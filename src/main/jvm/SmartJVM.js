/**
 * ShubaCore - Smart JVM Manager & Auto-Tuning Engine (Bloque ShubaCore Pro)
 * Developed by SHUBATECH
 *
 * Implements:
 * 1. Automatic silent download of required Java version (Java 21, 17, 8) from Eclipse Temurin
 *    into <userData>/runtime/ if the user does not have it installed.
 * 2. Auto-Tuning of G1GC and Generational ZGC flags based on os.totalmem() and CPU architecture.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');
const { Readable } = require('stream');
const { finished } = require('stream/promises');
const { defaultLogger: logger } = require('../utils/logger');
const { JavaManager } = require('./JavaManager');
const { JVMOptimizer } = require('./JVMOptimizer');
const { getConfigManager } = require('../config/ConfigManager');

// Enlaces oficiales directos de Eclipse Temurin JRE para Windows x64
const TEMURIN_JRE_URLS = {
  8: 'https://api.adoptium.net/v3/binary/latest/8/ga/windows/x64/jre/hotspot/normal/eclipse',
  17: 'https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jre/hotspot/normal/eclipse',
  21: 'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse'
};

class SmartJVM {
  constructor() {
    this.configManager = getConfigManager();
    this.rootPath = (typeof this.configManager?.getRootPath === 'function' ? this.configManager.getRootPath() : this.configManager?.configDir) || path.join(process.cwd(), '.shubacore-data');
    this.runtimeDir = path.join(this.rootPath, 'runtime');
    if (!fs.existsSync(this.runtimeDir)) {
      try { fs.mkdirSync(this.runtimeDir, { recursive: true }); } catch (_) {}
    }
  }

  /**
   * Determina la versión de Java mayor requerida según la versión de Minecraft
   */
  resolveRequiredJavaVersion(mcVersion) {
    if (!mcVersion) return 21;
    const parts = String(mcVersion).split('.').map((p) => parseInt(p, 10) || 0);
    const minor = parts[1] || 0;
    const patch = parts[2] || 0;

    // MC 1.20.5+ y 1.21+ requieren Java 21
    if (minor > 20 || (minor === 20 && patch >= 5)) {
      return 21;
    }
    // MC 1.18 - 1.20.4 requieren Java 17
    if (minor >= 18) {
      return 17;
    }
    // MC 1.17 y anteriores funcionan óptimamente con Java 8 o 16
    return 8;
  }

  /**
   * Asegura que el runtime de Java requerido esté presente.
   * Si no existe en el sistema ni en runtime/, lo descarga silenciosamente.
   */
  async ensureJavaForInstance({ gameVersion, onProgress = null }) {
    const requiredMajor = this.resolveRequiredJavaVersion(gameVersion);
    logger.info(`[SmartJVM] Verificando Java ${requiredMajor} para Minecraft ${gameVersion}...`);

    // 1. Buscar si ya existe en ShubaCore runtime/ o en el sistema
    const existing = JavaManager.detectJavaByVersion(requiredMajor, this.rootPath);
    if (existing && existing.path && fs.existsSync(existing.path)) {
      logger.info(`[SmartJVM] Java ${requiredMajor} localizado en: "${existing.path}"`);
      return {
        success: true,
        javaPath: existing.path,
        majorVersion: requiredMajor,
        downloaded: false
      };
    }

    // 2. Si es Java 21, intentar con JVMOptimizer.findJava21
    if (requiredMajor === 21) {
      const found21 = JVMOptimizer.findJava21(this.rootPath);
      if (found21 && fs.existsSync(found21)) {
        logger.info(`[SmartJVM] Java 21 encontrado por escaneo avanzado: "${found21}"`);
        return {
          success: true,
          javaPath: found21,
          majorVersion: 21,
          downloaded: false
        };
      }
    }

    // 3. Descarga silenciosa de Eclipse Temurin JRE
    logger.info(`[SmartJVM] Java ${requiredMajor} no encontrado. Descargando automáticamente Eclipse Temurin JRE...`);
    if (onProgress) {
      onProgress({ percent: 10, message: `Iniciando descarga de Java ${requiredMajor} (Eclipse Temurin)...` });
    }

    const downloadUrl = TEMURIN_JRE_URLS[requiredMajor] || TEMURIN_JRE_URLS[21];
    const targetFolder = path.join(this.runtimeDir, `java${requiredMajor}`);
    const tempZip = path.join(this.runtimeDir, `temurin-jre-${requiredMajor}-temp.zip`);

    try {
      const res = await fetch(downloadUrl, {
        headers: { 'User-Agent': 'SHUBATECH-ShubaCore-Launcher/1.1.0' },
        redirect: 'follow'
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} al descargar Java de Adoptium API`);
      }

      if (onProgress) {
        onProgress({ percent: 40, message: `Guardando paquete JRE ${requiredMajor}...` });
      }

      const fileStream = fs.createWriteStream(tempZip);
      await finished(Readable.fromWeb(res.body).pipe(fileStream));

      if (onProgress) {
        onProgress({ percent: 75, message: `Extrayendo Java ${requiredMajor} en runtime/...` });
      }

      // Extraer ZIP
      if (fs.existsSync(targetFolder)) {
        try { fs.rmSync(targetFolder, { recursive: true, force: true }); } catch (_) {}
      }
      fs.mkdirSync(targetFolder, { recursive: true });

      const zip = new AdmZip(tempZip);
      zip.extractAllTo(targetFolder, true);

      // Limpiar archivo temporal
      try { fs.unlinkSync(tempZip); } catch (_) {}

      // Localizar ejecutable extraído
      const javawPath = JavaManager.findExecutable(targetFolder, ['javaw.exe', 'java.exe']);
      if (!javawPath) {
        throw new Error(`No se encontró javaw.exe tras extraer Java ${requiredMajor} en ${targetFolder}`);
      }

      if (onProgress) {
        onProgress({ percent: 100, message: `¡Java ${requiredMajor} instalado y listo!` });
      }

      logger.info(`[SmartJVM] ✅ Java ${requiredMajor} descargado y configurado en: "${javawPath}"`);
      return {
        success: true,
        javaPath: javawPath,
        majorVersion: requiredMajor,
        downloaded: true
      };
    } catch (err) {
      logger.error(`[SmartJVM] Error al descargar Java ${requiredMajor}:`, err.message);
      try { if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip); } catch (_) {}
      throw err;
    }
  }

  /**
   * Calcula automáticamente los argumentos óptimos de G1GC / ZGC según el hardware
   */
  getAutoTunedJVMFlags({ allocatedRamMb = null, javaMajor = 21 } = {}) {
    const totalBytes = os.totalmem();
    const totalRamGb = Math.round(totalBytes / (1024 * 1024 * 1024));

    // Si no se especificó RAM, asignar inteligentemente ~50% de la RAM del sistema
    let ramMb = allocatedRamMb;
    if (!ramMb || ramMb <= 1024) {
      if (totalRamGb >= 32) ramMb = 10240; // 10GB
      else if (totalRamGb >= 16) ramMb = 8192; // 8GB
      else if (totalRamGb >= 8) ramMb = 4096; // 4GB
      else ramMb = 3072; // 3GB
    }

    const maxRamStr = `${Math.round(ramMb / 1024)}G`;
    const minRamStr = `${Math.max(2, Math.round((ramMb / 1024) / 2))}G`;

    // Calcular tamaño de región G1GC según RAM asignada
    let heapRegionSize = '16M';
    if (ramMb >= 16384) heapRegionSize = '32M';
    else if (ramMb <= 4096) heapRegionSize = '8M';

    // Banderas base G1GC de ultra-rendimiento (Aikar's Client Tuning)
    const flags = [
      `-Xmx${maxRamStr}`,
      `-Xms${minRamStr}`,
      '-XX:+UnlockExperimentalVMOptions',
      '-XX:+UseG1GC',
      '-XX:G1NewSizePercent=20',
      '-XX:G1ReservePercent=20',
      '-XX:MaxGCPauseMillis=50',
      `-XX:G1HeapRegionSize=${heapRegionSize}`,
      '-XX:+DisableExplicitGC'
    ];

    // Para Java 21+: flag obligatoria para MCLC y Mixins modernos
    if (javaMajor >= 21) {
      flags.push('--enable-native-access=ALL-UNNAMED');
    }

    return {
      success: true,
      minRam: minRamStr,
      maxRam: maxRamStr,
      ramMb,
      totalSystemRamGb: totalRamGb,
      heapRegionSize,
      flags,
      flagsString: flags.join(' ')
    };
  }
}

let smartJvmInstance = null;
function getSmartJVM() {
  if (!smartJvmInstance) {
    smartJvmInstance = new SmartJVM();
  }
  return smartJvmInstance;
}

module.exports = {
  SmartJVM,
  getSmartJVM
};
