/**
 * ShubaCore - Screenshots & Video Clips Gallery Manager (Bloque 5 v1.1.0)
 * Developed by SHUBATECH
 *
 * Scans, copies to clipboard, opens and deletes:
 * - Screenshots (.png, .jpg) in <instanceDir>/screenshots
 * - Video Clips (.mp4, .webm) in <instanceDir>/clips (Replay de 30s con atajo F9)
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
   * Obtiene la lista de directorios de capturas conocidos (screenshots y clips)
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
          const clipDir = path.join(instDir, 'clips');
          dirs.push({
            instanceId: p.id,
            instanceName: p.name || 'Instancia',
            dirPath: scDir,
            clipsPath: clipDir,
            instancePath: instDir
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
      const defaultClips = path.join(defaultDataDir, 'clips');
      if (!dirs.some((d) => d.dirPath === defaultSc)) {
        dirs.push({
          instanceId: 'default',
          instanceName: 'Instancia Principal',
          dirPath: defaultSc,
          clipsPath: defaultClips,
          instancePath: defaultDataDir
        });
      }
    } catch (_) {}

    return dirs;
  }

  /**
   * Lista todas las capturas de pantalla y clips de video encontrados
   *
   * @param {Object} options
   * @param {string} [options.instanceId] - 'all' o ID específico de perfil
   * @param {string} [options.mediaType] - 'all', 'photos' o 'clips'
   * @returns {Array<Object>}
   */
  listScreenshots(options = {}) {
    const filterId = options.instanceId || 'all';
    const mediaType = options.mediaType || 'all'; // 'all', 'photos', 'clips'
    const targetDirs = this._getScreenshotDirectories();

    if (options.instancePath && fs.existsSync(options.instancePath)) {
      targetDirs.push({
        instanceId: 'custom',
        instanceName: path.basename(options.instancePath),
        dirPath: path.join(options.instancePath, 'screenshots'),
        clipsPath: path.join(options.instancePath, 'clips'),
        instancePath: options.instancePath
      });
    }

    const results = [];

    for (const item of targetDirs) {
      if (filterId !== 'all' && item.instanceId !== filterId) {
        continue;
      }

      // 1. Fotos (Screenshots): <instanceDir>/screenshots
      if (mediaType === 'all' || mediaType === 'photos') {
        if (fs.existsSync(item.dirPath)) {
          try {
            const files = fs.readdirSync(item.dirPath);
            for (const file of files) {
              const lower = file.toLowerCase();
              if (!lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.endsWith('.jpeg')) continue;

              const fullPath = path.join(item.dirPath, file);
              try {
                const stats = fs.statSync(fullPath);
                results.push(this._buildMediaItem(file, fullPath, stats, 'screenshot', item));
              } catch (_) {}
            }
          } catch (readErr) {
            logger.warn(`[Screenshots] No se pudo leer ${item.dirPath}:`, readErr.message);
          }
        }
      }

      // 2. Video Clips: <instanceDir>/clips
      if (mediaType === 'all' || mediaType === 'clips') {
        if (fs.existsSync(item.clipsPath)) {
          try {
            const files = fs.readdirSync(item.clipsPath);
            for (const file of files) {
              const lower = file.toLowerCase();
              if (!lower.endsWith('.mp4') && !lower.endsWith('.webm') && !lower.endsWith('.mkv')) continue;

              const fullPath = path.join(item.clipsPath, file);
              try {
                const stats = fs.statSync(fullPath);
                results.push(this._buildMediaItem(file, fullPath, stats, 'clip', item));
              } catch (_) {}
            }
          } catch (readErr) {
            logger.warn(`[Screenshots] No se pudo leer ${item.clipsPath}:`, readErr.message);
          }
        }
      }
    }

    // Ordenar de más reciente a más antiguo
    results.sort((a, b) => b.timestamp - a.timestamp);
    return results;
  }

  _buildMediaItem(fileName, fullPath, stats, mediaType, item) {
    const sizeFormatted = stats.size > 1048576
      ? `${(stats.size / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.round(stats.size / 1024)} KB`;

    const d = new Date(stats.mtime);
    const dateFormatted = d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const normalizedPath = fullPath.replace(/\\/g, '/');
    const fileUrl = `file:///${normalizedPath}`;

    return {
      id: `${item.instanceId}_${fileName}`,
      type: mediaType, // 'screenshot' | 'clip'
      fileName,
      filePath: fullPath,
      fileUrl,
      sizeBytes: stats.size,
      sizeFormatted,
      dateFormatted,
      timestamp: stats.mtimeMs,
      instanceId: item.instanceId,
      instanceName: item.instanceName
    };
  }

  /**
   * Guarda un búfer de video replay grabado en <instanceDir>/clips/
   * @param {string} instancePathOrId
   * @param {Buffer|Uint8Array} videoBuffer
   * @param {string} [extension='webm']
   */
  saveClip(instancePathOrId, videoBuffer, extension = 'webm') {
    let targetDir = null;
    if (instancePathOrId && fs.existsSync(instancePathOrId)) {
      targetDir = path.join(instancePathOrId, 'clips');
    } else {
      const dirs = this._getScreenshotDirectories();
      const found = dirs.find((d) => d.instanceId === instancePathOrId) || dirs[0];
      targetDir = found ? found.clipsPath : path.join(process.env.APPDATA || '', '.shubacore', 'clips');
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const cleanExt = extension.replace(/^\./, '') || 'webm';
    const fileName = `Clip-${timeStr}.${cleanExt}`;
    const filePath = path.join(targetDir, fileName);

    fs.writeFileSync(filePath, Buffer.from(videoBuffer));
    logger.info(`[Screenshots] ✅ Clip de video guardado exitosamente: ${filePath} (${videoBuffer.length || videoBuffer.byteLength} bytes)`);

    const normalizedPath = filePath.replace(/\\/g, '/');
    return {
      success: true,
      filePath,
      fileName,
      fileUrl: `file:///${normalizedPath}`,
      sizeBytes: videoBuffer.length || videoBuffer.byteLength
    };
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
   * Elimina un archivo de captura o clip de video
   */
  deleteScreenshot(filePath) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`[Screenshots] Archivo multimedia eliminado: ${filePath}`);
      return { success: true };
    }
    return { success: false, message: 'El archivo ya no existía.' };
  }

  /**
   * Abre la carpeta de capturas o clips de una instancia
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
