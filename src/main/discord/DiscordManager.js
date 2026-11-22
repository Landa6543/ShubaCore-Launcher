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
    const isBedrock = Boolean(
      data?.isBedrock ||
      data?.edition === 'bedrock' ||
      (data?.loader && data.loader.toLowerCase() === 'bedrock')
    );

    const activeProfile = this.profileManager.getActive();
    const profileIsBedrock = (activeProfile?.edition === 'bedrock') ||
                             (activeProfile?.loader && activeProfile.loader.toLowerCase() === 'bedrock');

    const effectiveIsBedrock = isBedrock || profileIsBedrock;

    const mcVer = effectiveIsBedrock
      ? (activeProfile?.mcVersion || data?.mcVersion || 'Bedrock Edition')
      : (activeProfile?.mcVersion || data?.mcVersion || '1.21.1');

    const loaderRaw = effectiveIsBedrock
      ? 'bedrock'
      : (activeProfile?.loader || data?.loader || 'neoforge').toLowerCase();

    const loaderCap = loaderRaw === 'bedrock'
      ? 'Bedrock'
      : (loaderRaw.charAt(0).toUpperCase() + loaderRaw.slice(1));

    let activeModsCount = 0;
    if (!effectiveIsBedrock) {
      try {
        const instancePath = this.profileManager.getActiveInstancePath();
        const { getModManager } = require('../mods/ModManager');
        const mods = getModManager().scanAndSyncMods(instancePath);
        activeModsCount = (Array.isArray(mods) ? mods : []).filter((m) => m.enabled !== false).length;
      } catch (_) {}
    }

    const hostServer = this.launchManager.activeHostServer;
    const quickPlayServer = data?.quickPlayMultiplayer || data?.serverAddress || null;

    this.isPlaying = true;
    if (!this.gameStartTime) {
      this.gameStartTime = Math.floor(Date.now() / 1000);
    }
    this.activeGameInfo = {
      isBedrock: effectiveIsBedrock,
      profileName: activeProfile?.name || data?.profile || (effectiveIsBedrock ? 'Minecraft Bedrock' : 'Mi Instancia'),
      mcVersion: mcVer,
      loader: loaderCap,
      loaderRaw,
      activeModsCount,
      hostServer,
      quickPlayServer
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
      const downloadButton = {
        label: 'Descargar ShubaCore',
        url: 'https://github.com/Landa6543/ShubaCore-Launcher'
      };

      if (this.isPlaying && this.activeGameInfo) {
        // Estado: Jugando Minecraft
        const runningCount = this.launchManager.getRunningCount();
        const info = this.activeGameInfo;

        let detailsText = '';
        let stateText = '';
        let smallImageKey = 'shubacore_logo';
        let smallImageText = 'ShubaCore Launcher';

        if (info.isBedrock) {
          detailsText = 'Jugando Minecraft Bedrock';
          stateText = runningCount > 1
            ? `Windows 10/11 Edition (${runningCount} sesiones)`
            : 'Windows 10/11 Edition';
          smallImageKey = 'bedrock';
          smallImageText = 'Minecraft Bedrock';
        } else if (info.hostServer || this.launchManager.activeHostServer) {
          detailsText = 'Hospedando mundo LAN (ShubaHost)';
          stateText = `Mundo: ${info.profileName} · MC ${info.mcVersion} (${info.loader})`;
          smallImageKey = info.loaderRaw || 'fabric';
          smallImageText = `${info.loader} · MC ${info.mcVersion}`;
        } else if (info.quickPlayServer) {
          detailsText = 'Jugando en servidor multijugador';
          stateText = `Conectado a: ${info.quickPlayServer}`;
          smallImageKey = info.loaderRaw || 'fabric';
          smallImageText = `${info.loader} · MC ${info.mcVersion}`;
        } else {
          detailsText = runningCount > 1
            ? `Jugando: ${info.profileName} (${runningCount} sesiones)`
            : `Jugando: ${info.profileName}`;

          const modsPart = info.activeModsCount > 0
            ? ` · ${info.activeModsCount} mods`
            : '';
          stateText = `Minecraft ${info.mcVersion} (${info.loader})${modsPart}`;
          smallImageKey = info.loaderRaw || 'neoforge';
          smallImageText = `${info.loader} · MC ${info.mcVersion}`;
        }

        activity = {
          details: detailsText,
          state: stateText,
          startTimestamp: this.gameStartTime || Math.floor(Date.now() / 1000),
          largeImageKey: 'shubacore_logo',
          largeImageText: 'ShubaCore Launcher — SHUBATECH',
          smallImageKey,
          smallImageText,
          buttons: [downloadButton]
        };
      } else {
        // Estado: En menús del Launcher
        let detailsText = 'En el menú principal';
        let stateText = '';

        const active = this.profileManager.getActive();
        const profileName = active ? active.name : 'Mi Aventura';
        const mcVer = active?.mcVersion ? ` (MC ${active.mcVersion})` : '';

        switch (this.currentView) {
          case 'catalog':
            detailsText = 'Explorando el Catálogo de Mods';
            stateText = 'CurseForge & Modrinth (Mods, Shaders, Packs)';
            break;
          case 'mods':
            detailsText = `Gestionando Perfil: ${profileName}`;
            stateText = 'Configurando mods y complementos';
            break;
          case 'datapacks':
            detailsText = 'Configurando Datapacks';
            stateText = `Instancia: ${profileName}`;
            break;
          case 'shaders':
            detailsText = 'Configurando Shaders';
            stateText = 'Ajustando gráficos hiperrealistas';
            break;
          case 'resourcepacks':
            detailsText = 'Personalizando Texturas';
            stateText = `Packs de recursos: ${profileName}`;
            break;
          case 'worlds':
            detailsText = 'Gestionando Mundos & Partidas';
            stateText = 'Respaldos y exportación de mapas';
            break;
          case 'hud':
            detailsText = 'Personalizando HUD & ShubaClient';
            stateText = 'Ajustando interfaz in-game';
            break;
          case 'presets':
          case 'opti':
            detailsText = 'Optimizando Rendimiento FPS';
            stateText = 'ShubaOpti & Presets Extremos';
            break;
          case 'social':
          case 'friends':
            detailsText = 'En la Red Social de ShubaCore';
            stateText = 'Conectado con amigos & comunidad';
            break;
          case 'community':
            detailsText = 'Explorando la Comunidad ShubaCore';
            stateText = 'Directorio oficial de jugadores';
            break;
          case 'servers':
            detailsText = 'Explorando Servidores Multijugador';
            stateText = 'Directorio de servidores comunitarios';
            break;
          case 'screenshots':
          case 'gallery':
            detailsText = 'Viendo Galería de Capturas';
            stateText = 'Revisando recuerdos in-game';
            break;
          case 'skins':
            detailsText = 'En el Probador de Skins 3D';
            stateText = 'Personalizando apariencia';
            break;
          case 'controller':
            detailsText = 'Configurando Gamepad / Mando';
            stateText = 'Mapeo de controles & sensibilidad';
            break;
          case 'settings':
            detailsText = 'Configuración de ShubaCore';
            stateText = 'Ajustes globales, Java y RAM';
            break;
          case 'console':
            detailsText = 'Consola de Diagnóstico & Logs';
            stateText = 'Supervisando salida en tiempo real';
            break;
          case 'import':
          case 'modpack-import':
            detailsText = 'Importando Modpack o Instancia';
            stateText = 'CurseForge / Modrinth / Zip';
            break;
          case 'profiles':
          default:
            detailsText = 'En el Menú de Instancias';
            stateText = `Instancia activa: ${profileName}${mcVer}`;
            break;
        }

        activity = {
          details: detailsText,
          state: stateText,
          startTimestamp: this.launcherStartTime,
          largeImageKey: 'shubacore_logo',
          largeImageText: 'ShubaCore Launcher — SHUBATECH',
          buttons: [downloadButton]
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
