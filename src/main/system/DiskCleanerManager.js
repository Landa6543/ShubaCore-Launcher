/**
 * ShubaCore - Smart Garbage & Cache Cleaner Manager (v1.1.0)
 * Developed by SHUBATECH
 *
 * Scans and cleans safe temporary files:
 * - <instanceDir>/logs/*.log.gz (compressed old Minecraft logs)
 * - <instanceDir>/crash-reports/* (old crash logs)
 * - <instanceDir>/.cache/ (temporary build/runtime caches)
 * - <userData>/cache/ (launcher temporary downloaded assets)
 *
 * STRICT SAFETY RULE:
 * Absolutely NEVER touches:
 * - saves/ (worlds)
 * - mods/ (game modifications)
 * - screenshots/ (user captures)
 * - clips/ (video replays)
 * - resourcepacks/ / shaderpacks/
 * - options.txt / config files
 */

const fs = require('fs');
const path = require('path');
const { defaultLogger: logger } = require('../utils/logger');
const { getProfileManager } = require('../profiles/ProfileManager');
const { getConfigManager } = require('../config/ConfigManager');

class DiskCleanerManager {
  constructor() {
    this.profileManager = getProfileManager();
    this.configManager = getConfigManager();
  }

  /**
   * Obtiene la lista de directorios a analizar
   * @param {string} [specificInstanceDir] - Ruta opcional de una instancia específica
   */
  _getTargetDirectories(specificInstanceDir) {
    const list = [];
    if (specificInstanceDir && typeof specificInstanceDir === 'string') {
      list.push({ type: 'instance', name: path.basename(specificInstanceDir), path: specificInstanceDir });
      return list;
    }

    try {
      const all = typeof this.profileManager.getAll === 'function' ? this.profileManager.getAll() : null;
      const profiles = (all && Array.isArray(all.profiles))
        ? all.profiles
        : (typeof this.profileManager.getAllProfiles === 'function' ? this.profileManager.getAllProfiles() : []);

      for (const p of profiles) {
        const instDir = p.instancePath || p.gameDirectory || (p.id ? this.profileManager.getInstancePath(p.id) : null);
        if (instDir && fs.existsSync(instDir)) {
          list.push({ type: 'instance', name: p.name || path.basename(instDir), path: instDir });
        }
      }
    } catch (err) {
      logger.warn('[DiskCleaner] Error al enumerar perfiles:', err.message);
    }

    // Carpeta global de datos de ShubaCore
    try {
      const sharedRoot = this.configManager.get('launcher.gameDirectory', path.join(process.env.APPDATA || '', '.shubacore'));
      if (fs.existsSync(sharedRoot)) {
        list.push({ type: 'shared', name: 'ShubaCore Global', path: sharedRoot });
      }
    } catch (_) {}

    return list;
  }

  /**
   * Escanea archivos basura seguros sin eliminarlos
   * @param {string} [instanceDir]
   * @returns {Object}
   */
  scan(instanceDir = null) {
    const targets = this._getTargetDirectories(instanceDir);
    const filesToClean = [];
    let totalBytes = 0;

    for (const target of targets) {
      const tPath = target.path;

      // 1. Logs comprimidos: <target>/logs/*.log.gz
      const logsDir = path.join(tPath, 'logs');
      if (fs.existsSync(logsDir)) {
        try {
          const files = fs.readdirSync(logsDir);
          for (const f of files) {
            if (f.endsWith('.log.gz')) {
              const fullPath = path.join(logsDir, f);
              try {
                const stat = fs.statSync(fullPath);
                totalBytes += stat.size;
                filesToClean.push({
                  path: fullPath,
                  category: 'Logs Comprimidos (.log.gz)',
                  size: stat.size,
                  instance: target.name
                });
              } catch (_) {}
            }
          }
        } catch (_) {}
      }

      // 2. Crash reports antiguos: <target>/crash-reports/*
      const crashDir = path.join(tPath, 'crash-reports');
      if (fs.existsSync(crashDir)) {
        try {
          const files = fs.readdirSync(crashDir);
          for (const f of files) {
            const fullPath = path.join(crashDir, f);
            try {
              const stat = fs.statSync(fullPath);
              if (stat.isFile()) {
                totalBytes += stat.size;
                filesToClean.push({
                  path: fullPath,
                  category: 'Crash Reports Antiguos',
                  size: stat.size,
                  instance: target.name
                });
              }
            } catch (_) {}
          }
        } catch (_) {}
      }

      // 3. Caché temporal de modloaders o herramientas: <target>/.cache/
      const cacheDir = path.join(tPath, '.cache');
      if (fs.existsSync(cacheDir)) {
        this._scanDirRecursive(cacheDir, filesToClean, 'Caché Temporal (.cache)', target.name, (b) => { totalBytes += b; });
      }
    }

    // 4. Caché de la aplicación ShubaCore: <userData>/cache/
    try {
      const appData = path.join(process.env.APPDATA || '', '.shubacore', 'cache');
      if (fs.existsSync(appData)) {
        this._scanDirRecursive(appData, filesToClean, 'Caché Global de Descargas', 'ShubaCore', (b) => { totalBytes += b; });
      }
    } catch (_) {}

    return {
      success: true,
      totalFiles: filesToClean.length,
      totalBytes,
      totalFormatted: this._formatBytes(totalBytes),
      items: filesToClean
    };
  }

  /**
   * Elimina de forma segura los archivos basura identificados
   * @param {string} [instanceDir]
   * @returns {Object}
   */
  clean(instanceDir = null) {
    const scanResult = this.scan(instanceDir);
    let freedBytes = 0;
    let deletedFiles = 0;
    const errors = [];

    for (const item of scanResult.items) {
      try {
        if (fs.existsSync(item.path)) {
          fs.unlinkSync(item.path);
          freedBytes += item.size;
          deletedFiles++;
        }
      } catch (err) {
        errors.push({ path: item.path, error: err.message });
      }
    }

    // Intentar limpiar carpetas .cache vacías
    const targets = this._getTargetDirectories(instanceDir);
    for (const target of targets) {
      const cacheDir = path.join(target.path, '.cache');
      this._removeEmptyDirRecursive(cacheDir);
    }

    logger.info(`[DiskCleaner] Limpieza completada: ${deletedFiles} archivos eliminados, ${this._formatBytes(freedBytes)} liberados.`);

    return {
      success: true,
      cleanedFiles: deletedFiles,
      freedBytes,
      freedFormatted: this._formatBytes(freedBytes),
      errors
    };
  }

  _scanDirRecursive(dirPath, list, category, instanceName, byteCounter) {
    if (!fs.existsSync(dirPath)) return;
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const ent of entries) {
        const full = path.join(dirPath, ent.name);
        if (ent.isDirectory()) {
          this._scanDirRecursive(full, list, category, instanceName, byteCounter);
        } else if (ent.isFile()) {
          try {
            const stat = fs.statSync(full);
            byteCounter(stat.size);
            list.push({
              path: full,
              category,
              size: stat.size,
              instance: instanceName
            });
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  _removeEmptyDirRecursive(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    try {
      const entries = fs.readdirSync(dirPath);
      for (const e of entries) {
        const p = path.join(dirPath, e);
        if (fs.statSync(p).isDirectory()) {
          this._removeEmptyDirRecursive(p);
        }
      }
      if (fs.readdirSync(dirPath).length === 0) {
        fs.rmdirSync(dirPath);
      }
    } catch (_) {}
  }

  _formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 MB';
    if (bytes >= 1073741824) {
      return `${(bytes / 1073741824).toFixed(2)} GB`;
    }
    if (bytes >= 1048576) {
      return `${(bytes / 1048576).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  }
}

let cleanerInstance = null;
function getDiskCleanerManager() {
  if (!cleanerInstance) {
    cleanerInstance = new DiskCleanerManager();
  }
  return cleanerInstance;
}

module.exports = {
  DiskCleanerManager,
  getDiskCleanerManager
};
