/**
 * ShubaCore - Modloader Resolver & Headless Client Installer
 * Developed by SHUBATECH
 *
 * Implements headless installation for NeoForge, Forge and Fabric:
 * 1. Ensures dummy `launcher_profiles.json` exists in `mcRoot` (mandatory for Forge/NeoForge installers).
 * 2. Ensures Vanilla base client (<mcVersion>.jar and <mcVersion>.json) exists before running the installer.
 * 3. Downloads official installer jar and verifies size > 1MB.
 * 4. Runs headless `java -jar <installer.jar> --installClient <mcRoot>` capturing stdout & stderr.
 * 5. Yields official version JSON name so MCLC launches directly mapped without buggy wrappers.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { Readable } = require('stream');
const { finished } = require('stream/promises');
const { defaultLogger: logger } = require('../utils/logger');
const { LoaderVersionResolver } = require('./LoaderVersionResolver');

class ModloaderResolver {
  /**
   * Obtiene la versión recomendada por defecto (delegado a LoaderVersionResolver)
   */
  static getRecommendedLoaderVersion(mcVersion, loader) {
    return LoaderVersionResolver.getRecommendedLoaderVersion(mcVersion, loader);
  }

  /**
   * REQUISITO 1: Asegura la existencia de `launcher_profiles.json` dummy en la raíz de Minecraft.
   * Los instaladores oficiales de Forge y NeoForge verifican este archivo antes de continuar;
   * si no existe, fallan de inmediato con código 1 ("There is no minecraft installation at this location").
   */
  static ensureLauncherProfilesJson(mcRoot) {
    if (!fs.existsSync(mcRoot)) {
      fs.mkdirSync(mcRoot, { recursive: true });
    }

    const launcherProfilesPath = path.join(mcRoot, 'launcher_profiles.json');
    if (!fs.existsSync(launcherProfilesPath)) {
      logger.info(`[ModloaderResolver] Creando launcher_profiles.json dummy obligatorio en: ${launcherProfilesPath}`);
      fs.writeFileSync(
        launcherProfilesPath,
        JSON.stringify({ profiles: {}, settings: {}, version: 3 }, null, 2),
        'utf8'
      );
    }
  }

  /**
   * REQUISITO 2: Asegura que el cliente base Vanilla (<mcVersion>.jar y <mcVersion>.json)
   * exista antes de ejecutar el instalador de NeoForge/Forge.
   */
  static async ensureVanillaClient({ mcRoot, mcVersion, onProgress = null }) {
    const versionDir = path.join(mcRoot, 'versions', mcVersion);
    const clientJarPath = path.join(versionDir, `${mcVersion}.jar`);
    const clientJsonPath = path.join(versionDir, `${mcVersion}.json`);

    const hasJar = fs.existsSync(clientJarPath) && fs.statSync(clientJarPath).size > 1024 * 1024;
    const hasJson = fs.existsSync(clientJsonPath) && fs.statSync(clientJsonPath).size > 100;

    if (hasJar && hasJson) {
      logger.info(`Cliente base Vanilla ${mcVersion} verificado (.jar y .json válidos) en: ${versionDir}`);
      return true;
    }

    logger.info(`Preparando cliente base oficial Vanilla ${mcVersion} desde los servidores de Mojang...`);
    if (onProgress) onProgress({ type: 'vanilla', message: `Consultando manifiesto de Mojang para Vanilla ${mcVersion}...`, percent: 10 });

    if (!fs.existsSync(versionDir)) {
      fs.mkdirSync(versionDir, { recursive: true });
    }

    const manifestRes = await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json', {
      headers: { 'User-Agent': 'SHUBATECH/ShubaCore/1.1.0' }
    });

    if (!manifestRes.ok) {
      throw new Error(`Fallo al consultar el manifiesto oficial de Mojang (HTTP ${manifestRes.status})`);
    }

    const manifest = await manifestRes.json();
    const verEntry = (manifest.versions || []).find((v) => v.id === mcVersion);

    if (!verEntry || !verEntry.url) {
      throw new Error(`La versión de Minecraft ${mcVersion} no fue encontrada en el manifiesto oficial de Mojang.`);
    }

    if (onProgress) onProgress({ type: 'vanilla', message: `Descargando metadatos oficiales de ${mcVersion}.json...`, percent: 20 });
    const pkgRes = await fetch(verEntry.url, { headers: { 'User-Agent': 'SHUBATECH/ShubaCore/1.1.0' } });
    if (!pkgRes.ok) throw new Error(`Fallo al descargar metadatos de ${mcVersion}`);
    const pkgData = await pkgRes.json();

    fs.writeFileSync(clientJsonPath, JSON.stringify(pkgData, null, 2), 'utf8');
    logger.info(`Metadatos guardados: ${clientJsonPath}`);

    const clientUrl = pkgData.downloads?.client?.url;
    if (!clientUrl) {
      throw new Error(`No se encontró URL de descarga del cliente Vanilla para ${mcVersion}`);
    }

    logger.info(`Descargando ejecutable oficial Vanilla ${mcVersion}.jar desde: ${clientUrl}`);
    await ModloaderResolver._downloadFile(clientUrl, clientJarPath, (pct) => {
      if (onProgress) onProgress({ type: 'vanilla', message: `Descargando cliente base Vanilla ${mcVersion}.jar (${pct}%)...`, percent: pct });
    });

    if (!fs.existsSync(clientJarPath) || fs.statSync(clientJarPath).size < 1024 * 1024) {
      throw new Error(`El archivo Vanilla ${clientJarPath} descargado es inválido o menor a 1MB.`);
    }

    logger.info(`Cliente base oficial Vanilla ${mcVersion} verificado y listo.`);
    return true;
  }

  /**
   * Prepara el modloader instalándolo de forma nativa/headless para evitar el wrapper defectuoso de MCLC
   *
   * @param {Object} options
   * @param {string} options.mcRoot - Ruta raíz compartida de Minecraft (.shubacore)
   * @param {string} options.mcVersion - Versión de Minecraft (ej: 1.21.1)
   * @param {string} options.loader - 'neoforge' | 'forge' | 'fabric' | 'quilt' | 'vanilla'
   * @param {string} options.loaderVersion - Versión exacta del loader (ej: 21.1.265)
   * @param {string} options.javaPath - Ejecutable de Java compatible (Java 21)
   * @param {Function} [options.onProgress] - Progreso
   * @returns {Promise<Object>} { customVersionName, isVanilla }
   */
  static async prepareLoader({ mcRoot, mcVersion, loader, loaderVersion, javaPath, onProgress = null }) {
    const norm = (loader || 'vanilla').toLowerCase().trim();

    // 1. Crear launcher_profiles.json dummy obligatorio en la raíz
    ModloaderResolver.ensureLauncherProfilesJson(mcRoot);

    if (norm === 'vanilla') {
      await ModloaderResolver.ensureVanillaClient({ mcRoot, mcVersion, onProgress });
      return { customVersionName: null, isVanilla: true };
    }

    // 2. Asegurar primero que exista el cliente base Vanilla
    await ModloaderResolver.ensureVanillaClient({ mcRoot, mcVersion, onProgress });

    if (norm === 'neoforge') {
      return await ModloaderResolver._installNeoForgeHeadless({ mcRoot, mcVersion, loaderVersion, javaPath, onProgress });
    }

    if (norm === 'fabric') {
      return await ModloaderResolver._installFabricHeadless({ mcRoot, mcVersion, loaderVersion, javaPath, onProgress });
    }

    if (norm === 'forge') {
      return await ModloaderResolver._installForgeHeadless({ mcRoot, mcVersion, loaderVersion, javaPath, onProgress });
    }

    throw new Error(`Loader no soportado: ${loader}`);
  }

  /**
   * REQUISITOS 1, 2 y 3: Instalación silenciosa de NeoForge mediante su instalador oficial
   * Ejecuta: java -jar neoforge-<version>-installer.jar --installClient <mcRoot>
   */
  static async _installNeoForgeHeadless({ mcRoot, mcVersion, loaderVersion, javaPath, onProgress }) {
    const cleanLoaderVersion = String(loaderVersion || '21.1.265').split(' ')[0].trim();
    logger.info(`[NeoForge Installer] Verificando instalación de NeoForge ${cleanLoaderVersion} para MC ${mcVersion}...`);

    // 1. Asegurar launcher_profiles.json dummy obligatorio
    ModloaderResolver.ensureLauncherProfilesJson(mcRoot);

    // 2. Comprobar si ya está instalado en <mcRoot>/versions/
    const versionsDir = path.join(mcRoot, 'versions');
    if (fs.existsSync(versionsDir)) {
      const existing = fs.readdirSync(versionsDir).find((dirName) => {
        const lower = dirName.toLowerCase();
        return lower.includes('neoforge') && lower.includes(cleanLoaderVersion);
      });

      if (existing) {
        const jsonPath = path.join(versionsDir, existing, `${existing}.json`);
        if (fs.existsSync(jsonPath) && fs.statSync(jsonPath).size > 200) {
          logger.info(`[NeoForge] Perfil ya instalado y verificado en caché: ${existing} (${jsonPath})`);
          if (onProgress) onProgress({ type: 'loader_install', message: `NeoForge ${cleanLoaderVersion} verificado en caché.`, percent: 100 });
          return { customVersionName: existing, isVanilla: false };
        }
      }
    }

    // 3. Asegurar cliente base Vanilla (<mcVersion>.jar y <mcVersion>.json)
    await ModloaderResolver.ensureVanillaClient({ mcRoot, mcVersion, onProgress });

    // 4. Descargar instalador oficial si no existe o es menor a 1MB
    const loadersDir = path.join(mcRoot, 'loaders', 'neoforge');
    if (!fs.existsSync(loadersDir)) fs.mkdirSync(loadersDir, { recursive: true });

    const installerName = `neoforge-${cleanLoaderVersion}-installer.jar`;
    const installerPath = path.join(loadersDir, installerName);

    if (!fs.existsSync(installerPath) || fs.statSync(installerPath).size < 1024 * 1024) {
      const downloadUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${cleanLoaderVersion}/${installerName}`;
      logger.info(`Descargando instalador oficial de NeoForge desde: ${downloadUrl}`);
      if (onProgress) onProgress({ type: 'loader_download', message: `Descargando instalador oficial NeoForge ${cleanLoaderVersion}...`, percent: 30 });
      await ModloaderResolver._downloadFile(downloadUrl, installerPath, (pct) => {
        if (onProgress) onProgress({ type: 'loader_download', message: `Descargando instalador NeoForge (${pct}%)...`, percent: Math.round(30 + pct * 0.3) });
      });
    }

    // Validar que el archivo descargado sea un jar válido (> 1MB)
    if (!fs.existsSync(installerPath) || fs.statSync(installerPath).size < 1024 * 1024) {
      throw new Error(`El instalador de NeoForge descargado es inválido o menor a 1MB: ${installerPath}`);
    }

    // 5. Ejecutar instalador oficial en modo headless pasando exactamente:
    // java -jar "<ruta_al_installer.jar>" --installClient "<mcRoot>"
    logger.info(`Ejecutando instalador oficial de NeoForge en modo silencioso (--installClient)...`);
    logger.info(`Comando: "${javaPath}" -jar "${installerPath}" --installClient "${mcRoot}"`);
    if (onProgress) onProgress({ type: 'loader_install', message: 'Parcheando cliente y procesando librerías oficiales de NeoForge...', percent: 65 });

    await ModloaderResolver._runJavaJar(javaPath, installerPath, ['--installClient', mcRoot], (line) => {
      if (onProgress) {
        if (line.includes('Processing') || line.includes('Patching') || line.includes('Extracting') || line.includes('Downloading')) {
          onProgress({ type: 'loader_install', message: line, percent: 85 });
        }
      }
    });

    // 6. Localizar el perfil generado en <mcRoot>/versions/
    const generated = fs.readdirSync(versionsDir).find((dirName) => {
      const lower = dirName.toLowerCase();
      return lower.includes('neoforge') && lower.includes(cleanLoaderVersion);
    }) || `neoforge-${cleanLoaderVersion}`;

    const generatedJson = path.join(versionsDir, generated, `${generated}.json`);
    if (!fs.existsSync(generatedJson)) {
      throw new Error(`El instalador de NeoForge finalizó pero no generó el archivo de versión esperado: ${generatedJson}`);
    }

    // Saneamiento proactivo del JSON recién generado unificando argumentos JVM y vaciando `arguments.jvm` para MCLC
    ModloaderResolver.sanitizeAndUnifyJvmArgs({ mcRoot, customVersionName: generated });

    logger.info(`[NeoForge] ¡Instalación headless completada con éxito! Perfil generado: ${generated}`);
    if (onProgress) onProgress({ type: 'loader_install', message: `NeoForge ${cleanLoaderVersion} instalado exitosamente.`, percent: 100 });
    return { customVersionName: generated, isVanilla: false };
  }

  /**
   * Instalación silenciosa de Fabric
   */
  static async _installFabricHeadless({ mcRoot, mcVersion, loaderVersion, javaPath, onProgress }) {
    const cleanLoaderVersion = String(loaderVersion || '0.16.10').split(' ')[0].trim();
    logger.info(`[Fabric Installer] Verificando Fabric ${cleanLoaderVersion} para MC ${mcVersion}...`);

    ModloaderResolver.ensureLauncherProfilesJson(mcRoot);

    const versionsDir = path.join(mcRoot, 'versions');
    const expectedDir = `fabric-loader-${cleanLoaderVersion}-${mcVersion}`;

    if (fs.existsSync(path.join(versionsDir, expectedDir, `${expectedDir}.json`))) {
      logger.info(`[Fabric] Perfil ya instalado: ${expectedDir}`);
      return { customVersionName: expectedDir, isVanilla: false };
    }

    const loadersDir = path.join(mcRoot, 'loaders', 'fabric');
    if (!fs.existsSync(loadersDir)) fs.mkdirSync(loadersDir, { recursive: true });

    const installerPath = path.join(loadersDir, 'fabric-installer-1.0.1.jar');
    if (!fs.existsSync(installerPath) || fs.statSync(installerPath).size < 100 * 1024) {
      const url = 'https://maven.fabricmc.net/net/fabricmc/fabric-installer/1.0.1/fabric-installer-1.0.1.jar';
      await ModloaderResolver._downloadFile(url, installerPath);
    }

    if (onProgress) onProgress({ type: 'loader_install', message: `Instalando Fabric Loader ${cleanLoaderVersion}...`, percent: 60 });

    await ModloaderResolver._runJavaJar(javaPath, installerPath, [
      'client',
      '-dir', mcRoot,
      '-mcversion', mcVersion,
      '-loader', cleanLoaderVersion,
      '-downloadMinecraft', 'false'
    ]);

    return { customVersionName: expectedDir, isVanilla: false };
  }

  /**
   * Instalación silenciosa de Forge
   */
  static async _installForgeHeadless({ mcRoot, mcVersion, loaderVersion, javaPath, onProgress }) {
    const cleanLoaderVersion = String(loaderVersion || '47.3.0').split(' ')[0].trim();
    logger.info(`[Forge Installer] Verificando Forge ${cleanLoaderVersion} para MC ${mcVersion}...`);

    ModloaderResolver.ensureLauncherProfilesJson(mcRoot);

    const versionsDir = path.join(mcRoot, 'versions');
    if (fs.existsSync(versionsDir)) {
      const existing = fs.readdirSync(versionsDir).find((d) => d.toLowerCase().includes('forge') && d.includes(cleanLoaderVersion));
      if (existing && fs.existsSync(path.join(versionsDir, existing, `${existing}.json`))) {
        logger.info(`[Forge] Perfil ya instalado: ${existing}`);
        return { customVersionName: existing, isVanilla: false };
      }
    }

    await ModloaderResolver.ensureVanillaClient({ mcRoot, mcVersion, onProgress });

    const loadersDir = path.join(mcRoot, 'loaders', 'forge');
    if (!fs.existsSync(loadersDir)) fs.mkdirSync(loadersDir, { recursive: true });

    const installerName = `forge-${mcVersion}-${cleanLoaderVersion}-installer.jar`;
    const installerPath = path.join(loadersDir, installerName);

    if (!fs.existsSync(installerPath) || fs.statSync(installerPath).size < 1024 * 1024) {
      const url = `https://maven.minecraftforge.net/net/minecraftforge/forge/${mcVersion}-${cleanLoaderVersion}/${installerName}`;
      logger.info(`Descargando instalador de Forge desde: ${url}`);
      await ModloaderResolver._downloadFile(url, installerPath);
    }

    if (!fs.existsSync(installerPath) || fs.statSync(installerPath).size < 1024 * 1024) {
      throw new Error(`El instalador de Forge descargado es inválido o menor a 1MB: ${installerPath}`);
    }

    if (onProgress) onProgress({ type: 'loader_install', message: `Instalando Forge ${cleanLoaderVersion}...`, percent: 60 });

    await ModloaderResolver._runJavaJar(javaPath, installerPath, ['--installClient', mcRoot]);

    const generated = fs.readdirSync(versionsDir).find((d) => d.toLowerCase().includes('forge') && d.includes(cleanLoaderVersion)) || `${mcVersion}-forge-${cleanLoaderVersion}`;
    return { customVersionName: generated, isVanilla: false };
  }

  /**
   * REQUISITO 3: Ejecuta un JAR con Java en un subproceso asíncrono capturando tanto stdout como stderr
   */
  static _runJavaJar(javaBin, jarPath, args = [], onLine = null) {
    return new Promise((resolve, reject) => {
      const fullArgs = ['-jar', jarPath, ...args];
      logger.info(`[Java Process] Ejecutando: "${javaBin}" ${fullArgs.join(' ')}`);

      const proc = spawn(javaBin, fullArgs, {
        cwd: path.dirname(jarPath),
        windowsHide: true
      });

      let stdoutOutput = '';
      let stderrOutput = '';
      let combinedOutput = '';

      proc.stdout.on('data', (d) => {
        const text = d.toString();
        stdoutOutput += text;
        combinedOutput += text;
        const lines = text.split(/\r?\n/).filter(Boolean);
        for (const line of lines) {
          logger.info(`[Java stdout] ${line}`);
          if (onLine) onLine(line);
        }
      });

      proc.stderr.on('data', (d) => {
        const text = d.toString();
        stderrOutput += text;
        combinedOutput += text;
        const lines = text.split(/\r?\n/).filter(Boolean);
        for (const line of lines) {
          logger.warn(`[Java stderr] ${line}`);
          if (onLine) onLine(line);
        }
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          const detail = (combinedOutput.trim() || stderrOutput.trim() || stdoutOutput.trim() || 'Sin detalles registrados por el instalador');
          logger.error(`El proceso Java finalizó con error (código ${code}):\n${detail}`);
          reject(new Error(`Fallo en el instalador (código de salida ${code}):\n${detail}`));
        }
      });

      proc.on('error', (err) => {
        logger.error(`Error al iniciar subproceso de Java ("${javaBin}"):`, err.stack || err.message);
        reject(err);
      });
    });
  }

  static async _downloadFile(url, destinationPath, onProgress = null) {
    const response = await fetch(url, { headers: { 'User-Agent': 'SHUBATECH/ShubaCore/1.1.0' } });
    if (!response.ok) {
      throw new Error(`Fallo al descargar ${url}: ${response.status} ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
    let receivedBytes = 0;

    const fileStream = fs.createWriteStream(destinationPath);
    const bodyStream = Readable.fromWeb(response.body);

    bodyStream.on('data', (chunk) => {
      receivedBytes += chunk.length;
      if (totalBytes > 0 && onProgress) {
        const percent = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
        onProgress(percent);
      }
    });

    await finished(bodyStream.pipe(fileStream));
  }

  /**
   * REQUISITOS 1 y 2: Unifica pares de flags JVM en neoforge-<version>.json y sanea el JSON en disco.
   *
   * 1. Unifica pares separados en arguments.jvm (ej: ["--add-opens", "java.base/..."] -> ["--add-opens=java.base/..."])
   *    y ["-p", "..."] -> ["--module-path=..."]
   * 2. Reemplaza los placeholders oficiales:
   *    - ${library_directory} -> <mcRoot>/libraries (normalizado con '/' para evitar problemas de escape en Java)
   *    - ${classpath_separator} -> ';'
   *    - ${version_name} -> customVersionName
   * 3. Sanea el archivo <customVersionName>.json en disco guardando arguments.jvm = [] (respaldando _shubaRawJvm)
   *    para que MCLC no vuelva a inyectar argumentos rotos.
   *
   * @param {Object} params
   * @param {string} params.mcRoot - Ruta raíz de Minecraft (.shubacore)
   * @param {string} params.customVersionName - Nombre de la versión (ej: neoforge-21.1.265)
   * @returns {string[]} Lista de argumentos JVM unificados y listos para inyectar en customArgs
   */
  static sanitizeAndUnifyJvmArgs({ mcRoot, customVersionName }) {
    if (!customVersionName) return [];

    const customJsonPath = path.join(mcRoot, 'versions', customVersionName, `${customVersionName}.json`);
    if (!fs.existsSync(customJsonPath)) {
      return [];
    }

    try {
      const vData = JSON.parse(fs.readFileSync(customJsonPath, 'utf8'));
      const librariesDir = path.resolve(mcRoot, 'libraries').replace(/\\/g, '/');
      const classpathSeparator = path.delimiter; // ';' en Windows

      // Obtener el array original sin procesar (si ya fue respaldado, usar el respaldo)
      const rawJvmArgs = Array.isArray(vData._shubaRawJvm)
        ? vData._shubaRawJvm
        : (Array.isArray(vData.arguments?.jvm) ? vData.arguments.jvm : []);

      if (!rawJvmArgs || rawJvmArgs.length === 0) {
        return [];
      }

      const resolvePlaceholders = (str) => {
        if (typeof str !== 'string') return '';
        return str
          .split('${library_directory}').join(librariesDir)
          .split('${classpath_separator}').join(classpathSeparator)
          .split('${version_name}').join(customVersionName);
      };

      const unifiedArgs = [];
      for (let i = 0; i < rawJvmArgs.length; i++) {
        const curr = rawJvmArgs[i];
        if (typeof curr === 'string') {
          // Descartar banderas de memoria por defecto (-Xmx / -Xms) del manifiesto
          if (curr.startsWith('-Xmx') || curr.startsWith('-Xms')) {
            continue;
          }
          if (curr === '-p' || curr === '--module-path') {
            if (i + 1 < rawJvmArgs.length && typeof rawJvmArgs[i + 1] === 'string') {
              unifiedArgs.push('--module-path=' + resolvePlaceholders(rawJvmArgs[i + 1]));
              i++;
            } else {
              unifiedArgs.push(resolvePlaceholders(curr));
            }
          } else if (['--add-modules', '--add-opens', '--add-exports', '--add-reads'].includes(curr)) {
            if (i + 1 < rawJvmArgs.length && typeof rawJvmArgs[i + 1] === 'string' && !rawJvmArgs[i + 1].startsWith('-')) {
              unifiedArgs.push(curr + '=' + resolvePlaceholders(rawJvmArgs[i + 1]));
              i++;
            } else {
              unifiedArgs.push(resolvePlaceholders(curr));
            }
          } else {
            unifiedArgs.push(resolvePlaceholders(curr));
          }
        } else if (typeof curr === 'object' && curr !== null && curr.value) {
          const valList = Array.isArray(curr.value) ? curr.value : [curr.value];
          for (let j = 0; j < valList.length; j++) {
            const v = valList[j];
            if (typeof v === 'string') {
              // Descartar banderas de memoria por defecto (-Xmx / -Xms) del manifiesto
              if (v.startsWith('-Xmx') || v.startsWith('-Xms')) {
                continue;
              }
              if (v === '-p' || v === '--module-path') {
                if (j + 1 < valList.length && typeof valList[j + 1] === 'string') {
                  unifiedArgs.push('--module-path=' + resolvePlaceholders(valList[j + 1]));
                  j++;
                } else {
                  unifiedArgs.push(resolvePlaceholders(v));
                }
              } else if (['--add-modules', '--add-opens', '--add-exports', '--add-reads'].includes(v)) {
                if (j + 1 < valList.length && typeof valList[j + 1] === 'string' && !valList[j + 1].startsWith('-')) {
                  unifiedArgs.push(v + '=' + resolvePlaceholders(valList[j + 1]));
                  j++;
                } else {
                  unifiedArgs.push(resolvePlaceholders(v));
                }
              } else {
                unifiedArgs.push(resolvePlaceholders(v));
              }
            }
          }
        }
      }

      // REQUISITO 2: Respaldar original en _shubaRawJvm y vaciar arguments.jvm en disco
      let jsonModified = false;
      if (!Array.isArray(vData._shubaRawJvm)) {
        vData._shubaRawJvm = rawJvmArgs;
        jsonModified = true;
      }
      if (!vData.arguments) {
        vData.arguments = {};
        jsonModified = true;
      }
      if (Array.isArray(vData.arguments.jvm) && vData.arguments.jvm.length > 0) {
        vData.arguments.jvm = [];
        jsonModified = true;
      }
      if (Array.isArray(vData.arguments['default-user-jvm'])) {
        const prevLen = vData.arguments['default-user-jvm'].length;
        vData.arguments['default-user-jvm'] = vData.arguments['default-user-jvm'].filter(arg => {
          if (typeof arg === 'string') return !arg.startsWith('-Xmx') && !arg.startsWith('-Xms');
          if (arg && typeof arg === 'object' && arg.value) {
            if (typeof arg.value === 'string') return !arg.value.startsWith('-Xmx') && !arg.value.startsWith('-Xms');
            if (Array.isArray(arg.value)) {
              arg.value = arg.value.filter(val => typeof val !== 'string' || (!val.startsWith('-Xmx') && !val.startsWith('-Xms')));
              return arg.value.length > 0;
            }
          }
          return true;
        });
        if (vData.arguments['default-user-jvm'].length !== prevLen) {
          jsonModified = true;
        }
      }

      if (jsonModified) {
        fs.writeFileSync(customJsonPath, JSON.stringify(vData, null, 2), 'utf8');
        logger.info(`[ModloaderResolver] JSON de versión ${customVersionName}.json saneado en disco (arguments.jvm vaciado para MCLC).`);
      }

      return unifiedArgs;
    } catch (err) {
      logger.warn(`[ModloaderResolver] Error al procesar arguments.jvm para ${customVersionName}: ${err.message}`);
      return [];
    }
  }
}

module.exports = { ModloaderResolver };
