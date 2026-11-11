/**
 * ShubaCore - Hardware Auto-Optimizer Engine (Bloque ShubaCore Pro)
 * Developed by SHUBATECH
 *
 * Automatically detects PC specifications (CPU cores, model, total RAM)
 * and tunes Minecraft options.txt (renderDistance, graphicsMode, shadows, clouds, vsync)
 * for maximum FPS without installing any external mods.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { defaultLogger: logger } = require('../utils/logger');

class HardwareOptimizer {
  /**
   * Obtiene las especificaciones de hardware del equipo
   */
  getSpecs() {
    const totalBytes = os.totalmem();
    const totalRamGb = Math.round(totalBytes / (1024 * 1024 * 1024));
    const cpus = os.cpus() || [];
    const cores = cpus.length;
    const cpuModel = cpus[0]?.model || 'Procesador estándar';
    const arch = os.arch();

    let tier = 'mid';
    let tierLabel = 'Gama Media';

    if (totalRamGb < 8 || cores <= 4) {
      tier = 'low';
      tierLabel = 'PC de Bajos Recursos (Low-End)';
    } else if (totalRamGb >= 16 && cores >= 8) {
      tier = 'high';
      tierLabel = 'PC de Alto Rendimiento (High-End)';
    } else {
      tier = 'mid';
      tierLabel = 'PC Estándar (Mid-Range)';
    }

    return {
      totalRamGb,
      totalBytes,
      cores,
      cpuModel,
      arch,
      tier,
      tierLabel
    };
  }

  /**
   * Genera el conjunto de opciones de options.txt según el nivel de hardware
   */
  getPresetOptions(tier) {
    if (tier === 'low') {
      return {
        renderDistance: '6',
        simulationDistance: '4',
        graphicsMode: '"fast"',
        renderClouds: '"false"',
        enableVsync: 'false',
        entityShadows: 'false',
        particles: '2',
        ao: '0',
        biomeBlendRadius: '0'
      };
    }

    if (tier === 'high') {
      return {
        renderDistance: '20',
        simulationDistance: '12',
        graphicsMode: '"fancy"',
        renderClouds: '"fancy"',
        enableVsync: 'false',
        entityShadows: 'true',
        particles: '0',
        ao: '2',
        biomeBlendRadius: '3'
      };
    }

    // Mid-Range por defecto
    return {
      renderDistance: '12',
      simulationDistance: '8',
      graphicsMode: '"fancy"',
      renderClouds: '"fancy"',
      enableVsync: 'false',
      entityShadows: 'true',
      particles: '0',
      ao: '2',
      biomeBlendRadius: '2'
    };
  }

  /**
   * Aplica la optimización automática en el archivo options.txt de la instancia
   * @param {string} instanceDir - Directorio de la instancia
   * @param {string} [forceTier] - 'low' | 'mid' | 'high' (opcional)
   */
  optimizeInstanceOptions(instanceDir, forceTier = null) {
    if (!instanceDir) {
      throw new Error('Directorio de instancia no especificado.');
    }

    if (!fs.existsSync(instanceDir)) {
      fs.mkdirSync(instanceDir, { recursive: true });
    }

    const specs = this.getSpecs();
    const effectiveTier = forceTier || specs.tier;
    const preset = this.getPresetOptions(effectiveTier);

    const optsFile = path.join(instanceDir, 'options.txt');
    let lines = [];
    if (fs.existsSync(optsFile)) {
      try {
        lines = fs.readFileSync(optsFile, 'utf8').split('\n');
      } catch (_) {}
    }

    // Mapear opciones existentes conservando configuraciones personalizadas
    const map = new Map();
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf(':');
      if (idx !== -1) {
        map.set(trimmed.slice(0, idx).trim(), trimmed.slice(idx + 1).trim());
      }
    }

    // Aplicar ajustes del perfil de hardware
    for (const [k, v] of Object.entries(preset)) {
      map.set(k, v);
    }

    // Reconstruir y guardar options.txt
    const outLines = [];
    for (const [k, v] of map.entries()) {
      outLines.push(`${k}:${v}`);
    }

    fs.writeFileSync(optsFile, outLines.join('\n') + '\n', 'utf8');
    logger.info(`[HardwareOptimizer] ✅ options.txt auto-optimizado para ${specs.tierLabel} en: ${optsFile}`);

    return {
      success: true,
      tier: effectiveTier,
      specs,
      appliedPreset: preset,
      optionsFilePath: optsFile
    };
  }
}

let hardwareOptimizerInstance = null;
function getHardwareOptimizer() {
  if (!hardwareOptimizerInstance) {
    hardwareOptimizerInstance = new HardwareOptimizer();
  }
  return hardwareOptimizerInstance;
}

module.exports = {
  HardwareOptimizer,
  getHardwareOptimizer
};
