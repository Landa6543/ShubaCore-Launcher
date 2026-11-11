/**
 * ShubaCore - Main Process Entry Point
 * Developed by SHUBATECH
 * Private High-Performance Minecraft Launcher
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const { getConfigManager } = require('./src/main/config/ConfigManager');
const { getAuthManager } = require('./src/main/auth/AuthManager');
const { registerIpcHandlers } = require('./src/main/ipc/ipcHandlers');
const { defaultLogger: logger } = require('./src/main/utils/logger');

// Asegurar instancia única de la aplicación
const gotTheLock = app.requestSingleInstanceLock();

let mainWindow = null;

if (!gotTheLock) {
  logger.warn('Otra instancia de ShubaCore ya está en ejecución. Cerrando proceso duplicado...');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createMainWindow);
}

function createMainWindow() {
  logger.info('Iniciando ShubaCore Launcher (SHUBATECH)...');

  // Inicializar el gestor de configuración
  const configManager = getConfigManager();
  const rootPath = configManager.getInstanceDirectory();
  logger.info(`Instancia de datos configurada en: ${rootPath}`);

  // Asegurar launcher_profiles.json dummy obligatorio para instaladores oficiales de Forge y NeoForge
  try {
    if (!fs.existsSync(rootPath)) fs.mkdirSync(rootPath, { recursive: true });
    const dummyProfilesPath = path.join(rootPath, 'launcher_profiles.json');
    if (!fs.existsSync(dummyProfilesPath)) {
      fs.writeFileSync(dummyProfilesPath, JSON.stringify({ profiles: {}, settings: {}, version: 3 }, null, 2), 'utf8');
      logger.info(`[SHUBATECH] launcher_profiles.json inicializado en: ${dummyProfilesPath}`);
    }
  } catch (profilesErr) {
    logger.warn('Aviso al verificar launcher_profiles.json:', profilesErr?.message || profilesErr);
  }

  // Cargar sesión persistente de usuario (auth-session.json) y auto-renovar tokens si es necesario
  try {
    const authManager = getAuthManager();
    authManager.getSavedSession().then((session) => {
      logger.info(`[Auth] Sesión persistente restaurada. Modo activo: ${session.activeMode} (Usuario: ${session.account?.name || 'Ninguno'})`);
    }).catch((err) => {
      logger.warn('[Auth] Error al restaurar sesión persistente:', err.message);
    });
  } catch (authErr) {
    logger.warn('[Auth] Aviso al inicializar sesión:', authErr.message);
  }

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 960,
    minHeight: 640,
    frame: false, // Barra de título personalizada para interfaz gamer / técnica moderna
    show: false,
    icon: path.join(__dirname, 'logo.png'),
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, 'src/preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      devTools: true,
      backgroundThrottling: true
    }
  });

  mainWindow.webContents.setBackgroundThrottling(true);

  // Registrar todos los manejadores IPC con la ventana activa
  registerIpcHandlers(mainWindow);

  // Inicializar y conectar motor de Auto-Actualización (electron-updater)
  setupAutoUpdater(mainWindow);

  // Inicializar y conectar Discord Rich Presence (Discord RPC)
  try {
    const { getDiscordManager } = require('./src/main/discord/DiscordManager');
    const discordManager = getDiscordManager();
    discordManager.init();
    app.on('will-quit', () => {
      discordManager.destroy();
    });
  } catch (rpcErr) {
    logger.warn('Aviso al inicializar Discord RPC:', rpcErr.message);
  }

  // Cargar archivo HTML principal del renderer
  const rendererPath = path.join(__dirname, 'src/renderer/index.html');
  mainWindow.loadFile(rendererPath);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    logger.info('Ventana principal de ShubaCore renderizada y visible.');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// =========================================================================
// SISTEMA DE AUTO-ACTUALIZACIÓN (ELECTRON-UPDATER)
// =========================================================================
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function setupAutoUpdater(win) {
  const isIgnorableUpdaterError = (errOrMsg) => {
    const text = String(errOrMsg?.message || errOrMsg || '');
    return text.includes('No published versions on GitHub') ||
           text.includes('HttpError: 404') ||
           text.includes('404 Not Found') ||
           text.includes('Cannot find latest.yml') ||
           text.includes('status 404');
  };

  autoUpdater.logger = {
    info: (msg) => logger.info(`[AutoUpdater] ${msg}`),
    warn: (msg) => {
      if (isIgnorableUpdaterError(msg)) {
        logger.info(`[AutoUpdater] Versión actual al día (v${app.getVersion()})`);
        return;
      }
      logger.warn(`[AutoUpdater] ${msg}`);
    },
    error: (msg) => {
      if (isIgnorableUpdaterError(msg)) {
        logger.info(`[AutoUpdater] Versión actual al día (v${app.getVersion()})`);
        return;
      }
      logger.error(`[AutoUpdater] ${msg}`);
    },
    debug: (msg) => logger.debug(`[AutoUpdater] ${msg}`)
  };

  autoUpdater.on('checking-for-update', () => {
    logger.info('[AutoUpdater] Comprobando si hay actualizaciones disponibles...');
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:checking');
    }
  });

  autoUpdater.on('update-available', (info) => {
    logger.info(`[AutoUpdater] Actualización encontrada: v${info.version}`);
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    logger.info('[AutoUpdater] El launcher ya está en la versión más reciente.');
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:update-not-available', {
        version: info?.version || app.getVersion()
      });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:download-progress', {
        percent: Math.round(progressObj.percent),
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    logger.info(`[AutoUpdater] ¡Actualización v${info.version} descargada y lista para instalar!`);
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:update-downloaded', {
        version: info.version
      });
    }
  });

  autoUpdater.on('error', (err) => {
    if (isIgnorableUpdaterError(err)) {
      logger.info(`[AutoUpdater] Versión actual al día (v${app.getVersion()})`);
      if (win && !win.isDestroyed()) {
        win.webContents.send('updater:update-not-available', {
          version: app.getVersion()
        });
      }
      return;
    }
    logger.warn(`[AutoUpdater Error] ${err.message}`);
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:error', {
        message: err.message
      });
    }
  });

  // Al iniciar la app, si está empaquetada (app.isPackaged), comprobar automáticamente
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      if (isIgnorableUpdaterError(err)) {
        logger.info(`[AutoUpdater] Versión actual al día (v${app.getVersion()})`);
        return;
      }
      logger.warn('[AutoUpdater] No se pudo verificar actualización automática al inicio:', err.message);
    });
  }
}

// Handlers IPC para AutoUpdater
ipcMain.handle('updater:check', async () => {
  const isIgnorableUpdaterError = (errOrMsg) => {
    const text = String(errOrMsg?.message || errOrMsg || '');
    return text.includes('No published versions on GitHub') ||
           text.includes('HttpError: 404') ||
           text.includes('404 Not Found') ||
           text.includes('Cannot find latest.yml') ||
           text.includes('status 404');
  };

  try {
    logger.info('[AutoUpdater] Verificación manual solicitada por el usuario...');
    if (!app.isPackaged) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('updater:checking');
      }
      try {
        const res = await autoUpdater.checkForUpdates();
        return { success: true, isDev: true, result: res };
      } catch (devErr) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('updater:update-not-available', {
            version: app.getVersion(),
            message: 'Modo desarrollo: versión local sin empaquetar.'
          });
        }
        return { success: true, isDev: true, message: devErr.message };
      }
    }
    const res = await autoUpdater.checkForUpdates();
    return { success: true, result: res };
  } catch (err) {
    if (isIgnorableUpdaterError(err)) {
      logger.info(`[AutoUpdater] Versión actual al día (v${app.getVersion()})`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('updater:update-not-available', {
          version: app.getVersion()
        });
      }
      return { success: true, message: `Versión actual al día (v${app.getVersion()})` };
    }
    logger.error('Error al comprobar actualizaciones:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('updater:quit-and-install', () => {
  logger.info('[AutoUpdater] Reiniciando launcher para instalar actualización...');
  setImmediate(() => {
    autoUpdater.quitAndInstall(false, true);
  });
  return { success: true };
});

ipcMain.handle('updater:get-version', () => {
  return app.getVersion();
});

app.on('window-all-closed', () => {
  // En Windows y Linux salimos cuando todas las ventanas se cierran
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// Manejo de excepciones no capturadas a nivel global en el proceso principal
process.on('uncaughtException', (err) => {
  const errMsg = err?.stack || err?.message || String(err);
  logger.error('Excepción global no capturada en Main Process:\n' + errMsg);
});

process.on('unhandledRejection', (reason, promise) => {
  const reasonMsg = reason?.stack || reason?.message || String(reason);
  logger.error('Rechazo de promesa no capturado en Main Process:\n' + reasonMsg);
});
