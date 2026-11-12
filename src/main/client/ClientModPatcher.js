/**
 * ShubaCore - Client Mod Extractor, Patcher & Rebrander (OneClient -> ShubaClient UI)
 * Developed by SHUBATECH
 *
 * Automatically locates OneClient / Polyfrost installations on the host system,
 * extracts the primary UI expansions JAR (polyplus) and companion mods,
 * rebrands all metadata, language files, textures/SVGs and JVM Constant Pool strings
 * to "SHUBATECH / SHUBACORE / ShubaClient UI", and injects the customized mod
 * and optimization suite into ShubaCore instances.
 *
 * 100% Conflict-Free, native Fabric/Quilt in-game interface.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');
const { defaultLogger: logger } = require('../utils/logger');
const { getConfigManager } = require('../config/ConfigManager');

class ClientModPatcher {
  constructor() {
    this.extractedSource = null;
    this.baseJarPath = null;
    this.customJarPath = null;
    this.companionJars = [];
    this.optJars = [];
  }

  /**
   * Obtiene la carpeta interna de mods de cliente en el almacenamiento de ShubaCore
   */
  getRuntimeClientModsDir() {
    let baseDir = null;
    try {
      const cfgMgr = getConfigManager();
      const sharedRoot = cfgMgr.get('storage.sharedRoot');
      if (sharedRoot && typeof sharedRoot === 'string') {
        baseDir = sharedRoot;
      }
    } catch (_) {}

    if (!baseDir) {
      baseDir = path.join(
        process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : os.homedir()),
        '.shubacore'
      );
    }

    const clientModsDir = path.join(baseDir, 'runtime', 'client-mods');
    if (!fs.existsSync(clientModsDir)) {
      try { fs.mkdirSync(clientModsDir, { recursive: true }); } catch (_) {}
    }
    return clientModsDir;
  }

  /**
   * Escanea las rutas del sistema para localizar OneClient / OneLauncher instalado.
   * Retorna información detallada sobre el JAR de interfaz encontrado y sus dependencias.
   */
  findOneClientInstallation() {
    const userProfile = process.env.USERPROFILE || os.homedir();
    const appData = process.env.APPDATA || path.join(userProfile, 'AppData', 'Roaming');
    const localAppData = process.env.LOCALAPPDATA || path.join(userProfile, 'AppData', 'Local');

    const searchRoots = [
      path.join(appData, 'Polyfrost', 'OneClient'),
      path.join(appData, 'OneLauncher'),
      path.join(localAppData, 'OneLauncher'),
      path.join(appData, 'com.polyfrost.onelauncher'),
      path.join(localAppData, 'com.polyfrost.onelauncher'),
      path.join(userProfile, 'Downloads', 'OneLauncher-main'),
      path.join(userProfile, '.onelauncher')
    ];

    let foundBaseJar = null;
    let foundSourceDir = null;
    const foundCompanions = [];
    const foundOpt = [];

    for (const root of searchRoots) {
      if (!fs.existsSync(root)) continue;

      // 1. Buscar en clusters activos de mods (ej. clusters/26.3 Fabric/mods o .minecraft/mods)
      const candidateModDirs = [
        path.join(root, 'clusters', '26.3 Fabric', 'mods'),
        path.join(root, '.minecraft', 'mods', '26.3 Fabric'),
        path.join(root, '.minecraft', 'mods'),
        path.join(root, 'metadata', 'packages', 'mods', 'modrinth')
      ];

      for (const mDir of candidateModDirs) {
        if (!fs.existsSync(mDir)) continue;

        try {
          const files = this._collectJarsRecursive(mDir);
          for (const file of files) {
            const fileName = path.basename(file).toLowerCase();

            // Identificar PolyPlus (interfaz principal de OneClient con menú 3D, wardrobe, etc.)
            if (fileName.startsWith('polyplus') && fileName.endsWith('.jar') && !foundBaseJar) {
              foundBaseJar = file;
              foundSourceDir = path.dirname(file);
            }
            // Identificar OneConfig (librería requerida por PolyPlus)
            else if (fileName.startsWith('oneconfig') && fileName.endsWith('.jar')) {
              if (!foundCompanions.includes(file)) foundCompanions.push(file);
            }
            // Identificar otras dependencias y complementos de OneClient
            else if ((fileName.startsWith('polydium') || fileName.startsWith('fabric-language-kotlin') || fileName.startsWith('compose-bundle') || fileName.startsWith('rsls')) && fileName.endsWith('.jar')) {
              if (!foundCompanions.includes(file)) foundCompanions.push(file);
            }
            // Identificar suite de optimización (Sodium, ImmediatelyFast, ModernFix, EntityCulling, FerriteCore, Lithium)
            else if ((fileName.includes('sodium') || fileName.includes('immediatelyfast') || fileName.includes('modernfix') || fileName.includes('entityculling') || fileName.includes('ferritecore') || fileName.includes('lithium')) && fileName.endsWith('.jar')) {
              if (!foundOpt.includes(file)) foundOpt.push(file);
            }
          }
        } catch (_) {}

        if (foundBaseJar) break;
      }

      if (foundBaseJar) break;
    }

    if (foundBaseJar) {
      this.extractedSource = foundSourceDir;
      this.baseJarPath = foundBaseJar;
      this.companionJars = foundCompanions;
      this.optJars = foundOpt;

      logger.info(`[SHUBATECH] [ShubaClient] ✅ OneClient localizado en: ${foundBaseJar}`);
      return {
        found: true,
        sourcePath: foundSourceDir,
        baseJar: foundBaseJar,
        companionJars: foundCompanions,
        optJars: foundOpt
      };
    }

    return {
      found: false,
      sourcePath: null,
      baseJar: null,
      companionJars: [],
      optJars: []
    };
  }

  /**
   * Recolecta archivos .jar de forma recursiva con un límite seguro
   */
  _collectJarsRecursive(dir, depth = 0) {
    if (depth > 5 || !fs.existsSync(dir)) return [];
    const results = [];
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          results.push(...this._collectJarsRecursive(full, depth + 1));
        } else if (item.isFile() && item.name.toLowerCase().endsWith('.jar')) {
          results.push(full);
        }
      }
    } catch (_) {}
    return results;
  }

  /**
   * Extrae el .jar base de OneClient y sus dependencias a la carpeta interna del launcher
   */
  extractBaseJar(targetDir = null) {
    const destinationDir = targetDir || this.getRuntimeClientModsDir();
    const depsDir = path.join(destinationDir, 'deps');
    const optDir = path.join(destinationDir, 'opt');

    fs.mkdirSync(destinationDir, { recursive: true });
    fs.mkdirSync(depsDir, { recursive: true });
    fs.mkdirSync(optDir, { recursive: true });

    const discovery = this.findOneClientInstallation();
    if (!discovery.found || !discovery.baseJar) {
      // Si ya existía un shubaclient-base.jar previo en destinationDir, usarlo
      const fallbackBase = path.join(destinationDir, 'shubaclient-base.jar');
      if (fs.existsSync(fallbackBase)) {
        this.baseJarPath = fallbackBase;
        logger.info(`[SHUBATECH] [ShubaClient] Usando copia previa de shubaclient-base.jar en: ${fallbackBase}`);
        return {
          success: true,
          baseJarPath: fallbackBase,
          depsDir,
          optDir,
          sourcePath: 'runtime/cache'
        };
      }
      throw new Error('No se encontró ninguna instalación o archivo JAR de OneClient en el sistema.');
    }

    const outBaseJar = path.join(destinationDir, 'shubaclient-base.jar');
    fs.copyFileSync(discovery.baseJar, outBaseJar);
    this.baseJarPath = outBaseJar;
    logger.info(`[SHUBATECH] [ShubaClient] Archivo base extraído exitosamente desde: ${discovery.baseJar} -> ${outBaseJar}`);

    // Copiar dependencias esenciales (OneConfig, Kotlin, etc.)
    const copiedDeps = [];
    for (const dep of discovery.companionJars) {
      try {
        const dest = path.join(depsDir, path.basename(dep));
        fs.copyFileSync(dep, dest);
        copiedDeps.push(dest);
      } catch (_) {}
    }

    // Copiar pack de optimización (Sodium, ImmediatelyFast, ModernFix, etc.)
    const copiedOpt = [];
    for (const opt of discovery.optJars) {
      try {
        const dest = path.join(optDir, path.basename(opt));
        fs.copyFileSync(opt, dest);
        copiedOpt.push(dest);
      } catch (_) {}
    }

    return {
      success: true,
      baseJarPath: outBaseJar,
      sourcePath: discovery.baseJar,
      deps: copiedDeps,
      opt: copiedOpt
    };
  }

  /**
   * Copia recursivamente directorios y archivos sin sobrescribir si ya existen
   */
  _copyDirRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
      try { fs.mkdirSync(dest, { recursive: true }); } catch (_) {}
    }
    try {
      const items = fs.readdirSync(src, { withFileTypes: true });
      for (const item of items) {
        const srcPath = path.join(src, item.name);
        const destPath = path.join(dest, item.name);
        if (item.isDirectory()) {
          this._copyDirRecursive(srcPath, destPath);
        } else if (item.isFile()) {
          if (!fs.existsSync(destPath)) {
            try { fs.copyFileSync(srcPath, destPath); } catch (_) {}
          }
        }
      }
    } catch (_) {}
  }

  /**
   * Parsea la estructura binaria del Constant Pool de un archivo .class (JVM Specification)
   * y reemplaza de forma segura las constantes CONSTANT_Utf8 (tag 0x01) correspondientes
   * a nombres de marca de OneClient / Polyfrost sin alterar la longitud total del pool.
   */
  _patchClassConstantPool(classBuf, stringMap) {
    if (!classBuf || classBuf.length < 10) return { modified: false, buffer: classBuf };
    if (classBuf.readUInt32BE(0) !== 0xCAFEBABE) return { modified: false, buffer: classBuf };

    const poolCount = classBuf.readUInt16BE(8);
    let offset = 10;
    let modified = false;

    for (let i = 1; i < poolCount; i++) {
      if (offset >= classBuf.length) break;
      const tag = classBuf.readUInt8(offset);
      offset += 1;

      switch (tag) {
        case 1: { // CONSTANT_Utf8
          const len = classBuf.readUInt16BE(offset);
          offset += 2;
          if (offset + len <= classBuf.length) {
            const str = classBuf.toString('utf8', offset, offset + len);
            for (const [target, replacement] of Object.entries(stringMap)) {
              if (str === target && Buffer.byteLength(target, 'utf8') === Buffer.byteLength(replacement, 'utf8')) {
                Buffer.from(replacement, 'utf8').copy(classBuf, offset);
                modified = true;
              } else if (str.includes(target) && Buffer.byteLength(target, 'utf8') === Buffer.byteLength(replacement, 'utf8')) {
                // Solo reemplazar si no es un paquete Java interno que rompería el classloader
                if (!str.startsWith('org/polyfrost') && !str.startsWith('Lorg/polyfrost') && !str.startsWith('com/polyfrost')) {
                  const replaced = str.split(target).join(replacement);
                  if (Buffer.byteLength(replaced, 'utf8') === len) {
                    Buffer.from(replaced, 'utf8').copy(classBuf, offset);
                    modified = true;
                  }
                }
              }
            }
          }
          offset += len;
          break;
        }
        case 3: // Integer
        case 4: // Float
          offset += 4;
          break;
        case 5: // Long
        case 6: // Double
          offset += 8;
          i++; // Long y Double ocupan dos slots
          break;
        case 7: // Class
        case 8: // String
        case 16: // MethodType
        case 19: // Module
        case 20: // Package
          offset += 2;
          break;
        case 9: // Fieldref
        case 10: // Methodref
        case 11: // InterfaceMethodref
        case 12: // NameAndType
        case 17: // Dynamic
        case 18: // InvokeDynamic
          offset += 4;
          break;
        case 15: // MethodHandle
          offset += 3;
          break;
        default:
          return { modified, buffer: classBuf };
      }
    }

    return { modified, buffer: classBuf };
  }

  /**
   * Genera el SVG del logo horizontal de SHUBACORE para reemplazar oneclient.svg
   */
  getBrandSvgContent() {
    return `<svg width="159" height="19" viewBox="0 0 159 19" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shubaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>
  </defs>
  <text x="50%" y="15" text-anchor="middle" font-family="'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="15" letter-spacing="3.5" fill="url(#shubaGrad)">SHUBACORE</text>
</svg>`;
  }

  /**
   * Genera el SVG del emblema principal de SHUBATECH / ShubaCore para logo.svg
   */
  getMainLogoSvgContent() {
    return `<svg preserveAspectRatio="none" width="100%" height="100%" viewBox="0 0 144 144" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shubaStar" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
    <linearGradient id="shubaGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#facc15"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <path d="M72 16L86 52H124L93 75L105 111L72 88L39 111L51 75L20 52H58L72 16Z" fill="url(#shubaStar)"/>
  <circle cx="72" cy="72" r="22" fill="#0f172a" stroke="url(#shubaGold)" stroke-width="4"/>
  <path d="M64 68C64 63.58 67.58 60 72 60C76.42 60 80 63.58 80 68C80 73 75 76 72 82C69 76 64 73 64 68Z" fill="url(#shubaGold)"/>
</svg>`;
  }

  /**
   * Genera el SVG del footer logo
   */
  getFooterLogoSvgContent() {
    return `<svg preserveAspectRatio="none" width="100%" height="100%" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shubaFoot" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
  </defs>
  <path d="M12.5 2.5L15 8.5H21.5L16.2 12.3L18.3 18.5L12.5 14.6L6.7 18.5L8.8 12.3L3.5 8.5H10L12.5 2.5Z" fill="url(#shubaFoot)"/>
</svg>`;
  }

  /**
   * Parchea y personaliza el .jar base de OneClient para generar ShubaClient-UI.jar
   * con metadatos de SHUBATECH, traducción al español y logos oficiales.
   */
  patchClientMod(baseJarPath = null, outputJarPath = null) {
    const inputJar = baseJarPath || this.baseJarPath;
    if (!inputJar || !fs.existsSync(inputJar)) {
      throw new Error(`El archivo JAR base no existe en: ${inputJar}`);
    }

    const outputJar = outputJarPath || path.join(path.dirname(inputJar), 'ShubaClient-UI.jar');
    logger.info(`[SHUBATECH] [ShubaClient] Iniciando parcheo y rebranding de ${path.basename(inputJar)} -> ${path.basename(outputJar)}...`);

    const zip = new AdmZip(inputJar);
    const entries = zip.getEntries();

    // 0. ELIMINACIÓN DE FIRMAS DIGITALES Y SANEAMIENTO DE MANIFEST.MF
    // Evita crash código 1 por java.lang.SecurityException: SHA-256 digest error
    const sigFiles = entries.filter((e) =>
      /\.(SF|RSA|DSA)$/i.test(e.entryName) || /^META-INF\/SIG-/i.test(e.entryName)
    );
    for (const sigFile of sigFiles) {
      zip.deleteFile(sigFile);
      logger.debug(`[SHUBATECH] [ShubaClient] Firma digital eliminada: ${sigFile.entryName}`);
    }

    const manifestEntry = zip.getEntry('META-INF/MANIFEST.MF');
    if (manifestEntry) {
      try {
        let manifestText = zip.readAsText(manifestEntry);
        manifestText = manifestText.replace(/\r?\nName: [^\r\n]+(?:\r?\n [^\r\n]+)*(?:\r?\n[a-zA-Z0-9_-]+-Digest:[^\r\n]+)+/gi, '');
        manifestText = manifestText.replace(/^[a-zA-Z0-9_-]+-Digest:[^\r\n]+(?:\r?\n)?/gmi, '');
        zip.updateFile('META-INF/MANIFEST.MF', Buffer.from(manifestText.trim() + '\n', 'utf8'));
      } catch (mErr) {
        logger.warn(`[SHUBATECH] [ShubaClient] Aviso al sanear MANIFEST.MF: ${mErr.message}`);
      }
    }

    // 1. MODIFICAR METADATOS (fabric.mod.json)
    const fabricEntry = zip.getEntry('fabric.mod.json');
    if (fabricEntry) {
      try {
        const meta = JSON.parse(zip.readAsText(fabricEntry));
        meta.name = 'ShubaClient UI';
        meta.description = 'Interfaz moderna y utilidades exclusivas desarrolladas por SHUBATECH';
        meta.authors = ['SHUBATECH', 'LanderAlo'];
        if (meta.contact) {
          meta.contact.homepage = 'https://github.com/Landa6543/ShubaCore-Launcher';
        }
        zip.updateFile('fabric.mod.json', Buffer.from(JSON.stringify(meta, null, 2), 'utf8'));
      } catch (err) {
        logger.warn(`[SHUBATECH] [ShubaClient] No se pudo parsear fabric.mod.json: ${err.message}`);
      }
    }

    // 2. ARCHIVOS DE IDIOMA (en_us.json y es_es.json 100% traducidos al español con marca SHUBACORE)
    const fullSpanishTranslations = {
      'polyplus.hostWorld': 'Hostear Mundo',
      'polyplus.page.wardrobe': 'Vestidor',
      'polyplus.page.social': 'Amigos',
      'polyplus.page.stats': 'Estadísticas',
      'polyplus.page.news': 'Novedades',
      'polyplus.page.marketplace': 'Vestidor',
      'polyplus.mainmenu.play': 'Jugar',
      'polyplus.mainmenu.singleplayer': 'Un Jugador',
      'polyplus.mainmenu.multiplayer': 'Multijugador',
      'polyplus.mainmenu.switchToOneClient': 'Menú ShubaClient',
      'polyplus.mainmenu.switchToPolyPlus': 'Menú ShubaClient',
      'polyplus.mainmenu.preferVanilla': '¿Prefieres el menú Vanilla?',
      'polyplus.mainmenu.keepOneClient': 'Usar ShubaClient',
      'polyplus.session.refresh': 'Refrescar Sesión',
      'polyplus.session.refreshing': 'Refrescando sesión...',
      'polyplus.session.reconnecting': 'Reconectando...',
      'polyplus.session.refreshFailed': 'Fallo al refrescar - clic para reintentar',
      'polyplus.featured.sponsored': 'Patrocinado',
      'polyplus.featured.restore': 'Restaurar',
      'polyplus.mmc.debugifyNote': 'Nota de SHUBATECH: Optimizaciones y utilidades activas para un juego seguro y fluido.',
      'polyplus.sodium.options.view_bobbing.tooltip': 'Si está activado, la cámara se balanceará al caminar. Desactívalo si te produce mareos.',
      'menu.play': 'Jugar',
      'menu.singleplayer': 'Un Jugador',
      'menu.multiplayer': 'Multijugador',
      'menu.wardrobe': 'Vestidor',
      'menu.social': 'Amigos',
      'menu.stats': 'Estadísticas',
      'menu.news': 'Novedades',
      'menu.hostWorld': 'Hostear Mundo',
      'menu.returnToGame': 'Volver al juego',
      'menu.options': 'Opciones',
      'menu.worldOptions': 'Opciones del mundo',
      'menu.quit': 'Salir del Juego'
    };

    const langBytes = Buffer.from(JSON.stringify(fullSpanishTranslations, null, 2), 'utf8');
    if (zip.getEntry('assets/polyplus/lang/en_us.json')) {
      zip.updateFile('assets/polyplus/lang/en_us.json', langBytes);
    } else {
      zip.addFile('assets/polyplus/lang/en_us.json', langBytes);
    }
    if (zip.getEntry('assets/polyplus/lang/es_es.json')) {
      zip.updateFile('assets/polyplus/lang/es_es.json', langBytes);
    } else {
      zip.addFile('assets/polyplus/lang/es_es.json', langBytes);
    }

    // 3. TEXTURAS Y LOGOS VECTORIALES (SVG / PNG)
    zip.addFile('assets/polyplus/brand/oneclient.svg', Buffer.from(this.getBrandSvgContent(), 'utf8'));
    zip.addFile('assets/polyplus/mainmenu/logo.svg', Buffer.from(this.getMainLogoSvgContent(), 'utf8'));
    zip.addFile('assets/polyplus/mainmenu/footer-logo.svg', Buffer.from(this.getFooterLogoSvgContent(), 'utf8'));
    zip.addFile('assets/polyplus/modicons/polyplus.svg', Buffer.from(this.getMainLogoSvgContent(), 'utf8'));

    // Reemplazar icon.png con el logo oficial de ShubaCore si está disponible
    const localLogoPaths = [
      path.join(__dirname, '..', '..', 'renderer', 'assets', 'logo.png'),
      path.join(__dirname, '..', '..', '..', 'logo.png'),
      path.join(__dirname, '..', '..', '..', 'shubacore_logo.png')
    ];
    for (const lPath of localLogoPaths) {
      if (fs.existsSync(lPath)) {
        try {
          const logoBuffer = fs.readFileSync(lPath);
          zip.updateFile('icon.png', logoBuffer);
          break;
        } catch (_) {}
      }
    }

    // 4. CONSTANTES UTF-8 EN .CLASS (REEMPLAZO SEGURO Y EXACTO DE 9 BYTES)
    // "ONECLIENT" (9 bytes) -> "SHUBACORE" (9 bytes)
    // "OneClient" (9 bytes) -> "ShubaCore" (9 bytes)
    const TARGET_ONECLIENT_UTF8 = Buffer.from([0x01, 0x00, 0x09, 0x4f, 0x4e, 0x45, 0x43, 0x4c, 0x49, 0x45, 0x4e, 0x54]);
    const REPL_SHUBACORE_UTF8 = Buffer.from([0x01, 0x00, 0x09, 0x53, 0x48, 0x55, 0x42, 0x41, 0x43, 0x4f, 0x52, 0x45]);

    const TARGET_ONECLIENT_PASCAL = Buffer.from([0x01, 0x00, 0x09, 0x4f, 0x6e, 0x65, 0x43, 0x6c, 0x69, 0x65, 0x6e, 0x74]);
    const REPL_SHUBACORE_PASCAL = Buffer.from([0x01, 0x00, 0x09, 0x53, 0x68, 0x75, 0x62, 0x61, 0x43, 0x6f, 0x72, 0x65]);

    // Clases seguras de interfaz donde se reemplaza "OneClient"
    const safeUiClasses = [
      'org/polyfrost/polyplus/client/gui/PolyPlusMainMenuScreenKt.class',
      'org/polyfrost/polyplus/client/gui/MenuWidgetsKt.class',
      'org/polyfrost/polyplus/client/gui/PolyPlusOnboardingScreenKt.class',
      'org/polyfrost/polyplus/client/gui/PauseMenuPanel.class'
    ];

    let patchedClassesCount = 0;
    for (const entry of entries) {
      if (entry.entryName.endsWith('.class')) {
        let classBuf = zip.readFile(entry);
        let changed = false;

        // 4.1 Parser binario formal de Constant Pool de JVM
        const cpRes = this._patchClassConstantPool(classBuf, {
          'ONECLIENT': 'SHUBACORE',
          'POLYFROST': 'SHUBATECH',
          'polyfrost': 'shubatech',
          'oneclient': 'shubacore'
        });
        if (cpRes.modified) {
          classBuf = cpRes.buffer;
          changed = true;
        }

        if (safeUiClasses.includes(entry.entryName)) {
          const uiCpRes = this._patchClassConstantPool(classBuf, {
            'OneClient': 'ShubaCore',
            'Polyfrost': 'SHUBATECH'
          });
          if (uiCpRes.modified) {
            classBuf = uiCpRes.buffer;
            changed = true;
          }
        }

        // Reemplazo de ONECLIENT -> SHUBACORE (Global en cualquier clase)
        let idx = classBuf.indexOf(TARGET_ONECLIENT_UTF8);
        while (idx !== -1) {
          REPL_SHUBACORE_UTF8.copy(classBuf, idx);
          changed = true;
          idx = classBuf.indexOf(TARGET_ONECLIENT_UTF8, idx + TARGET_ONECLIENT_UTF8.length);
        }

        // Reemplazo de OneClient -> ShubaCore solo en pantallas de UI para evitar romper nombres de clases
        if (safeUiClasses.includes(entry.entryName)) {
          let pIdx = classBuf.indexOf(TARGET_ONECLIENT_PASCAL);
          while (pIdx !== -1) {
            REPL_SHUBACORE_PASCAL.copy(classBuf, pIdx);
            changed = true;
            pIdx = classBuf.indexOf(TARGET_ONECLIENT_PASCAL, pIdx + TARGET_ONECLIENT_PASCAL.length);
          }
        }

        // Reemplazo de Marketplace -> Vestidor y redirección de navegación a Wardrobe en LobbyChromeKt
        if (entry.entryName === 'org/polyfrost/polyplus/client/gui/lobbyshell/LobbyChromeKt.class') {
          const TARGET_MARKETPLACE_UTF8 = Buffer.from([0x01, 0x00, 0x0b, 0x4d, 0x61, 0x72, 0x6b, 0x65, 0x74, 0x70, 0x6c, 0x61, 0x63, 0x65]);
          const REPL_VESTIDOR_UTF8 = Buffer.from([0x01, 0x00, 0x0b, 0x56, 0x65, 0x73, 0x74, 0x69, 0x64, 0x6f, 0x72, 0x20, 0x20, 0x20]);
          let mIdx = classBuf.indexOf(TARGET_MARKETPLACE_UTF8);
          if (mIdx !== -1) {
            REPL_VESTIDOR_UTF8.copy(classBuf, mIdx);
            changed = true;
          }

          // Redirección de getstatic LobbyPage.Marketplace -> getstatic LobbyPage.Wardrobe
          const GETSTATIC_MKT = Buffer.from([0xb2, 0x00, 0x22]);
          const GETSTATIC_WDR = Buffer.from([0xb2, 0x00, 0x1c]);
          let gIdx = 0;
          while ((gIdx = classBuf.indexOf(GETSTATIC_MKT, gIdx)) !== -1) {
            GETSTATIC_WDR.copy(classBuf, gIdx);
            changed = true;
            gIdx += GETSTATIC_MKT.length;
          }
        }

        // Cosméticos desbloqueados 100% gratis en Vestidor (CosmeticUiItem.getOwned() -> true)
        if (entry.entryName === 'org/polyfrost/polyplus/client/gui/wardrobe/CosmeticUiItem.class') {
          const CUI_TARGET = Buffer.from([0x2a, 0xb4, 0x00, 0x2c, 0xac]); // aload_0, getfield owned, ireturn
          const CUI_REPL = Buffer.from([0x04, 0xac, 0x00, 0x00, 0x00]);   // iconst_1, ireturn, nop, nop, nop
          let cIdx = classBuf.indexOf(CUI_TARGET);
          if (cIdx !== -1) {
            CUI_REPL.copy(classBuf, cIdx);
            changed = true;
          }
        }

        // Validación de propiedad en tienda/vestidor (WardrobeModelsKt.fullyOwned() -> true)
        if (entry.entryName === 'org/polyfrost/polyplus/client/gui/wardrobe/WardrobeModelsKt.class') {
          const WM_TARGET = Buffer.from([0x2a, 0x12, 0x0a, 0xb8, 0x00, 0x10, 0x2b]);
          const WM_REPL = Buffer.from([0x04, 0xac, 0x00, 0x00, 0x00, 0x00, 0x00]); // iconst_1, ireturn, nop...
          let wIdx = classBuf.indexOf(WM_TARGET);
          if (wIdx !== -1) {
            WM_REPL.copy(classBuf, wIdx);
            changed = true;
          }
        }

        if (changed) {
          zip.updateFile(entry, classBuf);
          patchedClassesCount++;
        }
      }
    }

    logger.info(`[SHUBATECH] [ShubaClient] Parcheadas ${patchedClassesCount} clases JVM con constantes SHUBACORE, vestidor gratuito y redirección de Marketplace.`);

    // 5. GUARDAR ShubaClient-UI.jar
    zip.writeZip(outputJar);
    this.customJarPath = outputJar;

    const stats = fs.statSync(outputJar);
    logger.info(`[SHUBATECH] [ShubaClient] ✅ Parcheo y rebranding a ShubaClient-UI.jar completado exitosamente (${stats.size} bytes).`);

    return {
      success: true,
      outputPath: outputJar,
      size: stats.size,
      patchedClassesCount
    };
  }

  /**
   * Asegura que el archivo ShubaClient-UI.jar esté listo para usarse.
   * Si no existe, realiza la extracción y el parcheo automáticamente.
   */
  ensureShubaClientReady() {
    const runtimeDir = this.getRuntimeClientModsDir();
    const customJar = path.join(runtimeDir, 'ShubaClient-UI.jar');

    if (fs.existsSync(customJar) && fs.statSync(customJar).size > 1000000) {
      this.customJarPath = customJar;
      return {
        ready: true,
        customJarPath: customJar,
        depsDir: path.join(runtimeDir, 'deps'),
        optDir: path.join(runtimeDir, 'opt')
      };
    }

    // Realizar extracción
    const extraction = this.extractBaseJar(runtimeDir);
    // Realizar parcheo
    const patchResult = this.patchClientMod(extraction.baseJarPath, customJar);

    return {
      ready: true,
      customJarPath: patchResult.outputPath,
      depsDir: path.join(runtimeDir, 'deps'),
      optDir: path.join(runtimeDir, 'opt'),
      sourcePath: extraction.sourcePath
    };
  }

  /**
   * Prepara los archivos de configuración predeterminados de OneConfig / PolyPlus en la instancia
   * para que el menú 3D LOBBY y el menú de pausa STEP_BACK_FLAT se activen por defecto.
   */
  prepareInstanceConfig(instanceDir) {
    if (!instanceDir || typeof instanceDir !== 'string') return;
    const oneconfigDir = path.join(instanceDir, 'oneconfig');
    const backupDir = path.join(oneconfigDir, 'backup');
    fs.mkdirSync(oneconfigDir, { recursive: true });
    fs.mkdirSync(backupDir, { recursive: true });

    // Configuración para el menú 3D de ShubaClient (Lobby y panorama)
    const mainMenuConfig = {
      mainMenuFpsLimit: 260,
      lastSeenNewsMillis: 0,
      hideMainMenuQuickplay: false,
      mainMenu: {
        class: 'org.polyfrost.polyplus.client.MainMenuChoice',
        value: 'LOBBY'
      },
      swapMainMenuSideColumns: false,
      hideMainMenuModButtons: false,
      hidePanoramaOverlay: false,
      migratedFromLegacyConfig: false,
      hideMainMenuHostWorld: false,
      hideMainMenuRealms: false,
      hideMainMenuSocial: false,
      hideMainMenuCosmetics: false,
      hideMainMenuAltManager: false,
      customPanorama: true,
      hideMainMenuFooter: false,
      mainMenuFpsLimitMode: {
        class: 'org.polyfrost.polyplus.client.MainMenuFpsLimitMode',
        value: 'SMART'
      },
      panoramaInAllMenus: true
    };

    // Configuración para el menú de pausa in-game (Wardrobe, Social, Host World)
    const pauseConfig = {
      migratedFromSplitConfigs: false,
      pauseWidgetPanels: '',
      compactPauseMenuPanel: false,
      pausePerformanceWidget: true,
      pauseWidgets: '',
      pauseRecordingWidget: true,
      pauseSceneWidget: true,
      pauseScreenStyle: {
        class: 'org.polyfrost.polyplus.client.gui.pausescreen.PauseScreenStyle',
        value: 'STEP_BACK_FLAT'
      },
      vanillaPausePlayerPanel: false,
      replacePauseLanButton: true
    };

    try {
      fs.writeFileSync(path.join(oneconfigDir, 'polyplus-mainmenu.json'), JSON.stringify(mainMenuConfig, null, 2), 'utf8');
      fs.writeFileSync(path.join(backupDir, 'polyplus-mainmenu.json'), JSON.stringify(mainMenuConfig, null, 2), 'utf8');
      fs.writeFileSync(path.join(oneconfigDir, 'polyplus-pause.json'), JSON.stringify(pauseConfig, null, 2), 'utf8');
      fs.writeFileSync(path.join(backupDir, 'polyplus-pause.json'), JSON.stringify(pauseConfig, null, 2), 'utf8');
      logger.info(`[SHUBATECH] [ShubaClient] Archivos oneconfig/polyplus inicializados (Menú 3D y Pausa panorámica) en: ${oneconfigDir}`);
    } catch (err) {
      logger.warn(`[SHUBATECH] [ShubaClient] Error escribiendo configs de ShubaClient: ${err.message}`);
    }
  }

  /**
   * Inyecta ShubaClient-UI.jar y el pack de dependencias y optimización en la carpeta mods/ de la instancia.
   */
  injectIntoInstance(instanceDir, options = {}) {
    if (!instanceDir || typeof instanceDir !== 'string') return { injected: false };

    const instanceModsDir = path.join(instanceDir, 'mods');
    fs.mkdirSync(instanceModsDir, { recursive: true });

    // Limpiar mod previo obsoleto si existe
    const oldCustom = path.join(instanceModsDir, 'shubaclient-custom.jar');
    if (fs.existsSync(oldCustom)) {
      try { fs.rmSync(oldCustom, { force: true }); } catch (_) {}
    }

    // Asegurar que el mod custom esté listo
    const readyState = this.ensureShubaClientReady();
    if (!readyState.ready || !readyState.customJarPath) {
      return { injected: false, error: 'No se pudo generar ShubaClient-UI.jar' };
    }

    const injectedFiles = [];

    // 1. Inyectar ShubaClient-UI.jar
    const targetCustom = path.join(instanceModsDir, 'ShubaClient-UI.jar');
    fs.copyFileSync(readyState.customJarPath, targetCustom);
    injectedFiles.push('ShubaClient-UI.jar');

    // 2. Inyectar dependencias esenciales (deps/) si no existen en mods/
    if (fs.existsSync(readyState.depsDir)) {
      try {
        const depFiles = fs.readdirSync(readyState.depsDir).filter(f => f.endsWith('.jar'));
        for (const dep of depFiles) {
          const targetDep = path.join(instanceModsDir, dep);
          if (!fs.existsSync(targetDep)) {
            fs.copyFileSync(path.join(readyState.depsDir, dep), targetDep);
            injectedFiles.push(dep);
          }
        }
      } catch (_) {}
    }

    // 3. Inyectar pack de optimización (opt/: Sodium, ImmediatelyFast, ModernFix, etc.)
    const includeOpt = options.includeOptimization !== false;
    if (includeOpt && fs.existsSync(readyState.optDir)) {
      try {
        const optFiles = fs.readdirSync(readyState.optDir).filter(f => f.endsWith('.jar'));
        for (const opt of optFiles) {
          const targetOpt = path.join(instanceModsDir, opt);
          if (!fs.existsSync(targetOpt)) {
            fs.copyFileSync(path.join(readyState.optDir, opt), targetOpt);
            injectedFiles.push(opt);
          }
        }
      } catch (_) {}
    }

    // 4. Copiar assets y cosméticos locales del host si existen
    try {
      const userProfile = process.env.USERPROFILE || os.homedir();
      const hostPolyplus = path.join(userProfile, 'AppData', 'Roaming', 'Polyfrost', 'OneClient', '.minecraft', 'polyplus');
      if (fs.existsSync(hostPolyplus)) {
        const instPolyplus = path.join(instanceDir, 'polyplus');
        fs.mkdirSync(instPolyplus, { recursive: true });
        const subdirs = ['cosmetics', 'lobby', 'panorama'];
        for (const sd of subdirs) {
          const srcSd = path.join(hostPolyplus, sd);
          const dstSd = path.join(instPolyplus, sd);
          if (fs.existsSync(srcSd) && !fs.existsSync(dstSd)) {
            this._copyDirRecursive(srcSd, dstSd);
            logger.info(`[SHUBATECH] [ShubaClient] Caché local de cosméticos sincronizado: ${sd}`);
          }
        }
      }
    } catch (cosmErr) {
      logger.warn(`[SHUBATECH] [ShubaClient] Aviso al copiar cosméticos locales: ${cosmErr.message}`);
    }

    // 5. Preparar configs por defecto de OneConfig
    this.prepareInstanceConfig(instanceDir);

    // 6. Sincronizar capturas de pantalla del usuario en el panorama del menú
    try {
      this.injectScreenshotsAsPanorama(instanceDir);
    } catch (_) {}

    logger.info(`[SHUBATECH] [ShubaClient] ✨ Inyectada interfaz in-game ShubaClient UI y pack de optimización (${injectedFiles.length} mods) en: ${instanceModsDir}`);

    return {
      injected: true,
      injectedFiles,
      instanceModsDir
    };
  }

  /**
   * Detecta capturas de pantalla del usuario en <instanceDir>/screenshots/
   * y las sincroniza como panorama principal en ShubaClient (polyplus/panorama)
   * y en el fallback de resource packs para Vanilla y NeoForge.
   */
  injectScreenshotsAsPanorama(instanceDir) {
    if (!instanceDir || typeof instanceDir !== 'string') return { applied: false };

    const screenshotsDir = path.join(instanceDir, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      return { applied: false, reason: 'Carpeta de screenshots no encontrada' };
    }

    try {
      const files = fs.readdirSync(screenshotsDir)
        .filter(f => f.toLowerCase().endsWith('.png'))
        .map(f => ({
          name: f,
          path: path.join(screenshotsDir, f),
          mtime: fs.statSync(path.join(screenshotsDir, f)).mtimeMs
        }))
        .sort((a, b) => b.mtime - a.mtime);

      if (files.length === 0) {
        return { applied: false, reason: 'No hay capturas disponibles' };
      }

      const latestScreenshot = files[0].path;

      // 1. Inyectar en galería de panoramas 3D de ShubaClient (PolyPlus)
      const panoramaDir = path.join(instanceDir, 'polyplus', 'panorama', 'my-screenshots');
      fs.mkdirSync(panoramaDir, { recursive: true });
      for (let i = 0; i < 6; i++) {
        fs.copyFileSync(latestScreenshot, path.join(panoramaDir, `panorama_${i}.png`));
      }
      fs.writeFileSync(path.join(panoramaDir, '.complete'), '', 'utf8');

      // Activar customPanorama en oneconfig
      const oneconfigPath = path.join(instanceDir, 'oneconfig', 'polyplus-mainmenu.json');
      if (fs.existsSync(oneconfigPath)) {
        try {
          const cfg = JSON.parse(fs.readFileSync(oneconfigPath, 'utf8'));
          cfg.customPanorama = true;
          fs.writeFileSync(oneconfigPath, JSON.stringify(cfg, null, 2), 'utf8');
        } catch (_) {}
      }

      // 2. Adaptación NeoForge / Vanilla: generar resourcepack ShubaPanorama ligero
      const rpPanoramaDir = path.join(instanceDir, 'resourcepacks', 'ShubaPanorama', 'assets', 'minecraft', 'textures', 'gui', 'title', 'background');
      fs.mkdirSync(rpPanoramaDir, { recursive: true });
      for (let i = 0; i < 6; i++) {
        fs.copyFileSync(latestScreenshot, path.join(rpPanoramaDir, `panorama_${i}.png`));
      }
      const rpMeta = {
        pack: {
          pack_format: 34,
          description: 'SHUBACORE - Fondo de capturas en el menú principal'
        }
      };
      fs.writeFileSync(
        path.join(instanceDir, 'resourcepacks', 'ShubaPanorama', 'pack.mcmeta'),
        JSON.stringify(rpMeta, null, 2),
        'utf8'
      );

      logger.info(`[SHUBATECH] [ShubaClient] Captura de usuario (${files[0].name}) aplicada como panorama 3D y menú principal.`);
      return { applied: true, screenshot: latestScreenshot };
    } catch (err) {
      logger.warn(`[SHUBATECH] [ShubaClient] Aviso al inyectar capturas en panorama: ${err.message}`);
      return { applied: false, error: err.message };
    }
  }
}

let patcherInstance = null;
function getClientModPatcher() {
  if (!patcherInstance) {
    patcherInstance = new ClientModPatcher();
  }
  return patcherInstance;
}

module.exports = {
  ClientModPatcher,
  getClientModPatcher
};
