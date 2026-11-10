/**
 * ShubaCore - Hybrid Authentication Manager
 * Developed by SHUBATECH
 * Manages both Microsoft (Official/Xbox Device Code Flow) and Offline (No-Premium) accounts
 */

const { createOfflineProfile } = require('./OfflineAuth');
const { getMicrosoftDeviceAuth } = require('./MicrosoftDeviceAuth');
const { getConfigManager } = require('../config/ConfigManager');
const { defaultLogger: logger } = require('../utils/logger');

class AuthManager {
  constructor() {
    this.configManager = getConfigManager();
    this.deviceAuth = getMicrosoftDeviceAuth();
  }

  /**
   * Obtiene la cuenta actualmente activa
   */
  getCurrentAccount() {
    return this.configManager.get('auth.currentUser', null);
  }

  /**
   * Obtiene el modo de autenticación actual ('offline' | 'premium')
   */
  getAuthMode() {
    return this.configManager.get('auth.mode', 'offline');
  }

  /**
   * Autenticación en Modo Offline (No-Premium)
   */
  loginOffline(username) {
    try {
      logger.info(`Iniciando sesión en Modo Offline con el usuario: "${username}"`);
      const profile = createOfflineProfile(username);

      this._saveAccount(profile, 'offline');
      this.configManager.set('auth.mode', 'offline');

      logger.info(`Sesión offline iniciada con éxito. UUID generado: ${profile.uuid}`);
      return {
        success: true,
        account: profile
      };
    } catch (err) {
      logger.error('Error durante el inicio de sesión offline:', err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Solicita el código de dispositivo para iniciar sesión con Microsoft
   */
  async requestDeviceCode() {
    try {
      const codeData = await this.deviceAuth.requestDeviceCode();
      return {
        success: true,
        ...codeData
      };
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Cancela la espera de autorización de Microsoft
   */
  cancelDeviceCode() {
    this.deviceAuth.cancelPoll();
    return { success: true };
  }

  /**
   * Espera a que el usuario complete el inicio de sesión en el navegador
   */
  async pollAndCompleteMicrosoftLogin(deviceCode, interval = 5) {
    try {
      // 1. Polling a Microsoft OAuth2
      const tokens = await this.deviceAuth.pollDeviceToken(deviceCode, interval);

      // 2. Intercambio por tokens de Xbox Live y perfil de Minecraft
      const mcData = await this.deviceAuth.exchangeForMinecraft(tokens.msAccessToken);

      // 3. Crear el objeto MCLC Authorization
      const mclcAuth = {
        access_token: mcData.mcAccessToken,
        client_token: mcData.uuid,
        uuid: mcData.uuid,
        name: mcData.name,
        user_properties: '{}'
      };

      const account = {
        name: mcData.name,
        uuid: mcData.uuid,
        rawUuid: mcData.rawUuid,
        type: 'premium',
        skinUrl: mcData.skinUrl,
        mclcAuth,
        tokens: {
          msAccessToken: tokens.msAccessToken,
          msRefreshToken: tokens.msRefreshToken,
          mcAccessToken: mcData.mcAccessToken,
          expiresAt: Date.now() + (tokens.expiresIn * 1000)
        },
        createdAt: new Date().toISOString()
      };

      // 4. Guardar cuenta y modo premium
      this._saveAccount(account, 'premium');
      this.configManager.set('auth.mode', 'premium');

      // 5. Descargar y registrar skin automáticamente para el vestidor y el canvas
      try {
        const { getSkinManager } = require('../skins/SkinManager');
        const skinMgr = getSkinManager();
        await skinMgr.setSkinFromMojangUsername(mcData.name, mcData.name);
      } catch (skinErr) {
        logger.warn('[Auth] No se pudo cachear skin localmente:', skinErr.message);
      }

      logger.info(`[Auth] Sesión Premium de "${account.name}" (${account.uuid}) guardada exitosamente.`);
      return {
        success: true,
        account
      };
    } catch (err) {
      logger.error('[Auth] Error al completar autenticación de Microsoft:', err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Refresca las credenciales de una cuenta Premium si ya expiró el token
   */
  async refreshPremiumSession(account) {
    if (!account || account.type !== 'premium' || !account.tokens?.msRefreshToken) {
      return { success: false, error: 'No hay datos de sesión premium para refrescar.' };
    }

    try {
      logger.info(`Refrescando token de Microsoft para ${account.name}...`);
      const refreshed = await this.deviceAuth.refreshSession(account.tokens.msRefreshToken);

      account.mclcAuth = {
        access_token: refreshed.mcAccessToken,
        client_token: account.uuid,
        uuid: account.uuid,
        name: refreshed.name,
        user_properties: '{}'
      };
      account.tokens.msAccessToken = refreshed.msAccessToken;
      account.tokens.msRefreshToken = refreshed.msRefreshToken;
      account.tokens.mcAccessToken = refreshed.mcAccessToken;
      account.tokens.expiresAt = Date.now() + (3600 * 1000);

      this._saveAccount(account, 'premium');
      logger.info('Token de Microsoft refrescado con éxito.');
      return { success: true, account };
    } catch (err) {
      logger.error('Error al refrescar token de Microsoft:', err);
      return { success: false, error: err.message || 'Error al refrescar token.' };
    }
  }

  /**
   * Cierra la sesión activa actual
   */
  logout() {
    logger.info('Cerrando sesión de la cuenta activa...');
    this.configManager.set('auth.currentUser', null);
    return { success: true };
  }

  /**
   * Obtiene la cuenta de Microsoft conectada (activa o guardada)
   */
  getMicrosoftAccount() {
    const current = this.getCurrentAccount();
    if (current && current.type === 'premium') {
      return current;
    }
    const saved = this.configManager.get('auth.savedAccounts', []);
    const msAcc = saved.find((acc) => acc.type === 'premium');
    return msAcc || null;
  }

  /**
   * Selecciona y activa una cuenta existente por su UUID
   */
  switchAccount(uuid) {
    const saved = this.configManager.get('auth.savedAccounts', []);
    const account = saved.find((acc) => acc.uuid === uuid);
    if (!account) {
      return { success: false, error: 'Cuenta no encontrada.' };
    }
    this.configManager.set('auth.currentUser', account);
    this.configManager.set('auth.mode', account.type || 'offline');
    logger.info(`[Auth] Cuenta cambiada a "${account.name}" (${account.type}).`);
    return { success: true, account };
  }

  /**
   * Cierra sesión y remueve la cuenta de Microsoft
   */
  logoutMicrosoft(uuid) {
    let saved = this.configManager.get('auth.savedAccounts', []);
    const targetUuid = uuid || (this.getMicrosoftAccount()?.uuid);

    saved = saved.filter((acc) => acc.type !== 'premium' && acc.uuid !== targetUuid);
    this.configManager.set('auth.savedAccounts', saved);

    const current = this.getCurrentAccount();
    if (current && (current.type === 'premium' || current.uuid === targetUuid)) {
      const offlineFallback = saved.find((acc) => acc.type === 'offline');
      if (offlineFallback) {
        this.configManager.set('auth.currentUser', offlineFallback);
        this.configManager.set('auth.mode', 'offline');
      } else {
        this.configManager.set('auth.currentUser', null);
        this.configManager.set('auth.mode', 'offline');
      }
    }

    logger.info('[Auth] Sesión de Microsoft cerrada y cuenta desvinculada.');
    return { success: true };
  }

  /**
   * Obtiene el objeto de autorización para MCLC
   */
  getMCLCAuth() {
    const current = this.getCurrentAccount();
    if (!current || !current.mclcAuth) {
      throw new Error('No hay ninguna cuenta activa. Inicia sesión en Modo Premium o Offline antes de jugar.');
    }
    return current.mclcAuth;
  }

  _formatUuid(uuid) {
    if (!uuid || typeof uuid !== 'string') return uuid;
    const clean = uuid.replace(/-/g, '');
    if (clean.length !== 32) return uuid;
    return `${clean.substring(0, 8)}-${clean.substring(8, 12)}-${clean.substring(12, 16)}-${clean.substring(16, 20)}-${clean.substring(20, 32)}`;
  }

  _saveAccount(profile, mode) {
    this.configManager.set('auth.currentUser', profile);

    const savedAccounts = this.configManager.get('auth.savedAccounts', []);
    const existingIndex = savedAccounts.findIndex((acc) => acc.uuid === profile.uuid);

    if (existingIndex >= 0) {
      savedAccounts[existingIndex] = profile;
    } else {
      savedAccounts.push(profile);
    }

    this.configManager.set('auth.savedAccounts', savedAccounts);
  }
}

let authManagerInstance = null;
function getAuthManager() {
  if (!authManagerInstance) {
    authManagerInstance = new AuthManager();
  }
  return authManagerInstance;
}

module.exports = {
  AuthManager,
  getAuthManager
};
