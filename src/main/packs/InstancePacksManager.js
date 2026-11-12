/**
 * ShubaCore - Instance Packs Manager (Shaders & Resource Packs)
 * Developed by SHUBATECH
 * Manages installed shaders in /shaderpacks and resource packs in /resourcepacks
 * Extracts pack.mcmeta and pack.png internal icons and descriptions
 */

const fs = require('fs');
const path = require('path');
const { shell } = require('electron');
const AdmZip = require('adm-zip');
const { getProfileManager } = require('../profiles/ProfileManager');
const { defaultLogger: logger } = require('../utils/logger');

class InstancePacksManager {
  constructor() {
    this.profileManager = getProfileManager();
  }

  _getTargetDir(instancePath, type) {
    const inst = instancePath || this.profileManager.getActiveInstancePath();
    const folder = type === 'shaders' ? 'shaderpacks' : 'resourcepacks';
    const targetDir = path.join(inst, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    return targetDir;
  }

  _normalizeDescription(desc) {
    if (!desc) return '';
    if (typeof desc === 'string') return desc.replace(/§[0-9a-fk-or]/gi, '').trim();
    if (Array.isArray(desc)) {
      return desc
        .map((part) => (typeof part === 'string' ? part : part?.text || ''))
        .join('')
        .replace(/§[0-9a-fk-or]/gi, '')
        .trim();
    }
    if (typeof desc === 'object') {
      let str = desc.text || '';
      if (Array.isArray(desc.extra)) {
        str += desc.extra.map((p) => (typeof p === 'string' ? p : p?.text || '')).join('');
      }
      return str.replace(/§[0-9a-fk-or]/gi, '').trim();
    }
    return String(desc);
  }

  /**
   * Lista todos los shaders o resource packs instalados en la instancia
   * @param {string} instancePath
   * @param {'shaders'|'resourcepacks'} type
   */
  async listPacks(instancePath, type = 'resourcepacks') {
    const targetDir = this._getTargetDir(instancePath, type);
    if (!fs.existsSync(targetDir)) return [];

    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    const packs = [];

    for (const ent of entries) {
      const fullPath = path.join(targetDir, ent.name);
      const isZip = ent.isFile() && ent.name.toLowerCase().endsWith('.zip');
      const isDir = ent.isDirectory();

      if (!isZip && !isDir) continue;

      // PROHIBIDO y AUTO-PURGA: ShubaSkinOverride y ShubaCoreSplash nunca deben listarse ni existir
      if (
        ent.name.includes('ShubaSkinOverride') ||
        ent.name.includes('ShubaCoreSplash')
      ) {
        try {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } catch (_) {}
        continue;
      }

      let name = ent.name.replace(/\.zip$/i, '');
      let description = type === 'shaders' ? 'Paquete de shaders para Minecraft' : 'Paquete de recursos y texturas';
      let icon = null;
      let packFormat = null;
      let sizeBytes = 0;
      let modifiedAt = new Date().toISOString();

      try {
        const stat = fs.statSync(fullPath);
        sizeBytes = stat.size;
        modifiedAt = stat.mtime.toISOString();

        if (isZip) {
          try {
            const zip = new AdmZip(fullPath);
            const mcmetaEntry = zip.getEntry('pack.mcmeta');
            if (mcmetaEntry) {
              const mcmetaContent = mcmetaEntry.getData().toString('utf8');
              const parsed = JSON.parse(mcmetaContent);
              if (parsed && parsed.pack) {
                if (parsed.pack.description) {
                  description = this._normalizeDescription(parsed.pack.description);
                }
                if (parsed.pack.pack_format) {
                  packFormat = parsed.pack.pack_format;
                }
              }
            }

            const iconEntry = zip.getEntry('pack.png');
            if (iconEntry) {
              const iconBuf = iconEntry.getData();
              icon = `data:image/png;base64,${iconBuf.toString('base64')}`;
            }
          } catch (zipErr) {
            logger.debug(`[Packs] No se pudo leer metadata zip de ${ent.name}: ${zipErr.message}`);
          }
        } else if (isDir) {
          const mcmetaPath = path.join(fullPath, 'pack.mcmeta');
          if (fs.existsSync(mcmetaPath)) {
            try {
              const parsed = JSON.parse(fs.readFileSync(mcmetaPath, 'utf8'));
              if (parsed && parsed.pack) {
                if (parsed.pack.description) {
                  description = this._normalizeDescription(parsed.pack.description);
                }
                if (parsed.pack.pack_format) {
                  packFormat = parsed.pack.pack_format;
                }
              }
            } catch (_) {}
          }

          const iconPath = path.join(fullPath, 'pack.png');
          if (fs.existsSync(iconPath)) {
            try {
              const iconBuf = fs.readFileSync(iconPath);
              icon = `data:image/png;base64,${iconBuf.toString('base64')}`;
            } catch (_) {}
          }
        }
      } catch (err) {
        logger.warn(`[Packs] Error al procesar ${ent.name}: ${err.message}`);
      }

      packs.push({
        fileName: ent.name,
        name,
        description,
        icon,
        packFormat,
        sizeBytes,
        formattedSize: this._formatSize(sizeBytes),
        modifiedAt,
        isZip,
        type
      });
    }

    // Ordenar alfabéticamente
    packs.sort((a, b) => a.name.localeCompare(b.name));
    return packs;
  }

  _formatSize(bytes) {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    return Math.round(bytes / 1024) + ' KB';
  }

  /**
   * Elimina un shader o resource pack
   */
  async deletePack(instancePath, type, fileName) {
    if (!fileName) throw new Error('Falta el nombre de archivo a eliminar.');
    const targetDir = this._getTargetDir(instancePath, type);
    const targetFile = path.join(targetDir, fileName);

    if (!fs.existsSync(targetFile)) {
      throw new Error(`El archivo ${fileName} no existe en ${type}.`);
    }

    const stat = fs.statSync(targetFile);
    if (stat.isDirectory()) {
      fs.rmSync(targetFile, { recursive: true, force: true });
    } else {
      fs.unlinkSync(targetFile);
    }

    logger.info(`[Packs] Eliminado ${type}: ${fileName}`);
    return { success: true, fileName };
  }

  /**
   * Abre la carpeta de shaders o resource packs en el explorador
   */
  async openPacksFolder(instancePath, type) {
    const targetDir = this._getTargetDir(instancePath, type);
    await shell.openPath(targetDir);
    return { success: true, path: targetDir };
  }
}

let instance = null;
function getInstancePacksManager() {
  if (!instance) {
    instance = new InstancePacksManager();
  }
  return instance;
}

module.exports = {
  InstancePacksManager,
  getInstancePacksManager
};
