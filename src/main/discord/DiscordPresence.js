/**
 * ShubaCore - Advanced Discord Rich Presence & Party Join (Bloque ShubaCore Pro)
 * Developed by SHUBATECH
 *
 * Implements:
 * 1. Native "Join Game" and "Ask to Join" buttons via partyId & joinSecret.
 * 2. Dedicated multiplayer server and LAN party states with live player counts.
 * 3. Handling Discord activityJoin events to auto-connect to servers/LAN.
 */

const { getDiscordManager } = require('./DiscordManager');
const { defaultLogger: logger } = require('../utils/logger');
const { EventEmitter } = require('events');

class DiscordPresence extends EventEmitter {
  constructor() {
    super();
    this.discordManager = getDiscordManager();
    this.partyState = null;
    this._setupDiscordJoinListeners();
  }

  _setupDiscordJoinListeners() {
    if (!this.discordManager.client) return;

    try {
      this.discordManager.client.on('activityJoin', (secret) => {
        logger.info(`[Discord RPC] Invitación de unión recibida con secret: "${secret}"`);
        this.emit('join-game', secret);
      });

      this.discordManager.client.on('activityJoinRequest', (user) => {
        logger.info(`[Discord RPC] Solicitud de unión de: ${user?.username} (${user?.id})`);
        this.emit('join-request', user);
      });
    } catch (err) {
      logger.debug(`[DiscordPresence] Aviso al enlazar eventos de unión: ${err.message}`);
    }
  }

  /**
   * Configura la presencia para un servidor multijugador o mundo LAN
   * @param {Object} options
   * @param {string} options.serverName - Nombre del servidor o mundo
   * @param {string} options.serverIp - Dirección IP del servidor
   * @param {number} [options.serverPort=25565] - Puerto del servidor
   * @param {string} [options.partyId] - ID único de la party
   * @param {number} [options.currentPlayers=1] - Jugadores actuales
   * @param {number} [options.maxPlayers=20] - Jugadores máximos
   * @param {string} [options.profileId] - ID del perfil/modpack necesario
   */
  async setPartyActivity({
    serverName = 'Servidor de Minecraft',
    serverIp = '127.0.0.1',
    serverPort = 25565,
    partyId = null,
    currentPlayers = 1,
    maxPlayers = 20,
    profileId = null
  }) {
    if (!this.discordManager.isEnabled() || !this.discordManager.isConnected || !this.discordManager.client?.user) {
      return { success: false, reason: 'Discord RPC no está conectado' };
    }

    const safePartyId = partyId || `shuba_party_${Date.now().toString(36)}`;
    const joinSecret = Buffer.from(JSON.stringify({ ip: serverIp, port: serverPort, profileId })).toString('base64');

    this.partyState = {
      serverName,
      serverIp,
      serverPort,
      partyId: safePartyId,
      joinSecret,
      currentPlayers: Math.max(1, currentPlayers),
      maxPlayers: Math.max(currentPlayers, maxPlayers),
      profileId
    };

    try {
      const activeGame = this.discordManager.activeGameInfo;
      const details = `Jugando en: ${serverName}`;
      const state = `Conectado a ${serverIp}:${serverPort}`;

      const activity = {
        details,
        state,
        startTimestamp: this.discordManager.gameStartTime || Math.floor(Date.now() / 1000),
        largeImageKey: 'shubacore_logo',
        largeImageText: 'ShubaCore Launcher — SHUBATECH',
        smallImageKey: 'minecraft_icon',
        smallImageText: activeGame ? `Minecraft ${activeGame.mcVersion}` : 'Minecraft',
        party: {
          id: safePartyId,
          size: [this.partyState.currentPlayers, this.partyState.maxPlayers]
        },
        secrets: {
          join: joinSecret
        }
      };

      await this.discordManager.client.user.setActivity(activity);
      logger.info(`[DiscordPresence] Presencia de servidor con botón Unirse activada: ${serverName} (${this.partyState.currentPlayers}/${this.partyState.maxPlayers})`);
      return { success: true, party: this.partyState };
    } catch (err) {
      logger.warn(`[DiscordPresence] Error al configurar actividad de Party: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Limpia el estado de party y regresa al estado normal
   */
  async clearPartyActivity() {
    this.partyState = null;
    return this.discordManager.refreshActivity();
  }

  getPartyState() {
    return this.partyState;
  }
}

let discordPresenceInstance = null;
function getDiscordPresence() {
  if (!discordPresenceInstance) {
    discordPresenceInstance = new DiscordPresence();
  }
  return discordPresenceInstance;
}

module.exports = {
  DiscordPresence,
  getDiscordPresence
};
