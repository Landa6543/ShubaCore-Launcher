/**
 * ShubaCore - Launch Manager
 * Developed by SHUBATECH
 * Core game execution engine using minecraft-launcher-core (MCLC)
 * Supports isolated instances, native headless NeoForge/Forge/Fabric, Java 21, and Close-on-Launch
 */

const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { Client } = require('minecraft-launcher-core');
const Handler = require('minecraft-launcher-core/components/handler');
const { getConfigManager } = require('../config/ConfigManager');
const { getAuthManager } = require('../auth/AuthManager');
const { getProfileManager } = require('../profiles/ProfileManager');
const { JVMOptimizer } = require('../jvm/JVMOptimizer');
const { ModloaderResolver } = require('./ModloaderResolver');
const { defaultLogger: logger } = require('../utils/logger');

// FILTRO ESTRICTO DE LIBRERÍAS INCOMPATIBLES (ARM64, X86, LINUX, OSX, MACOS)
// Evita que DLLs de 32 bits o ARM64 entren al classpath o sobreescriban natives/ en Windows x64
function isLibraryIncompatible(libName = '', libPath = '') {
  const name = String(libName || '').toLowerCase();
  const p = String(libPath || '').toLowerCase();
  if (
    name.includes('arm64') || name.includes('x86') ||
    p.includes('arm64') || p.includes('x86') ||
    name.includes('linux') || name.includes('macos') || name.includes('osx') ||
    p.includes('linux') || p.includes('macos') || p.includes('osx')
  ) {
    return true;
  }
  return false;
}

// Interceptar parseRule de MCLC para descartar dependencias de plataformas ajenas o no-x64
const origParseRule = Handler.prototype.parseRule;
Handler.prototype.parseRule = function(lib) {
  const libName = lib.name || '';
  const libPath = lib.downloads?.artifact?.path || '';
  if (isLibraryIncompatible(libName, libPath)) {
    return true; // true = regla rechazada, libreria omitida
  }
  return origParseRule.call(this, lib);
};

// Función auxiliar para descartar banderas de memoria por defecto (-Xmx y -Xms) del manifiesto
function stripMemoryFlags(argsArray) {
  if (!Array.isArray(argsArray)) return argsArray;
  return argsArray.filter((arg) => {
    if (typeof arg === 'string') {
      return !arg.startsWith('-Xmx') && !arg.startsWith('-Xms');
    }
    if (arg && typeof arg === 'object' && arg.value) {
      if (typeof arg.value === 'string') {
        return !arg.value.startsWith('-Xmx') && !arg.value.startsWith('-Xms');
      }
      if (Array.isArray(arg.value)) {
        arg.value = arg.value.filter((v) => typeof v !== 'string' || (!v.startsWith('-Xmx') && !v.startsWith('-Xms')));
        return arg.value.length > 0;
      }
    }
    return true;
  });
}

// Interceptar getVersion de MCLC para depurar las librerías cargadas desde el JSON de versión y eliminar -Xmx/-Xms por defecto
const origGetVersion = Handler.prototype.getVersion;
Handler.prototype.getVersion = async function() {
  const ver = await origGetVersion.call(this);
  if (ver) {
    if (Array.isArray(ver.libraries)) {
      ver.libraries = ver.libraries.filter((lib) => {
        const libName = lib.name || '';
        const libPath = lib.downloads?.artifact?.path || '';
        return !isLibraryIncompatible(libName, libPath);
      });
    }
    if (ver.arguments) {
      if (Array.isArray(ver.arguments.jvm)) {
        ver.arguments.jvm = stripMemoryFlags(ver.arguments.jvm);
      }
      if (Array.isArray(ver.arguments['default-user-jvm'])) {
        ver.arguments['default-user-jvm'] = stripMemoryFlags(ver.arguments['default-user-jvm']);
      }
    }
  }
  return ver;
};

// Interceptar getClasses de MCLC para garantizar que NINGÚN .jar incompatible entre al classpath (-cp)
const origGetClasses = Handler.prototype.getClasses;
Handler.prototype.getClasses = async function(classJson) {
  if (classJson && Array.isArray(classJson.libraries)) {
    classJson.libraries = classJson.libraries.filter((lib) => {
      const libName = lib.name || '';
      const libPath = lib.downloads?.artifact?.path || '';
      return !isLibraryIncompatible(libName, libPath);
    });
  }
  const classes = await origGetClasses.call(this, classJson);
  return classes.filter((filePath) => !isLibraryIncompatible(filePath, filePath));
};

// Interceptar getNatives de MCLC para respetar el directorio de nativos saneado
const origGetNatives = Handler.prototype.getNatives;
Handler.prototype.getNatives = async function() {
  if (this.options?.overrides?.natives) {
    return this.options.overrides.natives;
  }
  return origGetNatives.call(this);
};

class LaunchManager {
  constructor() {
    this.configManager = getConfigManager();
    this.authManager = getAuthManager();
    this.profileManager = getProfileManager();
    this.runningProcesses = new Map(); // key: sessionId -> { sessionId, pid, child, instanceId, instanceName, username, accountMode, startTime }
    this.isLaunching = false;
    this.hasGameStarted = false;
    this.eventListeners = new Set();
    this.currentLogStream = null;
    this.lastLogPath = null;
    this.lastInstancePath = null;
    this.recentLogsBuffer = [];
    this.pendingLogBatch = [];
    this.logFlushTimer = null;
    this.controllerBridgeTimer = null;
  }

  get activeProcess() {
    if (this.runningProcesses.size === 0) return null;
    return Array.from(this.runningProcesses.values())[0]?.child || null;
  }

  getRunningProcesses() {
    return Array.from(this.runningProcesses.values()).map((s) => ({
      sessionId: s.sessionId,
      pid: s.pid,
      instanceId: s.instanceId,
      instanceName: s.instanceName,
      username: s.username,
      accountMode: s.accountMode,
      startTime: s.startTime
    }));
  }

  getRunningCount() {
    return this.runningProcesses.size;
  }

  getRecentLogs() {
    return [...this.recentLogsBuffer];
  }

  onEvent(callback) {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  _emit(eventName, data) {
    for (const listener of this.eventListeners) {
      try {
        listener(eventName, data);
      } catch (err) {
        logger.error(`Error en listener de evento ${eventName}:`, err);
      }
    }
  }

  /**
   * Lanza la instancia del perfil activo o el especificado
   */
  async launch(overrideOptions = {}) {
    if (this.isLaunching) {
      throw new Error('Ya hay un proceso de lanzamiento en curso.');
    }

    this.isLaunching = true;
    this.hasGameStarted = false;
    this._emit('launch:status', { state: 'initializing', message: 'Inicializando motor ShubaCore...' });

    try {
      // 1. Validar autenticación activa y auto-renovar tokens si es necesario
      if (this.authManager && typeof this.authManager.ensureValidSession === 'function') {
        await this.authManager.ensureValidSession();
      }
      const auth = this.authManager.getMCLCAuth();
      const currentAccount = this.authManager.getCurrentAccount();
      logger.info(`Jugador autenticado: ${auth.name} (${currentAccount.type.toUpperCase()})`);

      // MECANISMO 1: Passthrough de UUID Oficial para Modo Offline con Skin Premium
      const { getSkinManager } = require('../skins/SkinManager');
      const skinMgr = getSkinManager();
      const skinInfo = skinMgr.getCurrentSkinInfo(auth.name);

      if (currentAccount.type === 'offline' && skinInfo && skinInfo.clonedUuid) {
        auth.uuid = skinInfo.clonedUuid;
        logger.info(`⚡ [LaunchManager] [MECANISMO 1] Passthrough de UUID Oficial activado: "${auth.name}" usará UUID Mojang: ${auth.uuid}`);
      }

      // 2. Obtener el perfil de instancia activa
      const activeProfile = this.profileManager.getActive();
      if (!activeProfile) {
        throw new Error('No se encontró ningún perfil configurado para lanzar.');
      }

      const mcVersion = overrideOptions.mcVersion || activeProfile.mcVersion || '1.21.1';
      const loader = (overrideOptions.loader || activeProfile.loader || 'neoforge').toLowerCase();
      const loaderVersion = overrideOptions.loaderVersion || activeProfile.loaderVersion || '';

      const sharedRoot = this.configManager.getInstanceDirectory(); // Raíz compartida (.shubacore)
      const instancePath = overrideOptions.instancePath || this.profileManager.getInstancePath(activeProfile.id);

      logger.info(`Perfil a lanzar: "${activeProfile.name}" [ID: ${activeProfile.id}]`);
      logger.info(`Versión: Minecraft ${mcVersion} | Loader: ${loader.toUpperCase()} (${loaderVersion || 'Auto'})`);
      logger.info(`Directorio de juego aislado: ${instancePath}`);

      // REQUISITO 3: Asegurar existencia de la subcarpeta /mods de la instancia
      const instanceModsDir = path.join(instancePath, 'mods');
      if (!fs.existsSync(instanceModsDir)) {
        fs.mkdirSync(instanceModsDir, { recursive: true });
        logger.info(`[LaunchManager] Creada subcarpeta /mods para la instancia: ${instanceModsDir}`);
      }

      // Si la carpeta /mods del perfil no tiene .jar pero hay mods en la raíz compartida (.shubacore/mods),
      // copiar automáticamente los mods y sincronizar mods-lock.json para que NeoForge los detecte y cargue
      const sharedModsDir = path.join(sharedRoot, 'mods');
      if (fs.existsSync(sharedModsDir)) {
        const localJars = fs.readdirSync(instanceModsDir).filter((f) => f.toLowerCase().endsWith('.jar'));
        if (localJars.length === 0) {
          const sharedJars = fs.readdirSync(sharedModsDir).filter((f) => f.toLowerCase().endsWith('.jar'));
          if (sharedJars.length > 0) {
            logger.info(`[LaunchManager] Sincronizando ${sharedJars.length} mods desde la raíz hacia "${activeProfile.name}" (/mods)...`);
            for (const jFile of sharedJars) {
              const src = path.join(sharedModsDir, jFile);
              const dst = path.join(instanceModsDir, jFile);
              if (!fs.existsSync(dst)) {
                fs.copyFileSync(src, dst);
              }
            }
            const sharedLock = path.join(sharedRoot, 'mods-lock.json');
            const instanceLock = path.join(instancePath, 'mods-lock.json');
            if (fs.existsSync(sharedLock) && !fs.existsSync(instanceLock)) {
              fs.copyFileSync(sharedLock, instanceLock);
            }
          }
        }
      }

      // 3. Detectar y resolver Java oficial compatible (según perfil o automático por versión de Minecraft)
      const { JavaManager } = require('../jvm/JavaManager');
      this._emit('launch:status', { state: 'resolving_java', message: `Resolviendo runtime de Java para Minecraft ${mcVersion}...` });

      const javaResult = await JavaManager.resolveJavaForLaunch({
        profile: activeProfile,
        overrideOptions,
        globalConfig: this.configManager.getAll(),
        mcVersion,
        sharedRoot,
        onProgress: (prog) => {
          this._emit('launch:progress', prog);
        }
      });

      const resolvedJavaPath = javaResult.path;
      const resolvedJavaMajor = javaResult.majorVersion;
      logger.info(`⚡ [LaunchManager] Java resuelto para MC ${mcVersion}: "${resolvedJavaPath}" (Java ${resolvedJavaMajor}, ${javaResult.vendor || 'OpenJDK'})`);

      // 4. Preparar Modloader en modo nativo/headless (evita forgewrapper defectuoso en NeoForge)
      this._emit('launch:status', {
        state: 'preparing_loader',
        message: `Preparando ${loader.toUpperCase()} ${loaderVersion}...`
      });

      const loaderPrep = await ModloaderResolver.prepareLoader({
        mcRoot: sharedRoot,
        mcVersion,
        loader,
        loaderVersion,
        javaPath: resolvedJavaPath,
        onProgress: (prog) => {
          this._emit('launch:progress', {
            type: prog.type,
            percent: prog.percent,
            message: prog.message
          });
        }
      });

      // 5. Configurar Flags JVM de alto rendimiento
      const memoryMin = overrideOptions.ramMin || overrideOptions.memoryMin || activeProfile.ramMin || activeProfile.memoryMin || this.configManager.get('memory.min', '2G');
      const memoryMax = overrideOptions.ramMax || overrideOptions.memoryMax || activeProfile.ramMax || activeProfile.memoryMax || this.configManager.get('memory.max', '8G');
      const customJvmArgs = overrideOptions.customJvmArgs || activeProfile.customJvmArgs || this.configManager.get('performance.customJvmArgs', '');

      const jvmFlags = JVMOptimizer.buildJvmArguments({
        majorVersion: resolvedJavaMajor,
        memoryMin,
        memoryMax,
        ramMin: memoryMin,
        ramMax: memoryMax,
        customJvmArgs
      });

      // 5b. Extraer e inyectar argumentos JVM del JSON de NeoForge/Forge + flags de reflexión obligatorias
      const customVersionName = loaderPrep.customVersionName;
      let parsedLoaderJvmArgs = [];

      // Saneamiento proactivo del version.json en disco para eliminar -Xmx/-Xms duplicados antes de MCLC
      try {
        const targetVersionName = customVersionName || mcVersion;
        const versionJsonPath = path.join(sharedRoot, 'versions', targetVersionName, `${targetVersionName}.json`);
        if (fs.existsSync(versionJsonPath)) {
          const vJson = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
          let vModified = false;
          if (vJson.arguments) {
            if (Array.isArray(vJson.arguments.jvm)) {
              const beforeLen = vJson.arguments.jvm.length;
              vJson.arguments.jvm = stripMemoryFlags(vJson.arguments.jvm);
              if (vJson.arguments.jvm.length !== beforeLen) vModified = true;
            }
            if (Array.isArray(vJson.arguments['default-user-jvm'])) {
              const beforeLen = vJson.arguments['default-user-jvm'].length;
              vJson.arguments['default-user-jvm'] = stripMemoryFlags(vJson.arguments['default-user-jvm']);
              if (vJson.arguments['default-user-jvm'].length !== beforeLen) vModified = true;
            }
          }
          if (vModified) {
            fs.writeFileSync(versionJsonPath, JSON.stringify(vJson, null, 2), 'utf8');
            logger.info(`[LaunchManager] Version JSON ${targetVersionName}.json saneado en disco (eliminadas flags -Xmx/-Xms del manifiesto).`);
          }
        }
      } catch (cleanErr) {
        logger.warn(`[LaunchManager] Aviso al sanear version JSON en disco: ${cleanErr.message}`);
      }

      if (customVersionName) {
        // REQUISITOS 1 y 2: Unificar pares de flags JVM y vaciar arguments.jvm en disco para MCLC
        parsedLoaderJvmArgs = ModloaderResolver.sanitizeAndUnifyJvmArgs({
          mcRoot: sharedRoot,
          customVersionName
        });
        parsedLoaderJvmArgs = parsedLoaderJvmArgs.filter((a) => typeof a === 'string' && !a.startsWith('-Xmx') && !a.startsWith('-Xms'));
        logger.info(`[NeoForge JVM] Inyectados ${parsedLoaderJvmArgs.length} argumentos JVM unificados desde ${customVersionName}.json`);
      }

      // Flags obligatorias de reflexión para UnionFileSystem y BootstrapLauncher en Java 21
      const mandatoryReflectionFlags = [
        '--add-opens=java.base/java.lang.invoke=ALL-UNNAMED',
        '--add-opens=java.base/java.nio=ALL-UNNAMED',
        '--add-opens=java.base/java.lang=ALL-UNNAMED',
        '--add-opens=java.base/java.util=ALL-UNNAMED',
        '--add-opens=java.base/java.util.jar=ALL-UNNAMED',
        '--add-exports=java.base/sun.security.util=ALL-UNNAMED',
        '--add-exports=jdk.naming.dns/com.sun.jndi.dns=java.naming',
        '--enable-native-access=ALL-UNNAMED'
      ];

      // Combinar todas las flags evitando duplicados y preservando estrictamente la RAM de ShubaCore
      const finalJvmArgs = [];
      const seenArgs = new Set();
      const allArgsToInject = [...jvmFlags, ...parsedLoaderJvmArgs, ...mandatoryReflectionFlags];

      for (const a of allArgsToInject) {
        if (a && typeof a === 'string') {
          // Descartar flags de memoria que no provengan directamente de jvmFlags de ShubaCore
          if ((a.startsWith('-Xmx') || a.startsWith('-Xms')) && !jvmFlags.includes(a)) {
            continue;
          }
          if (!seenArgs.has(a)) {
            seenArgs.add(a);
            finalJvmArgs.push(a);
          }
        }
      }

      // 5c. Asegurar archivo controller-map.json en la instancia para el puente Win32
      try {
        const { getControllerMapManager } = require('../controller/ControllerMapManager');
        getControllerMapManager().ensureMappingFile(instancePath);
      } catch (_) {}

      // 5d. Asegurar options.txt forzando lang:es_es y autoJump:false
      try {
        const { getHudOptionsManager } = require('../hud/HudOptionsManager');
        getHudOptionsManager().prepareInstanceOptions(instancePath);
      } catch (optErr) {
        logger.warn(`[LaunchManager] Aviso preparando options.txt: ${optErr.message}`);
      }

      // 5e. REQUISITO 1: Purga total de <instanceDir>/natives/ y extracción exclusiva de nativos x64
      const instanceNativesDir = this._prepareCleanNatives(instancePath, sharedRoot);

      // 5f. REQUISITO 2: Verificar integridad de assets (evitar crash de lwjgl_freetype con unifont) y asegurar es_es.json
      await this._verifyAndFixAssets(sharedRoot, mcVersion, customVersionName);

      // Inyectar rutas limpias de nativos en las flags de Java (reemplazando cualquier ruta anterior)
      const cleanedJvmArgs = finalJvmArgs.filter((arg) => !arg.startsWith('-Djava.library.path=') && !arg.startsWith('-Dorg.lwjgl.librarypath='));
      cleanedJvmArgs.push(`-Djava.library.path=${instanceNativesDir}`);
      cleanedJvmArgs.push(`-Dorg.lwjgl.librarypath=${instanceNativesDir}`);

      logger.info(`Flags JVM completas aplicadas (Java ${resolvedJavaMajor}):\n${cleanedJvmArgs.join(' ')}`);

      // 6. Configurar opciones completas de MCLC
      const customLaunchArgs = [...(overrideOptions.customLaunchArgs || [])];

      // Entrada directa al mundo con QuickPlay de Mojang si se especificó
      if (overrideOptions.quickPlaySingleplayer) {
        customLaunchArgs.push('--quickPlaySingleplayer', overrideOptions.quickPlaySingleplayer);
        logger.info(`⚡ [QuickPlay] Lanzando con entrada directa al mundo: "${overrideOptions.quickPlaySingleplayer}"`);
      }

      // Silenciar telemetría y llamadas de cuenta en modo offline pasando --userProperties {}
      const isOfflineAccount = !currentAccount || currentAccount.type === 'offline';
      if (isOfflineAccount) {
        if (!customLaunchArgs.includes('--userProperties')) {
          customLaunchArgs.push('--userProperties', '{}');
        }
      }

      // REQUISITO 1: detached: true obligatorio tanto en opts como en overrides para evitar que Windows mate Java
      const mclcOptions = {
        clientPackage: null,
        authorization: auth,
        root: sharedRoot, // Carpeta compartida con libraries, versions y assets
        javaPath: resolvedJavaPath,
        version: {
          number: mcVersion,
          type: 'release',
          custom: customVersionName || undefined
        },
        memory: {
          min: memoryMin,
          max: memoryMax
        },
        detached: true,
        customArgs: cleanedJvmArgs,
        customLaunchArgs,
        overrides: {
          cwd: instancePath, // Forzar CWD en el directorio de la instancia (evita desvíos a la raíz)
          gameDirectory: instancePath, // Aísla /mods, /config y /saves en la carpeta de la instancia (inyecta --gameDir automáticamente)
          natives: instanceNativesDir, // Directorio de nativos 64-bit limpio y saneado
          detached: true
        }
      };

      // 6b. Configurar registro físico en disco (logs/launcher-output.log)
      const instanceLogsDir = path.join(instancePath, 'logs');
      if (!fs.existsSync(instanceLogsDir)) {
        fs.mkdirSync(instanceLogsDir, { recursive: true });
      }

      const launcherLogFile = path.join(instanceLogsDir, 'launcher-output.log');
      this.lastLogPath = launcherLogFile;
      this.lastInstancePath = instancePath;

      logger.info(`[SHUBACORE ENGINE] Iniciando sesión: Perfil "${activeProfile.name}", MC ${mcVersion} (${loader}), RAM: ${memoryMin}-${memoryMax}`);

      // REQUISITO 2: ShubaCore Engine - Inyección de variables de entorno de alto rendimiento para GPU
      process.env.SHIM_MCCOMPAT = '0x800000001';
      process.env.__GL_THREADED_OPTIMIZATIONS = '1';

      // Si el perfil tiene activo el Motor ShubaCore (por defecto true), inyectar optimizadores de renderizado
      const isEngineEnabled = activeProfile.shubaEngine !== false && overrideOptions.shubaEngine !== false;
      if (isEngineEnabled && loader !== 'vanilla') {
        logger.info('⚡ [SHUBACORE ENGINE] Inyección interna activa. Verificando optimizadores base de motor...');
        try {
          const { getModManager } = require('../mods/ModManager');
          const modMgr = getModManager();
          await modMgr.installPerformancePack({
            mcVersion,
            loader,
            instancePath,
            onProgress: (p) => {
              this._emit('launch:progress', { type: 'engine_opt', message: p.message, percent: p.percent });
            }
          });
        } catch (engineErr) {
          logger.warn(`[SHUBACORE ENGINE] Aviso al inyectar optimizadores base: ${engineErr.message}`);
        }
      }

      // MECANISMO 2: Inyección de Resource Pack Nativo "ShubaSkinOverride" (100% Vanilla sin mods)
      try {
        const packRes = await skinMgr.injectSkinResourcePack({
          instancePath,
          username: auth.name,
          mcVersion
        });
        if (packRes.applied) {
          logger.info(`⚡ [LaunchManager] [MECANISMO 2] Resource pack nativo ShubaSkinOverride aplicado en "${instancePath}" (Vanilla 100% sin mods).`);
        }
      } catch (skinErr) {
        logger.warn(`[LaunchManager] Aviso al inyectar Resource Pack ShubaSkinOverride: ${skinErr.message}`);
      }

      // MECANISMO 3: Purgar y asegurar que ShubaCoreSplash esté 100% desactivado y eliminado de resourcepacks y options.txt
      try {
        const { getSplashScreen } = require('../splash/SplashScreen');
        getSplashScreen().cleanAndPurgeSplash(instancePath);
      } catch (splashErr) {
        logger.warn(`[LaunchManager] Aviso al purgar SplashScreen: ${splashErr.message}`);
      }

      // 7. ShubaCore Pro - Limpieza de memoria Standby (Anti-Stuttering) antes del despegue
      try {
        const { getMemoryCleaner } = require('../system/MemoryCleaner');
        await getMemoryCleaner().cleanStandbyMemory();
      } catch (cleanerErr) {
        logger.debug(`[LaunchManager] Limpieza de memoria Standby omitida con seguridad: ${cleanerErr.message}`);
      }

      // 8. Enlazar eventos de logs y lanzamiento para este proceso
      const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      const clientLauncher = new Client();

      this._bindSessionMclcEvents(clientLauncher, sessionId, activeProfile.name);
      this._emit('launch:status', { state: 'launching_game', message: 'Iniciando proceso de Minecraft...' });

      const gameProcess = await clientLauncher.launch(mclcOptions);

      const sessionInfo = {
        sessionId,
        pid: gameProcess.pid,
        child: gameProcess,
        instanceId: activeProfile.id,
        instanceName: activeProfile.name,
        instancePath,
        username: auth.name,
        accountMode: currentAccount?.type || (this.authManager?.isPremium?.() ? 'microsoft' : 'offline'),
        startTime: Date.now()
      };
      this.runningProcesses.set(sessionId, sessionInfo);
      this.isLaunching = false;

      // Garantizar Prioridad Normal para evitar que Java ahogue al driver de GPU (DWM/NVIDIA)
      try {
        const os = require('os');
        if (os.constants?.priority?.PRIORITY_NORMAL !== undefined && gameProcess.pid) {
          os.setPriority(gameProcess.pid, os.constants.priority.PRIORITY_NORMAL);
        }
      } catch (_) {}

      // Registrar timestamp de último juego en el perfil
      this.profileManager.updateProfile(activeProfile.id, { lastPlayed: new Date().toISOString() });

      logger.info(`[LaunchManager] Proceso de Minecraft (${activeProfile.name} - ${auth.name}) iniciado exitosamente con PID: ${gameProcess.pid} [Sesión: ${sessionId}]. Sesiones activas: ${this.runningProcesses.size}`);
      this._emit('launch:started', {
        sessionId,
        pid: gameProcess.pid,
        profile: activeProfile.name,
        username: auth.name,
        accountMode: sessionInfo.accountMode,
        runningCount: this.runningProcesses.size
      });
      this._emit('game:sessions-changed', {
        runningCount: this.runningProcesses.size,
        sessions: this.getRunningProcesses()
      });

      this._monitorGameProcess(gameProcess, clientLauncher, sessionId, activeProfile.name);

      return {
        success: true,
        sessionId,
        pid: gameProcess.pid,
        profile: activeProfile.name,
        username: auth.name
      };
    } catch (err) {
      this.isLaunching = false;
      const errorMsg = err?.stack || err?.message || String(err);
      logger.error('Error crítico durante el lanzamiento:\n' + errorMsg);
      this._emit('launch:error', { error: err?.message || errorMsg });
      throw err;
    }
  }

  _bindSessionMclcEvents(clientLauncher, sessionId, profileName) {
    if (!this.logFlushTimer) {
      this.logFlushTimer = setInterval(() => {
        if (this.pendingLogBatch.length > 0) {
          const batch = this.pendingLogBatch.splice(0, this.pendingLogBatch.length);
          this._emit('launch:log-batch', batch);
        }
      }, 500);
    }

    clientLauncher.on('debug', (e) => {
      this._emit('launch:debug', e);
    });

    clientLauncher.on('data', (e) => {
      const rawText = typeof e === 'string' ? e : e.toString();
      const lines = rawText.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // Comprobar si la ventana del juego ya está lista
        this._checkGameStartedLog(line, sessionId, profileName);

        // Almacenar en buffer circular en memoria (máximo 2000 líneas)
        this.recentLogsBuffer.push(line);
        if (this.recentLogsBuffer.length > 2000) {
          this.recentLogsBuffer.shift();
        }

        // Acumular en el lote para emisión diferida
        this.pendingLogBatch.push(line);
      }
    });

    clientLauncher.on('progress', (e) => {
      this._emit('launch:progress', e);
    });

    clientLauncher.on('download-status', (e) => {
      this._emit('launch:download-status', e);
    });
  }

  _checkGameStartedLog(line, sessionId, profileName) {
    if (this.hasGameStarted) return;

    // Retrasar detección de ventana lista hasta que los recursos y audio estén inicializados
    const gameReadySignatures = [
      'Sound engine started',
      'Sound engine started.',
      'Created: ',
      'Backend library: LWJGL',
      'OpenAL initialized.',
      'Narrator library for',
      'Reloading ResourceManager: Default',
      'Reloading ResourceManager: Vanilla'
    ];

    if (gameReadySignatures.some((sig) => line.includes(sig))) {
      this._handleGameWindowReady(sessionId, profileName);
    }
  }

  _handleGameWindowReady(sessionId, profileName) {
    if (this.hasGameStarted) return;
    this.hasGameStarted = true;

    logger.info('===========================================================');
    logger.info(`¡La ventana de Minecraft (${profileName || 'Sesión'}) se ha creado y el juego está listo!`);
    logger.info('===========================================================');

    // Retrasar el inicio de ControllerBridge 8 segundos tras abrir la ventana para no interferir con OpenGL y fuentes
    if (process.platform === 'win32') {
      if (this.controllerBridgeTimer) {
        clearTimeout(this.controllerBridgeTimer);
        this.controllerBridgeTimer = null;
      }
      logger.info('[Mando] Esperando 8 segundos a que Minecraft estabilice OpenGL y fuentes antes de activar el mando...');
      this.controllerBridgeTimer = setTimeout(() => {
        if (this.runningProcesses.has(sessionId)) {
          try {
            const { getControllerBridge } = require('../controller/ControllerBridge');
            const session = this.runningProcesses.get(sessionId);
            const pid = session?.pid;
            const instPath = session?.instancePath || this.lastInstancePath;
            getControllerBridge().start(instPath, pid);
            logger.info(`[Mando] Puente XInput/Gamepad activo para Minecraft (PID: ${pid || 'auto'}) tras 8s de estabilización`);
          } catch (bridgeErr) {
            logger.warn(`[LaunchManager] Aviso al iniciar puente de mandos Win32: ${bridgeErr.message}`);
          }
        }
      }, 8000);
    }

    // Emitir evento para que ipcHandlers / main.js oculte la ventana y congele interfaz
    this._emit('launch:game-ready', {
      sessionId,
      profile: profileName,
      timestamp: Date.now(),
      runningCount: this.runningProcesses.size
    });
  }

  _monitorGameProcess(gameProcess, clientLauncher, sessionId, profileName) {
    const fallbackTimer = setTimeout(() => {
      if (this.runningProcesses.has(sessionId)) {
        logger.info(`Tiempo de espera cumplido: la sesión ${sessionId} está activa y estable.`);
        this._handleGameWindowReady(sessionId, profileName);
      }
    }, 14000);

    const handleSessionClose = (code) => {
      clearTimeout(fallbackTimer);
      if (this.controllerBridgeTimer) {
        clearTimeout(this.controllerBridgeTimer);
        this.controllerBridgeTimer = null;
      }
      if (!this.runningProcesses.has(sessionId)) return;

      this.runningProcesses.delete(sessionId);
      logger.info(`[LaunchManager] Sesión ${sessionId} (PID ${gameProcess.pid}) finalizada con código: ${code}. Sesiones activas restantes: ${this.runningProcesses.size}`);

      if (this.runningProcesses.size === 0) {
        this.hasGameStarted = false;
        if (this.logFlushTimer) {
          clearInterval(this.logFlushTimer);
          this.logFlushTimer = null;
        }
        if (this.pendingLogBatch.length > 0) {
          const batch = this.pendingLogBatch.splice(0, this.pendingLogBatch.length);
          this._emit('launch:log-batch', batch);
        }
        try {
          const { getControllerBridge } = require('../controller/ControllerBridge');
          getControllerBridge().stop();
          logger.info('[Mando] Puente de mando detenido');
        } catch (_) {}
      }

      this._emit('launch:close', {
        sessionId,
        pid: gameProcess.pid,
        code,
        runningCount: this.runningProcesses.size
      });
      this._emit('game:sessions-changed', {
        runningCount: this.runningProcesses.size,
        sessions: this.getRunningProcesses()
      });
    };

    gameProcess.on('exit', (code) => handleSessionClose(code));
    clientLauncher.on('close', (code) => handleSessionClose(code));
  }

  killSession(sessionId) {
    if (this.controllerBridgeTimer) {
      clearTimeout(this.controllerBridgeTimer);
      this.controllerBridgeTimer = null;
    }
    const session = this.runningProcesses.get(sessionId);
    if (!session) return false;

    logger.warn(`[LaunchManager] Interrumpiendo sesión ${sessionId} (PID: ${session.pid})...`);
    try {
      if (process.platform === 'win32' && session.pid) {
        const { exec } = require('child_process');
        exec(`taskkill /pid ${session.pid} /f /t`);
      } else if (session.child) {
        session.child.kill('SIGKILL');
      }
    } catch (err) {
      logger.error(`Error al terminar proceso PID ${session.pid}:`, err);
    }

    this.runningProcesses.delete(sessionId);
    if (this.runningProcesses.size === 0) {
      this.hasGameStarted = false;
    }

    this._emit('launch:close', {
      sessionId,
      pid: session.pid,
      code: -1,
      runningCount: this.runningProcesses.size
    });
    this._emit('game:sessions-changed', {
      runningCount: this.runningProcesses.size,
      sessions: this.getRunningProcesses()
    });
    return true;
  }

  killAll() {
    logger.warn(`[LaunchManager] Cerrando todas las sesiones de Minecraft activas (${this.runningProcesses.size})...`);
    for (const [sessionId, session] of this.runningProcesses.entries()) {
      try {
        if (process.platform === 'win32' && session.pid) {
          const { exec } = require('child_process');
          exec(`taskkill /pid ${session.pid} /f /t`);
        } else if (session.child) {
          session.child.kill('SIGKILL');
        }
      } catch (_) {}
    }

    this.runningProcesses.clear();
    this.hasGameStarted = false;
    this.isLaunching = false;

    if (this.logFlushTimer) {
      clearInterval(this.logFlushTimer);
      this.logFlushTimer = null;
    }

    this._emit('launch:close', { code: -1, runningCount: 0 });
    this._emit('game:sessions-changed', { runningCount: 0, sessions: [] });
    return true;
  }

  abort() {
    this.isLaunching = false;
    return this.killAll();
  }

  _openPathSafely(targetPath) {
    try {
      const electron = require('electron');
      if (electron && electron.shell && typeof electron.shell.openPath === 'function') {
        electron.shell.openPath(targetPath);
        return;
      }
    } catch (_) {}

    try {
      const { exec } = require('child_process');
      if (process.platform === 'win32') {
        exec(`start "" "${targetPath}"`);
      } else if (process.platform === 'darwin') {
        exec(`open "${targetPath}"`);
      } else {
        exec(`xdg-open "${targetPath}"`);
      }
    } catch (_) {}
  }

  openLatestLog(instancePath = null) {
    const targetInstance = instancePath || this.lastInstancePath || this.profileManager.getActiveInstancePath();
    const logsDir = path.join(targetInstance, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const latestLogPath = path.join(logsDir, 'latest.log');
    const launcherLogPath = path.join(logsDir, 'launcher-output.log');

    if (fs.existsSync(latestLogPath)) {
      this._openPathSafely(latestLogPath);
      return { success: true, path: latestLogPath };
    } else if (fs.existsSync(launcherLogPath)) {
      this._openPathSafely(launcherLogPath);
      return { success: true, path: launcherLogPath };
    } else {
      fs.writeFileSync(launcherLogPath, '[SHUBACORE] No se encontraron logs previos para esta instancia.\n', 'utf8');
      this._openPathSafely(launcherLogPath);
      return { success: true, path: launcherLogPath };
    }
  }

  openLogsFolder(instancePath = null) {
    const targetInstance = instancePath || this.lastInstancePath || this.profileManager.getActiveInstancePath();
    const logsDir = path.join(targetInstance, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    this._openPathSafely(logsDir);
    return { success: true, path: logsDir };
  }

  openCrashReports(instancePath = null) {
    const targetInstance = instancePath || this.lastInstancePath || this.profileManager.getActiveInstancePath();
    const crashDir = path.join(targetInstance, 'crash-reports');
    const logsDir = path.join(targetInstance, 'logs');

    if (fs.existsSync(crashDir)) {
      this._openPathSafely(crashDir);
      return { success: true, path: crashDir };
    }
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    this._openPathSafely(logsDir);
    return { success: true, path: logsDir };
  }

  /**
   * REQUISITO 1: Purga total de <instanceDir>/natives/ y extracción exclusiva
   * de los .jar que terminen exactamente en -natives-windows.jar (64 bits)
   */
  _prepareCleanNatives(instancePath, sharedRoot) {
    const instanceNativesDir = path.join(instancePath, 'natives');
    if (fs.existsSync(instanceNativesDir)) {
      try {
        fs.rmSync(instanceNativesDir, { recursive: true, force: true });
      } catch (rmErr) {
        logger.warn(`[LaunchManager] Aviso limpiando natives/: ${rmErr.message}`);
      }
    }
    fs.mkdirSync(instanceNativesDir, { recursive: true });

    const librariesRoot = path.join(sharedRoot, 'libraries');
    if (fs.existsSync(librariesRoot)) {
      const AdmZip = require('adm-zip');
      const findNativeJars = (dir) => {
        let results = [];
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              results = results.concat(findNativeJars(full));
            } else if (entry.isFile()) {
              const lowerName = entry.name.toLowerCase();
              // Regla estricta: debe terminar exactamente en -natives-windows.jar (64 bits) y no tener arm64 ni x86
              if (lowerName.endsWith('-natives-windows.jar') && !lowerName.includes('arm64') && !lowerName.includes('x86')) {
                results.push(full);
              }
            }
          }
        } catch (_) {}
        return results;
      };

      const nativeJars = findNativeJars(librariesRoot);
      logger.info(`[LaunchManager] Extrayendo ${nativeJars.length} jars de nativos oficiales 64-bit Windows en: ${instanceNativesDir}`);
      for (const jarPath of nativeJars) {
        try {
          const zip = new AdmZip(jarPath);
          const zipEntries = zip.getEntries();
          for (const zEntry of zipEntries) {
            if (!zEntry.isDirectory && zEntry.entryName.toLowerCase().endsWith('.dll') && !zEntry.entryName.includes('/')) {
              const dest = path.join(instanceNativesDir, zEntry.name);
              fs.writeFileSync(dest, zEntry.getData());
            }
          }
        } catch (zipErr) {
          logger.warn(`[LaunchManager] Aviso extrayendo nativos de ${path.basename(jarPath)}: ${zipErr.message}`);
        }
      }
    }
    return instanceNativesDir;
  }

  /**
   * REQUISITO 2: Verifica la integridad de tamaño y descarga de todos los assets
   * en <userData>/assets/indexes/<assetIndexId>.json para evitar crashes en lwjgl_freetype.dll (unifont).
   * Si algún objeto tiene tamaño 0 o distinto a assetObj.size, lo re-descarga de Mojang.
   */
  async _verifyAndFixAssets(sharedRoot, mcVersion, customVersionName) {
    try {
      const assetDir = path.join(sharedRoot, 'assets');
      const indexesDir = path.join(assetDir, 'indexes');
      const objectsDir = path.join(assetDir, 'objects');

      if (!fs.existsSync(indexesDir)) fs.mkdirSync(indexesDir, { recursive: true });
      if (!fs.existsSync(objectsDir)) fs.mkdirSync(objectsDir, { recursive: true });

      // 1. Localizar el assetIndexId desde el archivo de versión
      let assetIndexId = null;
      let assetIndexUrl = null;
      const targetVersion = customVersionName || mcVersion;
      const vJsonPath = path.join(sharedRoot, 'versions', targetVersion, `${targetVersion}.json`);
      if (fs.existsSync(vJsonPath)) {
        try {
          const vData = JSON.parse(fs.readFileSync(vJsonPath, 'utf8'));
          if (vData.assetIndex) {
            assetIndexId = vData.assetIndex.id;
            assetIndexUrl = vData.assetIndex.url;
          } else if (vData.assets) {
            assetIndexId = vData.assets;
          }
        } catch (_) {}
      }

      if (!assetIndexId) assetIndexId = mcVersion;

      let indexFile = path.join(indexesDir, `${assetIndexId}.json`);
      if (!fs.existsSync(indexFile)) {
        indexFile = path.join(indexesDir, `${mcVersion}.json`);
      }
      if (!fs.existsSync(indexFile)) {
        const indexFiles = fs.readdirSync(indexesDir).filter((f) => f.endsWith('.json'));
        if (indexFiles.length > 0) {
          indexFile = path.join(indexesDir, indexFiles[0]);
        }
      }

      // Si el índice no existe en disco pero tenemos su URL oficial, descargarlo
      if (!fs.existsSync(indexFile) && assetIndexUrl) {
        try {
          logger.info(`[LaunchManager] Descargando assetIndex (${assetIndexId}) desde: ${assetIndexUrl}`);
          const https = require('https');
          const indexDir = path.dirname(indexFile);
          if (!fs.existsSync(indexDir)) fs.mkdirSync(indexDir, { recursive: true });
          await new Promise((resolve) => {
            const file = fs.createWriteStream(indexFile);
            https.get(assetIndexUrl, (res) => {
              if (res.statusCode !== 200) return resolve();
              res.pipe(file);
              file.on('finish', () => file.close(resolve));
            }).on('error', () => resolve());
          });
        } catch (_) {}
      }

      // Si es modloader con nombre custom (ej. NeoForge), clonar el índice para que MCLC lo encuentre
      if (customVersionName && fs.existsSync(indexFile)) {
        const customIndexTarget = path.join(indexesDir, `${customVersionName}.json`);
        if (!fs.existsSync(customIndexTarget)) {
          try {
            fs.copyFileSync(indexFile, customIndexTarget);
          } catch (_) {}
        }
      }

      if (!fs.existsSync(indexFile)) {
        logger.warn(`[LaunchManager] No se pudo verificar assets: indexFile no encontrado en ${indexesDir}`);
        return;
      }

      const indexData = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
      const objects = indexData.objects || {};
      const toDownload = [];

      // 2. Comprobar existencia y tamaño exacto de cada objeto
      for (const [name, obj] of Object.entries(objects)) {
        if (!obj || !obj.hash || typeof obj.size !== 'number') continue;
        const hash = obj.hash;
        const expectedSize = obj.size;
        const prefix = hash.substring(0, 2);
        const objDir = path.join(objectsDir, prefix);
        const objPath = path.join(objDir, hash);

        let needsDownload = false;
        try {
          const stat = fs.statSync(objPath);
          if (stat.size !== expectedSize || stat.size === 0) {
            needsDownload = true;
            try { fs.unlinkSync(objPath); } catch (_) {}
          }
        } catch (_) {
          needsDownload = true;
        }

        if (needsDownload) {
          toDownload.push({ name, hash, expectedSize, prefix, objDir, objPath });
        }
      }

      // Asegurar específicamente que el idioma español exista en la lista de descarga si falta
      const esLangObj = objects['minecraft/lang/es_es.json'];
      if (esLangObj && esLangObj.hash) {
        const esHash = esLangObj.hash;
        const esPrefix = esHash.substring(0, 2);
        const esPath = path.join(objectsDir, esPrefix, esHash);
        try {
          const s = fs.statSync(esPath);
          if (s.size === 0 || s.size !== esLangObj.size) {
            if (!toDownload.some((d) => d.hash === esHash)) {
              toDownload.push({ name: 'minecraft/lang/es_es.json', hash: esHash, expectedSize: esLangObj.size, prefix: esPrefix, objDir: path.join(objectsDir, esPrefix), objPath: esPath });
            }
          }
        } catch (_) {
          if (!toDownload.some((d) => d.hash === esHash)) {
            toDownload.push({ name: 'minecraft/lang/es_es.json', hash: esHash, expectedSize: esLangObj.size, prefix: esPrefix, objDir: path.join(objectsDir, esPrefix), objPath: esPath });
          }
        }
      }

      if (toDownload.length === 0) {
        logger.info(`[LaunchManager] ✅ Integridad de assets verificada: ${Object.keys(objects).length} objetos 100% íntegros (evitado crash freetype).`);
        return;
      }

      logger.info(`[LaunchManager] ⚠️ Se detectaron ${toDownload.length} assets faltantes o corruptos (tamaño 0 / distinto). Descargando...`);

      // 3. Descarga concurrente (pool de 10) desde https://resources.download.minecraft.net/
      const https = require('https');
      const downloadOne = (item) => {
        return new Promise((resolve) => {
          if (!fs.existsSync(item.objDir)) {
            try { fs.mkdirSync(item.objDir, { recursive: true }); } catch (_) {}
          }
          const url = `https://resources.download.minecraft.net/${item.prefix}/${item.hash}`;
          const file = fs.createWriteStream(item.objPath);
          const req = https.get(url, (res) => {
            if (res.statusCode !== 200) {
              try { fs.unlinkSync(item.objPath); } catch (_) {}
              return resolve(false);
            }
            res.pipe(file);
            file.on('finish', () => {
              file.close(() => {
                try {
                  const s = fs.statSync(item.objPath);
                  resolve(s.size === item.expectedSize);
                } catch (_) {
                  resolve(false);
                }
              });
            });
          });
          req.on('error', () => {
            try { fs.unlinkSync(item.objPath); } catch (_) {}
            resolve(false);
          });
          req.setTimeout(15000, () => {
            req.destroy();
            try { fs.unlinkSync(item.objPath); } catch (_) {}
            resolve(false);
          });
        });
      };

      const concurrency = 10;
      let currentIndex = 0;
      let repaired = 0;

      const workers = Array(concurrency).fill(null).map(async () => {
        while (currentIndex < toDownload.length) {
          const item = toDownload[currentIndex++];
          const ok = await downloadOne(item);
          if (ok) repaired++;
        }
      });

      await Promise.all(workers);
      logger.info(`[LaunchManager] ✅ Reparación de assets completada: ${repaired}/${toDownload.length} descargados exitosamente.`);
    } catch (err) {
      logger.warn(`[LaunchManager] Aviso durante verificación de assets: ${err.message}`);
    }
  }

  async _ensureLanguageAssets(sharedRoot, mcVersion, customVersionName) {
    return this._verifyAndFixAssets(sharedRoot, mcVersion, customVersionName);
  }

  getStatus() {
    return {
      isLaunching: this.isLaunching,
      isRunning: this.runningProcesses.size > 0,
      runningCount: this.runningProcesses.size,
      sessions: this.getRunningProcesses(),
      pid: this.runningProcesses.size > 0 ? Array.from(this.runningProcesses.values())[0].pid : null,
      hasGameStarted: this.hasGameStarted
    };
  }
}

let launchManagerInstance = null;
function getLaunchManager() {
  if (!launchManagerInstance) {
    launchManagerInstance = new LaunchManager();
  }
  return launchManagerInstance;
}

module.exports = {
  LaunchManager,
  getLaunchManager
};
