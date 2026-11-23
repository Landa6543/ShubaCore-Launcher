/**
 * ShubaCore - Graphic Presets Manager (Presets Gráficos de Alto Rendimiento)
 * Developed by SHUBATECH
 * Aplica configuraciones optimizadas en options.txt para PCs patatas, equilibradas o gama alta.
 */

const fs = require('fs');
const path = require('path');
const { defaultLogger: logger } = require('../utils/logger');

const PRESETS = {
  potato: {
    name: '🥔 Modo Patata (Ultra Rendimiento)',
    description: 'Optimizado al máximo para PCs de bajos recursos o gráficos integrados.',
    options: {
      renderDistance: '4',
      simulationDistance: '4',
      graphicsMode: '0', // Fast
      ao: '0', // Ambient Occlusion OFF
      particles: '2', // Minimal
      clouds: 'false',
      entityShadows: 'false',
      mipmapLevels: '0',
      biomeBlendRadius: '0',
      maxFps: '75',
      fov: '70',
      enableVsync: 'false'
    }
  },
  balanced: {
    name: '⚖️ Modo Equilibrado (Recomendado)',
    description: 'El balance ideal entre calidad visual atractiva y fluidez de FPS.',
    options: {
      renderDistance: '10',
      simulationDistance: '8',
      graphicsMode: '1', // Fancy
      ao: '1', // Min smooth lighting
      particles: '1', // Decreased
      clouds: 'true',
      entityShadows: 'true',
      mipmapLevels: '4',
      biomeBlendRadius: '2',
      maxFps: '144',
      enableVsync: 'false'
    }
  },
  ultra: {
    name: '✨ Modo Ultra (Cinemático)',
    description: 'Máxima distancia de visión, iluminación suave y fidelidad para GPUs dedicadas.',
    options: {
      renderDistance: '18',
      simulationDistance: '14',
      graphicsMode: '2', // Fabulous
      ao: '2', // Max smooth lighting
      particles: '0', // All
      clouds: 'true',
      entityShadows: 'true',
      mipmapLevels: '4',
      biomeBlendRadius: '5',
      maxFps: '260',
      enableVsync: 'false'
    }
  }
};

class GraphicPresetsManager {
  _getOptionsPath(instancePath) {
    return path.join(instancePath, 'options.txt');
  }

  getAvailablePresets() {
    return Object.entries(PRESETS).map(([key, val]) => ({
      key,
      name: val.name,
      description: val.description,
      settingsCount: Object.keys(val.options).length
    }));
  }

  applyPreset(instancePath, presetKey) {
    if (!instancePath || !fs.existsSync(instancePath)) {
      return { success: false, error: 'Carpeta de instancia no encontrada' };
    }
    const preset = PRESETS[presetKey];
    if (!preset) {
      return { success: false, error: `Preset desconocido: ${presetKey}` };
    }

    const optionsPath = this._getOptionsPath(instancePath);
    let currentOptions = {};

    if (fs.existsSync(optionsPath)) {
      try {
        const raw = fs.readFileSync(optionsPath, 'utf8');
        const lines = raw.split(/\r?\n/);
        for (const line of lines) {
          const sepIdx = line.indexOf(':');
          if (sepIdx !== -1) {
            const k = line.slice(0, sepIdx).trim();
            const v = line.slice(sepIdx + 1).trim();
            if (k) currentOptions[k] = v;
          }
        }
      } catch (err) {
        logger.warn('[GraphicPresetsManager] Error leyendo options.txt existente:', err);
      }
    }

    // Sobreescribir las opciones definidas en el preset
    const modifiedKeys = [];
    for (const [key, val] of Object.entries(preset.options)) {
      currentOptions[key] = val;
      modifiedKeys.push(key);
    }

    // Serializar de vuelta respetando formato vanilla
    const outputLines = Object.entries(currentOptions).map(([k, v]) => `${k}:${v}`);
    try {
      fs.writeFileSync(optionsPath, outputLines.join('\n') + '\n', 'utf8');
      logger.info(`[GraphicPresetsManager] Preset "${presetKey}" aplicado correctamente en ${optionsPath}`);
      return {
        success: true,
        preset: presetKey,
        presetName: preset.name,
        modifiedKeys
      };
    } catch (err) {
      logger.error('[GraphicPresetsManager] Error escribiendo options.txt:', err);
      return { success: false, error: err.message };
    }
  }

  getCurrentPreset(instancePath) {
    const optionsPath = this._getOptionsPath(instancePath);
    if (!fs.existsSync(optionsPath)) return { detectedPreset: 'balanced' };

    try {
      const raw = fs.readFileSync(optionsPath, 'utf8');
      if (raw.includes('renderDistance:4') || raw.includes('renderDistance:2') || raw.includes('graphicsMode:0')) {
        return { detectedPreset: 'potato' };
      }
      if (raw.includes('graphicsMode:2') || raw.includes('renderDistance:18') || raw.includes('renderDistance:24')) {
        return { detectedPreset: 'ultra' };
      }
      return { detectedPreset: 'balanced' };
    } catch (_) {
      return { detectedPreset: 'balanced' };
    }
  }
}

let graphicPresetsManagerInstance = null;
function getGraphicPresetsManager() {
  if (!graphicPresetsManagerInstance) {
    graphicPresetsManagerInstance = new GraphicPresetsManager();
  }
  return graphicPresetsManagerInstance;
}

module.exports = {
  GraphicPresetsManager,
  getGraphicPresetsManager
};
