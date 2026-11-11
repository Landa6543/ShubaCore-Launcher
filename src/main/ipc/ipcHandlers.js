/**
 * ShubaCore - IPC Handlers Registration
 * Developed by SHUBATECH
 * Connects the Electron Main Process with the Preload Bridge securely
 */

const { ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { getConfigManager } = require('../config/ConfigManager');
const { getAuthManager } = require('../auth/AuthManager');
const { getProfileManager } = require('../profiles/ProfileManager');
const { getLaunchManager } = require('../launcher/LaunchManager');
const { getModManager } = require('../mods/ModManager');
const { getSkinManager } = require('../skins/SkinManager');
const { getPackPorter } = require('../packs/PackPorter');
const { JVMOptimizer } = require('../jvm/JVMOptimizer');
const { JavaManager } = require('../jvm/JavaManager');
const { LoaderVersionResolver } = require('../launcher/LoaderVersionResolver');
const { getDiscordManager } = require('../discord/DiscordManager');
const { defaultLogger: logger } = require('../utils/logger');

function registerIpcHandlers(mainWindow) {
  const configManager = getConfigManager();
  const authManager = getAuthManager();
  const profileManager = getProfileManager();
  const launchManager = getLaunchManager();
  const modManager = getModManager();
  const skinManager = getSkinManager();
  const packPorter = getPackPorter();
  const discordManager = getDiscordManager();

  // Estado de visibilidad de la pestaña de consola para evitar IPC flood y backpressure
  let isConsoleTabVisible = false;

  // Suscribir eventos del LaunchManager para retransmitirlos a la ventana del renderer
  launchManager.onEvent((eventName, data) => {
    // Comportamiento del Launcher al Iniciar el Juego (launchBehavior: 'hide' | 'keep' | 'close')
    const launchBehavior = configManager.get('performance.launchBehavior', 'hide');

    if (eventName === 'launch:game-ready') {
      if (launchBehavior === 'hide') {
        if (mainWindow && !mainWindow.isDestroyed()) {
          logger.info('⚡ [RENDIMIENTO MÁXIMO] Modo Rendimiento ("hide"): ShubaCore congelado y oculto en segundo plano (0.0% CPU / 0% GPU). Discord RPC y logs continúan activos.');
          try {
            mainWindow.webContents.setBackgroundThrottling(true);
            mainWindow.webContents.send('app:freeze-ui', true);
            if (mainWindow.webContents.session) {
              mainWindow.webContents.session.clearCache().catch(() => {});
            }
          } catch (_) {}
          mainWindow.hide();
        }
      } else if (launchBehavior === 'close') {
        logger.info('[SHUBATECH] launchBehavior="close": Esperando 4 segundos a que Minecraft despegue para cerrar el launcher...');
        setTimeout(() => {
          try {
            app.quit();
          } catch (_) {
            process.exit(0);
          }
        }, 4000);
      } else if (launchBehavior === 'keep') {
        logger.info('[SHUBATECH] launchBehavior="keep": Manteniendo la ventana del launcher abierta durante la partida.');
      }
    } else if (eventName === 'launch:close') {
      const remainingSessions = launchManager.getRunningCount();
      if (remainingSessions === 0) {
        if (launchBehavior === 'hide' || launchBehavior === 'keep') {
          if (mainWindow && !mainWindow.isDestroyed()) {
            logger.info('[SHUBATECH] Todas las sesiones de Minecraft han finalizado. Descongelando y restaurando ventana de ShubaCore.');
            try {
              mainWindow.webContents.send('app:freeze-ui', false);
            } catch (_) {}
            mainWindow.show();
            mainWindow.focus();
          }
        } else if (launchBehavior === 'close') {
          logger.info('[SHUBATECH] Proceso de Minecraft cerrado. Cerrando launcher completamente ("close").');
          try {
            app.quit();
          } catch (_) {
            process.exit(0);
          }
        }
      } else {
        logger.info(`[SHUBATECH] Una sesión de Minecraft ha finalizado. Quedan ${remainingSessions} sesión(es) activa(s).`);
      }
    }

    // Filtrar estrictamente la transmisión de logs:
    // NUNCA enviar si la ventana está oculta, o si el usuario no está en la pestaña Consola
    if (eventName === 'launch:log-batch') {
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() && isConsoleTabVisible) {
        mainWindow.webContents.send('launch:log-batch', data);
      }
      return;
    }

    // Descartar logs individuales obsoletos para evitar saturar el canal IPC
    if (eventName === 'launch:log' || eventName === 'game-log') {
      return;
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(eventName, data);
    }
  });

  // Retransmitir logs del backend al frontend
  logger.subscribe((entry) => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      if (entry.level === 'ERROR' || isConsoleTabVisible) {
        mainWindow.webContents.send('app:log', entry);
      }
    }
  });

  // ==========================================
  // SISTEMA DE PERFILES E INSTANCIAS AISLADAS
  // ==========================================
  ipcMain.handle('profiles:get-all', async () => {
    return profileManager.getAll();
  });

  ipcMain.handle('profiles:get-active', async () => {
    return profileManager.getActive();
  });

  ipcMain.handle('profiles:set-active', async (event, id) => {
    try {
      const active = profileManager.setActive(id);
      discordManager.refreshActivity();
      return { success: true, profile: active };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('profiles:create', async (event, data) => {
    try {
      const created = profileManager.createProfile(data);
      return { success: true, profile: created };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('profiles:update', async (event, { id, partial }) => {
    try {
      const updated = profileManager.updateProfile(id, partial);
      return { success: true, profile: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('profiles:delete', async (event, id) => {
    try {
      profileManager.deleteProfile(id);
      return { success: true, all: profileManager.getAll() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('profiles:open-folder', async (event, id) => {
    try {
      const folderPath = id ? profileManager.getInstancePath(id) : profileManager.getActiveInstancePath();
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      await shell.openPath(folderPath);
      return { success: true, path: folderPath };
    } catch (err) {
      logger.error('Error al abrir carpeta de instancia:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('profiles:select-icon-dialog', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Seleccionar Icono para la Instancia',
        filters: [
          { name: 'Imágenes (.png, .jpg, .webp)', extensions: ['png', 'jpg', 'jpeg', 'webp'] }
        ],
        properties: ['openFile']
      });

      if (canceled || filePaths.length === 0) {
        return { canceled: true };
      }

      const filePath = filePaths[0];
      const ext = path.extname(filePath).toLowerCase().replace('.', '') || 'png';
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : (ext === 'webp' ? 'image/webp' : 'image/png');
      const base64Data = fs.readFileSync(filePath).toString('base64');
      const dataUrl = `data:${mime};base64,${base64Data}`;

      return {
        canceled: false,
        filePath,
        dataUrl
      };
    } catch (err) {
      logger.error('Error al seleccionar icono de instancia:', err);
      return { canceled: true, error: err.message };
    }
  });

  ipcMain.handle('system:open-external', async (event, url) => {
    try {
      if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
        await shell.openExternal(url);
        return { success: true };
      }
      return { success: false, error: 'URL inválida' };
    } catch (err) {
      logger.error('Error al abrir URL externa:', err);
      return { success: false, error: err.message };
    }
  });

  // ==========================================
  // VERSIONES EXACTAS DE MOD LOADERS (API EN VIVO)
  // ==========================================
  ipcMain.handle('loaders:get-versions', async (event, { loader, mcVersion }) => {
    try {
      return await LoaderVersionResolver.getAvailableLoaderVersions(loader, mcVersion);
    } catch (err) {
      logger.error('Error en loaders:get-versions IPC:', err);
      return ['latest'];
    }
  });

  // ==========================================
  // CONFIGURACIÓN Y PERSISTENCIA
  // ==========================================
  ipcMain.handle('config:get', async () => {
    return configManager.getAll();
  });

  ipcMain.handle('config:get-key', async (event, keyPath, defaultValue) => {
    return configManager.get(keyPath, defaultValue);
  });

  ipcMain.handle('config:set', async (event, keyPath, value) => {
    const success = configManager.set(keyPath, value);
    return { success, config: configManager.getAll() };
  });

  ipcMain.handle('config:update', async (event, partial) => {
    const success = configManager.update(partial);
    return { success, config: configManager.getAll() };
  });

  ipcMain.handle('config:select-directory', async (event, defaultPath) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar carpeta de la instancia de ShubaCore',
      defaultPath: defaultPath || configManager.getInstanceDirectory(),
      properties: ['openDirectory', 'createDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      configManager.set('instance.path', selectedPath);
      return { canceled: false, path: selectedPath };
    }
    return { canceled: true };
  });

  ipcMain.handle('config:select-java', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar ejecutable de Java (javaw.exe / java.exe)',
      properties: ['openFile'],
      filters: [
        { name: 'Ejecutables de Java', extensions: ['exe', ''] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const selectedJava = result.filePaths[0];
      configManager.set('performance.javaPath', selectedJava);
      return { canceled: false, path: selectedJava };
    }
    return { canceled: true };
  });

  // ==========================================
  // AUTENTICACIÓN HÍBRIDA & SESIÓN PERSISTENTE
  // ==========================================
  ipcMain.handle('get-saved-session', async () => {
    return await authManager.getSavedSession();
  });

  ipcMain.handle('auth:get-saved-session', async () => {
    return await authManager.getSavedSession();
  });

  ipcMain.handle('auth:set-active-mode', async (event, mode) => {
    return authManager.setActiveMode(mode);
  });

  ipcMain.handle('auth:refresh-ms-token', async (event, force) => {
    return await authManager.refreshMicrosoftSession(force);
  });

  ipcMain.handle('auth:get-current', async () => {
    return authManager.getCurrentAccount();
  });

  ipcMain.handle('auth:login-offline', async (event, username) => {
    return authManager.loginOffline(username);
  });

  ipcMain.handle('auth:ms-device-code', async () => {
    return await authManager.requestDeviceCode();
  });

  ipcMain.handle('auth:ms-poll', async (event, { deviceCode, interval }) => {
    return await authManager.pollAndCompleteMicrosoftLogin(deviceCode, interval);
  });

  ipcMain.handle('auth:ms-cancel', async () => {
    return authManager.cancelDeviceCode();
  });

  ipcMain.handle('auth:login-microsoft', async () => {
    const codeRes = await authManager.requestDeviceCode();
    if (!codeRes.success) return codeRes;
    return await authManager.pollAndCompleteMicrosoftLogin(codeRes.deviceCode, codeRes.interval);
  });

  ipcMain.handle('auth:logout', async () => {
    return authManager.logout();
  });

  ipcMain.handle('auth:get-ms-account', async () => {
    return authManager.getMicrosoftAccount();
  });

  ipcMain.handle('auth:switch-account', async (event, uuid) => {
    return authManager.switchAccount(uuid);
  });

  ipcMain.handle('auth:logout-ms', async (event, uuid) => {
    return authManager.logoutMicrosoft(uuid);
  });

  // ==========================================
  // DETECCIÓN Y OPTIMIZACIÓN JVM / GESTOR RUNTIMES
  // ==========================================
  ipcMain.handle('jvm:detect', async (event, customJavaPath, targetMcVersion) => {
    return await JVMOptimizer.detectJava(
      customJavaPath || configManager.get('performance.javaPath', null),
      targetMcVersion || '1.21.1'
    );
  });

  ipcMain.handle('jvm:get-recommended-args', async (event, options) => {
    return JVMOptimizer.buildJvmArguments(options);
  });

  ipcMain.handle('jvm:scan-installed', async () => {
    try {
      const sharedRoot = configManager.get('launcher.gameDirectory', path.join(process.env.APPDATA || '', '.shubacore'));
      return await JavaManager.scanInstalledJavas(sharedRoot);
    } catch (err) {
      logger.error('Error al escanear versiones de Java:', err);
      return [];
    }
  });

  ipcMain.handle('jvm:install', async (event, majorVersion) => {
    try {
      const sharedRoot = configManager.get('launcher.gameDirectory', path.join(process.env.APPDATA || '', '.shubacore'));
      const result = await JavaManager.downloadAndInstallJava(Number(majorVersion), sharedRoot, (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('jvm:download-progress', progress);
        }
      });
      return result;
    } catch (err) {
      logger.error(`Error al instalar Java ${majorVersion}:`, err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('jvm:get-required-version', async (event, mcVersion) => {
    try {
      const sharedRoot = configManager.get('launcher.gameDirectory', path.join(process.env.APPDATA || '', '.shubacore'));
      return JavaManager.getRequiredJavaForMinecraft(mcVersion, sharedRoot);
    } catch (err) {
      return { majorVersion: 21, reason: 'heuristic' };
    }
  });

  // ==========================================
  // MOTOR DE LANZAMIENTO (MCLC)
  // ==========================================
  ipcMain.handle('launcher:launch', async (event, options) => {
    try {
      return await launchManager.launch(options);
    } catch (err) {
      const errorMsg = err?.stack || err?.message || String(err);
      logger.error('Error en launcher:launch IPC:\n' + errorMsg);
      return { success: false, error: err?.message || errorMsg };
    }
  });

  ipcMain.handle('launcher:abort', async () => {
    return { success: launchManager.abort() };
  });

  ipcMain.handle('launcher:get-status', async () => {
    return launchManager.getStatus();
  });

  ipcMain.handle('launcher:get-running', async () => {
    return launchManager.getRunningProcesses();
  });

  ipcMain.handle('launcher:kill-all', async () => {
    return { success: launchManager.killAll() };
  });

  ipcMain.handle('launcher:kill-session', async (event, sessionId) => {
    return { success: launchManager.killSession(sessionId) };
  });

  ipcMain.handle('launcher:open-latest-log', async (event, instancePath) => {
    try {
      return launchManager.openLatestLog(instancePath);
    } catch (err) {
      logger.error('Error al abrir latest.log:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('launcher:open-logs-folder', async (event, instancePath) => {
    try {
      return launchManager.openLogsFolder(instancePath);
    } catch (err) {
      logger.error('Error al abrir carpeta de logs:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('launcher:open-crash-reports', async (event, instancePath) => {
    try {
      return launchManager.openCrashReports(instancePath);
    } catch (err) {
      logger.error('Error al abrir crash reports:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.on('launcher:set-console-visibility', (event, visible) => {
    isConsoleTabVisible = !!visible;
  });

  ipcMain.handle('launcher:get-recent-logs', async () => {
    return launchManager.getRecentLogs();
  });

  // ==========================================
  // GESTOR DE MODS DUAL (CurseForge + Modrinth)
  // Opera sobre la instancia activa del perfil
  // ==========================================
  ipcMain.handle('mods:search', async (event, options) => {
    try {
      return await modManager.searchMods(options);
    } catch (err) {
      logger.error('Error en mods:search IPC:', err);
      return [];
    }
  });

  ipcMain.handle('mods:download', async (event, options) => {
    try {
      const targetInstance = options.instancePath || profileManager.getActiveInstancePath();
      const result = await modManager.downloadMod({ ...options, instancePath: targetInstance }, new Set());
      return { success: true, mod: result };
    } catch (err) {
      logger.error('Error en mods:download IPC:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('mods:list-installed', async (event, instancePath) => {
    try {
      const targetInstance = instancePath || profileManager.getActiveInstancePath();
      return modManager.scanAndSyncMods(targetInstance);
    } catch (err) {
      logger.error('Error en mods:list-installed IPC:', err);
      return [];
    }
  });

  ipcMain.handle('mods:toggle', async (event, { fileName, enabled, instancePath }) => {
    try {
      const targetInstance = instancePath || profileManager.getActiveInstancePath();
      const allMods = modManager.toggleMod(fileName, enabled, targetInstance);
      return { success: true, mods: allMods };
    } catch (err) {
      logger.error('Error en mods:toggle IPC:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('mods:delete', async (event, { fileName, instancePath }) => {
    try {
      const targetInstance = instancePath || profileManager.getActiveInstancePath();
      const allMods = modManager.deleteMod(fileName, targetInstance);
      return { success: true, mods: allMods };
    } catch (err) {
      logger.error('Error en mods:delete IPC:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('mods:install-performance-pack', async (event, options = {}) => {
    try {
      const targetInstance = options.instancePath || profileManager.getActiveInstancePath();
      const res = await modManager.installPerformancePack({
        ...options,
        instancePath: targetInstance,
        onProgress: (progress) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('mods:performance-pack-progress', progress);
          }
        }
      });
      return res;
    } catch (err) {
      logger.error('Error en mods:install-performance-pack IPC:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('mods:search-modpacks', async (event, options) => {
    try {
      return await modManager.searchModpacks(options);
    } catch (err) {
      logger.error('Error en mods:search-modpacks IPC:', err);
      return [];
    }
  });

  ipcMain.handle('mods:install-modpack-file', async (event, options = {}) => {
    try {
      const targetInstance = options.createProfile ? null : (options.instancePath || null);
      return await modManager.installModpackFile({
        ...options,
        instancePath: targetInstance,
        createProfile: options.createProfile || !targetInstance,
        onProgress: (progress) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('mods:modpack-progress', progress);
          }
        }
      });
    } catch (err) {
      logger.error('Error en mods:install-modpack-file IPC:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('mods:select-modpack-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar archivo de modpack (CurseForge .zip / Modrinth .mrpack)',
      properties: ['openFile'],
      filters: [
        { name: 'Modpacks (CurseForge .zip / Modrinth .mrpack)', extensions: ['zip', 'mrpack'] },
        { name: 'CurseForge Modpack (.zip)', extensions: ['zip'] },
        { name: 'Modrinth Modpack (.mrpack)', extensions: ['mrpack'] },
        { name: 'Todos los archivos (*.*)', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return { canceled: false, path: result.filePaths[0] };
    }
    return { canceled: true };
  });

  // ==========================================
  // EXPLORADOR TOTAL MULTI-CATEGORÍA CON PAGINACIÓN
  // Mods, Modpacks, Texturas (Resourcepacks) y Shaders
  // ==========================================
  ipcMain.handle('content:search', async (event, options) => {
    try {
      return await modManager.searchContent(options);
    } catch (err) {
      logger.error('Error en content:search IPC:', err);
      return {
        results: [],
        totalCount: 0,
        currentPage: options?.page || 1,
        pageSize: options?.pageSize || 20,
        totalPages: 1,
        hasMore: false,
        error: err.message
      };
    }
  });

  ipcMain.handle('content:download', async (event, options) => {
    try {
      const targetInstance = options.instancePath || profileManager.getActiveInstancePath();
      const result = await modManager.downloadContent({
        ...options,
        instancePath: targetInstance,
        onProgress: (progress) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('content:download-progress', progress);
            if (progress && (progress.type === 'modpack_file' || progress.type === 'cf_modpack_file' || progress.type === 'modpack_download')) {
              mainWindow.webContents.send('mods:modpack-progress', progress);
            }
          }
        }
      });
      return { success: true, ...result, item: result };
    } catch (err) {
      logger.error('Error en content:download IPC:', err);
      return { success: false, error: err.message };
    }
  });

  // ==========================================
  // DETALLE DE MODS, VERSIONES EXACTAS Y ACTUALIZACIONES
  // ==========================================
  ipcMain.handle('mods:get-project-details', async (event, options) => {
    try {
      return await modManager.getProjectDetails(options);
    } catch (err) {
      logger.error('Error en mods:get-project-details IPC:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('mods:install-version', async (event, options) => {
    try {
      const targetInstance = options.instancePath || profileManager.getActiveInstancePath();
      return await modManager.installModVersion({
        ...options,
        instancePath: targetInstance,
        onProgress: (progress) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('mods:install-version-progress', progress);
          }
        }
      });
    } catch (err) {
      logger.error('Error en mods:install-version IPC:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('mods:check-updates', async (event, options = {}) => {
    try {
      const activeProf = profileManager.getActiveProfile ? profileManager.getActiveProfile() : (profileManager.getActive ? profileManager.getActive() : null);
      const targetInstance = options.instancePath || (activeProf ? activeProf.instancePath : profileManager.getActiveInstancePath());
      const mcVer = options.mcVersion || (activeProf ? activeProf.mcVersion : '1.21.1');
      const loader = options.loader || (activeProf ? activeProf.loader : 'neoforge');
      const channel = options.channel || 'release';
      return await modManager.checkForModUpdates(targetInstance, mcVer, loader, channel);
    } catch (err) {
      logger.error('Error en mods:check-updates IPC:', err);
      return { updates: [], count: 0, error: err.message };
    }
  });

  ipcMain.handle('mods:update-all', async (event, options = {}) => {
    try {
      const activeProf = profileManager.getActiveProfile ? profileManager.getActiveProfile() : (profileManager.getActive ? profileManager.getActive() : null);
      const targetInstance = options.instancePath || (activeProf ? activeProf.instancePath : profileManager.getActiveInstancePath());
      const mcVer = options.mcVersion || (activeProf ? activeProf.mcVersion : '1.21.1');
      const loader = options.loader || (activeProf ? activeProf.loader : 'neoforge');
      const channel = options.channel || 'release';
      return await modManager.updateAllMods({
        ...options,
        channel,
        instancePath: targetInstance,
        mcVersion: mcVer,
        loader,
        onProgress: (progress) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('mods:update-progress', progress);
          }
        }
      });
    } catch (err) {
      logger.error('Error en mods:update-all IPC:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('mods:resolve-icons', async (event, instancePath) => {
    try {
      const targetInstance = instancePath || profileManager.getActiveInstancePath();
      return await modManager.resolveMissingModIcons(targetInstance);
    } catch (err) {
      logger.error('Error en mods:resolve-icons IPC:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('mods:purge-duplicates', async (event, instancePath) => {
    try {
      const targetInstance = instancePath || profileManager.getActiveInstancePath();
      return modManager.purgeDuplicateMods(targetInstance);
    } catch (err) {
      logger.error('Error en mods:purge-duplicates IPC:', err);
      return { success: false, error: err.message, purgedCount: 0, removedFiles: [] };
    }
  });

  ipcMain.handle('mods:open-folder', async (event, instancePath) => {
    try {
      const targetInstance = instancePath || profileManager.getActiveInstancePath();
      const modsFolder = path.join(targetInstance, 'mods');
      if (!fs.existsSync(modsFolder)) {
        fs.mkdirSync(modsFolder, { recursive: true });
      }
      await shell.openPath(modsFolder);
      return { success: true, path: modsFolder };
    } catch (err) {
      logger.error('Error al abrir carpeta de mods:', err);
      return { success: false, error: err.message };
    }
  });

  // ==========================================
  // SISTEMA DE SKINS OFFLINE (NO-PREMIUM) - 100% VANILLA
  // ==========================================
  ipcMain.handle('skins:get', async (event, username) => {
    try {
      return skinManager.getSkin(username);
    } catch (err) {
      logger.error('Error en skins:get IPC:', err);
      return { exists: false, error: err.message };
    }
  });

  ipcMain.handle('skins:fetch-mojang-preview', async (event, username) => {
    try {
      const mojangInfo = await skinManager.fetchMojangSkin(username);
      return {
        success: true,
        username: mojangInfo.officialName,
        uuid: mojangInfo.formattedUuid,
        model: mojangInfo.skinModel,
        dataUrl: mojangInfo.dataUrl
      };
    } catch (err) {
      logger.warn(`Error al consultar preview de Mojang para "${username}":`, err.message);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('skins:set-from-username', async (event, { offlineUser, mojangUser }) => {
    try {
      const skinData = await skinManager.setSkinFromMojang(offlineUser, mojangUser);
      try {
        const activePath = profileManager.getActiveInstancePath();
        if (activePath && fs.existsSync(activePath)) {
          await skinManager.injectSkinResourcePack({ instancePath: activePath, username: offlineUser });
        }
      } catch (applyErr) {
        logger.warn('No se pudo aplicar Resource Pack automáticamente a la instancia:', applyErr.message);
      }
      return { success: true, skin: skinData };
    } catch (err) {
      logger.error('Error en skins:set-from-username IPC:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('skins:set-from-file', async (event, { offlineUser, filePath }) => {
    try {
      const skinData = await skinManager.setSkinFromFile(offlineUser, filePath);
      try {
        const activePath = profileManager.getActiveInstancePath();
        if (activePath && fs.existsSync(activePath)) {
          await skinManager.injectSkinResourcePack({ instancePath: activePath, username: offlineUser });
        }
      } catch (applyErr) {
        logger.warn('No se pudo aplicar Resource Pack automáticamente a la instancia:', applyErr.message);
      }
      return { success: true, skin: skinData };
    } catch (err) {
      logger.error('Error en skins:set-from-file IPC:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('skins:select-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar archivo de Skin (PNG de 64x64 o 64x32)',
      properties: ['openFile'],
      filters: [
        { name: 'Skins de Minecraft (*.png)', extensions: ['png'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return { canceled: false, path: result.filePaths[0] };
    }
    return { canceled: true };
  });

  ipcMain.handle('skins:remove', async (event, username) => {
    try {
      const removed = skinManager.removeSkin(username);
      return { success: removed };
    } catch (err) {
      logger.error('Error en skins:remove IPC:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('skins:upload-to-mojang', async (event, { mcAccessToken, skinData, variant }) => {
    try {
      return await skinManager.uploadSkinToMojang(mcAccessToken, skinData, variant);
    } catch (err) {
      logger.error('Error en skins:upload-to-mojang IPC:', err);
      return { success: false, error: err.message };
    }
  });

  // ==========================================
  // SISTEMA DE EXPORTACIÓN / IMPORTACIÓN .shubapack
  // ==========================================
  ipcMain.handle('packs:export', async (event, { profileId, outputPath }) => {
    try {
      const result = await packPorter.exportPack({
        profileId,
        outputPath,
        onProgress: (progress) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('packs:export-progress', progress);
          }
        }
      });
      return { success: true, ...result };
    } catch (err) {
      logger.error('Error en packs:export IPC:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('packs:import', async (event, { packFilePath, customName }) => {
    try {
      const result = await packPorter.importPack({
        packFilePath,
        customName,
        onProgress: (progress) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('packs:import-progress', progress);
          }
        }
      });
      return result;
    } catch (err) {
      logger.error('Error en packs:import IPC:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('packs:select-export-path', async (event, suggestedName) => {
    const defaultFileName = suggestedName
      ? `${suggestedName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.shubapack`
      : 'perfil_shubacore.shubapack';

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Exportar Paquete de Perfil (.shubapack)',
      defaultPath: defaultFileName,
      filters: [
        { name: 'Paquete ShubaCore (*.shubapack)', extensions: ['shubapack'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      return { canceled: false, path: result.filePath };
    }
    return { canceled: true };
  });

  ipcMain.handle('packs:select-import-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Importar Paquete de Perfil ShubaCore (.shubapack)',
      properties: ['openFile'],
      filters: [
        { name: 'Paquetes ShubaCore (*.shubapack)', extensions: ['shubapack'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return { canceled: false, path: result.filePaths[0] };
    }
    return { canceled: true };
  });

  // ==========================================
  // INFORMACIÓN DEL SISTEMA Y VERSIONES DE MC
  // ==========================================
  ipcMain.handle('system:get-versions', async () => {
    const list = [];

    // 1. Incluir versiones ya instaladas físicamente en <sharedRoot>/versions/
    try {
      const sharedRoot = configManager.get('launcher.gameDirectory', path.join(process.env.APPDATA || '', '.shubacore'));
      const versDir = path.join(sharedRoot, 'versions');
      if (fs.existsSync(versDir)) {
        const dirs = fs.readdirSync(versDir, { withFileTypes: true });
        for (const d of dirs) {
          if (d.isDirectory()) {
            const jsonFile = path.join(versDir, d.name, `${d.name}.json`);
            if (fs.existsSync(jsonFile) && !d.name.includes('neoforge-') && !d.name.includes('forge-') && !d.name.includes('fabric-')) {
              list.push(d.name);
            }
          }
        }
      }
    } catch (_) {}

    try {
      const response = await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json', {
        headers: { 'User-Agent': 'SHUBATECH/ShubaCore/1.1.0' }
      });
      if (response.ok) {
        const data = await response.json();
        const releases = data.versions
          .filter((v) => v.type === 'release')
          .map((v) => v.id);
        for (const r of releases) {
          if (!list.includes(r)) list.push(r);
        }
        if (list.length > 0) return list;
      }
    } catch (err) {
      logger.warn('No se pudo obtener el manifiesto de Mojang online. Usando lista predeterminada:', err.message);
    }

    const defaults = [
      '26.3', '1.21.4', '1.21.3', '1.21.2', '1.21.1', '1.21',
      '1.20.6', '1.20.4', '1.20.2', '1.20.1',
      '1.19.4', '1.19.3', '1.19.2', '1.19.1', '1.19',
      '1.18.2', '1.18.1', '1.18',
      '1.17.1', '1.16.5', '1.15.2', '1.14.4', '1.12.2', '1.8.9', '1.7.10'
    ];
    for (const d of defaults) {
      if (!list.includes(d)) list.push(d);
    }
    return list;
  });

  ipcMain.handle('system:get-info', async () => {
    return {
      brand: 'SHUBATECH',
      product: 'ShubaCore',
      version: '1.1.0',
      electron: process.versions.electron,
      node: process.versions.node,
      platform: process.platform,
      arch: process.arch,
      totalMemoryGb: (os.totalmem() / (1024 ** 3)).toFixed(1),
      freeMemoryGb: (os.freemem() / (1024 ** 3)).toFixed(1),
      cpuCount: os.cpus().length,
      cpuModel: os.cpus()[0] ? os.cpus()[0].model : 'Desconocido'
    };
  });

  // ==========================================
  // DISCORD RICH PRESENCE (RPC)
  // ==========================================
  ipcMain.handle('discord:get-status', async () => {
    return discordManager.getStatus();
  });

  ipcMain.handle('discord:set-enabled', async (event, enabled) => {
    discordManager.setEnabled(enabled);
    return discordManager.getStatus();
  });

  ipcMain.handle('discord:update-view', async (event, viewName) => {
    discordManager.setMenuActivity(viewName);
    return { success: true };
  });

  ipcMain.on('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) mainWindow.unmaximize();
      else mainWindow.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    if (mainWindow) mainWindow.close();
  });

  logger.info('Canales IPC registrados con éxito (incluyendo Perfiles y Versiones de Loaders).');
}

module.exports = { registerIpcHandlers };
