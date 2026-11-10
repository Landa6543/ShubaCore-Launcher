/**
 * ShubaCore - Complete Java Version Manager
 * Developed by SHUBATECH
 *
 * Capabilities:
 * 1. Deep scan of installed Java versions (System & Portable in <rootPath>/runtime/)
 * 2. 1-click Download & Installation of official Eclipse Temurin (Java 8, 17, 21, 25)
 * 3. Automatic Java resolution by Minecraft version (reading <mcVersion>.json or version heuristic)
 * 4. Free Java selector (Auto, Force 8, 17, 21, 25, or Custom javaw.exe)
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { Readable } = require('stream');
const { finished } = require('stream/promises');
const AdmZip = require('adm-zip');
const { JVMOptimizer } = require('./JVMOptimizer');
const { defaultLogger: logger } = require('../utils/logger');

// URLs oficiales de la API de Adoptium para Eclipse Temurin Windows x64
const ADOPTIUM_URLS = {
  8: 'https://api.adoptium.net/v3/binary/latest/8/ga/windows/x64/jre/hotspot/normal/eclipse',
  17: 'https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jre/hotspot/normal/eclipse',
  21: 'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse',
  25: 'https://api.adoptium.net/v3/binary/latest/25/ga/windows/x64/jre/hotspot/normal/eclipse'
};

const ADOPTIUM_FALLBACK_URLS = {
  25: 'https://api.adoptium.net/v3/binary/latest/25/ga/windows/x64/jdk/hotspot/normal/eclipse'
};

class JavaManager {
  /**
   * Busca recursivamente javaw.exe o java.exe en un directorio
   */
  static findExecutable(dir, exeNames = ['javaw.exe', 'java.exe']) {
    if (!fs.existsSync(dir)) return null;
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      // Primero buscar en el nivel actual (ej. carpeta bin/)
      for (const item of items) {
        if (item.isFile() && exeNames.some((name) => name.toLowerCase() === item.name.toLowerCase())) {
          return path.join(dir, item.name);
        }
      }
      // Luego descender recursivamente
      for (const item of items) {
        if (item.isDirectory()) {
          const found = JavaManager.findExecutable(path.join(dir, item.name), exeNames);
          if (found) return found;
        }
      }
    } catch (_) {}
    return null;
  }

  /**
   * Escanea y detecta todas las versiones de Java instaladas en el equipo y en ShubaCore
   */
  static scanInstalledJavas(sharedRoot = null) {
    const candidates = new Set();

    // 1. Runtimes portables en <sharedRoot>/runtime/
    if (sharedRoot) {
      const runtimeDir = path.join(sharedRoot, 'runtime');
      if (fs.existsSync(runtimeDir)) {
        try {
          const entries = fs.readdirSync(runtimeDir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const fullDir = path.join(runtimeDir, entry.name);
              const exe = JavaManager.findExecutable(fullDir, ['javaw.exe', 'java.exe']);
              if (exe) candidates.add(exe);
            }
          }
        } catch (_) {}
      }
    }

    // 2. Rutas del Launcher oficial de Minecraft
    const localAppData = process.env.LOCALAPPDATA || '';
    const appData = process.env.APPDATA || '';

    const mcOfficialDelta = path.join(appData, '.minecraft', 'runtime', 'java-runtime-delta', 'windows-x64', 'java-runtime-delta', 'bin', 'javaw.exe');
    if (fs.existsSync(mcOfficialDelta)) candidates.add(mcOfficialDelta);

    const packagesDir = path.join(localAppData, 'Packages');
    if (fs.existsSync(packagesDir)) {
      try {
        const pkgs = fs.readdirSync(packagesDir);
        for (const pkg of pkgs) {
          if (pkg.toLowerCase().startsWith('microsoft.4297127d')) {
            const deltaBin = path.join(packagesDir, pkg, 'LocalCache', 'Local', 'runtime', 'java-runtime-delta', 'windows-x64', 'java-runtime-delta', 'bin', 'javaw.exe');
            if (fs.existsSync(deltaBin)) candidates.add(deltaBin);
          }
        }
      } catch (_) {}
    }

    // 3. Directorios estándar de Program Files
    const searchRoots = [
      'C:\\Program Files\\Eclipse Adoptium',
      'C:\\Program Files\\Java',
      'C:\\Program Files\\Microsoft',
      'C:\\Program Files\\BellSoft',
      'C:\\Program Files\\Zulu',
      'C:\\Program Files\\Common Files\\Oracle\\Java\\javapath',
      path.join(localAppData, 'Programs', 'Eclipse Adoptium')
    ];

    for (const sRoot of searchRoots) {
      if (!fs.existsSync(sRoot)) continue;
      try {
        const entries = fs.readdirSync(sRoot, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subDir = path.join(sRoot, entry.name);
            const javaw = path.join(subDir, 'bin', 'javaw.exe');
            const java = path.join(subDir, 'bin', 'java.exe');
            if (fs.existsSync(javaw)) candidates.add(javaw);
            else if (fs.existsSync(java)) candidates.add(java);
            else {
              // Buscar recursivamente si la estructura tiene otra profundidad
              const rec = JavaManager.findExecutable(subDir, ['javaw.exe', 'java.exe']);
              if (rec) candidates.add(rec);
            }
          } else if (entry.isFile() && (entry.name.toLowerCase() === 'javaw.exe' || entry.name.toLowerCase() === 'java.exe')) {
            candidates.add(path.join(sRoot, entry.name));
          }
        }
      } catch (_) {}
    }

    // 4. Comando 'where java' del sistema
    try {
      const whereRes = spawnSync('where', ['java'], { windowsHide: true });
      if (whereRes && whereRes.stdout) {
        const lines = whereRes.stdout.toString().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        for (const l of lines) {
          if (fs.existsSync(l)) {
            // Intentar preferir javaw.exe en el mismo directorio bin
            const javawSibling = path.join(path.dirname(l), 'javaw.exe');
            if (fs.existsSync(javawSibling)) candidates.add(javawSibling);
            else candidates.add(l);
          }
        }
      }
    } catch (_) {}

    // 5. Analizar cada ejecutable encontrado
    const results = [];
    const seenPaths = new Set();

    for (const binPath of candidates) {
      const normalized = path.normalize(binPath);
      if (seenPaths.has(normalized.toLowerCase())) continue;
      seenPaths.add(normalized.toLowerCase());

      try {
        const info = JVMOptimizer.detectJavaSync(normalized);
        if (info && info.majorVersion > 0) {
          const isPortable = sharedRoot ? normalized.toLowerCase().includes(path.normalize(sharedRoot).toLowerCase()) : false;
          results.push({
            majorVersion: info.majorVersion,
            fullVersion: info.fullVersion,
            vendor: info.vendor,
            is64Bit: info.is64Bit,
            arch: info.arch,
            path: normalized,
            isPortable,
            type: isPortable ? 'portable' : 'system'
          });
        }
      } catch (_) {}
    }

    // Ordenar de mayor a menor versión (ej. 25, 21, 17, 8)
    results.sort((a, b) => b.majorVersion - a.majorVersion);
    return results;
  }

  /**
   * Determina qué versión mayor de Java requiere una versión de Minecraft:
   * 1. Lee <mcRoot>/versions/<mcVersion>/<mcVersion>.json -> javaVersion.majorVersion
   * 2. Si no existe, deduce de manera segura según la versión de Minecraft
   */
  static getRequiredJavaForMinecraft(mcVersion, mcRoot = null) {
    const cleanVer = String(mcVersion || '1.21.1').trim();

    // 1. Comprobar archivo JSON oficial si ya está descargado
    if (mcRoot) {
      const verJsonPath = path.join(mcRoot, 'versions', cleanVer, `${cleanVer}.json`);
      if (fs.existsSync(verJsonPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(verJsonPath, 'utf8'));
          if (data.javaVersion && data.javaVersion.majorVersion) {
            const officialMajor = parseInt(data.javaVersion.majorVersion, 10);
            if (!isNaN(officialMajor) && officialMajor > 0) {
              logger.info(`[JavaManager] Requisito oficial detectado en ${cleanVer}.json: Java ${officialMajor}`);
              return officialMajor;
            }
          }
        } catch (_) {}
      }
    }

    // 2. Inferencia inteligente si no está descargado el JSON:
    // Versiones 25+, 26+, snapshots 25w... o clasfile 69.0 requieren Java 25
    if (/^(?:2[5-9]|[3-9]\d)/.test(cleanVer) || cleanVer.toLowerCase().startsWith('25w')) {
      return 25;
    }

    // Minecraft 1.20.5 a 1.21.x requieren Java 21
    if (cleanVer.startsWith('1.21') || cleanVer === '1.20.5' || cleanVer === '1.20.6') {
      return 21;
    }

    // Minecraft 1.17 a 1.20.4 requieren Java 17
    if (cleanVer.startsWith('1.17') || cleanVer.startsWith('1.18') || cleanVer.startsWith('1.19') || cleanVer.startsWith('1.20')) {
      return 17;
    }

    // Minecraft 1.16.5 y anteriores requieren Java 8
    return 8;
  }

  /**
   * Busca si existe un Java de la versión mayor especificada
   */
  static findJavaForVersion(targetMajorVersion, sharedRoot = null) {
    const target = parseInt(targetMajorVersion, 10);
    if (isNaN(target)) return null;

    // 1. Primero revisar runtime portable propio en <sharedRoot>/runtime/java<target>/
    if (sharedRoot) {
      const portableDir = path.join(sharedRoot, 'runtime', `java${target}`);
      if (fs.existsSync(portableDir)) {
        const found = JavaManager.findExecutable(portableDir, ['javaw.exe', 'java.exe']);
        if (found) {
          const info = JVMOptimizer.detectJavaSync(found);
          if (info && info.majorVersion === target) {
            return { path: found, majorVersion: target, vendor: info.vendor, isPortable: true };
          }
        }
      }
    }

    // 2. Buscar en las instalaciones detectadas en el sistema
    const allInstalled = JavaManager.scanInstalledJavas(sharedRoot);
    const match = allInstalled.find((j) => j.majorVersion === target);
    if (match) {
      return { path: match.path, majorVersion: match.majorVersion, vendor: match.vendor, isPortable: match.isPortable };
    }

    return null;
  }

  /**
   * Descarga e instala en 1 clic Eclipse Temurin oficial portable para Windows x64
   */
  static async downloadAndInstallJava(majorVersion, sharedRoot, onProgress = null) {
    const target = parseInt(majorVersion, 10);
    const targetUrl = ADOPTIUM_URLS[target];

    if (!targetUrl) {
      throw new Error(`No hay URL de Adoptium configurada para Java ${majorVersion}.`);
    }

    const runtimeDir = path.join(sharedRoot, 'runtime', `java${target}`);
    if (!fs.existsSync(runtimeDir)) {
      fs.mkdirSync(runtimeDir, { recursive: true });
    }

    const zipTempPath = path.join(sharedRoot, 'runtime', `temurin-java${target}-temp.zip`);
    logger.info(`[JavaManager] Iniciando descarga de Eclipse Temurin Java ${target} desde Adoptium API...`);
    if (onProgress) onProgress({ type: 'java_download', message: `Descargando Eclipse Temurin Java ${target} oficial...`, percent: 10 });

    let response = await fetch(targetUrl, {
      redirect: 'follow',
      headers: { 'User-Agent': 'SHUBATECH/ShubaCore/1.0.0' }
    });

    // Fallback a JDK si JRE falla (por ejemplo en Java 25)
    if (!response.ok && ADOPTIUM_FALLBACK_URLS[target]) {
      logger.info(`[JavaManager] JRE no disponible, intentando JDK fallback para Java ${target}...`);
      response = await fetch(ADOPTIUM_FALLBACK_URLS[target], {
        redirect: 'follow',
        headers: { 'User-Agent': 'SHUBATECH/ShubaCore/1.0.0' }
      });
    }

    if (!response.ok) {
      throw new Error(`Fallo al descargar Java ${target} desde Adoptium (HTTP ${response.status}: ${response.statusText})`);
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
        onProgress({ type: 'java_download', message: `Descargando Java ${target} (${percent}%)...`, percent });
      }
    });

    await finished(bodyStream.pipe(fileStream));

    logger.info(`[JavaManager] Descomprimiendo Java ${target} en: ${runtimeDir}...`);
    if (onProgress) onProgress({ type: 'java_extract', message: `Descomprimiendo Java ${target} portable...`, percent: 90 });

    const zip = new AdmZip(zipTempPath);
    zip.extractAllTo(runtimeDir, true);

    try {
      if (fs.existsSync(zipTempPath)) fs.unlinkSync(zipTempPath);
    } catch (_) {}

    const located = JavaManager.findExecutable(runtimeDir, ['javaw.exe', 'java.exe']);
    if (!located) {
      throw new Error(`No se encontró javaw.exe tras descomprimir Java ${target} en ${runtimeDir}`);
    }

    const detected = JVMOptimizer.detectJavaSync(located);
    logger.info(`🎉 [JavaManager] ¡Java ${target} instalado exitosamente en: "${located}" (${detected.vendor})!`);

    return {
      success: true,
      majorVersion: target,
      path: located,
      fullVersion: detected.fullVersion,
      vendor: detected.vendor
    };
  }

  /**
   * Resuelve el ejecutable de Java ideal antes de lanzar Minecraft:
   * 1. Revisa configuración del perfil o global (auto, force-8, force-17, force-21, force-25, custom)
   * 2. Si es 'auto', consulta la versión requerida para mcVersion
   * 3. Si no existe, descarga e instala automáticamente
   */
  static async resolveJavaForLaunch({ profile = null, overrideOptions = {}, globalConfig = {}, mcVersion = '1.21.1', sharedRoot, onProgress = null }) {
    // 1. Selector de Java del perfil o global
    const selection = overrideOptions.javaSelection ||
                      profile?.javaSelection ||
                      profile?.javaVersionSelection ||
                      globalConfig.performance?.javaSelection ||
                      'auto';

    logger.info(`[JavaManager] Modo de selección de Java: "${selection}" (Minecraft ${mcVersion})`);

    // 2. Ruta personalizada manual
    if (selection === 'custom' || selection === 'manual') {
      const customPath = overrideOptions.javaPath || profile?.javaPath || globalConfig.performance?.javaPath;
      if (customPath && fs.existsSync(customPath)) {
        const detected = JVMOptimizer.detectJavaSync(customPath);
        return {
          path: customPath,
          majorVersion: detected.majorVersion || 21,
          vendor: detected.vendor,
          is64Bit: detected.is64Bit
        };
      }
    }

    // 3. Versión forzada explícita
    let targetMajor = null;
    if (selection === 'force-25' || selection === '25') targetMajor = 25;
    else if (selection === 'force-21' || selection === '21') targetMajor = 21;
    else if (selection === 'force-17' || selection === '17') targetMajor = 17;
    else if (selection === 'force-8' || selection === '8') targetMajor = 8;
    else {
      // 4. Modo Automático: Deducir según versión de Minecraft
      targetMajor = JavaManager.getRequiredJavaForMinecraft(mcVersion, sharedRoot);
    }

    logger.info(`[JavaManager] Versión de Java requerida para la sesión: Java ${targetMajor}`);

    // Buscar si ya está instalado
    let found = JavaManager.findJavaForVersion(targetMajor, sharedRoot);

    if (!found) {
      logger.info(`[JavaManager] Java ${targetMajor} no encontrado en el equipo. Descargando e instalando automáticamente Eclipse Temurin Java ${targetMajor}...`);
      if (onProgress) {
        onProgress({
          type: 'java_auto_download',
          message: `Minecraft ${mcVersion} requiere Java ${targetMajor}. Descargando runtime oficial...`,
          percent: 5
        });
      }
      const installed = await JavaManager.downloadAndInstallJava(targetMajor, sharedRoot, onProgress);
      found = {
        path: installed.path,
        majorVersion: targetMajor,
        vendor: installed.vendor,
        isPortable: true
      };
    }

    return {
      path: found.path,
      majorVersion: targetMajor,
      vendor: found.vendor || 'Eclipse Temurin',
      is64Bit: true
    };
  }
}

module.exports = {
  JavaManager,
  ADOPTIUM_URLS
};
