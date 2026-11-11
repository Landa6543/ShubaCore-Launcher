/**
 * ShubaCore - Hybrid Authentication Manager
 * Developed by SHUBATECH
 * Manages both Microsoft (Official/Xbox Device Code Flow) and Offline (No-Premium) accounts
 * Persistent session storage in <userData>/auth-session.json with silent auto-refresh
 */

const fs = require('fs');
const path = require('path');
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
   * Obtiene la ruta física del archivo auth-session.json en <userData>
   */
  _getSessionFilePath() {
    let userDataDir = null;
    try {
      const electron = require('electron');
      const electronApp = electron.app || (electron.remote && electron.remote.app);
      if (electronApp && typeof electronApp.getPath === 'function') {
        userDataDir = electronApp.getPath('userData');
      }
    } catch (_) {}

    if (!userDataDir) {
      userDataDir = path.join(process.env.APPDATA || process.env.USERPROFILE || process.env.HOME || '.', '.shubacore');
    }

    return path.join(userDataDir, 'auth-session.json');
  }

  /**
   * Lee auth-session.json de forma segura
   */
  _readSessionFile() {
    const filePath = this._getSessionFilePath();
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            activeMode: parsed.activeMode || 'offline',
            offlineAccount: parsed.offlineAccount || null,
            microsoftAccount: parsed.microsoftAccount || null
          };
        }
      }
    } catch (err) {
      logger.warn('[AuthManager] No se pudo leer auth-session.json:', err.message);
    }
    return {
      activeMode: 'offline',
      offlineAccount: null,
      microsoftAccount: null
    };
  }

  /**
   * Escribe auth-session.json en disco
   */
  _writeSessionFile(sessionData) {
    const filePath = this._getSessionFilePath();
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2), 'utf8');
      logger.debug(`[AuthManager] auth-session.json actualizado en: ${filePath}`);
    } catch (err) {
      logger.error('[AuthManager] Error al guardar auth-session.json:', err.message);
    }
  }

  /**
   * Reconstruye un objeto de cuenta completo a partir de la sesión de Microsoft
   */
  _buildAccountFromSession(msData) {
    if (!msData) return null;
    const rawUser = msData.username || msData.name;
    if (!rawUser || rawUser === 'undefined' || String(rawUser).trim() === '') return null;
    const cleanUser = String(rawUser).trim();

    return {
      name: cleanUser,
      username: cleanUser,
      uuid: msData.uuid,
      type: 'premium',
      isPremium: true,
      activeMode: 'microsoft',
      skinUrl: msData.skinUrl || `https://mc-heads.net/skin/${cleanUser}`,
      mclcAuth: {
        access_token: msData.mcAccessToken,
        client_token: msData.uuid,
        uuid: msData.uuid,
        name: cleanUser,
        user_properties: '{}'
      },
      tokens: {
        msRefreshToken: msData.msRefreshToken,
        mcAccessToken: msData.mcAccessToken,
        expiresAt: msData.expiresAt || (Date.now() + 3600 * 1000)
      }
    };
  }

  /**
   * Reconstruye un objeto de cuenta offline
   */
  _buildOfflineAccountFromSession(offData) {
    if (!offData) return null;
    const rawUser = offData.username || offData.name;
    if (!rawUser || rawUser === 'undefined' || String(rawUser).trim() === '') return null;
    const cleanUser = String(rawUser).trim();

    const profile = createOfflineProfile(cleanUser);
    profile.type = 'offline';
    profile.isPremium = false;
    profile.activeMode = 'offline';
    if (offData.uuid) {
      profile.uuid = offData.uuid;
      if (profile.mclcAuth) profile.mclcAuth.uuid = offData.uuid;
    }
    return profile;
  }

  /**
   * Carga la sesión guardada desde auth-session.json y renueva el token silenciosamente si expiró
   */
  async getSavedSession() {
    let session = this._readSessionFile();

    // Sanear session.offlineAccount para asegurar username y name válidos (evitar "undefined")
    if (session.offlineAccount) {
      const u = session.offlineAccount.username || session.offlineAccount.name;
      if (!u || u === 'undefined' || String(u).trim() === '') {
        session.offlineAccount = null;
      } else {
        const clean = String(u).trim();
        session.offlineAccount.username = clean;
        session.offlineAccount.name = clean;
      }
    }

    // Sanear session.microsoftAccount
    if (session.microsoftAccount) {
      const u = session.microsoftAccount.username || session.microsoftAccount.name;
      if (!u || u === 'undefined' || String(u).trim() === '') {
        session.microsoftAccount = null;
      } else {
        const clean = String(u).trim();
        session.microsoftAccount.username = clean;
        session.microsoftAccount.name = clean;
      }
    }

    // Migración o recuperación inicial si no hay cuentas válidas en auth-session.json
    if (!session.offlineAccount && !session.microsoftAccount) {
      const configCurrent = this.configManager.get('auth.currentUser', null);
      const confName = configCurrent ? (configCurrent.name || configCurrent.username) : null;
      if (confName && confName !== 'undefined' && String(confName).trim() !== '') {
        const clean = String(confName).trim();
        if (configCurrent.type === 'premium') {
          session.activeMode = 'microsoft';
          session.microsoftAccount = {
            username: clean,
            name: clean,
            uuid: configCurrent.uuid,
            mcAccessToken: configCurrent.tokens?.mcAccessToken || configCurrent.mclcAuth?.access_token || '',
            msRefreshToken: configCurrent.tokens?.msRefreshToken || '',
            skinUrl: configCurrent.skinUrl || '',
            expiresAt: configCurrent.tokens?.expiresAt || (Date.now() + 3600 * 1000)
          };
        } else {
          session.activeMode = 'offline';
          session.offlineAccount = {
            username: clean,
            name: clean,
            uuid: configCurrent.uuid
          };
        }
      } else {
        session.activeMode = 'offline';
        session.offlineAccount = {
          username: 'LanderAlo',
          name: 'LanderAlo'
        };
      }
      this._writeSessionFile(session);
    }

    // Auto-renovación silenciosa de token Microsoft si expiró o está por expirar
    if (session.microsoftAccount && session.microsoftAccount.msRefreshToken) {
      const isExpired = Date.now() >= ((session.microsoftAccount.expiresAt || 0) - 60 * 1000);
      if (isExpired) {
        logger.info('[AuthManager] Token de Microsoft expirado al cargar launcher. Auto-renovando silenciosamente con msRefreshToken...');
        try {
          await this.refreshMicrosoftSession();
          session = this._readSessionFile();
        } catch (err) {
          logger.warn(`[AuthManager] No se pudo auto-renovar token en inicio: ${err.message}`);
        }
      }
    }

    // Configurar la cuenta activa en configManager con fallback seguro
    let activeAccount = null;
    if (session.microsoftAccount && (session.activeMode === 'microsoft' || !session.offlineAccount)) {
      session.activeMode = 'microsoft';
      activeAccount = this._buildAccountFromSession(session.microsoftAccount);
      this.configManager.set('auth.currentUser', activeAccount);
      this.configManager.set('auth.mode', 'premium');
    } else if (session.activeMode === 'offline' && session.offlineAccount) {
      activeAccount = this._buildOfflineAccountFromSession(session.offlineAccount);
      this.configManager.set('auth.currentUser', activeAccount);
      this.configManager.set('auth.mode', 'offline');
    } else if (session.microsoftAccount) {
      session.activeMode = 'microsoft';
      activeAccount = this._buildAccountFromSession(session.microsoftAccount);
      this.configManager.set('auth.currentUser', activeAccount);
      this.configManager.set('auth.mode', 'premium');
    } else if (session.offlineAccount) {
      activeAccount = this._buildOfflineAccountFromSession(session.offlineAccount);
      this.configManager.set('auth.currentUser', activeAccount);
      this.configManager.set('auth.mode', 'offline');
    }

    return {
      success: true,
      activeMode: session.activeMode,
      offlineAccount: session.offlineAccount,
      microsoftAccount: session.microsoftAccount,
      account: activeAccount
    };
  }

  /**
   * Obtiene la cuenta actualmente activa
   */
  getCurrentAccount() {
    const session = this._readSessionFile();
    if (session.activeMode === 'microsoft' && session.microsoftAccount) {
      return this._buildAccountFromSession(session.microsoftAccount);
    }
    if (session.activeMode === 'offline' && session.offlineAccount) {
      return this._buildOfflineAccountFromSession(session.offlineAccount);
    }
    return this.configManager.get('auth.currentUser', null);
  }

  /**
   * Obtiene el modo de autenticación actual ('offline' | 'premium' | 'microsoft')
   */
  getAuthMode() {
    const session = this._readSessionFile();
    return session.activeMode === 'microsoft' ? 'premium' : 'offline';
  }

  /**
   * Cambia el modo activo ('microsoft' | 'offline') y persiste en auth-session.json
   */
  setActiveMode(mode) {
    const session = this._readSessionFile();
    const normalized = (mode === 'microsoft' || mode === 'premium') ? 'microsoft' : 'offline';
    session.activeMode = normalized;
    this._writeSessionFile(session);

    let activeAccount = null;
    if (normalized === 'microsoft' && session.microsoftAccount) {
      activeAccount = this._buildAccountFromSession(session.microsoftAccount);
      this.configManager.set('auth.currentUser', activeAccount);
      this.configManager.set('auth.mode', 'premium');
    } else if (session.offlineAccount) {
      activeAccount = this._buildOfflineAccountFromSession(session.offlineAccount);
      this.configManager.set('auth.currentUser', activeAccount);
      this.configManager.set('auth.mode', 'offline');
    }

    logger.info(`[AuthManager] Modo de sesión cambiado y guardado: ${normalized}`);
    return { success: true, activeMode: normalized, account: activeAccount };
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

      // Actualizar inmediatamente auth-session.json
      const session = this._readSessionFile();
      session.activeMode = 'offline';
      session.offlineAccount = {
        username: profile.name,
        uuid: profile.uuid
      };
      this._writeSessionFile(session);

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

      // 4. Guardar cuenta en configManager y en auth-session.json
      this._saveAccount(account, 'premium');
      this.configManager.set('auth.mode', 'premium');

      const session = this._readSessionFile();
      session.activeMode = 'microsoft';
      session.microsoftAccount = {
        username: mcData.name,
        uuid: mcData.uuid,
        mcAccessToken: mcData.mcAccessToken,
        msRefreshToken: tokens.msRefreshToken,
        skinUrl: mcData.skinUrl,
        expiresAt: Date.now() + (tokens.expiresIn * 1000)
      };
      this._writeSessionFile(session);

      // 5. Descargar y registrar skin automáticamente para el vestidor y el canvas
      try {
        const { getSkinManager } = require('../skins/SkinManager');
        const skinMgr = getSkinManager();
        await skinMgr.setSkinFromMojangUsername(mcData.name, mcData.name);
      } catch (skinErr) {
        logger.warn('[Auth] No se pudo cachear skin localmente:', skinErr.message);
      }

      logger.info(`[Auth] Sesión Premium de "${account.name}" (${account.uuid}) guardada permanentemente en auth-session.json.`);
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
   * Refresca silenciosamente la sesión de Microsoft usando el refresh_token
   */
  async refreshMicrosoftSession(force = false) {
    const session = this._readSessionFile();
    const msAcc = session.microsoftAccount;
    if (!msAcc || !msAcc.msRefreshToken) {
      return { success: false, error: 'No hay datos de sesión Microsoft para renovar.' };
    }

    const isExpired = Date.now() >= ((msAcc.expiresAt || 0) - 60 * 1000);
    if (!isExpired && !force) {
      return { success: true, renewed: false, session };
    }

    try {
      logger.info(`[AuthManager] Renovando sesión oficial silenciosamente para "${msAcc.username}"...`);
      const refreshed = await this.deviceAuth.refreshSession(msAcc.msRefreshToken);

      session.microsoftAccount.username = refreshed.name;
      session.microsoftAccount.uuid = refreshed.uuid;
      session.microsoftAccount.mcAccessToken = refreshed.mcAccessToken;
      session.microsoftAccount.msRefreshToken = refreshed.msRefreshToken || msAcc.msRefreshToken;
      session.microsoftAccount.skinUrl = refreshed.skinUrl || msAcc.skinUrl;
      session.microsoftAccount.expiresAt = Date.now() + ((refreshed.mcExpiresIn || 86400) * 1000);

      this._writeSessionFile(session);

      const fullAccount = this._buildAccountFromSession(session.microsoftAccount);
      if (session.activeMode === 'microsoft') {
        this.configManager.set('auth.currentUser', fullAccount);
        this.configManager.set('auth.mode', 'premium');
      }

      logger.info(`[AuthManager] Sesión de Microsoft renovada exitosamente para "${refreshed.name}".`);
      return { success: true, renewed: true, session, account: fullAccount };
    } catch (err) {
      logger.warn(`[AuthManager] Error al renovar token de Microsoft: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Garantiza que la sesión activa tenga tokens vigentes antes de lanzar Minecraft
   */
  async ensureValidSession() {
    const session = this._readSessionFile();
    if (session.activeMode === 'microsoft' && session.microsoftAccount) {
      const isExpired = Date.now() >= ((session.microsoftAccount.expiresAt || 0) - 60 * 1000);
      if (isExpired) {
        logger.info('[AuthManager] [Launch] Token de Microsoft expirado antes de lanzar Minecraft. Renovando silenciosamente...');
        await this.refreshMicrosoftSession();
      }
      const updated = this._readSessionFile();
      if (updated.microsoftAccount) {
        const fullAccount = this._buildAccountFromSession(updated.microsoftAccount);
        this.configManager.set('auth.currentUser', fullAccount);
        this.configManager.set('auth.mode', 'premium');
      }
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
    const session = this._readSessionFile();
    if (session.microsoftAccount) {
      return this._buildAccountFromSession(session.microsoftAccount);
    }
    const current = this.getCurrentAccount();
    if (current && (current.type === 'premium' || current.type === 'microsoft')) {
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
    const session = this._readSessionFile();
    if (session.microsoftAccount && session.microsoftAccount.uuid === uuid) {
      session.activeMode = 'microsoft';
      this._writeSessionFile(session);
      const account = this._buildAccountFromSession(session.microsoftAccount);
      this.configManager.set('auth.currentUser', account);
      this.configManager.set('auth.mode', 'premium');
      logger.info(`[Auth] Cuenta cambiada a Microsoft: "${account.name}".`);
      return { success: true, account };
    }

    if (session.offlineAccount && session.offlineAccount.uuid === uuid) {
      session.activeMode = 'offline';
      this._writeSessionFile(session);
      const account = this._buildOfflineAccountFromSession(session.offlineAccount);
      this.configManager.set('auth.currentUser', account);
      this.configManager.set('auth.mode', 'offline');
      logger.info(`[Auth] Cuenta cambiada a Offline: "${account.name}".`);
      return { success: true, account };
    }

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
    const session = this._readSessionFile();
    session.microsoftAccount = null;
    session.activeMode = 'offline';
    this._writeSessionFile(session);

    let saved = this.configManager.get('auth.savedAccounts', []);
    const targetUuid = uuid || (this.getMicrosoftAccount()?.uuid);

    saved = saved.filter((acc) => acc.type !== 'premium' && acc.uuid !== targetUuid);
    this.configManager.set('auth.savedAccounts', saved);

    let fallbackAccount = null;
    if (session.offlineAccount) {
      fallbackAccount = this._buildOfflineAccountFromSession(session.offlineAccount);
    } else {
      const offlineSaved = saved.find((acc) => acc.type === 'offline');
      if (offlineSaved) fallbackAccount = offlineSaved;
    }

    this.configManager.set('auth.currentUser', fallbackAccount);
    this.configManager.set('auth.mode', 'offline');

    logger.info('[Auth] Sesión de Microsoft cerrada y desvinculada.');
    return { success: true, account: fallbackAccount };
  }

  /**
   * Obtiene el objeto de autorización para MCLC
   */
  getMCLCAuth() {
    const session = this._readSessionFile();
    if (session.activeMode === 'microsoft' && session.microsoftAccount) {
      return {
        access_token: session.microsoftAccount.mcAccessToken,
        client_token: session.microsoftAccount.uuid,
        uuid: session.microsoftAccount.uuid,
        name: session.microsoftAccount.username,
        user_properties: '{}'
      };
    }
    if (session.activeMode === 'offline' && session.offlineAccount) {
      const profile = createOfflineProfile(session.offlineAccount.username);
      if (session.offlineAccount.uuid) {
        profile.uuid = session.offlineAccount.uuid;
        profile.mclcAuth.uuid = session.offlineAccount.uuid;
      }
      return profile.mclcAuth;
    }

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
