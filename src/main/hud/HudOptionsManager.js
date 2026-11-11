/**
 * ShubaCore - Native options.txt Quality of Life & Performance Manager (Bloque 5 v1.1.0)
 * Developed by SHUBATECH
 *
 * Implements 100% native options.txt modifications without requiring external mods:
 * 1. Fullbright (gamma: 100.0)
 * 2. Auto-Sprint (toggleSprint: true)
 * 3. Ocultar nubes (renderClouds: "false")
 * 4. Sombras de entidades (entityShadows: false)
 * 5. Desactivar VSync (enableVsync: false)
 *
 * All automatic background mod downloads from Modrinth/CurseForge have been permanently removed
 * to keep Vanilla and modded instances 100% clean and pristine.
 */

const fs = require('fs');
const path = require('path');
const { defaultLogger: logger } = require('../utils/logger');
const { getProfileManager } = require('../profiles/ProfileManager');

// Palabras clave de detección en modo solo lectura (para mods instalados manualmente por el usuario)
const HUD_MOD_KEYWORDS = {
  keystrokes: ['keystroke', 'keybinds', 'keys-hud', 'movement-hud', 'kronhud'],
  cps: ['cps', 'clicks', 'fps-display', 'simple-cps', 'cpsdisplay'],
  coords: ['betterf3', 'minihud', 'simple-hud-enhanced', 'batty'],
  armor: ['inventory-hud', 'armor-statues', 'status-effect-hud', 'equipment-compare'],
  zoom: ['zoomify', 'wi-zoom', 'logical-zoom', 'ok-zoomer'],
  minimap: ['xaero', 'minimap', 'journeymap', 'map'],
  fps: ['sodium', 'embeddium', 'lithium', 'ferritecore', 'ferrite-core']
};

const HUD_MOD_PROJECTS = {
  keystrokes: { name: 'Keystrokes', keywords: HUD_MOD_KEYWORDS.keystrokes },
  cps: { name: 'CPS/FPS', keywords: HUD_MOD_KEYWORDS.cps },
  coords: { name: 'BetterF3', keywords: HUD_MOD_KEYWORDS.coords },
  armor: { name: 'Inventory HUD+', keywords: HUD_MOD_KEYWORDS.armor },
  zoom: { name: 'Zoomify', keywords: HUD_MOD_KEYWORDS.zoom },
  minimap: { name: 'Minimap', keywords: HUD_MOD_KEYWORDS.minimap },
  fps: { name: 'Pack FPS', keywords: HUD_MOD_KEYWORDS.fps }
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
   * Lee y parsea options.txt de la instancia devolviendo los 5 ajustes nativos
   */
  readOptions(instanceDir) {
    const optsFile = this.getOptionsFilePath(instanceDir);
    const defaults = {
      fullbright: false,
      autoSprint: false,
      noClouds: false,
      entityShadows: true,
      noEntityShadows: false,
      noVsync: false,
      enableVsync: true
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
      const isNoClouds = (rawMap['renderClouds'] === '"false"' || rawMap['renderClouds'] === 'false');
      const isEntityShadowsDisabled = rawMap['entityShadows'] === 'false';
      const isNoVsync = rawMap['enableVsync'] === 'false';

      return {
        fullbright: isFullbright,
        autoSprint: isAutoSprint,
        noClouds: isNoClouds,
        entityShadows: !isEntityShadowsDisabled,
        noEntityShadows: isEntityShadowsDisabled,
        noVsync: isNoVsync,
        enableVsync: !isNoVsync
      };
    } catch (err) {
      logger.warn('[HudOptions] Error al leer options.txt:', err.message);
      return defaults;
    }
  }

  /**
   * Aplica un ajuste directo en options.txt sin mods
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
    } else if (optionKey === 'entityShadows') {
      updates['entityShadows'] = value ? 'true' : 'false';
    } else if (optionKey === 'noEntityShadows') {
      updates['entityShadows'] = value ? 'false' : 'true';
    } else if (optionKey === 'noVsync') {
      updates['enableVsync'] = value ? 'false' : 'true';
    } else if (optionKey === 'enableVsync' || optionKey === 'vsync') {
      updates['enableVsync'] = value ? 'true' : 'false';
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

    for (const [k, v] of Object.entries(updates)) {
      map.set(k, v);
    }

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
   * Inspecciona el estado de los módulos de mods HUD instalados manualmente en /mods (Solo lectura)
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

      for (const [modType, keywords] of Object.entries(HUD_MOD_KEYWORDS)) {
        const isPresent = files.some((fileName) =>
          keywords.some((kw) => fileName.includes(kw))
        );
        state[modType] = isPresent;
      }
    } catch (err) {
      logger.warn('[HudOptions] Error al escanear carpeta mods para HUD:', err.message);
    }

    return state;
  }

  /**
   * Bloqueo permanente de descargas automáticas de mods
   */
  async toggleHudMod() {
    throw new Error('Las descargas automáticas de mods han sido desactivadas permanentemente. Los módulos HUD externos requieren instalación manual en la carpeta mods/ y requieren un entorno con mods (NeoForge/Forge/Fabric). En Vanilla puro se aplican las optimizaciones nativas de options.txt.');
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
