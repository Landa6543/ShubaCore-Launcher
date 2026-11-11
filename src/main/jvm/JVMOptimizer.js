/**
 * ShubaCore - JVM Optimizer & Java Detection Module
 * Developed by SHUBATECH
 *
 * Maximiza el rendimiento del cliente de Minecraft seleccionando dinámicamente:
 * - Detección inteligente de Java 21 (evitando incompatibilidades de Java 25)
 * - Descarga automática de Eclipse Temurin JRE 21 portable si el PC no tiene Java 21
 * - Flag obligatoria: `--enable-native-access=ALL-UNNAMED`
 * - Generational ZGC (-XX:+UseZGC -XX:+ZGenerational) para Java 21+
 * - G1GC ultra-optimizado (Aikar's Client Flags) para Java 17
 */

const fs = require('fs');
const path = require('path');
const { execFile, spawnSync } = require('child_process');
const { Readable } = require('stream');
const { finished } = require('stream/promises');
const AdmZip = require('adm-zip');
const { defaultLogger: logger } = require('../utils/logger');

class JVMOptimizer {
  /**
   * Busca recursivamente un archivo ejecutable dentro de un directorio
   */
  static _findExecutableRecursively(dir, exeName) {
    if (!fs.existsSync(dir)) return null;
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          const found = JVMOptimizer._findExecutableRecursively(full, exeName);
          if (found) return found;
        } else if (item.isFile() && item.name.toLowerCase() === exeName.toLowerCase()) {
          return full;
        }
      }
    } catch (_) {}
    return null;
  }

  /**
   * Busca instalaciones locales de Java 21 (Adoptium, Temurin, Oracle, Microsoft, Mojang runtime)
   * para evitar usar Java 25 que rompe Mixins y LWJGL en 1.21.1
   */
  static findJava21(sharedRoot = null) {
    const candidatePaths = [];

    // 1. Runtime portable propio de ShubaCore en <sharedRoot>/runtime/java21/
    if (sharedRoot) {
      const embeddedDir = path.join(sharedRoot, 'runtime', 'java21');
      if (fs.existsSync(embeddedDir)) {
        const found = JVMOptimizer._findExecutableRecursively(embeddedDir, 'javaw.exe') ||
                      JVMOptimizer._findExecutableRecursively(embeddedDir, 'java.exe');
        if (found) candidatePaths.push(found);
      }
    }

    // 2. Ruta oficial del Launcher de Minecraft (java-runtime-delta)
    const localAppData = process.env.LOCALAPPDATA || '';
    const packagesDir = path.join(localAppData, 'Packages');
    if (fs.existsSync(packagesDir)) {
      try {
        const pkgs = fs.readdirSync(packagesDir);
        for (const pkg of pkgs) {
          if (pkg.toLowerCase().startsWith('microsoft.4297127d')) {
            const deltaBin = path.join(packagesDir, pkg, 'LocalCache', 'Local', 'runtime', 'java-runtime-delta', 'windows-x64', 'java-runtime-delta', 'bin');
            if (fs.existsSync(path.join(deltaBin, 'javaw.exe'))) candidatePaths.push(path.join(deltaBin, 'javaw.exe'));
            else if (fs.existsSync(path.join(deltaBin, 'java.exe'))) candidatePaths.push(path.join(deltaBin, 'java.exe'));
          }
        }
      } catch (_) {}
    }

    const appData = process.env.APPDATA || '';
    const mcRuntimeDir = path.join(appData, '.minecraft', 'runtime', 'java-runtime-delta', 'windows-x64', 'java-runtime-delta', 'bin');
    if (fs.existsSync(path.join(mcRuntimeDir, 'javaw.exe'))) candidatePaths.push(path.join(mcRuntimeDir, 'javaw.exe'));
    else if (fs.existsSync(path.join(mcRuntimeDir, 'java.exe'))) candidatePaths.push(path.join(mcRuntimeDir, 'java.exe'));

    // 3. Directorios estándar de Program Files
    const candidateDirs = [
      'C:\\Program Files\\Java',
      'C:\\Program Files\\Eclipse Adoptium',
      'C:\\Program Files\\Microsoft',
      'C:\\Program Files\\BellSoft',
      'C:\\Program Files\\Zulu',
      path.join(localAppData, 'Programs', 'Eclipse Adoptium')
    ];

    for (const dir of candidateDirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const folderName = entry.name.toLowerCase();
            // Buscar carpetas que apunten a Java 21 o runtime delta
            if (folderName.includes('21') || folderName.includes('delta')) {
              const binDir = path.join(dir, entry.name, 'bin');
              const javawExe = path.join(binDir, 'javaw.exe');
              const javaExe = path.join(binDir, 'java.exe');

              if (fs.existsSync(javawExe)) candidatePaths.push(javawExe);
              else if (fs.existsSync(javaExe)) candidatePaths.push(javaExe);
            }
          }
        }
      } catch (_) {}
    }

    // 4. Probar cada ejecutable para validar que sea exactamente Java 21
    for (const bin of candidatePaths) {
      try {
        const info = JVMOptimizer.detectJavaSync(bin);
        if (info && info.majorVersion === 21) {
          logger.info(`[Java Detector] Java 21 verificado en: "${bin}" (${info.fullVersion}, ${info.vendor})`);
          return bin;
        }
      } catch (_) {}
    }

    return null;
  }

  /**
   * Descarga el ZIP portable oficial de Eclipse Temurin JRE 21 para Windows x64
   * desde la API de Adoptium y lo extrae en <sharedRoot>/runtime/java21/
   */
  static async downloadTemurinJre21(sharedRoot, onProgress = null) {
    const runtimeDir = path.join(sharedRoot, 'runtime', 'java21');
    if (!fs.existsSync(runtimeDir)) {
      fs.mkdirSync(runtimeDir, { recursive: true });
    }

    const zipTempPath = path.join(sharedRoot, 'runtime', 'temurin-jre21-temp.zip');
    const apiUrl = 'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse?project=jdk';

    logger.info(`[Adoptium API] Iniciando descarga de Eclipse Temurin JRE 21 portable oficial...`);
    if (onProgress) onProgress({ type: 'java_download', message: 'Descargando Eclipse Temurin JRE 21 oficial portable...', percent: 10 });

    const response = await fetch(apiUrl, {
      redirect: 'follow',
      headers: { 'User-Agent': 'SHUBATECH/ShubaCore/1.0.0' }
    });

    if (!response.ok) {
      throw new Error(`Fallo al descargar JRE 21 desde Adoptium (HTTP ${response.status}: ${response.statusText})`);
    }

    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
    let receivedBytes = 0;

    const fileStream = fs.createWriteStream(zipTempPath);
    const bodyStream = Readable.fromWeb(response.body);

    bodyStream.on('data', (chunk) => {
      receivedBytes += chunk.length;
      if (totalBytes > 0 && onProgress) {
        const percent = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
        onProgress({ type: 'java_download', message: `Descargando JRE 21 portable (${percent}%)...`, percent });
      }
    });

    await finished(bodyStream.pipe(fileStream));

    logger.info(`[Adoptium API] Descomprimiendo JRE 21 en: ${runtimeDir}...`);
    if (onProgress) onProgress({ type: 'java_extract', message: 'Descomprimiendo runtime portable de Java 21...', percent: 90 });

    const zip = new AdmZip(zipTempPath);
    zip.extractAllTo(runtimeDir, true);

    try {
      if (fs.existsSync(zipTempPath)) fs.unlinkSync(zipTempPath);
    } catch (_) {}

    const located = JVMOptimizer._findExecutableRecursively(runtimeDir, 'javaw.exe') ||
                    JVMOptimizer._findExecutableRecursively(runtimeDir, 'java.exe');

    if (!located) {
      throw new Error(`No se encontró javaw.exe tras descomprimir JRE 21 en ${runtimeDir}`);
    }

    logger.info(`[Java 21 Installer] ¡Java 21 portable preparado con éxito en: "${located}"!`);
    return located;
  }

  /**
   * Garantiza la obtención de un binario válido de Java 21:
   * 1. Revisa si existe localmente en el PC.
   * 2. Si no existe, lo descarga automáticamente en <sharedRoot>/runtime/java21/
   */
  static async ensureJava21(sharedRoot = null, onProgress = null) {
    const existing = JVMOptimizer.findJava21(sharedRoot);
    if (existing) {
      return existing;
    }

    if (!sharedRoot) {
      throw new Error('No se encontró Java 21 en el equipo y no se especificó la ruta compartida para la descarga.');
    }

    logger.info('[Java 21] No se encontró Java 21 en el sistema. Descargando automáticamente Eclipse Temurin JRE 21 portable...');
    return await JVMOptimizer.downloadTemurinJre21(sharedRoot, onProgress);
  }

  /**
   * Detecta y garantiza un entorno de Java compatible.
   * Si la versión de MC requiere Java 21 (como 1.20.5+ o 1.21.1) y el sistema apunta a Java 24/25,
   * fuerza la utilización de Java 21 oficial.
   */
  static async detectJava(customJavaPath = null, targetMcVersion = '1.21.1', sharedRoot = null, onProgress = null) {
    let javaBin = customJavaPath && customJavaPath.trim() !== '' ? customJavaPath : null;

    // Si no hay ruta configurada, resolver dinámicamente con JavaManager
    if (!javaBin) {
      const { JavaManager } = require('./JavaManager');
      const resolved = await JavaManager.resolveJavaForLaunch({
        mcVersion: targetMcVersion,
        sharedRoot,
        onProgress
      });
      javaBin = resolved.path;
    }

    logger.info(`Detectando runtime de Java en: "${javaBin}"...`);

    return new Promise((resolve) => {
      execFile(javaBin, ['-version'], { timeout: 7000 }, (error, stdout, stderr) => {
        const output = (stderr || '') + '\n' + (stdout || '');

        if (error && !output.includes('version')) {
          logger.warn(`No se pudo ejecutar Java en "${javaBin}": ${error.message}`);
          return resolve({
            success: false,
            path: javaBin,
            error: `No se encontró Java en "${javaBin}".`,
            rawOutput: output
          });
        }

        const parsed = JVMOptimizer.parseJavaVersion(output);

        logger.info(`Java activo: Versión ${parsed.majorVersion} (${parsed.vendor}, ${parsed.arch}) en "${javaBin}"`);

        resolve({
          success: true,
          path: javaBin,
          majorVersion: parsed.majorVersion,
          fullVersion: parsed.fullVersion,
          vendor: parsed.vendor,
          is64Bit: parsed.is64Bit,
          arch: parsed.arch,
          recommendedGC: 'CurseForge / Mojang G1GC',
          rawOutput: output.trim()
        });
      });
    });
  }

  /**
   * Detección síncrona fiable mediante spawnSync combinando stdout y stderr
   */
  static detectJavaSync(customJavaPath = null) {
    const javaBin = customJavaPath && customJavaPath.trim() !== '' ? customJavaPath : 'java';
    try {
      const res = spawnSync(javaBin, ['-version'], {
        timeout: 5000,
        windowsHide: true
      });
      const output = (res.stderr ? res.stderr.toString() : '') + '\n' + (res.stdout ? res.stdout.toString() : '');
      return JVMOptimizer.parseJavaVersion(output);
    } catch (err) {
      return { majorVersion: 0, fullVersion: 'Desconocida', is64Bit: true, vendor: 'Desconocido' };
    }
  }

  static parseJavaVersion(output) {
    let majorVersion = 17;
    let fullVersion = 'Desconocida';
    let is64Bit = true;
    let vendor = 'OpenJDK';

    const versionMatch = output.match(/(?:openjdk|java) version "(?:1\.)?(\d+)(?:\.([\d_.]+))?"/i) ||
                         output.match(/build (?:1\.)?(\d+)(?:\.([\d_.]+))?/i);

    if (versionMatch) {
      majorVersion = parseInt(versionMatch[1], 10);
      fullVersion = versionMatch[0];
    }

    if (output.includes('Temurin') || output.includes('Adoptium')) {
      vendor = 'Eclipse Temurin';
    } else if (output.includes('HotSpot') || output.includes('Oracle')) {
      vendor = 'Oracle HotSpot';
    } else if (output.includes('Corretto')) {
      vendor = 'Amazon Corretto';
    } else if (output.includes('Zulu')) {
      vendor = 'Azul Zulu';
    } else if (output.includes('Microsoft')) {
      vendor = 'Microsoft Build of OpenJDK';
    }

    if (output.includes('64-Bit') || output.includes('x86_64') || output.includes('amd64')) {
      is64Bit = true;
    } else if (output.includes('32-Bit') || output.includes('x86')) {
      is64Bit = false;
    }

    return {
      majorVersion,
      fullVersion,
      vendor,
      is64Bit,
      arch: is64Bit ? '64-Bit' : '32-Bit'
    };
  }

  /**
   * Construye argumentos JVM oficiales de CurseForge / Mojang basados en G1GC
   * de alto rendimiento y máxima estabilidad para modpacks de 300+ mods.
   */
  static buildJvmArguments({ majorVersion = 21, ramMin, ramMax, memoryMin = '2G', memoryMax = '8G', customJvmArgs = '' } = {}) {
    const flags = [];

    // 1. Memoria RAM (CurseForge / Mojang: -Xmx y -Xms)
    const minVal = ramMin || memoryMin || '2G';
    const maxVal = ramMax || memoryMax || '8G';
    const cleanMin = String(minVal).trim().toUpperCase();
    const cleanMax = String(maxVal).trim().toUpperCase();
    const xms = cleanMin.endsWith('G') || cleanMin.endsWith('M') ? cleanMin : cleanMin + 'G';
    const xmx = cleanMax.endsWith('G') || cleanMax.endsWith('M') ? cleanMax : cleanMax + 'G';

    // CurseForge / Mojang: -Xmx primero, -Xms segundo (sin forzar Xms = Xmx para evitar Allocation Stalls)
    flags.push(`-Xmx${xmx}`);
    flags.push(`-Xms${xms}`);

    // 2. Argumentos JVM oficiales de CurseForge / Mojang para G1GC
    flags.push(
      '-XX:+UnlockExperimentalVMOptions',
      '-XX:+UseG1GC',
      '-XX:G1NewSizePercent=20',
      '-XX:G1ReservePercent=20',
      '-XX:MaxGCPauseMillis=50',
      '-XX:G1HeapRegionSize=32M',
      '-XX:+DisableExplicitGC'
    );

    // 3. Flags para Java 21+ (NeoForge 1.21+ exige --enable-native-access=ALL-UNNAMED)
    if (majorVersion >= 21) {
      flags.push('--enable-native-access=ALL-UNNAMED');
    }

    if (customJvmArgs && typeof customJvmArgs === 'string') {
      const userArgs = customJvmArgs.trim().split(/\s+/).filter((a) => a.length > 0);
      userArgs.forEach((arg) => {
        if (!flags.includes(arg)) flags.push(arg);
      });
    }

    return flags;
  }
}

module.exports = { JVMOptimizer };
