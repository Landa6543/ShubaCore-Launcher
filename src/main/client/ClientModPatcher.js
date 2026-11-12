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
   * Parchea y personaliza el .jar base de OneClient para generar shubaclient-custom.jar
   * con metadatos de SHUBATECH, traducción al español y logos oficiales.
   */
  patchClientMod(baseJarPath = null, outputJarPath = null) {
    const inputJar = baseJarPath || this.baseJarPath;
    if (!inputJar || !fs.existsSync(inputJar)) {
      throw new Error(`El archivo JAR base no existe en: ${inputJar}`);
    }

    const outputJar = outputJarPath || path.join(path.dirname(inputJar), 'shubaclient-custom.jar');
    logger.info(`[SHUBATECH] [ShubaClient] Iniciando parcheo y rebranding de ${path.basename(inputJar)} -> ${path.basename(outputJar)}...`);

    const zip = new AdmZip(inputJar);
    const entries = zip.getEntries();

    // 1. MODIFICAR METADATOS (fabric.mod.json)
    const fabricEntry = zip.getEntry('fabric.mod.json');
    if (fabricEntry) {
      try {
        const meta = JSON.parse(zip.readAsText(fabricEntry));
        meta.name = 'ShubaClient UI';
        meta.description = 'Interfaz nativa y utilidades exclusivas de SHUBATECH';
        meta.authors = ['SHUBATECH', 'LanderAlo'];
        if (meta.contact) {
          meta.contact.homepage = 'https://github.com/Landa6543/ShubaCore-Launcher';
        }
        zip.updateFile('fabric.mod.json', Buffer.from(JSON.stringify(meta, null, 2), 'utf8'));
      } catch (err) {
        logger.warn(`[SHUBATECH] [ShubaClient] No se pudo parsear fabric.mod.json: ${err.message}`);
      }
    }

    // 2. ARCHIVOS DE IDIOMA (en_us.json y es_es.json)
    const langEnEntry = zip.getEntry('assets/polyplus/lang/en_us.json');
    if (langEnEntry) {
      try {
        let enContent = zip.readAsText(langEnEntry);
        enContent = enContent.replace(/OneClient/g, 'ShubaClient');
        enContent = enContent.replace(/ONECLIENT/g, 'SHUBACORE');
        enContent = enContent.replace(/PolyPlus/g, 'ShubaClient');
        enContent = enContent.replace(/Polyfrost/g, 'SHUBATECH');
        zip.updateFile('assets/polyplus/lang/en_us.json', Buffer.from(enContent, 'utf8'));
      } catch (_) {}
    }

    // Crear traducción oficial al español (es_es.json)
    const esTranslations = {
      'polyplus.hostWorld': 'Hostear Mundo',
      'polyplus.page.wardrobe': 'Vestidor',
      'polyplus.page.social': 'Amigos',
      'polyplus.mainmenu.play': 'Jugar',
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
      'menu.wardrobe': 'Vestidor',
      'menu.social': 'Amigos',
      'menu.hostWorld': 'Hostear Mundo'
    };
    zip.addFile('assets/polyplus/lang/es_es.json', Buffer.from(JSON.stringify(esTranslations, null, 2), 'utf8'));

    // 3. TEXTURAS Y LOGOS VECTORIALES (SVG / PNG)
    zip.addFile('assets/polyplus/brand/oneclient.svg', Buffer.from(this.getBrandSvgContent(), 'utf8'));
    zip.addFile('assets/polyplus/mainmenu/logo.svg', Buffer.from(this.getMainLogoSvgContent(), 'utf8'));
    zip.addFile('assets/polyplus/mainmenu/footer-logo.svg', Buffer.from(this.getFooterLogoSvgContent(), 'utf8'));

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

        if (changed) {
          zip.updateFile(entry, classBuf);
          patchedClassesCount++;
        }
      }
    }

    logger.info(`[SHUBATECH] [ShubaClient] Parcheadas ${patchedClassesCount} clases JVM con constantes SHUBACORE.`);

    // 5. GUARDAR SHUBACLIENT-CUSTOM.JAR
    zip.writeZip(outputJar);
    this.customJarPath = outputJar;

    const stats = fs.statSync(outputJar);
    logger.info(`[SHUBATECH] [ShubaClient] ✅ Parcheo y rebranding a shubaclient-custom.jar completado exitosamente (${stats.size} bytes).`);

    return {
      success: true,
      outputPath: outputJar,
      size: stats.size,
      patchedClassesCount
    };
  }

  /**
   * Asegura que el archivo shubaclient-custom.jar esté listo para usarse.
   * Si no existe, realiza la extracción y el parcheo automáticamente.
   */
  ensureShubaClientReady() {
    const runtimeDir = this.getRuntimeClientModsDir();
    const customJar = path.join(runtimeDir, 'shubaclient-custom.jar');

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
   * Inyecta shubaclient-custom.jar y el pack de dependencias y optimización en la carpeta mods/ de la instancia.
   */
  injectIntoInstance(instanceDir, options = {}) {
    if (!instanceDir || typeof instanceDir !== 'string') return { injected: false };

    const instanceModsDir = path.join(instanceDir, 'mods');
    fs.mkdirSync(instanceModsDir, { recursive: true });

    // Asegurar que el mod custom esté listo
    const readyState = this.ensureShubaClientReady();
    if (!readyState.ready || !readyState.customJarPath) {
      return { injected: false, error: 'No se pudo generar shubaclient-custom.jar' };
    }

    const injectedFiles = [];

    // 1. Inyectar shubaclient-custom.jar
    const targetCustom = path.join(instanceModsDir, 'shubaclient-custom.jar');
    fs.copyFileSync(readyState.customJarPath, targetCustom);
    injectedFiles.push('shubaclient-custom.jar');

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

    // 4. Preparar configs por defecto de OneConfig
    this.prepareInstanceConfig(instanceDir);

    logger.info(`[SHUBATECH] [ShubaClient] ✨ Inyectada interfaz in-game ShubaClient UI y pack de optimización (${injectedFiles.length} mods) en: ${instanceModsDir}`);

    return {
      injected: true,
      injectedFiles,
      instanceModsDir
    };
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
