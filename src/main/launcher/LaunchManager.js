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

      // 7. Enlazar eventos de logs y lanzamiento para este proceso
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
