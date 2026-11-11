/**
 * ShubaCore - Secure Preload Bridge
 * Developed by SHUBATECH
 * Exposes safe APIs to the Renderer Process using contextBridge and IPC
 */

const { contextBridge, ipcRenderer } = require('electron');

const VALID_RECEIVE_CHANNELS = [
  'launch:status',
  'launch:progress',
  'launch:download-status',
  'launch:debug',
  'launch:log',
  'launch:log-batch',
  'game-log',
  'launch:started',
  'launch:game-ready',
  'launch:closing-launcher',
  'launch:close',
  'launch:error',
  'app:freeze-ui',
  'mods:performance-pack-progress',
  'mods:modpack-progress',
  'content:download-progress',
  'packs:export-progress',
  'packs:import-progress',
  'jvm:download-progress',
  'app:log',
  'updater:checking',
  'updater:update-available',
  'updater:update-not-available',
  'updater:download-progress',
  'updater:update-downloaded',
  'updater:error'
];

contextBridge.exposeInMainWorld('shubaCoreAPI', {
  // ==========================================
  // SISTEMA DE PERFILES E INSTANCIAS AISLADAS
  // ==========================================
  profiles: {
    getAll: () => ipcRenderer.invoke('profiles:get-all'),
    getActive: () => ipcRenderer.invoke('profiles:get-active'),
    setActive: (id) => ipcRenderer.invoke('profiles:set-active', id),
    create: (data) => ipcRenderer.invoke('profiles:create', data),
    update: (id, partial) => ipcRenderer.invoke('profiles:update', { id, partial }),
    delete: (id) => ipcRenderer.invoke('profiles:delete', id),
    openFolder: (id) => ipcRenderer.invoke('profiles:open-folder', id),
    selectIconDialog: () => ipcRenderer.invoke('profiles:select-icon-dialog')
  },

  // ==========================================
  // SELECTOR DINÁMICO DE VERSIONES DE LOADERS
  // ==========================================
  loaders: {
    getVersions: (loader, mcVersion) => ipcRenderer.invoke('loaders:get-versions', { loader, mcVersion })
  },

  // ==========================================
  // CONFIGURACIÓN Y PERSISTENCIA
  // ==========================================
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    getKey: (keyPath, defaultValue) => ipcRenderer.invoke('config:get-key', keyPath, defaultValue),
    set: (keyPath, value) => ipcRenderer.invoke('config:set', keyPath, value),
    update: (partial) => ipcRenderer.invoke('config:update', partial),
    selectDirectory: (defaultPath) => ipcRenderer.invoke('config:select-directory', defaultPath),
    selectJava: () => ipcRenderer.invoke('config:select-java')
  },

  // ==========================================
  // AUTENTICACIÓN HÍBRIDA (OFFLINE & MICROSOFT DEVICE CODE)
  // ==========================================
  auth: {
    getSavedSession: () => ipcRenderer.invoke('get-saved-session'),
    setActiveMode: (mode) => ipcRenderer.invoke('auth:set-active-mode', mode),
    refreshMsToken: (force) => ipcRenderer.invoke('auth:refresh-ms-token', force),
    getCurrent: () => ipcRenderer.invoke('auth:get-current'),
    getMsAccount: () => ipcRenderer.invoke('auth:get-ms-account'),
    loginOffline: (username) => ipcRenderer.invoke('auth:login-offline', username),
    loginMicrosoft: () => ipcRenderer.invoke('auth:login-microsoft'),
    requestDeviceCode: () => ipcRenderer.invoke('auth:ms-device-code'),
    pollDeviceCode: (deviceCode, interval) => ipcRenderer.invoke('auth:ms-poll', { deviceCode, interval }),
    cancelDeviceCode: () => ipcRenderer.invoke('auth:ms-cancel'),
    switchAccount: (uuid) => ipcRenderer.invoke('auth:switch-account', uuid),
    logoutMs: (uuid) => ipcRenderer.invoke('auth:logout-ms', uuid),
    logout: () => ipcRenderer.invoke('auth:logout')
  },

  // ==========================================
  // DETECCIÓN Y OPTIMIZACIÓN JVM / GESTOR RUNTIMES
  // ==========================================
  jvm: {
    detect: (customJavaPath, targetMcVersion) => ipcRenderer.invoke('jvm:detect', customJavaPath, targetMcVersion),
    getRecommendedArgs: (options) => ipcRenderer.invoke('jvm:get-recommended-args', options),
    scanInstalled: () => ipcRenderer.invoke('jvm:scan-installed'),
    install: (majorVersion) => ipcRenderer.invoke('jvm:install', majorVersion),
    getRequiredVersion: (mcVersion) => ipcRenderer.invoke('jvm:get-required-version', mcVersion)
  },

  // ==========================================
  // MOTOR DE LANZAMIENTO
  // ==========================================
  launcher: {
    launch: (options) => ipcRenderer.invoke('launcher:launch', options),
    abort: () => ipcRenderer.invoke('launcher:abort'),
    getStatus: () => ipcRenderer.invoke('launcher:get-status'),
    openLatestLog: (instancePath) => ipcRenderer.invoke('launcher:open-latest-log', instancePath),
    openLogsFolder: (instancePath) => ipcRenderer.invoke('launcher:open-logs-folder', instancePath),
    openCrashReports: (instancePath) => ipcRenderer.invoke('launcher:open-crash-reports', instancePath),
    setConsoleVisibility: (visible) => ipcRenderer.send('launcher:set-console-visibility', visible),
    getRecentLogs: () => ipcRenderer.invoke('launcher:get-recent-logs')
  },

  // ==========================================
  // GESTOR DE MODS DUAL (CurseForge + Modrinth)
  // ==========================================
  mods: {
    search: (options) => ipcRenderer.invoke('mods:search', options),
    download: (options) => ipcRenderer.invoke('mods:download', options),
    listInstalled: (instancePath) => ipcRenderer.invoke('mods:list-installed', instancePath),
    toggle: (fileName, enabled, instancePath) => ipcRenderer.invoke('mods:toggle', { fileName, enabled, instancePath }),
    delete: (fileName, instancePath) => ipcRenderer.invoke('mods:delete', { fileName, instancePath }),
    installPerformancePack: (options) => ipcRenderer.invoke('mods:install-performance-pack', options),
    searchModpacks: (options) => ipcRenderer.invoke('mods:search-modpacks', options),
    installModpackFile: (options) => ipcRenderer.invoke('mods:install-modpack-file', options),
    selectModpackFile: () => ipcRenderer.invoke('mods:select-modpack-file'),
    getProjectDetails: (options) => ipcRenderer.invoke('mods:get-project-details', options),
    installVersion: (options) => ipcRenderer.invoke('mods:install-version', options),
    checkUpdates: (options) => ipcRenderer.invoke('mods:check-updates', options),
    updateAll: (options) => ipcRenderer.invoke('mods:update-all', options),
    onUpdateProgress: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on('mods:update-progress', handler);
      return () => ipcRenderer.removeListener('mods:update-progress', handler);
    },
    resolveIcons: (instancePath) => ipcRenderer.invoke('mods:resolve-icons', instancePath),
    purgeDuplicates: (instancePath) => ipcRenderer.invoke('mods:purge-duplicates', instancePath),
    openFolder: (instancePath) => ipcRenderer.invoke('mods:open-folder', instancePath)
  },

  // ==========================================
  // EXPLORADOR TOTAL MULTI-CATEGORÍA CON PAGINACIÓN
  // Mods, Modpacks, Texturas (Resourcepacks) y Shaders
  // ==========================================
  content: {
    search: (options) => ipcRenderer.invoke('content:search', options),
    download: (options) => ipcRenderer.invoke('content:download', options)
  },

  // ==========================================
  // SISTEMA DE SKINS OFFLINE (NO-PREMIUM)
  // ==========================================
  skins: {
    get: (username) => ipcRenderer.invoke('skins:get', username),
    fetchMojangPreview: (username) => ipcRenderer.invoke('skins:fetch-mojang-preview', username),
    setFromUsername: (offlineUser, mojangUser) => ipcRenderer.invoke('skins:set-from-username', { offlineUser, mojangUser }),
    setFromFile: (offlineUser, filePath) => ipcRenderer.invoke('skins:set-from-file', { offlineUser, filePath }),
    selectFile: () => ipcRenderer.invoke('skins:select-file'),
    remove: (username) => ipcRenderer.invoke('skins:remove', username)
  },

  // ==========================================
  // SISTEMA DE EXPORTACIÓN / IMPORTACIÓN .shubapack
  // ==========================================
  packs: {
    export: (options) => ipcRenderer.invoke('packs:export', options),
    import: (options) => ipcRenderer.invoke('packs:import', options),
    selectExportPath: (suggestedName) => ipcRenderer.invoke('packs:select-export-path', suggestedName),
    selectImportFile: () => ipcRenderer.invoke('packs:select-import-file')
  },

  // ==========================================
  // DISCORD RICH PRESENCE (RPC)
  // ==========================================
  discord: {
    getStatus: () => ipcRenderer.invoke('discord:get-status'),
    setEnabled: (enabled) => ipcRenderer.invoke('discord:set-enabled', enabled),
    updateView: (viewName) => ipcRenderer.invoke('discord:update-view', viewName)
  },

  // ==========================================
  // SISTEMA Y VENTANA
  // ==========================================
  system: {
    getInfo: () => ipcRenderer.invoke('system:get-info'),
    getVersions: () => ipcRenderer.invoke('system:get-versions'),
    openExternal: (url) => ipcRenderer.invoke('system:open-external', url),
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  },

  // ==========================================
  // AUTO-ACTUALIZADOR DEL LAUNCHER
  // ==========================================
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    quitAndInstall: () => ipcRenderer.invoke('updater:quit-and-install'),
    getVersion: () => ipcRenderer.invoke('updater:get-version')
  },

  // ==========================================
  // EVENTOS Y REGISTROS EN TIEMPO REAL
  // ==========================================
  events: {
    on: (channel, callback) => {
      if (VALID_RECEIVE_CHANNELS.includes(channel)) {
        const subscription = (event, ...args) => callback(...args);
        ipcRenderer.on(channel, subscription);
        return () => ipcRenderer.removeListener(channel, subscription);
      }
      return () => {};
    },
    removeAll: (channel) => {
      if (VALID_RECEIVE_CHANNELS.includes(channel)) {
        ipcRenderer.removeAllListeners(channel);
      }
    }
  }
});
