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
    this._memCache = new Map();
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

  _getCacheFilePath(instancePath, type) {
    const inst = instancePath || this.profileManager.getActiveInstancePath();
    return path.join(inst, `.shubacore-${type}-cache.json`);
  }

  _readDiskCache(instancePath, type) {
    const p = this._getCacheFilePath(instancePath, type);
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch (_) {}
    }
    return {};
  }

  _writeDiskCache(instancePath, type, cacheObj) {
    const p = this._getCacheFilePath(instancePath, type);
    try {
      fs.writeFileSync(p, JSON.stringify(cacheObj, null, 2), 'utf8');
    } catch (_) {}
  }

  async _resolveShaderMeta(fileName, cleanName) {
    const lower = (fileName + ' ' + cleanName).toLowerCase().replace(/[^a-z0-9]/g, '');
    const KNOWN_SHADERS = [
      { key: 'complementaryreimagined', icon: 'https://cdn.modrinth.com/data/HVnmMxH1/79cb7c8123bbc54945305b2ebad6b8881efdf5f8_96.webp', desc: 'Complementary Reimagined: iluminación visual excepcional y compatibilidad máxima.' },
      { key: 'complementaryunbound', icon: 'https://cdn.modrinth.com/data/R2RDe3lN/67bcad4481b47372aa4356403063f9ebba06db8e_96.webp', desc: 'Complementary Unbound: estilo fotorrealista de alto impacto visual.' },
      { key: 'complementary', icon: 'https://cdn.modrinth.com/data/HVnmMxH1/79cb7c8123bbc54945305b2ebad6b8881efdf5f8_96.webp', desc: 'Complementary Shaders: el estándar de shaders de Minecraft.' },
      { key: 'bsl', icon: 'https://cdn.modrinth.com/data/Q1efCgrk/icon.png', desc: 'BSL Shaders: iluminación cálida, cielos dinámicos y sombras suaves.' },
      { key: 'rethinkingvoxels', icon: 'https://cdn.modrinth.com/data/1K594osW/icon.png', desc: 'Rethinking Voxels: sombras volumétricas y trazado de rayos por vóxeles.' },
      { key: 'solas', icon: 'https://cdn.modrinth.com/data/pbbqU9q2/icon.png', desc: 'Solas Shader: efectos atmosféricos y auroras boreales fantásticas.' },
      { key: 'makeup', icon: 'https://cdn.modrinth.com/data/01TVIZfQ/icon.png', desc: 'MakeUp Ultra Fast: ultra ligero para maximizar FPS en cualquier GPU.' },
      { key: 'photon', icon: 'https://cdn.modrinth.com/data/mU5dZ1yY/icon.png', desc: 'Photon Shader: simulación óptica y física de luz realista.' },
      { key: 'sildur', icon: 'https://cdn.modrinth.com/data/dGk9rL3Y/icon.png', desc: 'Sildurs Vibrant Shaders: colores vivos, reflejos de agua e iluminación radiante.' },
      { key: 'pastel', icon: 'https://cdn.modrinth.com/data/qVqGZ8oA/icon.png', desc: 'Pastel Shaders: estética suave y artística tipo acuarela.' },
      { key: 'spooklementary', icon: 'https://cdn.modrinth.com/data/kQnIe53c/icon.png', desc: 'Spooklementary: atmósfera tétrica y niebla densa para terror.' },
      { key: 'superduper', icon: 'https://cdn.modrinth.com/data/2X5kXoYn/icon.png', desc: 'Super Duper Vanilla: recreación del estilo oficial cancelado de Mojang.' },
      { key: 'aura', icon: 'https://cdn.modrinth.com/data/j1fF8P7b/icon.png', desc: 'Aura Shaders: estética cinematográfica con rendimiento optimizado.' },
      { key: 'insanity', icon: 'https://cdn.modrinth.com/data/9Z2gB4G9/icon.png', desc: 'Insanity Shader: estilo sombrío y apocalíptico de alto contraste.' },
      { key: 'kappa', icon: 'https://cdn.modrinth.com/data/X5xQfF2w/icon.png', desc: 'Kappa Shader: simulación física atmosférica realista.' },
      { key: 'bliss', icon: 'https://cdn.modrinth.com/data/7jLq0t8u/icon.png', desc: 'Bliss Shader: nubes dinámicas, niebla volumétrica y gran detalle.' },
      { key: 'noble', icon: 'https://cdn.modrinth.com/data/0RkWc6xY/icon.png', desc: 'Noble Shaders: excelente iluminación y balance de rendimiento.' }
    ];

    const match = KNOWN_SHADERS.find((s) => lower.includes(s.key));
    if (match) {
      return { icon: match.icon, description: match.desc };
    }

    const defaultShaderIcon = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#06b6d4"/><stop offset="100%" stop-color="#10b981"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#g)"/><circle cx="32" cy="24" r="10" fill="#ffffff" opacity="0.95"/><path d="M12 52 L26 34 L36 44 L44 32 L56 52 Z" fill="#0f172a" opacity="0.85"/></svg>', 'utf8').toString('base64');

    try {
      const q = cleanName.replace(/[-_v0-9.]/g, ' ').trim();
      if (q.length > 2) {
        const res = await fetch(`https://api.modrinth.com/v2/search?query=${encodeURIComponent(q)}&facets=[["project_type:shader"]]&limit=1`, {
          headers: { 'User-Agent': 'SHUBATECH-ShubaCore-Launcher' },
          signal: AbortSignal.timeout(2500)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.hits && data.hits.length > 0 && data.hits[0].icon_url) {
            return {
              icon: data.hits[0].icon_url,
              description: data.hits[0].description || 'Paquete de shaders para Minecraft'
            };
          }
        }
      }
    } catch (_) {}

    return { icon: defaultShaderIcon, description: 'Paquete de shaders para Minecraft' };
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

    const inst = instancePath || this.profileManager.getActiveInstancePath();
    const diskCache = this._readDiskCache(inst, type);
    const updatedCache = {};
    let cacheChanged = false;

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

      let stat = null;
      try {
        stat = fs.statSync(fullPath);
      } catch (_) {
        continue;
      }

      const cached = diskCache[ent.name];
      if (cached && cached.sizeBytes === stat.size && cached.mtimeMs === stat.mtimeMs && cached.icon) {
        packs.push(cached);
        updatedCache[ent.name] = cached;
        continue;
      }

      cacheChanged = true;
      let name = ent.name.replace(/\.zip$/i, '');
      let description = type === 'shaders' ? 'Paquete de shaders para Minecraft' : 'Paquete de recursos y texturas';
      let icon = null;
      let packFormat = null;
      const sizeBytes = stat.size;
      const modifiedAt = stat.mtime.toISOString();
      const mtimeMs = stat.mtimeMs;

      try {
        if (isZip) {
          try {
            const zip = new AdmZip(fullPath);
            const mcmetaEntry = zip.getEntry('pack.mcmeta');
            if (mcmetaEntry) {
              const mcmetaContent = mcmetaEntry.getData().toString('utf8').replace(/^\uFEFF/, '').trim();
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

            const iconEntry = zip.getEntry('pack.png') || zip.getEntry('shaders/pack.png') || zip.getEntry('icon.png');
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

        // Si es un shader y no tiene pack.png interno, resolver portada oficial o fallback temático
        if (type === 'shaders' && !icon) {
          const shaderMeta = await this._resolveShaderMeta(ent.name, name);
          if (shaderMeta.icon) icon = shaderMeta.icon;
          if (shaderMeta.description && description === 'Paquete de shaders para Minecraft') {
            description = shaderMeta.description;
          }
        }
      } catch (err) {
        logger.warn(`[Packs] Error al procesar ${ent.name}: ${err.message}`);
      }

      const packRecord = {
        fileName: ent.name,
        name,
        description,
        icon,
        packFormat,
        sizeBytes,
        mtimeMs,
        formattedSize: this._formatSize(sizeBytes),
        modifiedAt,
        isZip,
        type
      };

      packs.push(packRecord);
      updatedCache[ent.name] = packRecord;
    }

    if (cacheChanged || Object.keys(diskCache).length !== Object.keys(updatedCache).length) {
      this._writeDiskCache(inst, type, updatedCache);
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
