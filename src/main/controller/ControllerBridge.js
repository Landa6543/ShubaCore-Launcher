/**
 * ShubaCore - Native OS Controller Bridge (Win32 SendInput & XInput)
 * Developed by SHUBATECH
 *
 * Provides real-time 60Hz controller translation directly to Windows OS
 * using user32.dll and XInput without requiring any mods in mods/.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');
const { defaultLogger: logger } = require('../utils/logger');
const { getControllerMapManager } = require('./ControllerMapManager');

class ControllerBridge extends EventEmitter {
  constructor() {
    super();
    this.workerProcess = null;
    this.isRunning = false;
    this.currentInstanceDir = null;
    this.currentPid = 0;
    this.scriptPath = path.join(__dirname, 'controller-worker.ps1');
  }

  getStatus() {
    return {
      running: this.isRunning,
      pid: this.workerProcess ? this.workerProcess.pid : null,
      targetPid: this.currentPid,
      instanceDir: this.currentInstanceDir
    };
  }

  /**
   * Inicia el proceso de puente Win32
   */
  start(instanceDir = null, targetPid = 0) {
    if (this.isRunning && this.workerProcess) {
      if (instanceDir) this.updateInstance(instanceDir, targetPid);
      return true;
    }

    if (process.platform !== 'win32') {
      logger.warn('[ControllerBridge] El puente nativo de mandos Win32 solo es compatible con Windows.');
      return false;
    }

    if (!fs.existsSync(this.scriptPath)) {
      logger.error(`[ControllerBridge] No se encontró el script del worker en: ${this.scriptPath}`);
      return false;
    }

    this.currentInstanceDir = instanceDir;
    this.currentPid = targetPid;

    try {
      const mapMgr = getControllerMapManager();
      const map = mapMgr.getMapping(instanceDir);
      const configPayload = JSON.stringify({
        deadzone: map.deadzone || 0.15,
        sensitivityX: map.sensitivityX || 2.5,
        sensitivityY: map.sensitivityY || 2.5,
        invertY: !!map.invertY,
        targetPid: this.currentPid,
        buttons: map.buttons || {}
      });

      logger.info(`[ControllerBridge] Iniciando puente nativo Win32 (PowerShell worker)...`);

      this.workerProcess = spawn('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-File', this.scriptPath,
        '-ConfigJson', configPayload
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
      });

      this.isRunning = true;

      if (this.workerProcess.stdin) {
        this.workerProcess.stdin.on('error', (err) => {
          logger.debug(`[ControllerBridge] Stdin pipe cerrado/error: ${err.message}`);
        });
      }

      this.workerProcess.stdout.on('data', (data) => {
        const text = data.toString().trim();
        if (text.includes('SHUBA_CONTROLLER_READY')) {
          logger.info('🎮 [ControllerBridge] ✅ Puente nativo Win32 activo y listo para Minecraft (60Hz SendInput/XInput).');
          this.emit('ready');
        }
      });

      this.workerProcess.stderr.on('data', (data) => {
        const errText = data.toString().trim();
        if (errText && !errText.includes('SilentlyContinue')) {
          logger.debug(`[ControllerBridge Worker stderr]: ${errText}`);
        }
      });

      this.workerProcess.on('exit', (code) => {
        logger.info(`[ControllerBridge] Worker finalizado con código: ${code}`);
        this.isRunning = false;
        this.workerProcess = null;
        this.emit('stopped');
      });

      this.workerProcess.on('error', (err) => {
        logger.error(`[ControllerBridge] Error en proceso worker: ${err.message}`);
        this.stop();
      });

      return true;
    } catch (err) {
      logger.error(`[ControllerBridge] Fallo al iniciar puente de mando: ${err.message}`);
      this.isRunning = false;
      this.workerProcess = null;
      return false;
    }
  }

  /**
   * Actualiza la configuración del mapeo o el PID objetivo en el worker activo
   */
  updateInstance(instanceDir, targetPid = 0) {
    this.currentInstanceDir = instanceDir;
    if (targetPid) this.currentPid = targetPid;

    if (!this.isRunning || !this.workerProcess || this.workerProcess.killed || !this.workerProcess.stdin || !this.workerProcess.stdin.writable) {
      return false;
    }

    try {
      const mapMgr = getControllerMapManager();
      const map = mapMgr.getMapping(instanceDir);
      const configPayload = JSON.stringify({
        deadzone: map.deadzone || 0.15,
        sensitivityX: map.sensitivityX || 2.5,
        sensitivityY: map.sensitivityY || 2.5,
        invertY: !!map.invertY,
        targetPid: this.currentPid,
        buttons: map.buttons || {}
      });

      this.workerProcess.stdin.write(`CONFIG:${configPayload}\n`, () => {});
      return true;
    } catch (err) {
      logger.warn(`[ControllerBridge] Error al actualizar configuración: ${err.message}`);
      return false;
    }
  }

  /**
   * Envía un cuadro de entrada proveniente de Gamepad API (para mandos PS4/PS5/Switch)
   */
  sendGamepadFrame(frameData) {
    if (!this.isRunning || !this.workerProcess || this.workerProcess.killed || !this.workerProcess.stdin || !this.workerProcess.stdin.writable) {
      return false;
    }

    try {
      const line = `FRAME:${JSON.stringify(frameData)}\n`;
      return this.workerProcess.stdin.write(line, () => {});
    } catch (_) {
      return false;
    }
  }

  /**
   * Detiene el puente nativo y libera recursos
   */
  stop() {
    if (!this.isRunning && !this.workerProcess) return;

    logger.info('[ControllerBridge] Deteniendo puente nativo Win32...');
    try {
      if (this.workerProcess && !this.workerProcess.killed && this.workerProcess.stdin && this.workerProcess.stdin.writable) {
        this.workerProcess.stdin.write("EXIT\n", () => {});
      }
    } catch (_) {}

    const proc = this.workerProcess;
    setTimeout(() => {
      try {
        if (proc && !proc.killed) {
          proc.kill();
        }
      } catch (_) {}
    }, 300);

    this.isRunning = false;
    this.workerProcess = null;
    this.emit('stopped');
  }
}

let controllerBridgeInstance = null;
function getControllerBridge() {
  if (!controllerBridgeInstance) {
    controllerBridgeInstance = new ControllerBridge();
  }
  return controllerBridgeInstance;
}

module.exports = {
  ControllerBridge,
  getControllerBridge
};
