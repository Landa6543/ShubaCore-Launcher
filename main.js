/**
 * ShubaCore - Main Process Entry Point
 * Developed by SHUBATECH
 * Private High-Performance Minecraft Launcher
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const { getConfigManager } = require('./src/main/config/ConfigManager');
const { getAuthManager } = require('./src/main/auth/AuthManager');
const { registerIpcHandlers } = require('./src/main/ipc/ipcHandlers');
const { defaultLogger: logger } = require('./src/main/utils/logger');

// Configurar Chromium para evitar congelamiento de Gamepad API y timers en segundo plano
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

// Asegurar instancia única de la aplicación
const gotTheLock = app.requestSingleInstanceLock();

let mainWindow = null;
let tray = null;

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
      backgroundThrottling: false
    }
  });

  mainWindow.webContents.setBackgroundThrottling(false);

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

  // Asegurar cierre limpio de servidores dedicados al salir
  try {
    const { getServerManager } = require('./src/main/servers/ServerManager');
    const serverManager = getServerManager();
    app.on('will-quit', () => {
      serverManager.killAllServers();
    });
  } catch (_) {}

  // Inicializar Icono en la Bandeja del Sistema de Windows (System Tray)
  setupSystemTray();

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
// BANDEJA DEL SISTEMA DE WINDOWS (SYSTEM TRAY)
// =========================================================================
function restoreMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
    if (mainWindow.webContents) {
      mainWindow.webContents.setBackgroundThrottling(false);
      mainWindow.webContents.send('app:freeze-ui', false);
    }
  }
}

function updateTrayMenu() {
  if (!tray) return;
  try {
    const { getLaunchManager } = require('./src/main/launcher/LaunchManager');
    const launchManager = getLaunchManager();
    const runningCount = launchManager ? launchManager.getRunningCount() : 0;

    const template = [
      {
        label: runningCount > 0
          ? `🟢 Instancias en ejecución: ${runningCount}`
          : '⚪ Sin instancias en ejecución',
        enabled: false
      },
      { type: 'separator' },
      {
        label: '📂 Mostrar ShubaCore Launcher',
        click: () => {
          restoreMainWindow();
        }
      },
      {
        label: '⏹ Cerrar todos los juegos activos',
        enabled: runningCount > 0,
        visible: runningCount > 0,
        click: () => {
          if (launchManager) {
            launchManager.killAll();
          }
        }
      },
      { type: 'separator' },
      {
        label: '❌ Salir completamente de ShubaCore',
        click: () => {
          if (launchManager && launchManager.getRunningCount() > 0) {
            launchManager.killAll();
          }
          app.quit();
        }
      }
    ];

    const contextMenu = Menu.buildFromTemplate(template);
    tray.setContextMenu(contextMenu);
  } catch (err) {
    logger.warn('[Tray] Error al construir menú contextual:', err.message);
  }
}

function setupSystemTray() {
  if (tray) return;
  try {
    const iconPath = path.join(__dirname, 'logo.png');
    const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray = new Tray(trayIcon);
    tray.setToolTip('ShubaCore Launcher — SHUBATECH');

    // Clic izquierdo: restaurar y traer al frente
    tray.on('click', () => {
      restoreMainWindow();
    });

    // Doble clic: restaurar y traer al frente
    tray.on('double-click', () => {
      restoreMainWindow();
    });

    updateTrayMenu();

    // Actualizar menú dinámicamente cuando cambian las sesiones de Minecraft
    const { getLaunchManager } = require('./src/main/launcher/LaunchManager');
    const launchManager = getLaunchManager();
    launchManager.onEvent((eventName) => {
      if (eventName === 'launch:started' || eventName === 'launch:close' || eventName === 'game:sessions-changed') {
        updateTrayMenu();
      }
    });

    app.on('will-quit', () => {
      if (tray) {
        try { tray.destroy(); } catch (_) {}
        tray = null;
      }
    });

    logger.info('⚡ [Tray] Icono en la Bandeja del Sistema de Windows (System Tray) inicializado con éxito.');
  } catch (err) {
    logger.warn('[Tray] Error al inicializar System Tray:', err.message);
  }
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
