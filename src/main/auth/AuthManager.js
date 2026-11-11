/**
 * ShubaCore - Hybrid Authentication Manager
 * Developed by SHUBATECH
 * Manages both Microsoft (Official/Xbox Device Code Flow) and Offline (No-Premium) accounts
 * Persistent session storage in <userData>/auth-session.json with silent auto-refresh
 */

const fs = require('fs');
const path = require('path');
const { createOfflineProfile, generateOfflineUUID } = require('./OfflineAuth');
const { getMicrosoftDeviceAuth } = require('./MicrosoftDeviceAuth');
const { getConfigManager } = require('../config/ConfigManager');
const { defaultLogger: logger } = require('../utils/logger');

class AuthManager {
  constructor() {
    this.configManager = getConfigManager();
    this.deviceAuth = getMicrosoftDeviceAuth();
    this._savedSessionPromise = null;
    this._activeRefreshPromise = null;
    this._lastRefreshTimestamp = 0;
    this._refreshCooldownMs = 30000;
  }

  /**
   * Determina estrictamente si una sesión es Microsoft PREMIUM válida
   * REGLA: session.activeMode === 'microsoft' && session.microsoftAccount && mcAccessToken && uuid
   */
  isPremiumSession(session) {
    return Boolean(
      session &&
      session.activeMode === 'microsoft' &&
      session.microsoftAccount &&
      typeof session.microsoftAccount === 'object' &&
      session.microsoftAccount.mcAccessToken &&
      String(session.microsoftAccount.mcAccessToken).trim() !== '' &&
      !String(session.microsoftAccount.mcAccessToken).startsWith('offline_') &&
      session.microsoftAccount.uuid &&
      String(session.microsoftAccount.uuid).trim() !== ''
    );
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
   * Lee auth-session.json de forma segura y normalizada para cualquier jugador
   */
  _readSessionFile() {
    const filePath = this._getSessionFilePath();
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          let activeMode = (parsed.activeMode === 'microsoft') ? 'microsoft' : 'offline';
          let msAcc = parsed.microsoftAccount;

          // Validar cuenta Microsoft
          if (!msAcc || typeof msAcc !== 'object' || !msAcc.mcAccessToken || !msAcc.uuid || !msAcc.username) {
            msAcc = null;
          }

          // Si no hay cuenta Microsoft conectada válida, el modo ACTIVO NUNCA puede ser 'microsoft'
          if (!msAcc) {
            activeMode = 'offline';
          }

          // Normalizar cuenta Offline
          let offAcc = parsed.offlineAccount;
          if (offAcc && typeof offAcc === 'object' && offAcc.username && String(offAcc.username).trim() !== '' && offAcc.username !== 'undefined') {
            const cleanUser = String(offAcc.username).trim();
            const validUuid = offAcc.uuid || generateOfflineUUID(cleanUser);
            offAcc = { username: cleanUser, uuid: validUuid };
          } else {
            offAcc = { username: 'Jugador', uuid: generateOfflineUUID('Jugador') };
          }

          return {
            activeMode,
            offlineAccount: offAcc,
            microsoftAccount: msAcc
          };
        }
      }
    } catch (err) {
      logger.warn('[AuthManager] No se pudo leer auth-session.json:', err.message);
    }

    return {
      activeMode: 'offline',
      offlineAccount: { username: 'Jugador', uuid: generateOfflineUUID('Jugador') },
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
   * Utiliza una promesa en vuelo compartida para evitar múltiples llamadas concurrentes en el arranque
   */
  async getSavedSession() {
    if (this._savedSessionPromise) {
      return this._savedSessionPromise;
    }

    this._savedSessionPromise = (async () => {
      try {
        return await this._getSavedSessionInternal();
      } finally {
        this._savedSessionPromise = null;
      }
    })();

    return this._savedSessionPromise;
  }

  async _getSavedSessionInternal() {
    let session = this._readSessionFile();

    // Auto-renovación silenciosa de token Microsoft si expiró o está por expirar
    if (session.microsoftAccount && session.microsoftAccount.msRefreshToken) {
      const isExpired = Date.now() >= ((session.microsoftAccount.expiresAt || 0) - 60 * 1000);
      if (isExpired) {
        logger.info('[AuthManager] Token de Microsoft expirado al cargar launcher. Auto-renovando silenciosamente con msRefreshToken...');
        try {
          await this.refreshMicrosoftSession(false);
          session = this._readSessionFile();
        } catch (err) {
          logger.warn(`[AuthManager] No se pudo auto-renovar token en inicio: ${err.message}`);
        }
      }
    }

    const isPremium = this.isPremiumSession(session);
    let activeAccount = null;

    if (isPremium) {
      session.activeMode = 'microsoft';
      activeAccount = this._buildAccountFromSession(session.microsoftAccount);
      this.configManager.set('auth.currentUser', activeAccount);
      this.configManager.set('auth.mode', 'premium');
    } else {
      session.activeMode = 'offline';
      activeAccount = this._buildOfflineAccountFromSession(session.offlineAccount);
      this.configManager.set('auth.currentUser', activeAccount);
      this.configManager.set('auth.mode', 'offline');
    }

    this._writeSessionFile(session);

    return {
      success: true,
      activeMode: session.activeMode,
      offlineAccount: session.offlineAccount,
      microsoftAccount: session.microsoftAccount,
      isPremium,
      account: activeAccount
    };
  }

  /**
   * Obtiene la cuenta actualmente activa
   */
  getCurrentAccount() {
    const session = this._readSessionFile();
    if (this.isPremiumSession(session)) {
      return this._buildAccountFromSession(session.microsoftAccount);
    }
    if (session.offlineAccount) {
      return this._buildOfflineAccountFromSession(session.offlineAccount);
    }
    return createOfflineProfile('Jugador');
  }

  /**
   * Obtiene el modo de autenticación actual ('offline' | 'premium' | 'microsoft')
   */
  getAuthMode() {
    const session = this._readSessionFile();
    return this.isPremiumSession(session) ? 'premium' : 'offline';
  }

  /**
   * Cambia el modo activo ('microsoft' | 'offline') y persiste en auth-session.json
   */
  setActiveMode(mode) {
    const session = this._readSessionFile();
    const wantsMs = (mode === 'microsoft' || mode === 'premium');

    if (wantsMs && session.microsoftAccount && session.microsoftAccount.mcAccessToken && session.microsoftAccount.uuid) {
      session.activeMode = 'microsoft';
    } else {
      session.activeMode = 'offline';
    }

    this._writeSessionFile(session);

    const isPremium = this.isPremiumSession(session);
    let activeAccount = null;
    if (isPremium) {
      activeAccount = this._buildAccountFromSession(session.microsoftAccount);
      this.configManager.set('auth.currentUser', activeAccount);
      this.configManager.set('auth.mode', 'premium');
    } else {
      activeAccount = this._buildOfflineAccountFromSession(session.offlineAccount);
      this.configManager.set('auth.currentUser', activeAccount);
      this.configManager.set('auth.mode', 'offline');
    }

    logger.info(`[AuthManager] Modo de sesión cambiado: ${session.activeMode} (isPremium: ${isPremium})`);
    return {
      success: true,
      activeMode: session.activeMode,
      isPremium,
      account: activeAccount
    };
  }

  /**
   * Autenticación en Modo Offline (No-Premium) con generación automática de UUID v3
   */
  loginOffline(username) {
    try {
      const cleanUser = String(username || 'Jugador').trim();
      logger.info(`Iniciando sesión en Modo Offline con el usuario: "${cleanUser}"`);
      const profile = createOfflineProfile(cleanUser);

      this._saveAccount(profile, 'offline');
      this.configManager.set('auth.mode', 'offline');
      this.configManager.set('auth.currentUser', profile);

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
        activeMode: 'offline',
        isPremium: false,
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
   * Cuenta con bloqueo de concurrencia (mutex in-flight) y cooldown anti rate-limit (30s)
   */
  async refreshMicrosoftSession(force = false) {
    // 1. Mutex: si ya hay un proceso de renovación en curso, retornar la misma promesa
    if (this._activeRefreshPromise) {
      logger.debug('[AuthManager] Renovación de token de Microsoft ya en curso. Retornando promesa activa...');
      return this._activeRefreshPromise;
    }

    // 2. Cooldown anti rate-limit (30s): no volver a saturar Microsoft si ya se verificó recientemente
    const now = Date.now();
    if (!force && (now - this._lastRefreshTimestamp < this._refreshCooldownMs)) {
      logger.debug('[AuthManager] Renovación solicitada dentro del período de cooldown (30s). Reutilizando sesión actual.');
      const session = this._readSessionFile();
      return { success: true, renewed: false, session, account: this.getCurrentAccount() };
    }

    this._activeRefreshPromise = (async () => {
      try {
        return await this._refreshMicrosoftSessionInternal(force);
      } finally {
        this._activeRefreshPromise = null;
      }
    })();

    return this._activeRefreshPromise;
  }

  async _refreshMicrosoftSessionInternal(force = false) {
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
      this._lastRefreshTimestamp = Date.now();
      const refreshed = await this.deviceAuth.refreshSession(msAcc.msRefreshToken, msAcc);

      session.microsoftAccount.username = refreshed.name || msAcc.username;
      session.microsoftAccount.uuid = refreshed.uuid || msAcc.uuid;
      session.microsoftAccount.mcAccessToken = refreshed.mcAccessToken || msAcc.mcAccessToken;
      session.microsoftAccount.msRefreshToken = refreshed.msRefreshToken || msAcc.msRefreshToken;
      session.microsoftAccount.skinUrl = refreshed.skinUrl || msAcc.skinUrl;
      const expiresInSec = refreshed.rateLimited ? 600 : (refreshed.mcExpiresIn || 86400);
      session.microsoftAccount.expiresAt = Date.now() + (expiresInSec * 1000);

      this._writeSessionFile(session);

      const fullAccount = this._buildAccountFromSession(session.microsoftAccount);
      if (session.activeMode === 'microsoft') {
        this.configManager.set('auth.currentUser', fullAccount);
        this.configManager.set('auth.mode', 'premium');
      }

      logger.info(`[AuthManager] Sesión de Microsoft renovada exitosamente para "${refreshed.name}".${refreshed.rateLimited ? ' (Reutilizados por rate-limit Mojang)' : ''}`);
      return { success: true, renewed: true, session, account: fullAccount };
    } catch (err) {
      logger.warn(`[AuthManager] Aviso al renovar token de Microsoft: ${err.message}`);
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
        await this.refreshMicrosoftSession(false);
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
    const cleanUuid = String(uuid || '').replace(/-/g, '').toLowerCase();

    if (session.microsoftAccount) {
      const msUuid = String(session.microsoftAccount.uuid || '').replace(/-/g, '').toLowerCase();
      if (msUuid === cleanUuid || session.microsoftAccount.uuid === uuid) {
        session.activeMode = 'microsoft';
        this._writeSessionFile(session);
        const account = this._buildAccountFromSession(session.microsoftAccount);
        this.configManager.set('auth.currentUser', account);
        this.configManager.set('auth.mode', 'premium');
        logger.info(`[Auth] Cuenta cambiada a Microsoft: "${account.name}".`);
        return { success: true, account };
      }
    }

    if (session.offlineAccount) {
      const offUuid = String(session.offlineAccount.uuid || '').replace(/-/g, '').toLowerCase();
      if (offUuid === cleanUuid || session.offlineAccount.uuid === uuid) {
        session.activeMode = 'offline';
        this._writeSessionFile(session);
        const account = this._buildOfflineAccountFromSession(session.offlineAccount);
        this.configManager.set('auth.currentUser', account);
        this.configManager.set('auth.mode', 'offline');
        logger.info(`[Auth] Cuenta cambiada a Offline: "${account.name}".`);
        return { success: true, account };
      }
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
    if (!session.offlineAccount || !session.offlineAccount.username) {
      session.offlineAccount = {
        username: 'Jugador',
        uuid: generateOfflineUUID('Jugador')
      };
    }
    this._writeSessionFile(session);

    let saved = this.configManager.get('auth.savedAccounts', []);
    saved = saved.filter((acc) => acc.type !== 'premium' && acc.type !== 'microsoft');
    this.configManager.set('auth.savedAccounts', saved);

    const fallbackAccount = this._buildOfflineAccountFromSession(session.offlineAccount);
    this.configManager.set('auth.currentUser', fallbackAccount);
    this.configManager.set('auth.mode', 'offline');

    logger.info('[Auth] Sesión de Microsoft cerrada y desvinculada. Modo activo ahora es Offline.');
    return {
      success: true,
      activeMode: 'offline',
      isPremium: false,
      account: fallbackAccount
    };
  }

  /**
   * Obtiene el objeto de autorización para MCLC
   */
  getMCLCAuth() {
    const session = this._readSessionFile();
    if (this.isPremiumSession(session)) {
      return {
        access_token: session.microsoftAccount.mcAccessToken,
        client_token: session.microsoftAccount.uuid,
        uuid: session.microsoftAccount.uuid,
        name: session.microsoftAccount.username,
        user_properties: '{}'
      };
    }

    const offUser = (session.offlineAccount && session.offlineAccount.username) ? session.offlineAccount.username : 'Jugador';
    const profile = createOfflineProfile(offUser);
    if (session.offlineAccount && session.offlineAccount.uuid) {
      profile.uuid = session.offlineAccount.uuid;
      if (profile.mclcAuth) {
        profile.mclcAuth.uuid = session.offlineAccount.uuid;
        profile.mclcAuth.client_token = session.offlineAccount.uuid.replace(/-/g, '');
        profile.mclcAuth.access_token = `offline_token_${session.offlineAccount.uuid.replace(/-/g, '')}`;
      }
    }
    return profile.mclcAuth;
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
