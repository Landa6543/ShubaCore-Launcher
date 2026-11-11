/**
 * ShubaCore - PlayIt.gg P2P LAN Tunnel Manager
 * Developed by SHUBATECH
 *
 * Implements:
 * 1. Automatic downloading and management of the official PlayIt.gg CLI agent for Windows.
 * 2. Background process execution (child_process) to create zero-configuration P2P tunnels for local/LAN games.
 * 3. Extraction of temporary/static tunnel domains (e.g. *.joinmc.link, *.playit.gg) and claim URLs.
 * 4. 100% fail-safe process lifecycle: clean shutdown on stop or app exit.
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const { EventEmitter } = require('events');
const { defaultLogger: logger } = require('../utils/logger');
const { getConfigManager } = require('../config/ConfigManager');

// Enlaces de descarga del agente oficial de PlayIt.gg para Windows x64
const PLAYIT_DOWNLOAD_URLS = [
  'https://github.com/playit-cloud/playit-agent/releases/latest/download/playit-windows-x86_64.exe',
  'https://playit.gg/downloads/playit-windows-x86_64.exe'
];

class PlayItManager extends EventEmitter {
  constructor() {
    super();
    this.configManager = getConfigManager();
    const rootPath = (typeof this.configManager?.getRootPath === 'function' ? this.configManager.getRootPath() : this.configManager?.configDir) || path.join(process.cwd(), '.shubacore-data');
    this.binDir = path.join(rootPath, 'bin');
    this.exePath = path.join(this.binDir, 'playit.exe');

    this.process = null;
    this.state = {
      running: false,
      status: 'stopped', // 'stopped' | 'downloading' | 'starting' | 'running' | 'error'
      tunnelAddress: null,
      claimUrl: null,
      localPort: 25565,
      pid: null,
      error: null
    };

    this._ensureBinDir();
  }

  _ensureBinDir() {
    if (!fs.existsSync(this.binDir)) {
      try {
        fs.mkdirSync(this.binDir, { recursive: true });
      } catch (_) {}
    }
  }

  isBinaryInstalled() {
    return fs.existsSync(this.exePath);
  }

  /**
   * Descarga el binario oficial de PlayIt si no existe
   */
  async ensureBinary(onProgress = null) {
    if (this.isBinaryInstalled()) {
      return { success: true, path: this.exePath, alreadyExists: true };
    }

    this._ensureBinDir();
    this.state.status = 'downloading';
    this.emit('status', this.state);

    if (onProgress) onProgress({ percent: 10, message: 'Iniciando descarga de PlayIt.gg CLI...' });

    let lastError = null;
    for (const url of PLAYIT_DOWNLOAD_URLS) {
      try {
        logger.info(`[PlayItManager] Descargando cliente PlayIt desde: ${url}`);
        const res = await fetch(url, {
          headers: { 'User-Agent': 'SHUBATECH-ShubaCore-Launcher/1.1.0' },
          redirect: 'follow'
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);

        if (buffer.length < 50000) {
          throw new Error('El archivo descargado es demasiado pequeño o inválido.');
        }

        fs.writeFileSync(this.exePath, buffer);
        logger.info(`[PlayItManager] ✅ PlayIt CLI guardado con éxito en: ${this.exePath} (${(buffer.length / (1024 * 1024)).toFixed(1)} MB)`);

        if (onProgress) onProgress({ percent: 100, message: 'PlayIt CLI listo.' });
        return { success: true, path: this.exePath, downloaded: true };
      } catch (err) {
        lastError = err;
        logger.warn(`[PlayItManager] Aviso al descargar desde ${url}: ${err.message}`);
      }
    }

    this.state.status = 'error';
    this.state.error = lastError ? lastError.message : 'Error desconocido al descargar PlayIt CLI';
    this.emit('status', this.state);
    throw new Error(`No se pudo descargar PlayIt CLI: ${this.state.error}`);
  }

  /**
   * Inicia el túnel P2P en segundo plano
   * @param {Object} options
   * @param {number} [options.localPort=25565] - Puerto local de Minecraft (LAN o Servidor)
   * @param {string} [options.secret] - Token secreto de Playit para cuentas existentes
   */
  async startTunnel({ localPort = 25565, secret = null, onProgress = null } = {}) {
    if (this.state.running && this.process) {
      return {
        success: true,
        alreadyRunning: true,
        address: this.state.tunnelAddress,
        claimUrl: this.state.claimUrl,
        state: this.state
      };
    }

    try {
      await this.ensureBinary(onProgress);
    } catch (binErr) {
      return { success: false, error: binErr.message };
    }

    this.state = {
      running: true,
      status: 'starting',
      tunnelAddress: null,
      claimUrl: null,
      localPort: parseInt(localPort, 10) || 25565,
      pid: null,
      error: null
    };
    this.emit('status', this.state);

    const args = [];
    if (secret) {
      args.push('--secret', secret);
    }

    logger.info(`[PlayItManager] Ejecutando "${this.exePath}" para el puerto local ${this.state.localPort}...`);

    try {
      this.process = spawn(this.exePath, args, {
        cwd: this.binDir,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.state.pid = this.process.pid;

      this.process.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        this._parseOutput(text);
      });

      this.process.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        this._parseOutput(text);
      });

      this.process.on('close', (code) => {
        logger.info(`[PlayItManager] Proceso PlayIt finalizado (código ${code}).`);
        this.state.running = false;
        this.state.status = 'stopped';
        this.state.pid = null;
        this.process = null;
        this.emit('status', this.state);
      });

      this.process.on('error', (err) => {
        logger.error(`[PlayItManager] Error de proceso: ${err.message}`);
        this.state.running = false;
        this.state.status = 'error';
        this.state.error = err.message;
        this.emit('status', this.state);
      });

      return {
        success: true,
        status: 'starting',
        pid: this.state.pid,
        localPort: this.state.localPort
      };
    } catch (err) {
      this.state.running = false;
      this.state.status = 'error';
      this.state.error = err.message;
      this.emit('status', this.state);
      return { success: false, error: err.message };
    }
  }

  /**
   * Analiza la salida de PlayIt para extraer la dirección del túnel y la URL de reclamo
   */
  _parseOutput(text) {
    if (!text) return;
    const clean = text.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

    // 1. Detectar URL de reclamo de cuenta (cuando es primera vez)
    const claimMatch = clean.match(/https:\/\/(?:playit\.gg\/claim\/[a-zA-Z0-9_-]+|playit\.gg\/manage[a-zA-Z0-9_\-\/?=]*)/i);
    if (claimMatch && !this.state.claimUrl) {
      this.state.claimUrl = claimMatch[0];
      logger.info(`[PlayItManager] Enlace de reclamo detectado: ${this.state.claimUrl}`);
      this.emit('claim-url', this.state.claimUrl);
      this.emit('status', this.state);
    }

    // 2. Detectar dirección pública del túnel (e.g. abc-xyz.joinmc.link:12345 o playit.gg o IP:port)
    const addressMatch = clean.match(/([a-zA-Z0-9.-]+\.(?:joinmc\.link|playit\.gg|playit\.at)(?::[0-9]{2,5})?|[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}:[0-9]{2,5})/i);
    if (addressMatch) {
      const foundAddr = addressMatch[1];
      if (!this.state.tunnelAddress || this.state.tunnelAddress !== foundAddr) {
        this.state.tunnelAddress = foundAddr;
        this.state.status = 'running';
        logger.info(`[PlayItManager] ✅ Dirección de túnel activa: ${this.state.tunnelAddress}`);
        this.emit('tunnel-ready', this.state.tunnelAddress);
        this.emit('status', this.state);
      }
    }

    // Si detecta "tunnel running" o "registered tunnel"
    if (clean.toLowerCase().includes('tunnel running') || clean.toLowerCase().includes('registered')) {
      if (this.state.status !== 'running') {
        this.state.status = 'running';
        this.emit('status', this.state);
      }
    }
  }

  /**
   * Detiene el proceso del túnel de forma limpia
   */
  async stopTunnel() {
    if (!this.process && !this.state.running) {
      return { success: true, alreadyStopped: true };
    }

    logger.info('[PlayItManager] Deteniendo túnel PlayIt.gg...');

    return new Promise((resolve) => {
      const pid = this.state.pid || (this.process ? this.process.pid : null);

      if (pid && process.platform === 'win32') {
        try {
          exec(`taskkill /pid ${pid} /T /F`, () => {
            this._finalizeStop(resolve);
          });
          return;
        } catch (_) {}
      }

      if (this.process) {
        try {
          this.process.kill('SIGTERM');
        } catch (_) {}
      }

      setTimeout(() => {
        this._finalizeStop(resolve);
      }, 500);
    });
  }

  _finalizeStop(resolve) {
    this.process = null;
    this.state.running = false;
    this.state.status = 'stopped';
    this.state.tunnelAddress = null;
    this.state.pid = null;
    this.emit('status', this.state);
    resolve({ success: true, status: 'stopped' });
  }

  getStatus() {
    return { ...this.state };
  }
}

let playItInstance = null;
function getPlayItManager() {
  if (!playItInstance) {
    playItInstance = new PlayItManager();
  }
  return playItInstance;
}

module.exports = {
  PlayItManager,
  getPlayItManager
};
