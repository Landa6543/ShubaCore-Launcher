/**
 * ShubaCore - Custom Mod Icon Extractor
 * Developed by SHUBATECH
 *
 * Extracts real mod icons (PNG) from .jar files:
 * - NeoForge / Forge: logoFile in META-INF/neoforge.mods.toml or META-INF/mods.toml
 * - Fabric / Quilt: icon in fabric.mod.json or quilt.mod.json
 * - Legacy: logoFile in mcmod.info
 * Caches extracted icons to <userData>/cache/mod-icons/ and returns Base64 data URLs.
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { defaultLogger: logger } = require('../utils/logger');
const { getConfigManager } = require('../config/ConfigManager');

class CustomModIconExtractor {
  constructor() {
    this.configManager = getConfigManager();
    this.userDataPath = (typeof this.configManager?.getRootPath === 'function' ? this.configManager.getRootPath() : this.configManager?.configDir) || path.join(process.cwd(), '.shubacore-data');
    this.iconsCacheDir = path.join(this.userDataPath, 'cache', 'mod-icons');
    this._ensureDir(this.iconsCacheDir);
  }

  _ensureDir(dir) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (_) {}
    }
  }

  /**
   * Obtiene la ruta del archivo de icono en caché para un archivo dado
   */
  getIconPath(fileName) {
    const cleanBase = path.basename(fileName).replace(/\.jar$/i, '');
    return path.join(this.iconsCacheDir, `${cleanBase}.png`);
  }

  /**
   * Obtiene el icono en formato DataURL si ya existe en caché
   */
  getIconDataUrl(fileName) {
    const iconFile = this.getIconPath(fileName);
    if (fs.existsSync(iconFile)) {
      try {
        const buf = fs.readFileSync(iconFile);
        return `data:image/png;base64,${buf.toString('base64')}`;
      } catch (_) {}
    }
    return null;
  }

  /**
   * Extrae el icono de un archivo .jar local o de un Buffer en memoria
   * @param {string|Buffer} jarPathOrBuffer - Ruta al archivo .jar o Buffer del zip
   * @param {string} [fileName] - Nombre del archivo para cachear el icono
   * @returns {{ iconPath: string|null, iconBase64: string|null, name: string|null, version: string|null, modId: string|null }}
   */
  extractIcon(jarPathOrBuffer, fileName = null) {
    try {
      if (!jarPathOrBuffer) return null;
      if (typeof jarPathOrBuffer === 'string' && !fs.existsSync(jarPathOrBuffer)) {
        return null;
      }

      const zip = new AdmZip(jarPathOrBuffer);
      const entries = zip.getEntries();
      let modId = null;
      let name = null;
      let version = null;
      let logoFileName = null;

      // 1. Verificar NeoForge / Forge toml
      const neoToml = zip.getEntry('META-INF/neoforge.mods.toml') || zip.getEntry('META-INF/mods.toml');
      const fabricJson = zip.getEntry('fabric.mod.json') || zip.getEntry('quilt.mod.json');
      const mcmodInfo = zip.getEntry('mcmod.info');

      if (neoToml) {
        try {
          const content = neoToml.getData().toString('utf8');
          const modsSectionMatch = content.match(/\[\[mods\]\]([\s\S]*?)(?:\[\[|$)/i);
          const modBlock = modsSectionMatch ? modsSectionMatch[1] : content;

          const nameMatch = modBlock.match(/(?:displayName|name)\s*=\s*["']([^"']+)["']/i) || content.match(/(?:displayName|name)\s*=\s*["']([^"']+)["']/i);
          const modIdMatch = modBlock.match(/modId\s*=\s*["']([^"']+)["']/i) || content.match(/modId\s*=\s*["']([^"']+)["']/i);
          const verMatch = modBlock.match(/version\s*=\s*["']([^"']+)["']/i);
          const logoMatch = modBlock.match(/logoFile\s*=\s*["']([^"']+)["']/i) || content.match(/logoFile\s*=\s*["']([^"']+)["']/i);

          if (nameMatch) name = nameMatch[1];
          if (modIdMatch) modId = modIdMatch[1];
          if (verMatch && verMatch[1] !== '${file.jarVersion}') version = verMatch[1];
          if (logoMatch) logoFileName = logoMatch[1];
        } catch (_) {}
      } else if (fabricJson) {
        try {
          const json = JSON.parse(fabricJson.getData().toString('utf8'));
          name = json.name;
          modId = json.id;
          version = json.version;
          if (typeof json.icon === 'string') {
            logoFileName = json.icon;
          } else if (json.icon && typeof json.icon === 'object') {
            logoFileName = Object.values(json.icon)[0];
          }
        } catch (_) {}
      } else if (mcmodInfo) {
        try {
          const json = JSON.parse(mcmodInfo.getData().toString('utf8'));
          const m = Array.isArray(json) ? json[0] : (json.modList ? json.modList[0] : json);
          if (m) {
            name = m.name;
            modId = m.modid;
            version = m.version;
            logoFileName = m.logoFile;
          }
        } catch (_) {}
      }

      // 2. Localizar archivo de icono dentro del ZIP
      let iconEntry = null;
      if (logoFileName) {
        const cleanLogo = logoFileName.replace(/^[/\\]+/, '');
        iconEntry = zip.getEntry(cleanLogo) ||
                    zip.getEntry(logoFileName) ||
                    (modId ? zip.getEntry(`assets/${modId}/${cleanLogo}`) : null);

        if (!iconEntry) {
          iconEntry = entries.find((e) =>
            e.entryName.toLowerCase().endsWith(cleanLogo.toLowerCase()) && !e.isDirectory
          );
        }
      }

      // Fallbacks comunes de iconos
      if (!iconEntry) {
        const commonNames = ['logo.png', 'icon.png', 'pack.png'];
        for (const cn of commonNames) {
          iconEntry = zip.getEntry(cn);
          if (iconEntry) break;
          if (modId) {
            iconEntry = zip.getEntry(`assets/${modId}/${cn}`) ||
                        zip.getEntry(`assets/${modId}/textures/gui/${cn}`);
            if (iconEntry) break;
          }
        }
      }

      if (!iconEntry) {
        iconEntry = entries.find((e) =>
          (e.entryName.toLowerCase().endsWith('/icon.png') || e.entryName.toLowerCase().endsWith('/logo.png')) &&
          !e.isDirectory
        );
      }

      // 3. Procesar y cachear el icono
      if (iconEntry) {
        const iconBuffer = iconEntry.getData();
        const base64 = iconBuffer.toString('base64');
        const iconDataUrl = `data:image/png;base64,${base64}`;

        let savedPath = null;
        if (fileName) {
          savedPath = this.getIconPath(fileName);
          try {
            fs.writeFileSync(savedPath, iconBuffer);
          } catch (_) {}
        }

        return {
          iconPath: savedPath,
          iconBase64: iconDataUrl,
          name: name || (fileName ? path.basename(fileName, '.jar') : 'Custom Mod'),
          version: version || '1.0.0',
          modId: modId || (fileName ? path.basename(fileName, '.jar').toLowerCase() : 'custom_mod')
        };
      }

      return {
        iconPath: null,
        iconBase64: null,
        name: name || (fileName ? path.basename(fileName, '.jar') : null),
        version: version || null,
        modId: modId || null
      };
    } catch (err) {
      logger.warn(`[CustomModIconExtractor] Error al extraer icono de "${fileName || 'jar'}": ${err.message}`);
      return null;
    }
  }

  /**
   * Extrae el icono descargando el .jar en memoria desde una URL remota
   */
  async extractFromRemoteUrl(url, fileName, token = null) {
    if (!url || !fileName) return null;

    // Verificar si ya está en caché
    const existing = this.getIconDataUrl(fileName);
    if (existing) {
      return { iconBase64: existing, iconPath: this.getIconPath(fileName), cached: true };
    }

    try {
      const headers = { 'User-Agent': 'SHUBATECH-ShubaCore-Launcher/1.1.0' };
      if (token) headers['Authorization'] = `token ${token}`;

      const res = await fetch(url, { headers });
      if (!res.ok) return null;

      const arrayBuf = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      return this.extractIcon(buffer, fileName);
    } catch (err) {
      logger.debug(`[CustomModIconExtractor] No se pudo extraer icono remoto de ${fileName}: ${err.message}`);
      return null;
    }
  }
}

let extractorInstance = null;
function getCustomModIconExtractor() {
  if (!extractorInstance) {
    extractorInstance = new CustomModIconExtractor();
  }
  return extractorInstance;
}

module.exports = {
  CustomModIconExtractor,
  getCustomModIconExtractor
};
