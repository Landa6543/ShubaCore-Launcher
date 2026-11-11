/**
 * ShubaCore - Discord Rich Presence (RPC) Manager
 * Developed by SHUBATECH
 * Official Discord Application ID: 1569813011277938819
 *
 * Features:
 * - Silent error handling and automatic background reconnection every 30 seconds.
 * - Dynamic status:
 *   * Menu: "En el menú principal" / "Explorando el Catálogo" / etc. + "Perfil activo: <Nombre>"
 *   * Playing: "Jugando: <Nombre>" + "Minecraft <Versión> (<Loader>) · <X> mods activos" + Live Timer
 * - User toggle switch in Settings (persisted via ConfigManager).
 */

const { Client } = require('@xhayper/discord-rpc');
const { getConfigManager } = require('../config/ConfigManager');
const { getProfileManager } = require('../profiles/ProfileManager');
const { getLaunchManager } = require('../launcher/LaunchManager');
const { defaultLogger: logger } = require('../utils/logger');

const DISCORD_CLIENT_ID = '1569813011277938819';

class DiscordManager {
  constructor() {
    this.configManager = getConfigManager();
    this.profileManager = getProfileManager();
    this.launchManager = getLaunchManager();

    this.client = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectTimer = null;

    this.launcherStartTime = Math.floor(Date.now() / 1000);
    this.gameStartTime = null;
    this.currentView = 'profiles';
    this.isPlaying = false;
    this.activeGameInfo = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Conectar eventos del LaunchManager para detectar inicio y fin de juego en vivo
    this.launchManager.onEvent((eventName, data) => {
      if (eventName === 'launch:started') {
        this._handleGameStarted(data);
      } else if (eventName === 'launch:close') {
        this._handleGameClosed();
      }
    });

    if (this.isEnabled()) {
      this.connect();
    } else {
      logger.info('[Discord RPC] Rich Presence deshabilitado por configuración del usuario.');
    }
  }

  isEnabled() {
    return this.configManager.get('discord.rpcEnabled', true) === true;
  }

  setEnabled(enabled) {
    const isEn = !!enabled;
    this.configManager.set('discord.rpcEnabled', isEn);

    if (!isEn) {
      logger.info('[Discord RPC] Desactivando presencia de Discord a petición del usuario...');
      this.disconnect();
    } else {
      logger.info('[Discord RPC] Activando presencia de Discord...');
      this.connect();
    }
  }

  connect() {
    if (!this.isEnabled()) return;
    if (this.isConnected || this.isConnecting) return;

    this.isConnecting = true;

    try {
      if (this.client) {
        try { this.client.destroy(); } catch (_) {}
      }

      this.client = new Client({ clientId: DISCORD_CLIENT_ID });

      this.client.on('ready', () => {
        this.isConnected = true;
        this.isConnecting = false;
        logger.info(`⚡ [Discord RPC] Conexión establecida con Discord como: "${this.client.user?.username || 'Usuario'}"`);

        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }

        this.refreshActivity();
      });

      this.client.on('disconnected', () => {
        this.isConnected = false;
        this.isConnecting = false;
        logger.debug('[Discord RPC] Conexión con Discord perdida.');
        this._scheduleReconnect();
      });

      this.client.login().catch((err) => {
        this.isConnected = false;
        this.isConnecting = false;
        logger.debug(`[Discord RPC] Discord no disponible (${err.message}). Reintentando en segundo plano...`);
        this._scheduleReconnect();
      });
    } catch (err) {
      this.isConnected = false;
      this.isConnecting = false;
      logger.debug(`[Discord RPC] Error al instanciar cliente RPC: ${err.message}`);
      this._scheduleReconnect();
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client) {
      if (this.isConnected && this.client.user) {
        try {
          this.client.user.clearActivity().catch(() => {});
        } catch (_) {}
      }
      try {
        this.client.destroy();
      } catch (_) {}
    }

    this.client = null;
    this.isConnected = false;
    this.isConnecting = false;
  }

  _scheduleReconnect() {
    if (this.reconnectTimer || !this.isEnabled()) return;

    // Reintentar en 30 segundos silenciosamente
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.isEnabled() && !this.isConnected && !this.isConnecting) {
        this.connect();
      }
    }, 30000);
  }

  setMenuActivity(viewName) {
    this.currentView = viewName || this.currentView;
    if (!this.isPlaying) {
      this.refreshActivity();
    }
  }

  _handleGameStarted(data) {
    const activeProfile = this.profileManager.getActive();
    const mcVer = activeProfile?.mcVersion || '1.21.1';
    const loaderRaw = activeProfile?.loader || 'neoforge';
    const loaderCap = loaderRaw.charAt(0).toUpperCase() + loaderRaw.slice(1);

    let activeModsCount = 0;
    try {
      const instancePath = this.profileManager.getActiveInstancePath();
      const { getModManager } = require('../mods/ModManager');
      const mods = getModManager().scanAndSyncMods(instancePath);
      activeModsCount = (Array.isArray(mods) ? mods : []).filter((m) => m.enabled !== false).length;
    } catch (_) {}

    this.isPlaying = true;
    if (!this.gameStartTime) {
      this.gameStartTime = Math.floor(Date.now() / 1000);
    }
    this.activeGameInfo = {
      profileName: activeProfile?.name || data?.profile || 'Mi Instancia',
      mcVersion: mcVer,
      loader: loaderCap,
      activeModsCount
    };

    const count = this.launchManager.getRunningCount();
    logger.info(`⚡ [Discord RPC] Actualizando estado a "Jugando Minecraft" (${this.activeGameInfo.profileName}, ${count} sesión(es) activa(s))...`);
    this.refreshActivity();
  }

  _handleGameClosed() {
    const runningCount = this.launchManager.getRunningCount();
    if (runningCount === 0) {
      this.isPlaying = false;
      this.gameStartTime = null;
      this.activeGameInfo = null;
      logger.info('⚡ [Discord RPC] Todas las sesiones de Minecraft cerradas. Restaurando estado a "Menú Principal"...');
    } else {
      logger.info(`⚡ [Discord RPC] Una sesión de Minecraft cerrada. Quedan ${runningCount} sesión(es) activa(s)...`);
    }
    this.refreshActivity();
  }

  async refreshActivity() {
    if (!this.isEnabled() || !this.isConnected || !this.client || !this.client.user) {
      return;
    }

    try {
      let activity = null;

      if (this.isPlaying && this.activeGameInfo) {
        // Estado: Jugando Minecraft
        const runningCount = this.launchManager.getRunningCount();
        const modsPart = this.activeGameInfo.activeModsCount > 0
          ? ` · ${this.activeGameInfo.activeModsCount} mods activos`
          : '';

        const detailsText = runningCount > 1
          ? `Jugando: ${this.activeGameInfo.profileName} (${runningCount} sesiones activas)`
          : `Jugando: ${this.activeGameInfo.profileName}`;

        activity = {
          details: detailsText,
          state: `Minecraft ${this.activeGameInfo.mcVersion} (${this.activeGameInfo.loader})${modsPart}`,
          startTimestamp: this.gameStartTime || Math.floor(Date.now() / 1000),
          largeImageKey: 'shubacore_logo',
          largeImageText: 'ShubaCore Launcher — SHUBATECH'
        };
      } else {
        // Estado: En menús del Launcher
        let detailsText = 'En el menú principal';
        switch (this.currentView) {
          case 'catalog':
            detailsText = 'Explorando el Catálogo de Mods';
            break;
          case 'mods':
            detailsText = 'Gestionando Mods de Instancia';
            break;
          case 'skins':
            detailsText = 'En el Vestidor de Skins';
            break;
          case 'settings':
            detailsText = 'Configurando Java y Ajustes';
            break;
          case 'console':
            detailsText = 'Viendo Consola & Logs';
            break;
          case 'profiles':
          default:
            detailsText = 'En el menú principal';
            break;
        }

        const active = this.profileManager.getActive();
        const profileName = active ? active.name : 'Mi Aventura';

        activity = {
          details: detailsText,
          state: `Perfil activo: ${profileName}`,
          startTimestamp: this.launcherStartTime,
          largeImageKey: 'shubacore_logo',
          largeImageText: 'ShubaCore Launcher — SHUBATECH'
        };
      }

      await this.client.user.setActivity(activity);
    } catch (err) {
      logger.debug(`[Discord RPC] Error al enviar actividad a Discord: ${err.message}`);
    }
  }

  getStatus() {
    return {
      enabled: this.isEnabled(),
      connected: this.isConnected,
      isPlaying: this.isPlaying,
      currentView: this.currentView
    };
  }

  destroy() {
    this.disconnect();
  }
}

let discordManagerInstance = null;
function getDiscordManager() {
  if (!discordManagerInstance) {
    discordManagerInstance = new DiscordManager();
  }
  return discordManagerInstance;
}

module.exports = {
  DiscordManager,
  getDiscordManager,
  DISCORD_CLIENT_ID
};
