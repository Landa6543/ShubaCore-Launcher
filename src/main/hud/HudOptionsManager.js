/**
 * ShubaCore - Vanilla+ HUD & Quality of Life Utilities Manager (Bloque 5 v1.1.0)
 * Developed by SHUBATECH
 *
 * Implements:
 * 1. Direct options.txt modification (Fullbright, Auto-Sprint, No Clouds/Shadows, No VSync).
 * 2. On-screen HUD mods management (Coordinates/Days, Smooth Zoom C, Armor Status, FPS Pack)
 *    with automatic loader setup and silent Modrinth downloading.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { defaultLogger: logger } = require('../utils/logger');
const { getProfileManager } = require('../profiles/ProfileManager');

// Modrinth Project IDs recomendados para utilidades Vanilla+
const HUD_MOD_PROJECTS = {
  keystrokes: {
    name: 'Keystrokes (Teclas en Pantalla)',
    slug: 'keystrokes',
    keywords: ['keystroke', 'keybinds', 'keys-hud', 'movement-hud', 'kronhud']
  },
  cps: {
    name: 'Contador de CPS y FPS en Pantalla',
    slug: 'simple-cps',
    keywords: ['cps', 'clicks', 'fps-display', 'simple-cps', 'cpsdisplay']
  },
  coords: {
    name: 'BetterF3 (Coordenadas y Días)',
    slug: 'betterf3',
    keywords: ['betterf3', 'minihud', 'simple-hud-enhanced', 'batty']
  },
  armor: {
    name: 'Inventory HUD+ (Durabilidad y Armadura)',
    slug: 'inventory-hud-plus',
    keywords: ['inventory-hud', 'armor-statues', 'status-effect-hud', 'equipment-compare']
  },
  zoom: {
    name: 'Zoomify (Zoom Suave Tecla C)',
    slug: 'zoomify',
    keywords: ['zoomify', 'wi-zoom', 'logical-zoom', 'ok-zoomer']
  },
  minimap: {
    name: 'Minimapa y Marcadores (Xaeros Minimap)',
    slug: 'xaeros-minimap',
    keywords: ['xaero', 'minimap', 'journeymap', 'map']
  },
  fps: {
    name: 'Pack FPS Esencial (Sodium + Lithium + FerriteCore)',
    slug: 'sodium',
    keywords: ['sodium', 'embeddium', 'lithium', 'ferritecore', 'ferrite-core']
  }
};

class HudOptionsManager {
  constructor() {
    this.profileManager = getProfileManager();
  }

  /**
   * Obtiene la ruta al archivo options.txt de una instancia
   */
  getOptionsFilePath(instanceDir) {
    return path.join(instanceDir, 'options.txt');
  }

  /**
   * Lee y parsea options.txt de la instancia
   */
  readOptions(instanceDir) {
    const optsFile = this.getOptionsFilePath(instanceDir);
    const defaults = {
      fullbright: false,
      autoSprint: false,
      noClouds: false,
      noVsync: false
    };

    if (!fs.existsSync(optsFile)) {
      return defaults;
    }

    try {
      const content = fs.readFileSync(optsFile, 'utf8');
      const lines = content.split('\n');
      const rawMap = {};

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf(':');
        if (idx !== -1) {
          const k = trimmed.slice(0, idx).trim();
          const v = trimmed.slice(idx + 1).trim();
          rawMap[k] = v;
        }
      }

      const gammaVal = parseFloat(rawMap['gamma'] || '1.0');
      const isFullbright = gammaVal >= 5.0;
      const isAutoSprint = rawMap['toggleSprint'] === 'true';
      const isNoClouds = (rawMap['renderClouds'] === '"false"' || rawMap['renderClouds'] === 'false') &&
                         rawMap['entityShadows'] === 'false';
      const isNoVsync = rawMap['enableVsync'] === 'false';

      return {
        fullbright: isFullbright,
        autoSprint: isAutoSprint,
        noClouds: isNoClouds,
        noVsync: isNoVsync
      };
    } catch (err) {
      logger.warn('[HudOptions] Error al leer options.txt:', err.message);
      return defaults;
    }
  }

  /**
   * Aplica un ajuste directo en options.txt
   */
  setOption(instanceDir, optionKey, value) {
    const optsFile = this.getOptionsFilePath(instanceDir);
    if (!fs.existsSync(instanceDir)) {
      fs.mkdirSync(instanceDir, { recursive: true });
    }

    let lines = [];
    if (fs.existsSync(optsFile)) {
      lines = fs.readFileSync(optsFile, 'utf8').split('\n');
    }

    const updates = {};
    if (optionKey === 'fullbright') {
      updates['gamma'] = value ? '100.0' : '1.0';
    } else if (optionKey === 'autoSprint') {
      updates['toggleSprint'] = value ? 'true' : 'false';
    } else if (optionKey === 'noClouds') {
      updates['renderClouds'] = value ? '"false"' : '"fancy"';
      updates['entityShadows'] = value ? 'false' : 'true';
    } else if (optionKey === 'noVsync') {
      updates['enableVsync'] = value ? 'false' : 'true';
    }

    const map = new Map();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf(':');
      if (idx !== -1) {
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim();
        map.set(k, v);
      }
    }

    // Aplicar actualizaciones
    for (const [k, v] of Object.entries(updates)) {
      map.set(k, v);
    }

    // Reconstruir archivo
    const outLines = [];
    for (const [k, v] of map.entries()) {
      outLines.push(`${k}:${v}`);
    }

    fs.writeFileSync(optsFile, outLines.join('\n') + '\n', 'utf8');
    logger.info(`[HudOptions] Ajuste "${optionKey}" actualizado a ${value} en: ${optsFile}`);

    return {
      success: true,
      options: this.readOptions(instanceDir)
    };
  }

  /**
   * Inspecciona el estado de los módulos de mods HUD instalados en /mods
   */
  getHudModsState(instanceDir) {
    const modsDir = path.join(instanceDir, 'mods');
    const state = {
      keystrokes: false,
      cps: false,
      coords: false,
      armor: false,
      zoom: false,
      minimap: false,
      fps: false
    };

    if (!fs.existsSync(modsDir)) {
      return state;
    }

    try {
      const files = fs.readdirSync(modsDir)
        .filter((f) => f.endsWith('.jar'))
        .map((f) => f.toLowerCase());

      for (const [modType, config] of Object.entries(HUD_MOD_PROJECTS)) {
        const isPresent = files.some((fileName) =>
          config.keywords.some((kw) => fileName.includes(kw))
        );
        state[modType] = isPresent;
      }
    } catch (err) {
      logger.warn('[HudOptions] Error al escanear carpeta mods para HUD:', err.message);
    }

    return state;
  }

  /**
   * Alterna la instalación / activación de un módulo de mods HUD
   */
  async toggleHudMod({ profileId, modType, enable }) {
    const profile = (profileId ? this.profileManager.getById(profileId) : null) || this.profileManager.getActive();
    if (!profile) {
      throw new Error(`Perfil no encontrado.`);
    }

    const instanceDir = profile.instancePath || profile.gameDirectory || (profile.id ? this.profileManager.getInstancePath(profile.id) : null) || this.profileManager.getDataDirectory();
    const modsDir = path.join(instanceDir, 'mods');
    if (!fs.existsSync(modsDir)) {
      fs.mkdirSync(modsDir, { recursive: true });
    }

    const config = HUD_MOD_PROJECTS[modType];
    if (!config) {
      throw new Error(`Módulo HUD desconocido: "${modType}".`);
    }

    // CASO 1: Desactivar módulo
    if (!enable) {
      const files = fs.readdirSync(modsDir);
      let removedCount = 0;
      for (const f of files) {
        const lower = f.toLowerCase();
        if (config.keywords.some((kw) => lower.includes(kw))) {
          const filePath = path.join(modsDir, f);
          try {
            fs.unlinkSync(filePath);
            removedCount++;
            logger.info(`[HudOptions] Mod HUD desinstalado: ${f}`);
          } catch (_) {}
        }
      }
      return {
        success: true,
        enabled: false,
        modsState: this.getHudModsState(instanceDir)
      };
    }

    // CASO 2: Activar módulo
    let currentLoader = (profile.loader || 'vanilla').toLowerCase();
    if (currentLoader === 'vanilla') {
      throw new Error('Los módulos HUD en pantalla requieren un entorno con mods (NeoForge/Forge/Fabric). En Vanilla puro se aplican las optimizaciones nativas de options.txt.');
    }

    const mcVersion = profile.gameVersion || '1.21.1';
    logger.info(`[HudOptions] Descargando módulo HUD "${config.name}" para MC ${mcVersion} (${currentLoader})...`);

    // Descargar archivos correspondientes desde Modrinth
    const slugsToDownload = modType === 'fps'
      ? (currentLoader === 'fabric' ? ['sodium', 'lithium', 'ferrite-core'] : ['embeddium', 'ferrite-core'])
      : [config.slug];

    let downloadedCount = 0;
    for (const slug of slugsToDownload) {
      try {
        const fileInfo = await this._resolveModrinthVersion(slug, mcVersion, currentLoader);
        if (fileInfo && fileInfo.downloadUrl) {
          const destPath = path.join(modsDir, fileInfo.fileName);
          await this._downloadFile(fileInfo.downloadUrl, destPath);
          downloadedCount++;
          logger.info(`[HudOptions] Descargado e instalado: ${fileInfo.fileName}`);
        }
      } catch (dlErr) {
        logger.warn(`[HudOptions] No se pudo descargar "${slug}":`, dlErr.message);
      }
    }

    return {
      success: true,
      enabled: true,
      downloadedCount,
      modsState: this.getHudModsState(instanceDir)
    };
  }

  /**
   * Resuelve la versión compatible de un proyecto en Modrinth
   */
  _resolveModrinthVersion(slug, mcVersion, loader) {
    return new Promise((resolve) => {
      const url = `https://api.modrinth.com/v2/project/${slug}/version?game_versions=["${mcVersion}"]&loaders=["${loader}"]`;
      const req = https.get(
        url,
        { headers: { 'User-Agent': 'ShubaCore-Launcher/1.1.0 (SHUBATECH)' } },
        (res) => {
          if (res.statusCode !== 200) {
            // Intentar sin filtro estricto de loader si no encuentra
            resolve(null);
            return;
          }
          let raw = '';
          res.on('data', (c) => (raw += c));
          res.on('end', () => {
            try {
              const versions = JSON.parse(raw);
              if (Array.isArray(versions) && versions.length > 0) {
                const primaryFile = versions[0].files.find((f) => f.primary) || versions[0].files[0];
                if (primaryFile) {
                  resolve({
                    fileName: primaryFile.filename,
                    downloadUrl: primaryFile.url
                  });
                  return;
                }
              }
            } catch (_) {}
            resolve(null);
          });
        }
      );
      req.on('error', () => resolve(null));
      req.setTimeout(8000, () => {
        req.destroy();
        resolve(null);
      });
    });
  }

  /**
   * Descarga un archivo por HTTPS
   */
  _downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      const req = https.get(
        url,
        { headers: { 'User-Agent': 'ShubaCore-Launcher/1.1.0 (SHUBATECH)' } },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return this._downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
          }
          if (res.statusCode !== 200) {
            file.close();
            try { fs.unlinkSync(destPath); } catch (_) {}
            reject(new Error(`HTTP ${res.statusCode} al descargar mod`));
            return;
          }
          res.pipe(file);
          file.on('finish', () => {
            file.close(resolve);
          });
        }
      );
      req.on('error', (err) => {
        file.close();
        try { fs.unlinkSync(destPath); } catch (_) {}
        reject(err);
      });
    });
  }
}

let hudOptionsManagerInstance = null;
function getHudOptionsManager() {
  if (!hudOptionsManagerInstance) {
    hudOptionsManagerInstance = new HudOptionsManager();
  }
  return hudOptionsManagerInstance;
}

module.exports = {
  HudOptionsManager,
  getHudOptionsManager,
  HUD_MOD_PROJECTS
};
