/**
 * ShubaCore - ConfigManager
 * Developed by SHUBATECH
 * Handles persistent configuration in config.json
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { defaultLogger: logger } = require('../utils/logger');

class ConfigManager {
  constructor(customConfigDir = null) {
    this.configDir = customConfigDir || (app ? app.getPath('userData') : path.join(process.cwd(), '.shubacore-data'));
    this.configPath = path.join(this.configDir, 'config.json');
    this.defaultInstancePath = path.join(
      process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library/Application Support') : path.join(process.env.HOME, '.local/share')),
      '.shubacore'
    );

    this.defaultConfig = {
      app: {
        version: '1.0.0',
        brand: 'SHUBATECH',
        product: 'ShubaCore'
      },
      auth: {
        mode: 'offline', // 'offline' | 'premium'
        currentUser: null, // { name, uuid, type, skinUrl, mclcAuth, msmcToken }
        savedAccounts: []
      },
      memory: {
        min: '2G',
        max: '6G'
      },
      performance: {
        launchBehavior: 'hide', // 'hide' (por defecto: ocultar y reaparecer) | 'keep' (mantener abierto) | 'close' (cerrar)
        closeOnLaunch: false, // Compatibilidad hacia atrás
        autoDetectJava: true,
        javaPath: '', // Vacío para autodetección
        customJvmArgs: ''
      },
      game: {
        version: '1.21.1', // 1.21.1 por defecto
        loader: 'neoforge', // 'neoforge' por defecto
        loaderVersion: ''
      },
      instance: {
        path: this.defaultInstancePath,
        curseForgeApiKey: ''
      }
    };

    this.config = { ...this.defaultConfig };
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }

      const settingsPath = path.join(this.configDir, 'settings.json');
      const targetPath = fs.existsSync(this.configPath) ? this.configPath : (fs.existsSync(settingsPath) ? settingsPath : null);

      if (targetPath) {
        const raw = fs.readFileSync(targetPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.config = this._deepMerge(this.defaultConfig, parsed);
        logger.info(`Configuración cargada exitosamente desde: ${targetPath}`);
      } else {
        logger.info(`No se encontró config.json existente. Creando configuración por defecto en: ${this.configPath}`);
        this.save();
      }
    } catch (err) {
      logger.error('Error al inicializar la configuración. Restaurando valores por defecto:', err);
      this.config = { ...this.defaultConfig };
      this.save();
    }
  }

  _deepMerge(target, source) {
    const output = { ...target };
    if (this._isObject(target) && this._isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this._isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this._deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  _isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  get(keyPath, defaultValue = null) {
    if (!keyPath) return this.config;
    if (keyPath === 'launchBehavior') {
      keyPath = 'performance.launchBehavior';
    }

    const parts = keyPath.split('.');
    let current = this.config;

    for (const part of parts) {
      if (current === undefined || current === null) return defaultValue;
      current = current[part];
    }

    if (keyPath === 'performance.launchBehavior' && (current === undefined || current === null)) {
      const oldClose = this.config?.performance?.closeOnLaunch;
      if (oldClose === true) return 'close';
      if (oldClose === false) return 'hide';
      return defaultValue || 'hide';
    }

    return current !== undefined ? current : defaultValue;
  }

  set(keyPath, value) {
    if (keyPath === 'launchBehavior' || keyPath === 'performance.launchBehavior') {
      keyPath = 'performance.launchBehavior';
      this.config.performance.closeOnLaunch = (value === 'close');
    }

    const parts = keyPath.split('.');
    let current = this.config;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
    return this.save();
  }

  update(partialConfig) {
    this.config = this._deepMerge(this.config, partialConfig);
    return this.save();
  }

  getAll() {
    return JSON.parse(JSON.stringify(this.config));
  }

  save() {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }

      const tempPath = `${this.configPath}.tmp`;
      const serialized = JSON.stringify(this.config, null, 2);
      fs.writeFileSync(tempPath, serialized, 'utf8');
      fs.renameSync(tempPath, this.configPath);

      // Sincronizar simultáneamente con settings.json en <userData>
      try {
        const settingsPath = path.join(this.configDir, 'settings.json');
        fs.writeFileSync(settingsPath, serialized, 'utf8');
      } catch (_) {}

      return true;
    } catch (err) {
      logger.error('Error al guardar config.json:', err);
      return false;
    }
  }

  getInstanceDirectory() {
    const instancePath = this.get('instance.path', this.defaultInstancePath);
    if (!fs.existsSync(instancePath)) {
      fs.mkdirSync(instancePath, { recursive: true });
    }
    return instancePath;
  }

  getRootPath() {
    return this.configDir;
  }
}

// Singleton instance
let instance = null;

function getConfigManager(customDir = null) {
  if (!instance || customDir) {
    instance = new ConfigManager(customDir);
  }
  return instance;
}

module.exports = { ConfigManager, getConfigManager };
