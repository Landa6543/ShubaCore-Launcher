/**
 * ShubaCore - Screenshots Gallery Manager (Bloque 5 v1.1.0)
 * Developed by SHUBATECH
 *
 * Scans, copies to clipboard, opens and deletes screenshots (.png)
 * across all game instances and standard .minecraft directories.
 */

const fs = require('fs');
const path = require('path');
const { clipboard, nativeImage, shell } = require('electron');
const { defaultLogger: logger } = require('../utils/logger');
const { getProfileManager } = require('../profiles/ProfileManager');

class ScreenshotsManager {
  constructor() {
    this.profileManager = getProfileManager();
  }

  /**
   * Obtiene la lista de directorios de capturas conocidos
   */
  _getScreenshotDirectories() {
    const dirs = [];
    try {
      const all = typeof this.profileManager.getAll === 'function' ? this.profileManager.getAll() : null;
      const profiles = (all && Array.isArray(all.profiles))
        ? all.profiles
        : (typeof this.profileManager.getAllProfiles === 'function' ? this.profileManager.getAllProfiles() : []);

      for (const p of profiles) {
        const instDir = p.instancePath || p.gameDirectory || (p.id ? this.profileManager.getInstancePath(p.id) : null);
        if (instDir) {
          const scDir = path.join(instDir, 'screenshots');
          dirs.push({
            instanceId: p.id,
            instanceName: p.name || 'Instancia',
            dirPath: scDir
          });
        }
      }
    } catch (err) {
      logger.warn('[Screenshots] Error al obtener perfiles:', err.message);
    }

    // Agregar directorio por defecto de ShubaCore / .minecraft si existe
    try {
      const defaultDataDir = typeof this.profileManager.getDataDirectory === 'function'
        ? this.profileManager.getDataDirectory()
        : (this.profileManager.sharedRoot || path.join(process.env.APPDATA || '', '.shubacore'));
      const defaultSc = path.join(defaultDataDir, 'screenshots');
      if (!dirs.some((d) => d.dirPath === defaultSc)) {
        dirs.push({
          instanceId: 'default',
          instanceName: 'Instancia Principal',
          dirPath: defaultSc
        });
      }
    } catch (_) {}

    return dirs;
  }

  /**
   * Lista todas las capturas de pantalla encontradas
   *
   * @param {Object} options
   * @param {string} [options.instanceId] - 'all' o ID específico de perfil
   * @returns {Array<Object>}
   */
  listScreenshots(options = {}) {
    const filterId = options.instanceId || 'all';
    const targetDirs = this._getScreenshotDirectories();
    const results = [];

    for (const item of targetDirs) {
      if (filterId !== 'all' && item.instanceId !== filterId) {
        continue;
      }

      if (!fs.existsSync(item.dirPath)) continue;

      try {
        const files = fs.readdirSync(item.dirPath);
        for (const file of files) {
          if (!file.toLowerCase().endsWith('.png')) continue;

          const fullPath = path.join(item.dirPath, file);
          try {
            const stats = fs.statSync(fullPath);
            const sizeFormatted = stats.size > 1048576
              ? `${(stats.size / (1024 * 1024)).toFixed(2)} MB`
              : `${Math.round(stats.size / 1024)} KB`;

            // Formatear fecha
            const d = new Date(stats.mtime);
            const dateFormatted = d.toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            // Normalizar ruta para file:///
            const normalizedPath = fullPath.replace(/\\/g, '/');
            const fileUrl = `file:///${normalizedPath}`;

            results.push({
              id: `${item.instanceId}_${file}`,
              fileName: file,
              filePath: fullPath,
              fileUrl,
              sizeBytes: stats.size,
              sizeFormatted,
              dateFormatted,
              timestamp: stats.mtimeMs,
              instanceId: item.instanceId,
              instanceName: item.instanceName
            });
          } catch (_) {}
        }
      } catch (readErr) {
        logger.warn(`[Screenshots] No se pudo leer ${item.dirPath}:`, readErr.message);
      }
    }

    // Ordenar de más reciente a más antigua
    results.sort((a, b) => b.timestamp - a.timestamp);
    return results;
  }

  /**
   * Copia la imagen directamente al portapapeles de Windows (para pegar con Ctrl+V en Discord)
   */
  copyToClipboard(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error('El archivo de captura no existe en el disco.');
    }

    try {
      const img = nativeImage.createFromPath(filePath);
      if (img.isEmpty()) {
        throw new Error('No se pudo decodificar la imagen PNG para el portapapeles.');
      }
      clipboard.writeImage(img);
      logger.info(`[Screenshots] Captura copiada al portapapeles: ${filePath}`);
      return { success: true };
    } catch (err) {
      logger.error(`[Screenshots] Error al copiar captura al portapapeles: ${err.message}`);
      throw err;
    }
  }

  /**
   * Abre el archivo resaltado en el Explorador de Windows
   */
  showInFolder(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error('El archivo no existe.');
    }
    shell.showItemInFolder(filePath);
    return { success: true };
  }

  /**
   * Elimina un archivo de captura
   */
  deleteScreenshot(filePath) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`[Screenshots] Captura eliminada: ${filePath}`);
      return { success: true };
    }
    return { success: false, message: 'El archivo ya no existía.' };
  }

  /**
   * Abre la carpeta de capturas de una instancia
   */
  openFolder(instanceId) {
    const targetDirs = this._getScreenshotDirectories();
    const found = targetDirs.find((d) => d.instanceId === instanceId) || targetDirs[0];
    if (found) {
      if (!fs.existsSync(found.dirPath)) {
        fs.mkdirSync(found.dirPath, { recursive: true });
      }
      shell.openPath(found.dirPath);
      return { success: true, path: found.dirPath };
    }
    return { success: false };
  }
}

let screenshotsManagerInstance = null;
function getScreenshotsManager() {
  if (!screenshotsManagerInstance) {
    screenshotsManagerInstance = new ScreenshotsManager();
  }
  return screenshotsManagerInstance;
}

module.exports = {
  ScreenshotsManager,
  getScreenshotsManager
};
