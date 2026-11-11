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
const { getConfigManager } = require('../config/ConfigManager');
const { getAuthManager } = require('../auth/AuthManager');
const { getProfileManager } = require('../profiles/ProfileManager');
const { JVMOptimizer } = require('../jvm/JVMOptimizer');
const { ModloaderResolver } = require('./ModloaderResolver');
const { defaultLogger: logger } = require('../utils/logger');

class LaunchManager {
  constructor() {
    this.configManager = getConfigManager();
    this.authManager = getAuthManager();
    this.profileManager = getProfileManager();
    this.launcher = new Client();
    this.activeProcess = null;
    this.isLaunching = false;
    this.hasGameStarted = false;
    this.eventListeners = new Set();
    this.currentLogStream = null;
    this.lastLogPath = null;
    this.lastInstancePath = null;
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

      if (customVersionName) {
        // REQUISITOS 1 y 2: Unificar pares de flags JVM y vaciar arguments.jvm en disco para MCLC
        parsedLoaderJvmArgs = ModloaderResolver.sanitizeAndUnifyJvmArgs({
          mcRoot: sharedRoot,
          customVersionName
        });
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

      // Combinar todas las flags evitando duplicados
      const finalJvmArgs = [];
      const seenArgs = new Set();
      const allArgsToInject = [...jvmFlags, ...parsedLoaderJvmArgs, ...mandatoryReflectionFlags];

      for (const a of allArgsToInject) {
        if (a && typeof a === 'string' && !seenArgs.has(a)) {
          seenArgs.add(a);
          finalJvmArgs.push(a);
        }
      }

      logger.info(`Flags JVM completas aplicadas (Java ${resolvedJavaMajor}):\n${finalJvmArgs.join(' ')}`);

      // 6. Configurar opciones completas de MCLC
      const customLaunchArgs = [...(overrideOptions.customLaunchArgs || [])];
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
        customArgs: finalJvmArgs,
        customLaunchArgs,
        overrides: {
          cwd: instancePath, // Forzar CWD en el directorio de la instancia (evita desvíos a la raíz)
          gameDirectory: instancePath, // Aísla /mods, /config y /saves en la carpeta de la instancia (inyecta --gameDir automáticamente)
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

      if (this.currentLogStream) {
        try { this.currentLogStream.end(); } catch (_) {}
      }

      this.currentLogStream = fs.createWriteStream(launcherLogFile, { flags: 'a', encoding: 'utf8' });

      const launchHeader = [
        '\n=======================================================',
        `[SHUBACORE ENGINE] SESIÓN DE JUEGO INICIADA: ${new Date().toISOString()}`,
        `Perfil: "${activeProfile.name}" [ID: ${activeProfile.id}]`,
        `Minecraft: ${mcVersion} | Loader: ${loader.toUpperCase()} (${loaderVersion || 'Auto'})`,
        `Directorio de Instancia (gameDir): ${instancePath}`,
        `Directorio de Trabajo (cwd): ${instancePath}`,
        `Runtime Java: "${resolvedJavaPath}" (Java ${resolvedJavaMajor})`,
        `Memoria Asignada: ${memoryMin} - ${memoryMax}`,
        `Flags JVM: ${finalJvmArgs.join(' ')}`,
        '=======================================================\n'
      ].join('\n');
      this.currentLogStream.write(launchHeader + '\n');

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

      // 7. Enlazar eventos de logs y lanzamiento
      this._bindMclcEvents();
      this._emit('launch:status', { state: 'launching_game', message: 'Iniciando proceso de Minecraft...' });

      const gameProcess = await this.launcher.launch(mclcOptions);
      this.activeProcess = gameProcess;
      this.isLaunching = false;

      // REQUISITO 2: Asignar Prioridad Alta de CPU en Windows en tiempo real
      if (process.platform === 'win32' && gameProcess.pid) {
        this._setHighProcessPriority(gameProcess.pid);
      }

      // Registrar timestamp de último juego en el perfil
      this.profileManager.updateProfile(activeProfile.id, { lastPlayed: new Date().toISOString() });

      logger.info(`Proceso de Minecraft iniciado exitosamente con PID: ${gameProcess.pid}`);
      this._emit('launch:started', { pid: gameProcess.pid, profile: activeProfile.name });

      this._monitorGameProcess(gameProcess);

      return {
        success: true,
        pid: gameProcess.pid,
        profile: activeProfile.name
      };
    } catch (err) {
      this.isLaunching = false;
      this.activeProcess = null;
      const errorMsg = err?.stack || err?.message || String(err);
      if (this.currentLogStream) {
        try {
          this.currentLogStream.write(`\n[SHUBACORE CRITICAL ERROR] ${errorMsg}\n`);
          this.currentLogStream.end();
          this.currentLogStream = null;
        } catch (_) {}
      }
      logger.error('Error crítico durante el lanzamiento:\n' + errorMsg);
      this._emit('launch:error', { error: err?.message || errorMsg });
      throw err;
    }
  }

  _bindMclcEvents() {
    this.launcher.removeAllListeners();

    this.launcher.on('debug', (e) => {
      logger.debug(`[MCLC Debug] ${e}`);
      this._emit('launch:debug', e);
    });

    this.launcher.on('data', (e) => {
      const rawText = e.toString();
      if (this.currentLogStream) {
        try {
          this.currentLogStream.write(rawText.endsWith('\n') ? rawText : rawText + '\n');
        } catch (_) {}
      }

      const lines = rawText.split(/\r?\n/);
      for (const line of lines) {
        if (!line.trim()) continue;
        // Silenciar warnings esperados de telemetría / Realms 401 en modo offline
        if (line.includes('MinecraftServicesUserApiService') || line.includes('RealmsClient') || (line.includes('401') && line.includes('Realms'))) {
          logger.debug(`[Offline Telemetry / Realms Ignorado] ${line}`);
        } else {
          logger.game(line);
        }
        this._emit('launch:log', line);
        this._emit('game-log', line);
        this._checkGameStartedLog(line);
      }
    });

    this.launcher.on('progress', (e) => {
      this._emit('launch:progress', e);
    });

    this.launcher.on('download-status', (e) => {
      this._emit('launch:download-status', e);
    });

    this.launcher.on('close', (code) => {
      logger.info(`El proceso de Minecraft finalizó con código: ${code}`);
      if (this.currentLogStream) {
        try {
          this.currentLogStream.write(`\n[SHUBACORE] Proceso cerrado con código de salida: ${code} a las ${new Date().toISOString()}\n`);
          this.currentLogStream.end();
          this.currentLogStream = null;
        } catch (_) {}
      }
      this.activeProcess = null;
      this.isLaunching = false;
      this.hasGameStarted = false;
      this._emit('launch:close', { code });
    });
  }

  _checkGameStartedLog(line) {
    if (this.hasGameStarted) return;

    // REQUISITO 2: Retrasar detección de ventana lista hasta que los recursos y audio estén inicializados
    // (NO disparar prematuramente con 'Setting user:' o 'LWJGL' mientras NeoForge recién carga mods)
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
      this._handleGameWindowReady();
    }
  }

  _handleGameWindowReady() {
    if (this.hasGameStarted) return;
    this.hasGameStarted = true;

    logger.info('===========================================================');
    logger.info('¡La ventana de Minecraft se ha creado y el juego está listo!');
    logger.info('===========================================================');

    // Emitir evento para que ipcHandlers / main.js oculte la ventana y libere caché
    // sin ejecutar app.quit() mientras el proceso hijo de Java esté activo
    this._emit('launch:game-ready', { timestamp: Date.now() });
  }

  _monitorGameProcess(gameProcess) {
    const fallbackTimer = setTimeout(() => {
      if (this.activeProcess && !this.hasGameStarted) {
        logger.info('Tiempo de espera cumplido: el proceso de Minecraft está activo y estable.');
        this._handleGameWindowReady();
      }
    }, 14000);

    gameProcess.on('exit', () => {
      clearTimeout(fallbackTimer);
      this.activeProcess = null;
      this.isLaunching = false;
    });
  }

  /**
   * REQUISITO 2: Asigna Prioridad Alta de CPU al proceso Java de Minecraft en Windows
   */
  _setHighProcessPriority(pid) {
    const { exec } = require('child_process');
    const psCmd = `powershell -NoProfile -Command "Get-Process -Id ${pid} -ErrorAction SilentlyContinue | ForEach-Object { $_.PriorityClass = 'High' }"`;
    exec(psCmd, (err) => {
      if (!err) {
        logger.info(`⚡ [SHUBACORE ENGINE] Prioridad Alta de CPU asignada al proceso PID ${pid} (Windows).`);
      } else {
        exec(`wmic process where processid="${pid}" CALL setpriority "high priority"`, () => {});
      }
    });
  }

  abort() {
    if (this.activeProcess) {
      logger.warn('Interrumpiendo proceso activo de Minecraft...');
      try {
        this.activeProcess.kill();
      } catch (err) {}
      this.activeProcess = null;
      this.isLaunching = false;
      return true;
    }
    return false;
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

  getStatus() {
    return {
      isLaunching: this.isLaunching,
      isRunning: this.activeProcess !== null,
      pid: this.activeProcess ? this.activeProcess.pid : null,
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
