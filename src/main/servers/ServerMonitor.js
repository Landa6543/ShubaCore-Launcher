/**
 * ShubaCore - Live Minecraft Server Status Monitor
 * Developed by SHUBATECH
 *
 * Implements:
 * 1. Pinging Minecraft Java servers via official SLP protocol using minecraft-server-util.
 * 2. Real-time metrics: Online/Offline status, Round-trip latency (ping ms), Player counts (x/max), and MOTD.
 * 3. 30-second background polling cycle that broadcasts live updates to the UI widget.
 * 4. 100% fail-safe execution: network timeouts and offline servers never throw unhandled exceptions.
 */

const { EventEmitter } = require('events');
const util = require('minecraft-server-util');
const { defaultLogger: logger } = require('../utils/logger');
const { getConfigManager } = require('../config/ConfigManager');

class ServerMonitor extends EventEmitter {
  constructor() {
    super();
    this.configManager = getConfigManager();
    this.currentTarget = null;
    this.pollIntervalTimer = null;
    this.pollIntervalMs = 30000; // 30 segundos
    this.lastResult = null;
    this.mainWindow = null;
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  /**
   * Limpia y desglosa una dirección en host y puerto
   */
  parseAddress(addressString, defaultPort = 25565) {
    if (!addressString || typeof addressString !== 'string') {
      return { host: '127.0.0.1', port: defaultPort };
    }

    let clean = addressString.trim().toLowerCase();
    // Remover prefijos comunes como http://, https://, mc://
    clean = clean.replace(/^[a-z]+:\/\//i, '');
    clean = clean.replace(/\/.*$/, ''); // Quitar rutas

    if (clean.includes(':')) {
      const parts = clean.split(':');
      const host = parts[0].trim();
      const port = parseInt(parts[1], 10) || defaultPort;
      return { host, port };
    }

    return { host: clean, port: defaultPort };
  }

  /**
   * Ejecuta un ping único a un servidor de Minecraft Java
   * @param {string} hostOrAddress - Dirección IP o dominio
   * @param {number} [port=25565] - Puerto
   * @param {number} [timeoutMs=4000] - Tiempo de espera máximo
   */
  async pingServer(hostOrAddress, port = 25565, timeoutMs = 4000) {
    const parsed = this.parseAddress(hostOrAddress, port);
    const host = parsed.host;
    const targetPort = parsed.port;

    const startTime = Date.now();

    try {
      logger.debug(`[ServerMonitor] Haciendo ping a ${host}:${targetPort} (timeout: ${timeoutMs}ms)...`);
      const response = await util.status(host, targetPort, {
        timeout: timeoutMs,
        enableSRV: true
      });

      const pingMs = typeof response.roundTripLatency === 'number'
        ? response.roundTripLatency
        : (Date.now() - startTime);

      const result = {
        online: true,
        host,
        port: targetPort,
        address: `${host}:${targetPort}`,
        version: response.version?.name || 'Minecraft',
        protocolVersion: response.version?.protocol || 0,
        players: {
          online: response.players?.online || 0,
          max: response.players?.max || 20,
          sample: response.players?.sample || []
        },
        motd: response.motd?.clean || response.motd?.raw || '',
        motdHtml: response.motd?.html || '',
        pingMs,
        favicon: response.favicon || null,
        checkedAt: new Date().toISOString()
      };

      this.lastResult = result;
      this.emit('status-update', result);
      this._broadcastToWindow('server-monitor:update', result);
      return result;
    } catch (err) {
      logger.debug(`[ServerMonitor] Servidor ${host}:${targetPort} no respondió: ${err.message}`);

      const offlineResult = {
        online: false,
        host,
        port: targetPort,
        address: `${host}:${targetPort}`,
        version: null,
        players: { online: 0, max: 0, sample: [] },
        motd: 'Servidor fuera de línea',
        motdHtml: '<span style="color:#888;">Servidor fuera de línea</span>',
        pingMs: null,
        favicon: null,
        error: err.message,
        checkedAt: new Date().toISOString()
      };

      this.lastResult = offlineResult;
      this.emit('status-update', offlineResult);
      this._broadcastToWindow('server-monitor:update', offlineResult);
      return offlineResult;
    }
  }

  /**
   * Configura el servidor objetivo a monitorizar periódicamente
   */
  async setTargetServer(address, port = 25565) {
    const parsed = this.parseAddress(address, port);
    this.currentTarget = parsed;
    logger.info(`[ServerMonitor] Servidor objetivo configurado: ${parsed.host}:${parsed.port}`);

    // Iniciar monitor automático si no está corriendo
    this.startAutoMonitor();

    // Ejecutar ping inmediato
    return this.pingServer(parsed.host, parsed.port);
  }

  /**
   * Inicia el bucle de ping automático cada 30 segundos
   */
  startAutoMonitor(intervalMs = 30000) {
    if (this.pollIntervalTimer) {
      clearInterval(this.pollIntervalTimer);
      this.pollIntervalTimer = null;
    }

    this.pollIntervalMs = Math.max(10000, intervalMs);

    this.pollIntervalTimer = setInterval(async () => {
      if (this.currentTarget) {
        await this.pingServer(this.currentTarget.host, this.currentTarget.port);
      }
    }, this.pollIntervalMs);

    // Evitar que el timer impida que Electron cierre si no hay otras tareas
    if (this.pollIntervalTimer.unref) {
      this.pollIntervalTimer.unref();
    }
  }

  /**
   * Detiene el monitor automático en segundo plano
   */
  stopAutoMonitor() {
    if (this.pollIntervalTimer) {
      clearInterval(this.pollIntervalTimer);
      this.pollIntervalTimer = null;
    }
    logger.debug('[ServerMonitor] Monitor automático detenido.');
  }

  _broadcastToWindow(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed() && this.mainWindow.webContents) {
      try {
        this.mainWindow.webContents.send(channel, data);
      } catch (_) {}
    }
  }

  getLastResult() {
    return this.lastResult;
  }

  getTarget() {
    return this.currentTarget;
  }
}

let serverMonitorInstance = null;
function getServerMonitor() {
  if (!serverMonitorInstance) {
    serverMonitorInstance = new ServerMonitor();
  }
  return serverMonitorInstance;
}

module.exports = {
  ServerMonitor,
  getServerMonitor
};
