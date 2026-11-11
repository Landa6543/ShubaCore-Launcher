/**
 * ShubaCore - Native Desktop Renderer Script
 * Developed by SHUBATECH
 * Inspired by Modrinth App & Prism Launcher
 */

document.addEventListener('DOMContentLoaded', async () => {
  const api = window.shubaCoreAPI;
  if (!api) {
    console.error('ShubaCore Preload API no está disponible.');
    return;
  }

  // Sincronización dinámica de versión desde package.json vía IPC
  try {
    api.updater.getVersion().then((realVer) => {
      if (realVer) {
        document.title = `ShubaCore Launcher v${realVer} - SHUBATECH`;
        const appTitleEl = document.querySelector('.app-title');
        if (appTitleEl) appTitleEl.textContent = `ShubaCore v${realVer}`;
        const sidebarBadgeEl = document.querySelector('.sidebar-brand-title-row .brand-badge');
        if (sidebarBadgeEl) sidebarBadgeEl.textContent = `v${realVer}`;
        const launcherVerEl = document.getElementById('launcher-current-version');
        if (launcherVerEl) launcherVerEl.textContent = `v${realVer}`;
      }
    }).catch(() => {});
  } catch (_) {}

  // =======================================================
  // REFERENCIAS DOM: VENTANA Y NAVEGACIÓN
  // =======================================================
  const btnMinimize = document.getElementById('btn-minimize');
  const btnMaximize = document.getElementById('btn-maximize');
  const btnClose = document.getElementById('btn-close');

  // Vistas Principales (8 Vistas)
  const tabViewProfiles = document.getElementById('tab-view-profiles');
  const tabViewCatalog = document.getElementById('tab-view-catalog');
  const tabViewMods = document.getElementById('tab-view-mods');
  const tabViewServers = document.getElementById('tab-view-servers');
  const tabViewScreenshots = document.getElementById('tab-view-screenshots');
  const tabViewSkins = document.getElementById('tab-view-skins');
  const tabViewSettings = document.getElementById('tab-view-settings');
  const tabViewConsole = document.getElementById('tab-view-console');

  const viewProfiles = document.getElementById('view-profiles');
  const viewCatalog = document.getElementById('view-catalog');
  const viewMods = document.getElementById('view-mods');
  const viewServers = document.getElementById('view-servers');
  const viewScreenshots = document.getElementById('view-screenshots');
  const viewSkins = document.getElementById('view-skins');
  const viewSettings = document.getElementById('view-settings');
  const viewConsole = document.getElementById('view-console');

  // Cuenta y Avatar Canvas
  const accountStatus = document.getElementById('account-status');
  const sidebarAvatarCanvas = document.getElementById('sidebar-avatar-canvas');
  const playerName = document.getElementById('player-name');
  const playerType = document.getElementById('account-status-badge') || document.getElementById('sidebar-account-badge') || document.getElementById('player-type');
  const sidebarAccountBadge = playerType;
  const playerUuid = document.getElementById('player-uuid');
  const playerAvatar = document.getElementById('player-avatar');

  // Modal de Gestión de Cuenta
  const modalAccountManager = document.getElementById('modal-account-manager');
  const btnCloseAccountModal = document.getElementById('btn-close-account-modal');
  const tabOffline = document.getElementById('tab-offline');
  const tabPremium = document.getElementById('tab-premium');
  const formOffline = document.getElementById('form-offline');
  const formPremium = document.getElementById('form-premium');
  const inputOfflineUser = document.getElementById('offline-username');
  const btnLoginOffline = document.getElementById('btn-login-offline');
  const previewOfflineUuid = document.getElementById('preview-offline-uuid');
  const btnLoginMicrosoft = document.getElementById('btn-login-microsoft');

  // Tarjeta de Cuenta Microsoft Activa
  const msActiveAccountCard = document.getElementById('ms-active-account-card');
  const msActiveAvatarCanvas = document.getElementById('ms-active-avatar');
  const msActiveGamertag = document.getElementById('ms-active-gamertag');
  const msActiveUuid = document.getElementById('ms-active-uuid');
  const btnMsUseAccount = document.getElementById('btn-ms-use-account');
  const btnMsSwitchAccount = document.getElementById('btn-ms-switch-account');
  const btnMsLogout = document.getElementById('btn-ms-logout');
  const msLoginPrompt = document.getElementById('ms-login-prompt');

  // Modal de Microsoft Device Code
  const modalMsDeviceCode = document.getElementById('modal-ms-device-code');
  const btnCloseDeviceModal = document.getElementById('btn-close-device-modal');
  const msUserCodeBox = document.getElementById('ms-user-code-box');
  const btnCopyAndOpenLink = document.getElementById('btn-copy-and-open-link');
  const btnCopyLinkText = document.getElementById('btn-copy-link-text');
  const msStatusLabel = document.getElementById('ms-status-label');
  const btnCancelMsAuth = document.getElementById('btn-cancel-ms-auth');

  // Perfil Activo en Dock
  const activeProfileName = document.getElementById('active-profile-name');
  const activeProfileBadge = document.getElementById('active-profile-badge');
  const activeProfileMc = document.getElementById('active-profile-mc');
  const activeProfileLoaderVer = document.getElementById('active-profile-loader-ver');
  const activeProfileFolder = document.getElementById('active-profile-folder');

  // Dock de Lanzamiento
  const btnLaunch = document.getElementById('btn-launch');
  const btnLaunchText = document.getElementById('btn-launch-text');
  const btnStopSessions = document.getElementById('btn-stop-sessions');
  const dockLaunchProgress = document.getElementById('dock-launch-progress');
  const progressBar = document.getElementById('launch-progress-bar');
  const progressTaskLabel = document.getElementById('progress-task-label');
  const progressPercentLabel = document.getElementById('progress-percent-label');
  const launchBadge = document.getElementById('launch-badge');

  // Instancias / Perfiles
  const btnOpenCreateModal = document.getElementById('btn-open-create-modal');
  const btnCreateProfileTop = document.getElementById('btn-create-profile-top');
  const btnImportShubapack = document.getElementById('btn-import-shubapack');
  const profilesGrid = document.getElementById('profiles-grid');

  // Modal de Creación de Instancia
  const modalCreateProfile = document.getElementById('modal-create-profile');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  const btnConfirmCreateProfile = document.getElementById('btn-confirm-create-profile');
  const inputProfileName = document.getElementById('input-profile-name');
  const selectProfileMc = document.getElementById('select-profile-mc');
  const selectProfileLoader = document.getElementById('select-profile-loader');
  const selectProfileLoaderVersion = document.getElementById('select-profile-loader-version');
  const loaderFetchingIndicator = document.getElementById('loader-fetching-indicator');
  const inputProfileRamMin = document.getElementById('input-profile-ram-min');
  const inputProfileRamMax = document.getElementById('input-profile-ram-max');
  const createProfileIconPreview = document.getElementById('create-profile-icon-preview');
  const btnSelectCreateIcon = document.getElementById('btn-select-create-icon');
  const btnResetCreateIcon = document.getElementById('btn-reset-create-icon');
  const inputCreateProfileIcon = document.getElementById('input-create-profile-icon');

  // Modal de Edición de Instancia
  const modalEditProfile = document.getElementById('modal-edit-profile');
  const btnCloseEditModal = document.getElementById('btn-close-edit-modal');
  const btnCancelEditModal = document.getElementById('btn-cancel-edit-modal');
  const btnConfirmEditProfile = document.getElementById('btn-confirm-edit-profile');
  const inputEditProfileId = document.getElementById('input-edit-profile-id');
  const inputEditProfileName = document.getElementById('input-edit-profile-name');
  const editProfileIconPreview = document.getElementById('edit-profile-icon-preview');
  const btnSelectEditIcon = document.getElementById('btn-select-edit-icon');
  const btnResetEditIcon = document.getElementById('btn-reset-edit-icon');
  const inputEditProfileIcon = document.getElementById('input-edit-profile-icon');
  const selectEditProfileMc = document.getElementById('select-edit-profile-mc');
  const selectEditProfileLoader = document.getElementById('select-edit-profile-loader');
  const selectEditProfileLoaderVersion = document.getElementById('select-edit-profile-loader-version');
  const inputEditProfileLoaderVer = document.getElementById('input-edit-profile-loader-ver');
  const editLoaderFetchingIndicator = document.getElementById('edit-loader-fetching-indicator');
  const selectEditProfileJava = document.getElementById('select-edit-profile-java');
  const editProfileCustomJavaGroup = document.getElementById('edit-profile-custom-java-group');
  const inputEditProfileCustomJava = document.getElementById('input-edit-profile-custom-java');
  const btnBrowseEditProfileJava = document.getElementById('btn-browse-edit-profile-java');
  const inputEditProfileRamMin = document.getElementById('input-edit-profile-ram-min');
  const inputEditProfileRamMax = document.getElementById('input-edit-profile-ram-max');

  // Explorador de Catálogo
  const catPills = document.querySelectorAll('.cat-pill');
  const inputModSearch = document.getElementById('input-mod-search');
  const btnSearchMods = document.getElementById('btn-search-mods');
  const selectModSource = document.getElementById('select-mod-source');
  const selectModSort = document.getElementById('select-mod-sort');
  const selectModCategory = document.getElementById('select-mod-category');
  const modsSearchResults = document.getElementById('mods-search-results');
  const resultsHeadline = document.getElementById('results-headline');
  const resultsSubhint = document.getElementById('results-subhint');
  const btnPrevPage = document.getElementById('btn-prev-page');
  const btnNextPage = document.getElementById('btn-next-page');
  const spanPageIndicator = document.getElementById('span-page-indicator');
  const pillCatGithub = document.getElementById('pill-cat-github');
  const btnRefreshGithubMods = document.getElementById('btn-refresh-github-mods');
  const btnConfigGithubRepo = document.getElementById('btn-config-github-repo');

  // Gestor de Mods de Instancia & Actualizaciones
  const installedModsTitle = document.getElementById('installed-mods-title');
  const installedModsCount = document.getElementById('installed-mods-count');
  const installedModsInstanceName = document.getElementById('installed-mods-instance-name');
  const instanceContextIcon = document.getElementById('instance-context-icon');
  const instanceContextBadge = document.getElementById('instance-context-badge');
  const btnAddMoreMods = document.getElementById('btn-add-more-mods');
  const btnOpenModsFolder = document.getElementById('btn-open-mods-folder');
  const inputSearchInstalledMods = document.getElementById('input-search-installed-mods');
  const selectInstalledModsSort = document.getElementById('select-installed-mods-sort');
  const btnViewModeList = document.getElementById('btn-view-mode-list');
  const btnViewModeGrid = document.getElementById('btn-view-mode-grid');
  const btnRefreshInstalledMods = document.getElementById('btn-refresh-installed-mods');
  const btnCheckModUpdates = document.getElementById('btn-check-mod-updates');
  const btnUpdateAllMods = document.getElementById('btn-update-all-mods');
  const updatesAvailableCount = document.getElementById('updates-available-count');
  const btnInstallPerformancePack = document.getElementById('btn-install-performance-pack');
  const btnInstallModpack = document.getElementById('btn-install-modpack');
  const btnSyncCloudInstances = document.getElementById('btn-sync-cloud-instances');
  const btnPublishProfileMods = document.getElementById('btn-publish-profile-mods');
  const btnSyncProfileMods = document.getElementById('btn-sync-profile-mods');
  const modsInstalledList = document.getElementById('mods-installed-list');
  let activeAvailableUpdates = [];
  let currentInstalledModsList = [];
  let currentModsViewMode = 'list';

  // Modal Lightbox
  const imageLightbox = document.getElementById('image-lightbox');
  const lightboxImage = document.getElementById('lightbox-image');
  const btnCloseLightbox = document.getElementById('btn-close-lightbox');

  // Modal de Detalle de Proyecto y Selector de Versiones
  const modalModDetail = document.getElementById('modal-mod-detail');
  const detailModIcon = document.getElementById('detail-mod-icon');
  const detailModTitle = document.getElementById('detail-mod-title');
  const detailModBadge = document.getElementById('detail-mod-badge');
  const detailModAuthor = document.getElementById('detail-mod-author');
  const detailModDownloads = document.getElementById('detail-mod-downloads');
  const detailModSummary = document.getElementById('detail-mod-summary');
  const detailModBody = document.getElementById('detail-mod-body');
  const detailGalleryContainer = document.getElementById('detail-gallery-container');
  const detailGalleryScroll = document.getElementById('detail-gallery-scroll');
  const detailVersionsList = document.getElementById('detail-versions-list');
  const detailVersionsCount = document.getElementById('detail-versions-count');
  const detailCompatBadge = document.getElementById('detail-compat-badge');
  const tabDetailDesc = document.getElementById('tab-detail-desc');
  const tabDetailVersions = document.getElementById('tab-detail-versions');
  const panelDetailDesc = document.getElementById('panel-detail-desc');
  const panelDetailVersions = document.getElementById('panel-detail-versions');
  const btnCloseModDetail = document.getElementById('btn-close-mod-detail');
  const btnDismissModDetail = document.getElementById('btn-dismiss-mod-detail');
  const btnOpenModWeb = document.getElementById('btn-open-mod-web');
  let currentProjectDetail = null;

  // Modales de GitHub Mods y Sincronización en la Nube
  const modalGithubRepo = document.getElementById('modal-github-repo');
  const btnCloseGhRepoModal = document.getElementById('btn-close-gh-repo-modal');
  const btnCancelGhRepo = document.getElementById('btn-cancel-gh-repo');
  const btnSaveGhRepo = document.getElementById('btn-save-gh-repo');
  const inputGhRepoOwner = document.getElementById('input-gh-repo-owner');
  const inputGhRepoName = document.getElementById('input-gh-repo-name');
  const inputGhCustomToken = document.getElementById('input-gh-custom-token');

  const modalPublishProfile = document.getElementById('modal-publish-profile');
  const btnClosePublishModal = document.getElementById('btn-close-publish-modal');
  const btnCancelPublishProfile = document.getElementById('btn-cancel-publish-profile');
  const btnConfirmPublishProfile = document.getElementById('btn-confirm-publish-profile');
  const publishProfileTargetName = document.getElementById('publish-profile-target-name');
  const publishProfileModCount = document.getElementById('publish-profile-mod-count');
  const publishProfileTargetMeta = document.getElementById('publish-profile-target-meta');
  const checkPublishIncludeConfigs = document.getElementById('check-publish-include-configs');
  const publishSuccessBox = document.getElementById('publish-success-box');
  const inputPublishShareCode = document.getElementById('input-publish-share-code');
  const btnCopyShareCode = document.getElementById('btn-copy-share-code');
  const publishStatusText = document.getElementById('publish-status-text');
  let currentPublishTargetProfileId = null;

  const modalSyncProfile = document.getElementById('modal-sync-profile');
  const btnCloseSyncModal = document.getElementById('btn-close-sync-modal');
  const btnDismissSyncModal = document.getElementById('btn-dismiss-sync-modal');
  const syncTargetInstanceName = document.getElementById('sync-target-instance-name');
  const btnRefreshSharedList = document.getElementById('btn-refresh-shared-list');
  const sharedProfilesList = document.getElementById('shared-profiles-list');
  const syncProgressBox = document.getElementById('sync-progress-box');
  const syncProgressLabel = document.getElementById('sync-progress-label');
  const syncProgressPct = document.getElementById('sync-progress-pct');
  const syncProgressBar = document.getElementById('sync-progress-bar');
  let currentSyncTargetProfileId = null;

  // Vestidor de Skins 2D
  const vestidorFaceCanvas = document.getElementById('vestidor-face-canvas');
  const vestidorBodyCanvas = document.getElementById('vestidor-body-canvas');
  const skinPreviewLabel = document.getElementById('skin-preview-label');
  const skinModalUsername = document.getElementById('skin-modal-username');
  const skinAppliedStatus = document.getElementById('skin-applied-status');
  const inputMojangSkinClone = document.getElementById('input-mojang-skin-clone');
  const btnPreviewMojangSkin = document.getElementById('btn-preview-mojang-skin');
  const inputLocalSkinPath = document.getElementById('input-local-skin-path');
  const btnSelectLocalSkin = document.getElementById('btn-select-local-skin');
  const btnSaveSkin = document.getElementById('btn-save-skin');
  const btnRemoveSkin = document.getElementById('btn-remove-skin');

  // Java & Ajustes
  const btnScanJava = document.getElementById('btn-scan-java');
  const javaRuntimesList = document.getElementById('java-runtimes-list');
  const selectGlobalJava = document.getElementById('select-global-java');
  const btnInstallJava25 = document.getElementById('btn-install-java-25');
  const btnInstallJava21 = document.getElementById('btn-install-java-21');
  const btnInstallJava17 = document.getElementById('btn-install-java-17');
  const btnInstallJava8 = document.getElementById('btn-install-java-8');
  const javaInstallStatusBox = document.getElementById('java-install-status-box');
  const javaInstallProgressBar = document.getElementById('java-install-progress-bar');
  const javaInstallStatusText = document.getElementById('java-install-status-text');
  const inputMinRam = document.getElementById('input-min-ram');
  const inputMaxRam = document.getElementById('input-max-ram');
  const selectLaunchBehavior = document.getElementById('select-launch-behavior');
  const checkCloseOnLaunch = document.getElementById('check-close-on-launch');
  const checkDiscordRpc = document.getElementById('check-discord-rpc');
  const inputInstancePath = document.getElementById('input-instance-path');
  const btnBrowseInstance = document.getElementById('btn-browse-instance');
  const inputCustomJava = document.getElementById('input-custom-java');
  const btnBrowseJava = document.getElementById('btn-browse-java');

  // Auto-Actualizador del Launcher
  const launcherCurrentVersion = document.getElementById('launcher-current-version');
  const btnCheckLauncherUpdates = document.getElementById('btn-check-launcher-updates');
  const launcherUpdateStatus = document.getElementById('launcher-update-status');
  const launcherUpdateStatusText = document.getElementById('launcher-update-status-text');
  const launcherUpdateBanner = document.getElementById('launcher-update-banner');
  const updateBannerVersion = document.getElementById('update-banner-version');
  const updateBannerDesc = document.getElementById('update-banner-desc');
  const updateBannerProgressWrap = document.getElementById('update-banner-progress-wrap');
  const updateBannerProgressBar = document.getElementById('update-banner-progress-bar');
  const btnInstallLauncherUpdate = document.getElementById('btn-install-launcher-update');
  const btnDismissUpdateBanner = document.getElementById('btn-dismiss-update-banner');

  // Consola
  const btnDetectJava = document.getElementById('btn-detect-java');
  const btnClearConsole = document.getElementById('btn-clear-console');
  const inputFilterConsoleLogs = document.getElementById('input-filter-console-logs');
  const btnCopyConsoleLogs = document.getElementById('btn-copy-console-logs');
  const btnOpenLatestLog = document.getElementById('btn-open-latest-log');
  const btnOpenLogsFolder = document.getElementById('btn-open-logs-folder');
  const jvmVersionDisplay = document.getElementById('jvm-version-display');
  const jvmGcDisplay = document.getElementById('jvm-gc-display');
  const jvmArchDisplay = document.getElementById('jvm-arch-display');
  const jvmFlagsCode = document.getElementById('jvm-flags-code');
  const consoleStream = document.getElementById('console-stream');

  // Estado en Memoria
  let currentActiveProfile = null;
  let currentJavaVersion = 21;
  let currentContentType = 'mods';
  let currentContentPage = 1;
  const contentPageSize = 36;
  let totalContentCount = 0;
  let totalContentPages = 1;
  let pendingSkinData = null;
  let allCachedMcVersions = [];

  // =======================================================
  // CONTROLES DE VENTANA
  // =======================================================
  btnMinimize.addEventListener('click', () => api.system.minimize());
  btnMaximize.addEventListener('click', () => api.system.maximize());
  btnClose.addEventListener('click', () => api.system.close());

  // =======================================================
  // RENDERIZADO DE SKIN EN CANVAS (CARA Y CUERPO 2D NATIVOS)
  // =======================================================
  const DEFAULT_STEVE_SKIN_URL = 'https://mc-heads.net/skin/Steve';

  function renderSkinFaceToCanvas(imageSource, targetCanvas) {
    if (!targetCanvas) return;
    const ctx = targetCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

    const src = (imageSource && typeof imageSource === 'string' && imageSource.trim())
      ? imageSource.trim().replace(/^http:\/\/textures\.minecraft\.net/, 'https://textures.minecraft.net')
      : DEFAULT_STEVE_SKIN_URL;

    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('file:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      const w = targetCanvas.width;
      const h = targetCanvas.height;
      // 1. Capa base cara (8, 8, 8, 8) -> todo el canvas
      ctx.drawImage(img, 8, 8, 8, 8, 0, 0, w, h);
      // 2. Capa superior pelo/overlay (40, 8, 8, 8) -> todo el canvas
      ctx.drawImage(img, 40, 8, 8, 8, 0, 0, w, h);
    };
    img.onerror = () => {
      if (src !== DEFAULT_STEVE_SKIN_URL) {
        renderSkinFaceToCanvas(DEFAULT_STEVE_SKIN_URL, targetCanvas);
      }
    };
    img.src = src;
  }

  function renderSkinBodyToCanvas(imageSource, targetCanvas) {
    if (!targetCanvas) return;
    const ctx = targetCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

    const src = (imageSource && typeof imageSource === 'string' && imageSource.trim())
      ? imageSource.trim().replace(/^http:\/\/textures\.minecraft\.net/, 'https://textures.minecraft.net')
      : DEFAULT_STEVE_SKIN_URL;

    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('file:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

      const is64x64 = img.height >= 64;
      const s = targetCanvas.width / 16; // Con width=160 -> s=10

      // 1. Cabeza Base y Overlay: (8,8,8,8) y (40,8,8,8) en (4*s, 0, 8*s, 8*s)
      ctx.drawImage(img, 8, 8, 8, 8, 4 * s, 0, 8 * s, 8 * s);
      ctx.drawImage(img, 40, 8, 8, 8, 4 * s, 0, 8 * s, 8 * s);

      // 2. Torso Base y Overlay: (20,20,8,12) y (20,36,8,12) en (4*s, 8*s, 8*s, 12*s)
      ctx.drawImage(img, 20, 20, 8, 12, 4 * s, 8 * s, 8 * s, 12 * s);
      if (is64x64) {
        ctx.drawImage(img, 20, 36, 8, 12, 4 * s, 8 * s, 8 * s, 12 * s);
      }

      // 3. Brazo Derecho (A la izquierda en vista frontal): (44,20,4,12) y (44,36,4,12) en (0, 8*s, 4*s, 12*s)
      ctx.drawImage(img, 44, 20, 4, 12, 0, 8 * s, 4 * s, 12 * s);
      if (is64x64) {
        ctx.drawImage(img, 44, 36, 4, 12, 0, 8 * s, 4 * s, 12 * s);
      }

      // 4. Brazo Izquierdo (A la derecha en vista frontal):
      if (is64x64) {
        // Base (36,52,4,12) y Overlay (52,52,4,12) en (12*s, 8*s, 4*s, 12*s)
        ctx.drawImage(img, 36, 52, 4, 12, 12 * s, 8 * s, 4 * s, 12 * s);
        ctx.drawImage(img, 52, 52, 4, 12, 12 * s, 8 * s, 4 * s, 12 * s);
      } else {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(img, 44, 20, 4, 12, -(16 * s), 8 * s, 4 * s, 12 * s);
        ctx.restore();
      }

      // 5. Pierna Derecha (A la izquierda en vista frontal): (4,20,4,12) y (4,36,4,12) en (4*s, 20*s, 4*s, 12*s)
      ctx.drawImage(img, 4, 20, 4, 12, 4 * s, 20 * s, 4 * s, 12 * s);
      if (is64x64) {
        ctx.drawImage(img, 4, 36, 4, 12, 4 * s, 20 * s, 4 * s, 12 * s);
      }

      // 6. Pierna Izquierda (A la derecha en vista frontal):
      if (is64x64) {
        // Base (20,52,4,12) y Overlay (4,52,4,12) en (8*s, 20*s, 4*s, 12*s)
        ctx.drawImage(img, 20, 52, 4, 12, 8 * s, 20 * s, 4 * s, 12 * s);
        ctx.drawImage(img, 4, 52, 4, 12, 8 * s, 20 * s, 4 * s, 12 * s);
      } else {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(img, 4, 20, 4, 12, -(12 * s), 20 * s, 4 * s, 12 * s);
        ctx.restore();
      }
    };
    img.onerror = () => {
      if (src !== DEFAULT_STEVE_SKIN_URL) {
        renderSkinBodyToCanvas(DEFAULT_STEVE_SKIN_URL, targetCanvas);
      }
    };
    img.src = src;
  }

  // =======================================================
  // NAVEGACIÓN DE VISTAS (8 VISTAS DE ESCRITORIO)
  // =======================================================
  const navItems = [
    { btn: tabViewProfiles, view: viewProfiles, name: 'profiles' },
    { btn: tabViewCatalog, view: viewCatalog, name: 'catalog' },
    { btn: tabViewMods, view: viewMods, name: 'mods' },
    { btn: tabViewServers, view: viewServers, name: 'servers' },
    { btn: tabViewScreenshots, view: viewScreenshots, name: 'screenshots' },
    { btn: tabViewSkins, view: viewSkins, name: 'skins' },
    { btn: tabViewSettings, view: viewSettings, name: 'settings' },
    { btn: tabViewConsole, view: viewConsole, name: 'console' }
  ];

  function switchMainView(viewName) {
    navItems.forEach(({ btn, view }) => {
      if (btn) btn.classList.remove('active');
      if (view) {
        view.classList.remove('active');
        view.classList.add('hidden');
      }
    });

    const activeItem = navItems.find((item) => item.name === viewName);
    if (activeItem) {
      if (activeItem.btn) activeItem.btn.classList.add('active');
      if (activeItem.view) {
        activeItem.view.classList.add('active');
        activeItem.view.classList.remove('hidden');
      }
    }

    if (viewName === 'profiles') {
      loadProfiles();
    } else if (viewName === 'catalog') {
      if (!inputModSearch.value.trim() && modsSearchResults.children.length <= 1) {
        performModSearch();
      }
    } else if (viewName === 'mods') {
      loadInstalledMods();
    } else if (viewName === 'servers') {
      loadDedicatedServers();
    } else if (viewName === 'screenshots') {
      loadScreenshotsInstancesFilter();
      loadScreenshotsGallery();
    } else if (viewName === 'skins') {
      initSkinViewer3D();
    } else if (viewName === 'settings') {
      renderJavaRuntimes();
    } else if (viewName === 'console') {
      refreshJvmFlags();
      if (api.launcher && api.launcher.getRecentLogs) {
        api.launcher.getRecentLogs().then((logs) => {
          if (Array.isArray(logs) && logs.length > 0 && consoleLogBuffer.length === 0) {
            appendLogBatch(logs, 'game');
          }
        }).catch(() => {});
      }
    }

    // Informar al backend la visibilidad de la consola para encender/apagar IPC de logs
    if (api.launcher && api.launcher.setConsoleVisibility) {
      api.launcher.setConsoleVisibility(viewName === 'console');
    }

    if (api.discord && api.discord.updateView) {
      api.discord.updateView(viewName).catch(() => {});
    }
  }

  navItems.forEach(({ btn, name }) => {
    if (btn) {
      btn.addEventListener('click', () => switchMainView(name));
    }
  });

  // =======================================================
  // GESTOR DE CUENTAS (OFFLINE Y MICROSOFT)
  // =======================================================
  function switchAccountModalTab(tab) {
    if (tab === 'premium') {
      if (tabPremium) tabPremium.classList.add('active');
      if (tabOffline) tabOffline.classList.remove('active');
      if (formPremium) formPremium.classList.add('active');
      if (formOffline) formOffline.classList.remove('active');
      refreshMicrosoftAccountState();
    } else {
      if (tabOffline) tabOffline.classList.add('active');
      if (tabPremium) tabPremium.classList.remove('active');
      if (formOffline) formOffline.classList.add('active');
      if (formPremium) formPremium.classList.remove('active');
    }
  }

  async function refreshMicrosoftAccountState() {
    try {
      const sess = await api.auth.getSavedSession().catch(() => null);
      const msAccount = sess?.microsoftAccount || await api.auth.getMsAccount();

      if (msAccount && (msAccount.name || msAccount.username) && msAccount.mcAccessToken) {
        const msName = msAccount.name || msAccount.username;
        const msUuid = msAccount.uuid || '-';
        if (msActiveAccountCard) msActiveAccountCard.style.display = 'flex';
        if (msLoginPrompt) msLoginPrompt.style.display = 'none';
        if (msActiveGamertag) msActiveGamertag.textContent = msName;
        if (msActiveUuid) msActiveUuid.textContent = msUuid;

        const skinUrl = msAccount.skinUrl || `https://mc-heads.net/skin/${encodeURIComponent(msName)}`;
        if (msActiveAvatarCanvas) renderSkinFaceToCanvas(skinUrl, msActiveAvatarCanvas);

        const isCurrentActive = Boolean(sess && sess.activeMode === 'microsoft');
        if (btnMsUseAccount) {
          btnMsUseAccount.style.display = 'inline-flex';
          if (isCurrentActive) {
            btnMsUseAccount.textContent = '✔ Cuenta Activa';
            btnMsUseAccount.disabled = true;
            btnMsUseAccount.style.opacity = '0.65';
          } else {
            btnMsUseAccount.textContent = 'Usar esta cuenta Microsoft';
            btnMsUseAccount.disabled = false;
            btnMsUseAccount.style.opacity = '1';
          }
        }
      } else {
        if (msActiveAccountCard) msActiveAccountCard.style.display = 'none';
        if (msLoginPrompt) msLoginPrompt.style.display = 'block';
      }

      if (sess && sess.offlineAccount) {
        if (inputOfflineUser) inputOfflineUser.value = sess.offlineAccount.username || 'Jugador';
        if (previewOfflineUuid) previewOfflineUuid.textContent = sess.offlineAccount.uuid || '-';
      }
    } catch (err) {
      console.warn('Error al verificar estado de Microsoft:', err);
    }
  }

  if (accountStatus) {
    accountStatus.addEventListener('click', async () => {
      if (modalAccountManager) modalAccountManager.classList.add('active');
      try {
        const saved = await api.auth.getSavedSession();
        if (saved && saved.activeMode === 'microsoft') {
          switchAccountModalTab('premium');
        } else {
          switchAccountModalTab('offline');
        }
      } catch (_) {
        switchAccountModalTab('offline');
      }
      refreshMicrosoftAccountState();
    });
  }

  if (btnCloseAccountModal) {
    btnCloseAccountModal.addEventListener('click', () => {
      if (modalAccountManager) modalAccountManager.classList.remove('active');
    });
  }

  if (tabOffline) {
    tabOffline.addEventListener('click', (e) => {
      e.preventDefault();
      switchAccountModalTab('offline');
    });
  }

  if (tabPremium) {
    tabPremium.addEventListener('click', (e) => {
      e.preventDefault();
      switchAccountModalTab('premium');
    });
  }

  if (btnMsUseAccount) {
    btnMsUseAccount.addEventListener('click', async () => {
      const msAccount = await api.auth.getMsAccount();
      if (!msAccount) return;
      btnMsUseAccount.disabled = true;
      btnMsUseAccount.textContent = 'Activando...';

      try {
        const res = await api.auth.setActiveMode('microsoft');
        if (res && res.success) {
          const sess = await api.auth.getSavedSession();
          await updatePlayerBadge(sess.account, sess);
          await refreshMicrosoftAccountState();
          appendLog(`[Auth] Sesión cambiada a cuenta Microsoft: "${msAccount.username || msAccount.name}" (Premium)`, 'success');
          if (modalAccountManager) modalAccountManager.classList.remove('active');
        }
      } catch (err) {
        appendLog(`[Auth Error] ${err.message}`, 'error');
      } finally {
        btnMsUseAccount.disabled = false;
        btnMsUseAccount.textContent = 'Usar esta cuenta Microsoft';
      }
    });
  }

  if (btnMsSwitchAccount) {
    btnMsSwitchAccount.addEventListener('click', () => {
      btnLoginMicrosoft.click();
    });
  }

  if (btnMsLogout) {
    btnMsLogout.addEventListener('click', async () => {
      if (!confirm('¿Estás seguro de que deseas cerrar sesión de tu cuenta de Microsoft?')) return;
      btnMsLogout.disabled = true;
      try {
        await api.auth.logoutMs();
        appendLog('[Auth] Sesión de Microsoft cerrada. Modo cambiado a Offline.', 'info');
        const sess = await api.auth.getSavedSession();
        await updatePlayerBadge(sess.account, sess);
        await refreshMicrosoftAccountState();
      } catch (err) {
        appendLog(`[Auth Error] ${err.message}`, 'error');
      } finally {
        btnMsLogout.disabled = false;
      }
    });
  }

  async function handleOfflineLogin(username) {
    const raw = (username || 'Jugador').trim();
    if (!raw || raw.length < 3) {
      alert('Ingresa un nombre de usuario válido de al menos 3 caracteres.');
      return;
    }
    const result = await api.auth.loginOffline(raw);
    if (result && result.success) {
      const sess = await api.auth.getSavedSession();
      await updatePlayerBadge(result.account, sess);
      await refreshMicrosoftAccountState();
      appendLog(`[Auth] Sesión offline establecida para: "${result.account.name}" (UUID: ${result.account.uuid})`, 'info');
      if (modalAccountManager) modalAccountManager.classList.remove('active');
    } else {
      appendLog(`[Auth Error] ${result?.error || 'Fallo desconocido'}`, 'error');
      alert(`Error al activar cuenta offline: ${result?.error || 'Fallo desconocido'}`);
    }
  }

  btnLoginOffline.addEventListener('click', () => {
    handleOfflineLogin(inputOfflineUser.value.trim());
  });

  let currentMsUserCode = '';
  let currentMsVerificationUri = 'https://www.microsoft.com/link';

  function closeMsDeviceModal() {
    api.auth.cancelDeviceCode();
    if (modalMsDeviceCode) modalMsDeviceCode.classList.remove('active');
  }

  if (btnCloseDeviceModal) btnCloseDeviceModal.addEventListener('click', closeMsDeviceModal);
  if (btnCancelMsAuth) btnCancelMsAuth.addEventListener('click', closeMsDeviceModal);

  if (btnCopyAndOpenLink) {
    btnCopyAndOpenLink.addEventListener('click', async () => {
      if (currentMsUserCode) {
        try {
          await navigator.clipboard.writeText(currentMsUserCode);
          if (btnCopyLinkText) btnCopyLinkText.textContent = '¡Código Copiado! Abriendo navegador...';
          setTimeout(() => {
            if (btnCopyLinkText) btnCopyLinkText.textContent = 'Copiar Código y Abrir microsoft.com/link';
          }, 3500);
        } catch (_) {}
      }
      await api.system.openExternal(currentMsVerificationUri);
    });
  }

  btnLoginMicrosoft.addEventListener('click', async () => {
    btnLoginMicrosoft.disabled = true;
    appendLog('[Auth] Solicitando código de dispositivo a Microsoft...', 'info');

    try {
      const codeRes = await api.auth.requestDeviceCode();
      if (!codeRes.success) {
        throw new Error(codeRes.error || 'No se pudo obtener el código de Microsoft.');
      }

      currentMsUserCode = codeRes.userCode;
      currentMsVerificationUri = codeRes.verificationUri || 'https://www.microsoft.com/link';

      if (msUserCodeBox) msUserCodeBox.textContent = codeRes.userCode;
      if (msStatusLabel) msStatusLabel.textContent = 'Esperando confirmación en tu navegador...';
      if (btnCopyLinkText) btnCopyLinkText.textContent = 'Copiar Código y Abrir microsoft.com/link';

      if (modalAccountManager) modalAccountManager.classList.remove('active');
      if (modalMsDeviceCode) modalMsDeviceCode.classList.add('active');

      appendLog(`[Auth] Código generado: ${codeRes.userCode}. Abre ${currentMsVerificationUri} para autorizar.`, 'info');

      // Polling a Microsoft OAuth2
      const loginRes = await api.auth.pollDeviceCode(codeRes.deviceCode, codeRes.interval || 5);
      if (loginRes.success && loginRes.account) {
        if (modalMsDeviceCode) modalMsDeviceCode.classList.remove('active');
        await api.auth.setActiveMode('microsoft');
        await updatePlayerBadge(loginRes.account);
        await refreshMicrosoftAccountState();
        appendLog(`[Auth] ¡Sesión oficial de Microsoft iniciada para "${loginRes.account.name}"!`, 'success');
      } else if (loginRes.error && !loginRes.error.includes('cancelada')) {
        appendLog(`[Auth Microsoft Error] ${loginRes.error}`, 'error');
        alert(`Error al iniciar sesión: ${loginRes.error}`);
        if (modalMsDeviceCode) modalMsDeviceCode.classList.remove('active');
      }
    } catch (err) {
      if (!err.message?.includes('cancelada')) {
        appendLog(`[Auth Error] ${err.message}`, 'error');
        alert(`Error al conectar con Microsoft: ${err.message}`);
      }
      if (modalMsDeviceCode) modalMsDeviceCode.classList.remove('active');
    } finally {
      btnLoginMicrosoft.disabled = false;
    }
  });

  async function updatePlayerBadge(account, explicitSession) {
    if (!account) return;
    const session = explicitSession || await api.auth.getSavedSession().catch(() => null);

    const isPremium = Boolean(
      session &&
      session.activeMode === 'microsoft' &&
      session.microsoftAccount &&
      session.microsoftAccount.mcAccessToken &&
      !String(session.microsoftAccount.mcAccessToken).startsWith('offline_') &&
      session.microsoftAccount.uuid
    );

    const accName = isPremium
      ? (session.microsoftAccount.username || session.microsoftAccount.name || account.name || account.username || 'Jugador')
      : (session?.offlineAccount?.username || account.name || account.username || 'Jugador');

    const accUuid = isPremium
      ? (session.microsoftAccount.uuid || account.uuid || '-')
      : (session?.offlineAccount?.uuid || account.uuid || '-');

    if (playerName) playerName.textContent = accName;
    if (playerUuid) playerUuid.textContent = `UUID: ${accUuid}`;
    if (skinModalUsername) skinModalUsername.textContent = accName;

    // Asegurar que exista un ÚNICO badge en .player-name-row y eliminar hermanos duplicados
    const nameRow = document.querySelector('.player-info .player-name-row') || document.querySelector('.player-name-row');
    if (nameRow) {
      const existingBadges = nameRow.querySelectorAll('.badge, [id*="badge"]');
      if (existingBadges.length > 1) {
        for (let i = 1; i < existingBadges.length; i++) {
          existingBadges[i].remove();
        }
      }
    }

    const badge = document.getElementById('account-status-badge') ||
                  (nameRow ? nameRow.querySelector('.badge') : null);

    if (badge) {
      badge.id = 'account-status-badge';
      if (isPremium) {
        badge.textContent = 'PREMIUM';
        badge.className = 'badge badge-premium badge-microsoft';
        badge.style.setProperty('background-color', 'rgba(16, 185, 129, 0.15)', 'important');
        badge.style.setProperty('color', '#10b981', 'important');
        badge.style.setProperty('border', '1px solid rgba(16, 185, 129, 0.35)', 'important');
        badge.style.display = 'inline-block';
      } else {
        badge.textContent = 'OFFLINE';
        badge.className = 'badge badge-offline';
        badge.style.removeProperty('background-color');
        badge.style.removeProperty('color');
        badge.style.removeProperty('border');
        badge.style.display = 'inline-block';
      }
    }

    if (isPremium) {
      switchAccountModalTab('premium');
    } else {
      if (inputOfflineUser) inputOfflineUser.value = accName;
      if (previewOfflineUuid) previewOfflineUuid.textContent = accUuid;
      switchAccountModalTab('offline');
    }

    // Cargar Skin activa (Mojang oficial para Premium, skin local o mc-heads para Offline)
    let skinToRender = null;
    try {
      const localSkin = await api.skins.get(accName);
      if (localSkin && localSkin.exists && localSkin.dataUrl) {
        skinToRender = localSkin.dataUrl;
        if (skinAppliedStatus) skinAppliedStatus.textContent = 'Skin personalizada activa';
        if (skinPreviewLabel) skinPreviewLabel.textContent = 'Personalizada';
      } else if (isPremium) {
        skinToRender = session.microsoftAccount.skinUrl || `https://mc-heads.net/skin/${encodeURIComponent(accName)}`;
        if (skinAppliedStatus) skinAppliedStatus.textContent = 'Skin oficial sincronizada con Mojang';
        if (skinPreviewLabel) skinPreviewLabel.textContent = 'Oficial';
      } else {
        skinToRender = `https://mc-heads.net/skin/${encodeURIComponent(accName)}`;
        if (skinAppliedStatus) skinAppliedStatus.textContent = 'Skin vinculada por nombre de usuario';
        if (skinPreviewLabel) skinPreviewLabel.textContent = accName;
      }
    } catch (_) {
      skinToRender = `https://mc-heads.net/skin/${encodeURIComponent(accName)}`;
    }

    renderSkinFaceToCanvas(skinToRender, sidebarAvatarCanvas);
    renderSkinFaceToCanvas(skinToRender, vestidorFaceCanvas);
    renderSkinBodyToCanvas(skinToRender, vestidorBodyCanvas);
    loadSkinIn3DViewer(skinToRender);
  }

  // =======================================================
  // VISOR 3D INTERACTIVO DE SKINS (skinview3d)
  // =======================================================
  let skinViewer3D = null;
  let currentModelType = 'default'; // 'default' (Steve 4px) | 'slim' (Alex 3px)
  let activeAnimationMode = 'walk'; // 'idle' | 'walk' | 'run'
  let isSkinAutoRotating = false;
  let lastLoadedSkinUrl = null;

  function initSkinViewer3D() {
    const canvas = document.getElementById('skinview-3d-canvas');
    if (!canvas) return;
    if (typeof skinview3d === 'undefined') {
      console.warn('[SkinViewer 3D] Librería skinview3d aún no está disponible.');
      return;
    }

    if (skinViewer3D) {
      try {
        skinViewer3D.dispose();
      } catch (_) {}
      skinViewer3D = null;
    }

    try {
      skinViewer3D = new skinview3d.SkinViewer({
        canvas: canvas,
        width: 300,
        height: 420
      });

      skinViewer3D.controls.enableRotate = true;
      skinViewer3D.controls.enableZoom = true;
      skinViewer3D.controls.enablePan = false;
      skinViewer3D.camera.position.set(0, 0, 70);

      // Iniciar en modo caminar
      setSkinAnimation(activeAnimationMode || 'walk');

      if (lastLoadedSkinUrl) {
        skinViewer3D.loadSkin(lastLoadedSkinUrl, { model: currentModelType });
      }
    } catch (err) {
      console.error('[SkinViewer 3D] Error al instanciar visor:', err);
    }
  }

  function loadSkinIn3DViewer(skinUrl) {
    if (!skinUrl) return;
    lastLoadedSkinUrl = skinUrl;
    if (!skinViewer3D) {
      initSkinViewer3D();
    }
    if (skinViewer3D) {
      try {
        skinViewer3D.loadSkin(skinUrl, { model: currentModelType });
      } catch (err) {
        console.warn('[SkinViewer 3D] Error al cargar textura:', err);
      }
    }
  }

  function setSkinModelType(model) {
    currentModelType = model; // 'default' o 'slim'
    const btnClassic = document.getElementById('btn-model-classic');
    const btnSlim = document.getElementById('btn-model-slim');
    if (btnClassic) btnClassic.classList.toggle('active', model === 'default');
    if (btnSlim) btnSlim.classList.toggle('active', model === 'slim');

    const label = document.getElementById('skin-preview-label');
    if (label) {
      label.textContent = model === 'slim' ? 'Alex (Delgado 3px)' : 'Steve (Clásico 4px)';
    }

    if (skinViewer3D) {
      if (skinViewer3D.playerObject && skinViewer3D.playerObject.skin) {
        skinViewer3D.playerObject.skin.modelType = model;
      }
      if (lastLoadedSkinUrl) {
        skinViewer3D.loadSkin(lastLoadedSkinUrl, { model });
      }
    }
  }

  function setSkinAnimation(animType) {
    if (!skinViewer3D || typeof skinview3d === 'undefined') return;
    activeAnimationMode = animType;

    const btnIdle = document.getElementById('btn-anim-idle');
    const btnWalk = document.getElementById('btn-anim-walk');
    const btnRun = document.getElementById('btn-anim-run');

    if (btnIdle) btnIdle.classList.toggle('active', animType === 'idle');
    if (btnWalk) btnWalk.classList.toggle('active', animType === 'walk');
    if (btnRun) btnRun.classList.toggle('active', animType === 'run');

    if (animType === 'idle') {
      skinViewer3D.animation = null;
      if (skinViewer3D.playerObject && skinViewer3D.playerObject.skin) {
        skinViewer3D.playerObject.skin.leftArm.rotation.set(0, 0, 0);
        skinViewer3D.playerObject.skin.rightArm.rotation.set(0, 0, 0);
        skinViewer3D.playerObject.skin.leftLeg.rotation.set(0, 0, 0);
        skinViewer3D.playerObject.skin.rightLeg.rotation.set(0, 0, 0);
      }
    } else if (animType === 'walk') {
      skinViewer3D.animation = new skinview3d.WalkingAnimation();
      skinViewer3D.animation.speed = 0.8;
    } else if (animType === 'run') {
      skinViewer3D.animation = new skinview3d.RunningAnimation();
      skinViewer3D.animation.speed = 1.0;
    }
  }

  function toggleSkinAutoRotate() {
    if (!skinViewer3D) return;
    isSkinAutoRotating = !isSkinAutoRotating;
    skinViewer3D.autoRotate = isSkinAutoRotating;
    skinViewer3D.autoRotateSpeed = 1.2;
    const btnRotate = document.getElementById('btn-anim-rotate');
    if (btnRotate) btnRotate.classList.toggle('active', isSkinAutoRotating);
  }

  // Conectar botones del visor 3D
  const btnModelClassic = document.getElementById('btn-model-classic');
  const btnModelSlim = document.getElementById('btn-model-slim');
  const btnAnimIdle = document.getElementById('btn-anim-idle');
  const btnAnimWalk = document.getElementById('btn-anim-walk');
  const btnAnimRun = document.getElementById('btn-anim-run');
  const btnAnimRotate = document.getElementById('btn-anim-rotate');

  if (btnModelClassic) btnModelClassic.addEventListener('click', () => setSkinModelType('default'));
  if (btnModelSlim) btnModelSlim.addEventListener('click', () => setSkinModelType('slim'));
  if (btnAnimIdle) btnAnimIdle.addEventListener('click', () => setSkinAnimation('idle'));
  if (btnAnimWalk) btnAnimWalk.addEventListener('click', () => setSkinAnimation('walk'));
  if (btnAnimRun) btnAnimRun.addEventListener('click', () => setSkinAnimation('run'));
  if (btnAnimRotate) btnAnimRotate.addEventListener('click', () => toggleSkinAutoRotate());

  // =======================================================
  // VESTIDOR DE SKINS (CLONAR MOJANG Y SUBIR PNG LOCAL)
  // =======================================================
  if (btnPreviewMojangSkin) {
    btnPreviewMojangSkin.addEventListener('click', async () => {
      const targetUser = inputMojangSkinClone.value.trim();
      if (!targetUser) {
        alert('Ingresa el nombre de una cuenta Premium de Minecraft.');
        return;
      }
      btnPreviewMojangSkin.disabled = true;
      btnPreviewMojangSkin.textContent = 'Buscando...';
      try {
        const data = await api.skins.fetchMojangPreview(targetUser);
        if (data.success && data.skinUrl) {
          renderSkinFaceToCanvas(data.skinUrl, vestidorFaceCanvas);
          renderSkinBodyToCanvas(data.skinUrl, vestidorBodyCanvas);
          loadSkinIn3DViewer(data.skinUrl);
          if (skinPreviewLabel) skinPreviewLabel.textContent = `${data.officialName} (Mojang)`;
          if (skinAppliedStatus) skinAppliedStatus.textContent = `Skin clonada lista para aplicar a ${inputOfflineUser.value.trim()}`;
          pendingSkinData = { type: 'mojang', value: targetUser };
        } else {
          throw new Error('No se encontraron texturas para ese jugador.');
        }
      } catch (err) {
        alert(`Error: ${err.message}`);
      } finally {
        btnPreviewMojangSkin.disabled = false;
        btnPreviewMojangSkin.textContent = 'Obtener';
      }
    });
  }

  if (btnSelectLocalSkin) {
    btnSelectLocalSkin.addEventListener('click', async () => {
      const res = await api.skins.selectFile();
      if (!res.canceled && res.path) {
        inputLocalSkinPath.value = res.path;
        const fileUrl = `file:///${res.path.replace(/\\/g, '/')}`;
        renderSkinFaceToCanvas(fileUrl, vestidorFaceCanvas);
        renderSkinBodyToCanvas(fileUrl, vestidorBodyCanvas);
        loadSkinIn3DViewer(fileUrl);
        if (skinPreviewLabel) skinPreviewLabel.textContent = 'Archivo PNG local';
        if (skinAppliedStatus) skinAppliedStatus.textContent = 'Archivo PNG seleccionado (listo para aplicar)';
        pendingSkinData = { type: 'file', value: res.path };
      }
    });
  }

  if (btnSaveSkin) {
    btnSaveSkin.addEventListener('click', async () => {
      const activeUser = inputOfflineUser.value.trim() || 'Steve';
      if (!pendingSkinData && inputMojangSkinClone.value.trim()) {
        pendingSkinData = { type: 'mojang', value: inputMojangSkinClone.value.trim() };
      }
      if (!pendingSkinData) {
        alert('Ingresa el nombre de una cuenta Premium o selecciona un archivo PNG local.');
        return;
      }

      btnSaveSkin.disabled = true;
      btnSaveSkin.textContent = 'Guardando...';

      try {
        let result;
        if (pendingSkinData.type === 'mojang') {
          appendLog(`[Skins] Conectando a Mojang y clonando skin de "${pendingSkinData.value}" para "${activeUser}"...`, 'info');
          result = await api.skins.setFromUsername(activeUser, pendingSkinData.value);
        } else if (pendingSkinData.type === 'file') {
          appendLog(`[Skins] Guardando skin local para "${activeUser}"...`, 'info');
          result = await api.skins.setFromFile(activeUser, pendingSkinData.value);
        }

        if (result && result.success) {
          appendLog(`[Skins] Skin de ${activeUser} guardada con éxito (se aplicará nativamente sin mods vía ShubaSkinOverride).`, 'success');
          const finalSkin = result.skin?.dataUrl || result.dataUrl;
          renderSkinFaceToCanvas(finalSkin, sidebarAvatarCanvas);
          renderSkinFaceToCanvas(finalSkin, vestidorFaceCanvas);
          renderSkinBodyToCanvas(finalSkin, vestidorBodyCanvas);
          loadSkinIn3DViewer(finalSkin);
          if (skinAppliedStatus) skinAppliedStatus.textContent = 'Skin activa en el juego';

          // Si la cuenta activa es Premium, sincronizar con la API oficial de Mojang
          const sess = await api.auth.getSavedSession().catch(() => null);
          if (sess && sess.isPremium && sess.microsoftAccount?.mcAccessToken) {
            appendLog('[Skins] Cuenta Premium detectada: enviando skin a los servidores oficiales de Mojang...', 'info');
            try {
              const uploadRes = await api.skins.uploadToMojang(
                sess.microsoftAccount.mcAccessToken,
                finalSkin,
                result.skinModel || 'classic'
              );
              if (uploadRes && uploadRes.success) {
                appendLog('¡Skin sincronizada exitosamente con Mojang y visible en servidores oficiales!', 'success');
              } else {
                appendLog(`[Skins Aviso] Guardada localmente (Aviso Mojang: ${uploadRes?.error || 'servidor ocupado'})`, 'warn');
              }
            } catch (mojangUploadErr) {
              appendLog(`[Skins Aviso] Guardada localmente (Error Mojang: ${mojangUploadErr.message})`, 'warn');
            }
          }
        } else {
          throw new Error(result?.error || 'No se pudo guardar la skin.');
        }
      } catch (err) {
        appendLog(`[Skins Error] ${err.message}`, 'error');
        alert(`Error al guardar la skin: ${err.message}`);
      } finally {
        btnSaveSkin.disabled = false;
        btnSaveSkin.textContent = 'Guardar y Aplicar';
      }
    });
  }

  if (btnRemoveSkin) {
    btnRemoveSkin.addEventListener('click', async () => {
      const activeUser = inputOfflineUser.value.trim() || 'Steve';
      if (confirm(`¿Restaurar la skin por defecto (Steve/Alex) para "${activeUser}"?`)) {
        await api.skins.remove(activeUser);
        const defaultSteveUrl = `https://mc-heads.net/skin/${activeUser}`;
        renderSkinFaceToCanvas(defaultSteveUrl, sidebarAvatarCanvas);
        renderSkinFaceToCanvas(defaultSteveUrl, vestidorFaceCanvas);
        renderSkinBodyToCanvas(defaultSteveUrl, vestidorBodyCanvas);
        loadSkinIn3DViewer(defaultSteveUrl);
        if (skinAppliedStatus) skinAppliedStatus.textContent = 'Skin predeterminada activa';
        if (skinPreviewLabel) skinPreviewLabel.textContent = 'Steve';
        appendLog(`[Skins] Skin de ${activeUser} restaurada a los valores predeterminados.`, 'info');
      }
    });
  }

  // =======================================================
  // LOGS Y TERMINAL CON BUFFER ROTATIVO (2.000 LÍNEAS) Y BÚSQUEDA
  // =======================================================
  const MAX_CONSOLE_LOG_LINES = 2000;
  const consoleLogBuffer = [];
  let consoleLogFilterText = '';

  function appendLog(message, type = 'info') {
    if (!message && message !== 0) return;
    const text = typeof message === 'string' ? message : String(message);
    const item = { text, type, time: new Date().toLocaleTimeString() };

    consoleLogBuffer.push(item);
    if (consoleLogBuffer.length > MAX_CONSOLE_LOG_LINES) {
      consoleLogBuffer.shift();
    }

    if (consoleStream && (!consoleLogFilterText || text.toLowerCase().includes(consoleLogFilterText))) {
      const line = document.createElement('div');
      line.className = `log-line log-${type}`;
      line.textContent = text;
      consoleStream.appendChild(line);

      while (consoleStream.childElementCount > MAX_CONSOLE_LOG_LINES) {
        consoleStream.removeChild(consoleStream.firstChild);
      }

      consoleStream.scrollTop = consoleStream.scrollHeight;
    }
  }

  function appendLogBatch(messages, type = 'game') {
    if (!messages || !Array.isArray(messages) || messages.length === 0) return;
    const time = new Date().toLocaleTimeString();
    const fragment = document.createDocumentFragment();
    let hasVisibleLines = false;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg && msg !== 0) continue;
      const text = typeof msg === 'string' ? msg : String(msg);
      const item = { text, type, time };

      consoleLogBuffer.push(item);
      if (consoleLogBuffer.length > MAX_CONSOLE_LOG_LINES) {
        consoleLogBuffer.shift();
      }

      if (consoleStream && (!consoleLogFilterText || text.toLowerCase().includes(consoleLogFilterText))) {
        const line = document.createElement('div');
        line.className = `log-line log-${type}`;
        line.textContent = text;
        fragment.appendChild(line);
        hasVisibleLines = true;
      }
    }

    if (hasVisibleLines && consoleStream) {
      consoleStream.appendChild(fragment);
      while (consoleStream.childElementCount > MAX_CONSOLE_LOG_LINES) {
        consoleStream.removeChild(consoleStream.firstChild);
      }
      consoleStream.scrollTop = consoleStream.scrollHeight;
    }
  }

  function renderFilteredConsoleLogs() {
    if (!consoleStream) return;
    consoleStream.innerHTML = '';
    const filtered = consoleLogFilterText
      ? consoleLogBuffer.filter((it) => it.text.toLowerCase().includes(consoleLogFilterText))
      : consoleLogBuffer;

    const fragment = document.createDocumentFragment();
    for (const it of filtered) {
      const line = document.createElement('div');
      line.className = `log-line log-${it.type}`;
      line.textContent = it.text;
      fragment.appendChild(line);
    }
    consoleStream.appendChild(fragment);
    consoleStream.scrollTop = consoleStream.scrollHeight;
  }

  if (inputFilterConsoleLogs) {
    inputFilterConsoleLogs.addEventListener('input', (e) => {
      consoleLogFilterText = e.target.value.toLowerCase().trim();
      renderFilteredConsoleLogs();
    });
  }

  btnClearConsole.addEventListener('click', () => {
    consoleLogBuffer.length = 0;
    consoleStream.innerHTML = '';
  });

  if (btnCopyConsoleLogs) {
    btnCopyConsoleLogs.addEventListener('click', async () => {
      if (consoleLogBuffer.length === 0) {
        alert('No hay registros en la consola para copiar.');
        return;
      }
      try {
        const fullLogs = consoleLogBuffer.map((it) => it.text).join('\n');
        await navigator.clipboard.writeText(fullLogs);
        const origHtml = btnCopyConsoleLogs.innerHTML;
        btnCopyConsoleLogs.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          <span>¡Copiado!</span>
        `;
        setTimeout(() => {
          btnCopyConsoleLogs.innerHTML = origHtml;
        }, 2200);
      } catch (err) {
        alert('No se pudo copiar al portapapeles: ' + err.message);
      }
    });
  }

  if (btnOpenLatestLog) {
    btnOpenLatestLog.addEventListener('click', async () => {
      const targetInstance = currentActiveProfile?.instancePath || null;
      try {
        const res = await api.launcher.openLatestLog(targetInstance);
        if (res && res.path) {
          appendLog(`[Logs] Archivo de log abierto: ${res.path}`, 'info');
        }
      } catch (err) {
        alert('Error al abrir latest.log: ' + err.message);
      }
    });
  }

  if (btnOpenLogsFolder) {
    btnOpenLogsFolder.addEventListener('click', async () => {
      const targetInstance = currentActiveProfile?.instancePath || null;
      try {
        await api.launcher.openLogsFolder(targetInstance);
      } catch (err) {
        alert('Error al abrir carpeta de logs: ' + err.message);
      }
    });
  }

  function formatDownloads(count) {
    if (!count) return '0';
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return String(count);
  }

  // =======================================================
  // GESTIÓN DE PERFILES / INSTANCIAS AISLADAS
  // =======================================================
  async function loadProfiles() {
    try {
      const res = await api.profiles.getAll();
      const profiles = res.profiles || [];
      const activeId = res.activeProfileId;

      currentActiveProfile = profiles.find((p) => p.id === activeId) || profiles[0] || null;

      if (currentActiveProfile) {
        activeProfileName.textContent = currentActiveProfile.name;
        const loaderUpper = (currentActiveProfile.loader || 'NeoForge').toUpperCase();
        activeProfileBadge.textContent = loaderUpper;
        activeProfileBadge.className = `badge badge-${(currentActiveProfile.loader || 'neoforge').toLowerCase()}`;
        activeProfileMc.textContent = currentActiveProfile.mcVersion;
        activeProfileLoaderVer.textContent = (currentActiveProfile.loaderVersion || '').split(' ')[0].trim();
        activeProfileFolder.textContent = `instances/${currentActiveProfile.id}`;
        if (installedModsInstanceName) {
          installedModsInstanceName.textContent = currentActiveProfile.name;
        }

        inputMinRam.value = currentActiveProfile.ramMin || currentActiveProfile.memoryMin || '2G';
        inputMaxRam.value = currentActiveProfile.ramMax || currentActiveProfile.memoryMax || '8G';
      }

      profilesGrid.innerHTML = '';

      if (profiles.length === 0) {
        profilesGrid.innerHTML = '<div class="empty-state">No hay perfiles de Minecraft creados aún. Haz clic en "Nueva Instancia" arriba.</div>';
        return;
      }

      profiles.forEach((p) => {
        const isActive = p.id === activeId;
        const pLoaderUpper = (p.loader || 'NeoForge').toUpperCase();
        const pLoaderLower = (p.loader || 'neoforge').toLowerCase();
        const pCleanVer = (p.loaderVersion || '').split(' ')[0].trim();
        const pRamMin = p.ramMin || p.memoryMin || '2G';
        const pRamMax = p.ramMax || p.memoryMax || '8G';
        const pIcon = p.icon && p.icon.startsWith('data:image') ? p.icon : 'assets/logo.png';

        const card = document.createElement('div');
        card.className = `instance-card ${isActive ? 'active' : ''}`;
        card.setAttribute('data-id', p.id);

        card.innerHTML = `
          <div class="instance-card-header">
            <div class="instance-card-header-left">
              <img src="${pIcon}" class="instance-card-avatar" alt="Icono" onerror="this.src='assets/logo.png'">
              <div class="instance-card-info">
                <h3 class="instance-card-title" title="${escapeHtml(p.name || 'Sin Nombre')}">${escapeHtml(p.name || 'Sin Nombre')}</h3>
                <div class="instance-card-meta" title="MC ${escapeHtml(p.mcVersion || '1.21.1')} · ${escapeHtml(p.loader || 'NeoForge')} ${escapeHtml(pCleanVer)} · ${escapeHtml(pRamMin)}-${escapeHtml(pRamMax)}">
                  <span>MC ${escapeHtml(p.mcVersion || '1.21.1')}</span>
                  <span>·</span>
                  <span>${escapeHtml(p.loader || 'NeoForge')} ${escapeHtml(pCleanVer)}</span>
                  <span>·</span>
                  <span>${escapeHtml(pRamMin)}-${escapeHtml(pRamMax)}</span>
                </div>
              </div>
            </div>
            <span class="badge badge-${pLoaderLower}">${pLoaderUpper}</span>
          </div>

          <div class="instance-card-actions">
            <div class="instance-card-actions-left">
              <button class="btn btn-small ${isActive ? 'btn-primary' : 'btn-secondary'} btn-select-profile" data-id="${p.id}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                <span>${isActive ? 'Jugar' : 'Seleccionar'}</span>
              </button>
              <button class="btn btn-small btn-secondary btn-manage-mods" data-id="${p.id}" title="Ver mods de esta instancia">
                <span>Mods</span>
              </button>
            </div>
            <div class="instance-card-actions-right">
              <button class="btn btn-small btn-secondary btn-icon-square btn-edit-profile" data-id="${p.id}" title="Editar instancia">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <button class="btn btn-small btn-secondary btn-icon-square btn-open-logs" data-id="${p.id}" title="Ver logs y reportes de la instancia">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </button>
              <button class="btn btn-small btn-secondary btn-icon-square btn-open-folder" data-id="${p.id}" title="Abrir carpeta en el explorador">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
              </button>
              <button class="btn btn-small btn-secondary btn-icon-square btn-export-pack" data-id="${p.id}" data-name="${escapeHtml(p.name || 'perfil')}" title="Exportar como .shubapack">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              </button>
              <button class="btn btn-small btn-secondary btn-icon-square btn-publish-cloud" data-id="${p.id}" data-name="${escapeHtml(p.name || 'perfil')}" title="☁ Publicar en la nube para amigos (.shubasync.json)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><polyline points="12 13 12 7 9 10"/><polyline points="12 7 15 10"/></svg>
              </button>
              ${profiles.length > 1 ? `
                <button class="btn btn-small btn-danger btn-icon-square btn-delete-profile" data-id="${p.id}" title="Eliminar instancia">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              ` : ''}
            </div>
          </div>
        `;

        // 1-Clic en la tarjeta para seleccionar la instancia inmediatamente
        card.addEventListener('click', async (e) => {
          if (p.id !== activeId) {
            await api.profiles.setActive(p.id);
            await loadProfiles();
          }
        });

        profilesGrid.appendChild(card);
      });

      // Listeners de botones con stopPropagation()
      document.querySelectorAll('.btn-select-profile').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = e.currentTarget.getAttribute('data-id');
          await api.profiles.setActive(id);
          await loadProfiles();
          if (e.currentTarget.classList.contains('btn-primary')) {
            btnLaunch.click();
          }
        });
      });

      document.querySelectorAll('.btn-manage-mods').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = e.currentTarget.getAttribute('data-id');
          await api.profiles.setActive(id);
          await loadProfiles();
          switchMainView('mods');
        });
      });

      document.querySelectorAll('.btn-edit-profile').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = e.currentTarget.getAttribute('data-id');
          const target = profiles.find((p) => p.id === id);
          if (target) openEditProfileModal(target);
        });
      });

      document.querySelectorAll('.btn-open-folder').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = e.currentTarget.getAttribute('data-id');
          await api.profiles.openFolder(id);
        });
      });

      document.querySelectorAll('.btn-open-logs').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = e.currentTarget.getAttribute('data-id');
          const target = profiles.find((p) => p.id === id);
          const instPath = target ? (target.instancePath || null) : null;
          await api.launcher.openLatestLog(instPath);
        });
      });

      document.querySelectorAll('.btn-delete-profile').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = e.currentTarget.getAttribute('data-id');
          const target = profiles.find((p) => p.id === id);
          const pName = target ? target.name : id;
          if (confirm(`¿Estás seguro de que deseas eliminar la instancia "${pName}"? Esta acción es irreversible.`)) {
            await api.profiles.delete(id);
            await loadProfiles();
            appendLog(`[Instancias] Instancia "${pName}" eliminada.`, 'warn');
          }
        });
      });

      document.querySelectorAll('.btn-export-pack').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = e.currentTarget.getAttribute('data-id');
          const name = e.currentTarget.getAttribute('data-name');
          const saveRes = await api.packs.selectExportPath(name);
          if (!saveRes.canceled && saveRes.path) {
            appendLog(`[PackPorter] Exportando instancia "${name}" a "${saveRes.path}"...`, 'info');
            btn.disabled = true;
            try {
              const res = await api.packs.export({ profileId: id, outputPath: saveRes.path });
              if (res.success) {
                appendLog(`[PackPorter] Instancia exportada con éxito en: ${saveRes.path} (${res.pack?.stats?.totalFiles || 0} archivos).`, 'success');
              } else {
                throw new Error(res.error || 'Fallo desconocido al exportar.');
              }
            } catch (err) {
              appendLog(`[PackPorter Error] ${err.message}`, 'error');
              alert(`Error al exportar .shubapack: ${err.message}`);
            } finally {
              btn.disabled = false;
            }
          }
        });
      });

      document.querySelectorAll('.btn-publish-cloud').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = e.currentTarget.getAttribute('data-id');
          openPublishProfileModal(id);
        });
      });
    } catch (err) {
      appendLog(`Error cargando instancias: ${err.message}`, 'error');
    }
  }

  // Activa un perfil y refresca el dock y listado de instancias de forma segura
  async function switchActiveProfile(id) {
    if (!id) return;
    try {
      await api.profiles.setActive(id);
      await loadProfiles();
    } catch (err) {
      console.warn('Error al activar perfil:', err);
    }
  }

  // Importar archivo .shubapack
  if (btnImportShubapack) {
    btnImportShubapack.addEventListener('click', async () => {
      try {
        const selectRes = await api.packs.selectImportFile();
        if (!selectRes.canceled && selectRes.path) {
          appendLog(`[PackPorter] Importando paquete "${selectRes.path}"...`, 'info');
          btnImportShubapack.disabled = true;
          const res = await api.packs.import({ packFilePath: selectRes.path });
          if (res.success) {
            appendLog(`[PackPorter] Instancia "${res.profile?.name}" importada exitosamente. Se instalaron ${res.modsCount || 0} mods.`, 'success');
            await loadProfiles();
            switchMainView('profiles');
          } else {
            throw new Error(res.error || 'Error al importar el archivo .shubapack.');
          }
        }
      } catch (err) {
        appendLog(`[PackPorter Error] ${err.message}`, 'error');
        alert(`Error al importar .shubapack: ${err.message}`);
      } finally {
        btnImportShubapack.disabled = false;
      }
    });
  }

  // Importar Modpack de CurseForge (.zip) o Modrinth (.mrpack) desde Instancias
  const btnImportModpackInstances = document.getElementById('btn-import-modpack-instances');
  if (btnImportModpackInstances) {
    btnImportModpackInstances.addEventListener('click', async () => {
      try {
        const selectRes = await api.mods.selectModpackFile();
        if (!selectRes.canceled && selectRes.path) {
          appendLog(`[Modpacks] Importando paquete "${selectRes.path}" como nueva instancia...`, 'info');
          btnImportModpackInstances.disabled = true;

          const installRes = await api.mods.installModpackFile({
            packPath: selectRes.path,
            createProfile: true,
            instancePath: null
          });

          if (installRes.success) {
            appendLog(`[Modpacks] ¡Modpack "${installRes.name}" importado con éxito! Se instalaron ${installRes.filesCount || 0} archivos.`, 'success');
            try {
              const newProfileId = installRes.profile?.id;
              if (newProfileId) {
                await api.profiles.setActive(newProfileId);
              }
              await loadProfiles();
              switchMainView('profiles');
            } catch (uiErr) {
              console.warn('[Modpack UI] Advertencia al refrescar vista de instancias:', uiErr);
              appendLog(`[Modpack UI] Advertencia al refrescar vista de instancias: ${uiErr.message}`, 'warn');
            }
          } else {
            throw new Error(installRes.error || 'Error al procesar el modpack.');
          }
        }
      } catch (err) {
        appendLog(`[Modpack Error] ${err.message}`, 'error');
        alert(`Error al importar modpack: ${err.message}`);
      } finally {
        if (btnImportModpackInstances) btnImportModpackInstances.disabled = false;
      }
    });
  }

  // =======================================================
  // CREACIÓN DE INSTANCIAS
  // =======================================================
  async function openCreateProfileModal() {
    modalCreateProfile.classList.add('active');
    if (inputCreateProfileIcon) inputCreateProfileIcon.value = '';
    if (createProfileIconPreview) createProfileIconPreview.src = 'assets/logo.png';
    await updateLoaderVersionsInModal();
  }

  function closeCreateProfileModal() {
    modalCreateProfile.classList.remove('active');
  }

  if (btnOpenCreateModal) btnOpenCreateModal.addEventListener('click', openCreateProfileModal);
  if (btnCreateProfileTop) btnCreateProfileTop.addEventListener('click', openCreateProfileModal);
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeCreateProfileModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeCreateProfileModal);

  if (btnSelectCreateIcon) {
    btnSelectCreateIcon.addEventListener('click', async () => {
      const res = await api.profiles.selectIconDialog();
      if (!res.canceled && res.dataUrl) {
        if (inputCreateProfileIcon) inputCreateProfileIcon.value = res.dataUrl;
        if (createProfileIconPreview) createProfileIconPreview.src = res.dataUrl;
      }
    });
  }

  if (btnResetCreateIcon) {
    btnResetCreateIcon.addEventListener('click', () => {
      if (inputCreateProfileIcon) inputCreateProfileIcon.value = '';
      if (createProfileIconPreview) createProfileIconPreview.src = 'assets/logo.png';
    });
  }

  async function updateLoaderVersionsInModal() {
    const mc = selectProfileMc.value;
    const loader = selectProfileLoader.value;

    loaderFetchingIndicator.style.display = 'inline';
    selectProfileLoaderVersion.disabled = true;
    selectProfileLoaderVersion.innerHTML = '<option value="">Consultando versiones...</option>';

    try {
      const versions = await api.loaders.getVersions(loader, mc);
      selectProfileLoaderVersion.innerHTML = '';

      if (versions.length === 0 || loader === 'vanilla') {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Vanilla (Sin loader)';
        selectProfileLoaderVersion.appendChild(opt);
      } else {
        versions.forEach((v, index) => {
          const opt = document.createElement('option');
          const cleanVersion = String(v).split(' ')[0].trim();
          opt.value = cleanVersion;
          opt.textContent = `${cleanVersion} ${index === 0 ? '(Recomendada)' : ''}`;
          selectProfileLoaderVersion.appendChild(opt);
        });
      }
    } catch (e) {
      selectProfileLoaderVersion.innerHTML = '<option value="21.1.265">21.1.265 (Recomendada)</option>';
    } finally {
      loaderFetchingIndicator.style.display = 'none';
      selectProfileLoaderVersion.disabled = false;
    }
  }

  selectProfileMc.addEventListener('change', updateLoaderVersionsInModal);
  selectProfileLoader.addEventListener('change', updateLoaderVersionsInModal);

  btnConfirmCreateProfile.addEventListener('click', async () => {
    const name = inputProfileName.value.trim();
    if (!name) {
      alert('Por favor ingresa un nombre para la instancia.');
      return;
    }

    btnConfirmCreateProfile.disabled = true;
    btnConfirmCreateProfile.textContent = 'Creando Instancia...';

    try {
      const cleanLoaderVer = (selectProfileLoaderVersion.value || '').split(' ')[0].trim();
      const ramMin = (inputProfileRamMin.value || '2G').trim();
      const ramMax = (inputProfileRamMax.value || '8G').trim();

      const profilePayload = {
        name,
        mcVersion: selectProfileMc.value || '1.21.1',
        loader: selectProfileLoader.value || 'neoforge',
        loaderVersion: cleanLoaderVer,
        icon: (inputCreateProfileIcon ? inputCreateProfileIcon.value.trim() : '') || 'assets/logo.png',
        ramMin,
        ramMax,
        memoryMin: ramMin,
        memoryMax: ramMax
      };

      const res = await api.profiles.create(profilePayload);
      if (res && res.success === false) {
        throw new Error(res.error || 'Fallo al crear instancia.');
      }

      appendLog(`[Instancias] Instancia "${name}" creada exitosamente.`, 'success');
      closeCreateProfileModal();
      await loadProfiles();
      switchMainView('profiles');
    } catch (err) {
      alert(`Error al crear instancia: ${err.message}`);
    } finally {
      btnConfirmCreateProfile.disabled = false;
      btnConfirmCreateProfile.textContent = 'Crear Instancia';
    }
  });

  // =======================================================
  // EDICIÓN LIBRE DE INSTANCIAS (100% DESBLOQUEADO)
  // =======================================================
  async function openEditProfileModal(profile) {
    if (!profile) return;
    inputEditProfileId.value = profile.id;
    inputEditProfileName.value = profile.name || '';

    const currentIcon = profile.icon || '';
    if (inputEditProfileIcon) inputEditProfileIcon.value = currentIcon;
    if (editProfileIconPreview) {
      editProfileIconPreview.src = (currentIcon && (currentIcon.startsWith('data:image') || currentIcon.startsWith('http') || currentIcon.startsWith('assets/')))
        ? currentIcon
        : 'assets/logo.png';
    }

    if (selectEditProfileMc) {
      if (allCachedMcVersions && allCachedMcVersions.length > 0) {
        selectEditProfileMc.innerHTML = '';
        if (!allCachedMcVersions.includes(profile.mcVersion) && profile.mcVersion) {
          const customOpt = document.createElement('option');
          customOpt.value = profile.mcVersion;
          customOpt.textContent = `${profile.mcVersion} (Actual)`;
          selectEditProfileMc.appendChild(customOpt);
        }
        allCachedMcVersions.slice(0, 35).forEach((ver) => {
          const opt = document.createElement('option');
          opt.value = ver;
          opt.textContent = ver;
          selectEditProfileMc.appendChild(opt);
        });
      }
      selectEditProfileMc.value = profile.mcVersion || '1.21.1';
    }

    if (selectEditProfileLoader) {
      const currentLoader = (profile.loader || 'neoforge').toLowerCase();
      let matched = 'neoforge';
      if (currentLoader.includes('forge') && !currentLoader.includes('neo')) matched = 'forge';
      else if (currentLoader.includes('fabric')) matched = 'fabric';
      else if (currentLoader.includes('quilt')) matched = 'quilt';
      else if (currentLoader.includes('vanilla')) matched = 'vanilla';
      else matched = 'neoforge';
      selectEditProfileLoader.value = matched;
    }

    const currentLoaderVer = (profile.loaderVersion || '21.1.265').split(' ')[0].trim();
    if (inputEditProfileLoaderVer) {
      inputEditProfileLoaderVer.value = currentLoaderVer;
    }

    if (selectEditProfileJava) {
      const jSel = profile.javaSelection || 'auto';
      selectEditProfileJava.value = jSel;
      if (editProfileCustomJavaGroup) {
        editProfileCustomJavaGroup.style.display = (jSel === 'custom') ? 'block' : 'none';
      }
    }
    if (inputEditProfileCustomJava) {
      inputEditProfileCustomJava.value = profile.javaPath || '';
    }

    inputEditProfileRamMin.value = profile.ramMin || profile.memoryMin || '2G';
    inputEditProfileRamMax.value = profile.ramMax || profile.memoryMax || '8G';

    modalEditProfile.classList.add('active');
    await updateEditLoaderVersions(currentLoaderVer);
  }

  async function updateEditLoaderVersions(preselectVer = null) {
    if (!selectEditProfileMc || !selectEditProfileLoader || !selectEditProfileLoaderVersion) return;
    const mc = selectEditProfileMc.value;
    const loader = selectEditProfileLoader.value;

    if (editLoaderFetchingIndicator) editLoaderFetchingIndicator.style.display = 'inline';
    selectEditProfileLoaderVersion.disabled = true;
    selectEditProfileLoaderVersion.innerHTML = '<option value="">Consultando versiones...</option>';

    try {
      const versions = await api.loaders.getVersions(loader, mc);
      selectEditProfileLoaderVersion.innerHTML = '';

      if (versions.length === 0 || loader.toLowerCase() === 'vanilla') {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Vanilla (Sin loader)';
        selectEditProfileLoaderVersion.appendChild(opt);
        if (inputEditProfileLoaderVer) inputEditProfileLoaderVer.value = '';
      } else {
        let hasMatched = false;
        versions.forEach((v, index) => {
          const opt = document.createElement('option');
          const cleanVersion = String(v).split(' ')[0].trim();
          opt.value = cleanVersion;
          opt.textContent = `${cleanVersion} ${index === 0 ? '(Recomendada)' : ''}`;
          if (preselectVer && cleanVersion === preselectVer) {
            opt.selected = true;
            hasMatched = true;
          }
          selectEditProfileLoaderVersion.appendChild(opt);
        });

        if (preselectVer && !hasMatched && preselectVer !== 'latest' && preselectVer !== '') {
          const customOpt = document.createElement('option');
          customOpt.value = preselectVer;
          customOpt.textContent = `${preselectVer} (Actual)`;
          customOpt.selected = true;
          selectEditProfileLoaderVersion.insertBefore(customOpt, selectEditProfileLoaderVersion.firstChild);
        }

        if (inputEditProfileLoaderVer && (!inputEditProfileLoaderVer.value || preselectVer)) {
          inputEditProfileLoaderVer.value = selectEditProfileLoaderVersion.value || '';
        }
      }
    } catch (e) {
      selectEditProfileLoaderVersion.innerHTML = `<option value="${preselectVer || '21.1.265'}">${preselectVer || '21.1.265'}</option>`;
    } finally {
      if (editLoaderFetchingIndicator) editLoaderFetchingIndicator.style.display = 'none';
      selectEditProfileLoaderVersion.disabled = false;
    }
  }

  function closeEditProfileModal() {
    modalEditProfile.classList.remove('active');
  }

  btnCloseEditModal.addEventListener('click', closeEditProfileModal);
  btnCancelEditModal.addEventListener('click', closeEditProfileModal);

  if (btnSelectEditIcon) {
    btnSelectEditIcon.addEventListener('click', async () => {
      const res = await api.profiles.selectIconDialog();
      if (!res.canceled && res.dataUrl) {
        if (inputEditProfileIcon) inputEditProfileIcon.value = res.dataUrl;
        if (editProfileIconPreview) editProfileIconPreview.src = res.dataUrl;
      }
    });
  }

  if (btnResetEditIcon) {
    btnResetEditIcon.addEventListener('click', () => {
      if (inputEditProfileIcon) inputEditProfileIcon.value = '';
      if (editProfileIconPreview) editProfileIconPreview.src = 'assets/logo.png';
    });
  }

  selectEditProfileMc.addEventListener('change', () => updateEditLoaderVersions());
  selectEditProfileLoader.addEventListener('change', () => updateEditLoaderVersions());
  selectEditProfileLoaderVersion.addEventListener('change', () => {
    if (inputEditProfileLoaderVer) {
      inputEditProfileLoaderVer.value = selectEditProfileLoaderVersion.value;
    }
  });

  selectEditProfileJava.addEventListener('change', () => {
    if (editProfileCustomJavaGroup) {
      editProfileCustomJavaGroup.style.display = (selectEditProfileJava.value === 'custom') ? 'block' : 'none';
    }
  });

  if (btnBrowseEditProfileJava) {
    btnBrowseEditProfileJava.addEventListener('click', async () => {
      const res = await api.config.selectJava();
      if (!res.canceled && res.path && inputEditProfileCustomJava) {
        inputEditProfileCustomJava.value = res.path;
      }
    });
  }

  btnConfirmEditProfile.addEventListener('click', async () => {
    const id = inputEditProfileId.value;
    const name = inputEditProfileName.value.trim();
    if (!id || !name) {
      alert('Por favor ingresa un nombre válido para la instancia.');
      return;
    }

    const mcVersion = selectEditProfileMc ? selectEditProfileMc.value : '1.21.1';
    const loader = selectEditProfileLoader ? selectEditProfileLoader.value : 'neoforge';
    const rawLoaderVer = (inputEditProfileLoaderVer.value || selectEditProfileLoaderVersion?.value || '').trim();
    const cleanLoaderVer = loader.toLowerCase() === 'vanilla' ? '' : (rawLoaderVer.split(' ')[0].trim() || 'latest');
    const javaSelection = selectEditProfileJava ? selectEditProfileJava.value : 'auto';
    const javaPath = inputEditProfileCustomJava ? inputEditProfileCustomJava.value.trim() : '';
    const ramMin = (inputEditProfileRamMin.value || '2G').trim();
    const ramMax = (inputEditProfileRamMax.value || '8G').trim();

    btnConfirmEditProfile.disabled = true;
    btnConfirmEditProfile.textContent = 'Guardando...';

    try {
      const res = await api.profiles.update(id, {
        name,
        mcVersion,
        loader,
        loaderVersion: cleanLoaderVer,
        icon: (inputEditProfileIcon ? inputEditProfileIcon.value.trim() : '') || 'assets/logo.png',
        javaSelection,
        javaPath,
        ramMin,
        ramMax,
        memoryMin: ramMin,
        memoryMax: ramMax
      });

      if (res && res.success === false) {
        throw new Error(res.error || 'Error al actualizar instancia');
      }

      appendLog(`[Instancias] Instancia "${name}" actualizada con éxito.`, 'success');
      closeEditProfileModal();
      await loadProfiles();
    } catch (err) {
      alert(`Error al actualizar instancia: ${err.message}`);
    } finally {
      btnConfirmEditProfile.disabled = false;
      btnConfirmEditProfile.textContent = 'Guardar Cambios';
    }
  });

  // =======================================================
  // CARGA DE VERSIONES OFICIALES DE MOJANG
  // =======================================================
  async function loadVersionsList() {
    try {
      const versions = await api.system.getVersions();
      if (Array.isArray(versions) && versions.length > 0) {
        allCachedMcVersions = versions;
        selectProfileMc.innerHTML = '';
        versions.slice(0, 35).forEach((ver) => {
          const opt = document.createElement('option');
          opt.value = ver;
          opt.textContent = ver;
          if (ver === '1.21.1') opt.selected = true;
          selectProfileMc.appendChild(opt);
        });
      }
    } catch (e) {
      console.warn('Error al cargar versiones de Mojang:', e);
    }
  }

  // =======================================================
  // CARGA INICIAL DE CONFIGURACIÓN
  // =======================================================
  async function loadConfig() {
    try {
      await loadVersionsList();
      await loadProfiles();

      const config = await api.config.get();

      if (selectLaunchBehavior) {
        const behavior = config.performance?.launchBehavior || (config.performance?.closeOnLaunch ? 'close' : 'hide') || 'hide';
        selectLaunchBehavior.value = behavior;
      }
      if (checkCloseOnLaunch) {
        checkCloseOnLaunch.checked = config.performance?.closeOnLaunch !== false;
      }
      if (checkDiscordRpc && api.discord) {
        const dStatus = await api.discord.getStatus();
        checkDiscordRpc.checked = dStatus ? dStatus.enabled : true;
      }
      inputInstancePath.value = config.instance?.path || '';
      if (inputCustomJava) inputCustomJava.value = config.performance?.javaPath || '';
      if (selectGlobalJava) selectGlobalJava.value = config.performance?.javaSelection || 'auto';

      // Restauración de sesión persistente desde auth-session.json (<userData>)
      try {
        const savedSession = await api.auth.getSavedSession();
        if (savedSession && savedSession.success) {
          await updatePlayerBadge(savedSession.account, savedSession);
          await refreshMicrosoftAccountState();
          if (savedSession.isPremium) {
            appendLog(`[Auth] Sesión Microsoft restaurada: "${savedSession.microsoftAccount.username}" (Premium)`, 'info');
          } else {
            appendLog(`[Auth] Sesión Offline restaurada: "${savedSession.offlineAccount?.username || 'Jugador'}"`, 'info');
          }
        } else {
          const fallbackUser = (inputOfflineUser && inputOfflineUser.value.trim().length >= 3)
            ? inputOfflineUser.value.trim()
            : 'Jugador';
          await handleOfflineLogin(fallbackUser);
        }
      } catch (authInitErr) {
        console.warn('Error al cargar sesión persistente:', authInitErr);
        const fallbackUser = (inputOfflineUser && inputOfflineUser.value.trim().length >= 3)
          ? inputOfflineUser.value.trim()
          : 'Jugador';
        await handleOfflineLogin(fallbackUser);
      }

      await renderJavaRuntimes();
      await refreshJvmFlags();
    } catch (err) {
      appendLog(`Error al inicializar configuración: ${err.message}`, 'error');
    }
  }

  // Configuración de RAM rápida
  inputMinRam.addEventListener('change', () => {
    if (currentActiveProfile) {
      const val = inputMinRam.value.trim() || '2G';
      api.profiles.update(currentActiveProfile.id, { ramMin: val, memoryMin: val });
    }
    refreshJvmFlags();
  });

  inputMaxRam.addEventListener('change', () => {
    if (currentActiveProfile) {
      const val = inputMaxRam.value.trim() || '8G';
      api.profiles.update(currentActiveProfile.id, { ramMax: val, memoryMax: val });
    }
    refreshJvmFlags();
  });

  if (selectLaunchBehavior) {
    selectLaunchBehavior.addEventListener('change', async () => {
      const val = selectLaunchBehavior.value;
      await api.config.set('performance.launchBehavior', val);
      await api.config.set('launchBehavior', val);
      const labels = {
        hide: 'Ocultar en segundo plano y reaparecer al salir',
        keep: 'Mantener ventana abierta',
        close: 'Cerrar launcher completamente'
      };
      appendLog(`[Config] Comportamiento al iniciar el juego: ${labels[val] || val}`, 'info');
    });
  }

  if (checkCloseOnLaunch) {
    checkCloseOnLaunch.addEventListener('change', () => {
      api.config.set('performance.closeOnLaunch', checkCloseOnLaunch.checked);
      appendLog(`[Config] 'Cerrar ShubaCore al jugar': ${checkCloseOnLaunch.checked ? 'ACTIVADO' : 'DESACTIVADO'}`, 'info');
    });
  }

  if (checkDiscordRpc && api.discord) {
    checkDiscordRpc.addEventListener('change', async () => {
      await api.discord.setEnabled(checkDiscordRpc.checked);
      appendLog(`[Discord RPC] Actividad en Discord: ${checkDiscordRpc.checked ? 'ACTIVADA' : 'DESACTIVADA'}`, 'info');
    });
  }

  btnBrowseInstance.addEventListener('click', async () => {
    const res = await api.config.selectDirectory(inputInstancePath.value);
    if (!res.canceled && res.path) {
      inputInstancePath.value = res.path;
      appendLog(`[Config] Carpeta compartida cambiada a: ${res.path}`, 'info');
    }
  });

  if (btnBrowseJava) {
    btnBrowseJava.addEventListener('click', async () => {
      const res = await api.config.selectJava();
      if (!res.canceled && res.path) {
        inputCustomJava.value = res.path;
        await api.config.set('performance.javaPath', res.path);
        if (selectGlobalJava) {
          selectGlobalJava.value = 'custom';
          await api.config.set('performance.javaSelection', 'custom');
        }
        appendLog(`[Java] Ruta personalizada establecida: ${res.path}`, 'info');
        await detectJava();
      }
    });
  }

  // =======================================================
  // GESTOR DE VERSIONES DE JAVA (RUNTIMES)
  // =======================================================
  async function renderJavaRuntimes() {
    if (!javaRuntimesList) return;
    javaRuntimesList.innerHTML = '<div class="empty-state">Escaneando versiones de Java...</div>';

    try {
      const runtimes = await api.jvm.scanInstalled();
      if (!Array.isArray(runtimes) || runtimes.length === 0) {
        javaRuntimesList.innerHTML = '<div class="empty-state">No se encontraron runtimes instalados. Instala uno oficial abajo con 1-clic.</div>';
        return;
      }

      javaRuntimesList.innerHTML = '';
      runtimes.forEach((r) => {
        const row = document.createElement('div');
        row.className = 'java-item-row';

        row.innerHTML = `
          <div class="java-item-left">
            <span class="badge ${r.isPortable ? 'badge-premium' : 'badge-neoforge'}">Java ${r.majorVersion}</span>
            <strong>${r.vendor || 'OpenJDK'} (${r.is64Bit ? '64-Bit' : '32-Bit'})</strong>
            <span class="badge ${r.isPortable ? 'badge-offline' : 'badge-idle'}">${r.isPortable ? 'Portable' : 'Sistema'}</span>
          </div>
          <div class="java-item-path" title="${r.path}">${r.path}</div>
        `;
        javaRuntimesList.appendChild(row);
      });
    } catch (err) {
      javaRuntimesList.innerHTML = `<div class="empty-state" style="color: var(--accent-danger);">Error al escanear: ${err.message}</div>`;
    }
  }

  async function installAdoptiumJava(majorVersion, btn) {
    if (btn) btn.disabled = true;
    if (javaInstallStatusBox) {
      javaInstallStatusBox.style.display = 'flex';
      javaInstallProgressBar.style.width = '5%';
      javaInstallStatusText.textContent = `Descargando e instalando Eclipse Temurin Java ${majorVersion} oficial...`;
    }

    appendLog(`[JavaManager] Descargando e instalando Eclipse Temurin Java ${majorVersion}...`, 'info');

    try {
      const result = await api.jvm.install(majorVersion);
      if (result && result.success) {
        if (javaInstallProgressBar) javaInstallProgressBar.style.width = '100%';
        if (javaInstallStatusText) javaInstallStatusText.textContent = `¡Java ${majorVersion} instalado exitosamente!`;
        appendLog(`[JavaManager] ¡Java ${majorVersion} portable instalado y verificado! Ruta: "${result.path}" (${result.vendor})`, 'success');
        await renderJavaRuntimes();
        await detectJava();
        setTimeout(() => {
          if (javaInstallStatusBox) javaInstallStatusBox.style.display = 'none';
        }, 3000);
      } else {
        throw new Error(result?.error || 'Error desconocido al instalar Java.');
      }
    } catch (err) {
      if (javaInstallStatusText) javaInstallStatusText.textContent = `Error: ${err.message}`;
      appendLog(`[JavaManager Error] ${err.message}`, 'error');
      alert(`Error al instalar Java ${majorVersion}: ${err.message}`);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  if (btnScanJava) btnScanJava.addEventListener('click', renderJavaRuntimes);

  [
    { btn: btnInstallJava25, ver: 25 },
    { btn: btnInstallJava21, ver: 21 },
    { btn: btnInstallJava17, ver: 17 },
    { btn: btnInstallJava8, ver: 8 }
  ].forEach(({ btn, ver }) => {
    if (btn) {
      btn.addEventListener('click', () => installAdoptiumJava(ver, btn));
    }
  });

  if (selectGlobalJava) {
    selectGlobalJava.addEventListener('change', async () => {
      const val = selectGlobalJava.value;
      await api.config.set('performance.javaSelection', val);
      appendLog(`[Config] Selector Global de Java establecido en: "${val}"`, 'info');
      await detectJava();
    });
  }

  async function detectJava() {
    jvmVersionDisplay.textContent = 'Detectando...';
    jvmGcDisplay.textContent = 'Analizando...';

    const targetMc = currentActiveProfile?.mcVersion || '1.21.1';
    const customPath = (inputCustomJava ? inputCustomJava.value.trim() : null) || null;
    const info = await api.jvm.detect(customPath, targetMc);

    if (info.success) {
      currentJavaVersion = info.majorVersion;
      jvmVersionDisplay.textContent = `Java ${info.majorVersion} (${info.vendor})`;
      jvmGcDisplay.textContent = info.recommendedGC;
      jvmArchDisplay.textContent = info.arch;
      appendLog(`[JVM] Java ${info.majorVersion} activo (${info.path}). GC: ${info.recommendedGC}`, 'success');
    } else {
      jvmVersionDisplay.textContent = 'No detectado';
      jvmGcDisplay.textContent = 'Fallback G1GC';
      appendLog(`[JVM Alerta] ${info.error}`, 'warn');
    }

    await refreshJvmFlags();
  }

  async function refreshJvmFlags() {
    const flags = await api.jvm.getRecommendedArgs({
      majorVersion: currentJavaVersion,
      memoryMin: inputMinRam.value.trim() || '2G',
      memoryMax: inputMaxRam.value.trim() || '8G'
    });
    jvmFlagsCode.textContent = flags.join(' ');
  }

  btnDetectJava.addEventListener('click', detectJava);

  // Helpers de Limpieza y Escape
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function cleanModJarName(fileName) {
    if (!fileName || typeof fileName !== 'string' || fileName.toLowerCase() === 'undefined') return 'Mod Desconocido';
    let base = fileName.replace(/\.disabled$/i, '').replace(/\.jar$/i, '');
    const parts = base.split(/[-_+](?:neoforge|forge|fabric|quilt|mc\d|\d+\.\d+)/i);
    if (parts[0] && parts[0].trim().length > 1) {
      base = parts[0].trim();
    }
    base = base.replace(/_/g, ' ').trim();
    if (!base || base.toLowerCase() === 'undefined') {
      const fallback = fileName.replace(/\.disabled$/i, '').replace(/\.jar$/i, '').trim();
      return fallback && fallback.toLowerCase() !== 'undefined' ? fallback : 'Mod';
    }
    return base.charAt(0).toUpperCase() + base.slice(1);
  }

  function resolveModTitle(mod, rawFileName) {
    const cleanJar = cleanModJarName(rawFileName);
    let candidate = (mod && mod.displayName && String(mod.displayName).toLowerCase() !== 'undefined' && String(mod.displayName).trim())
      ? String(mod.displayName).trim()
      : ((mod && mod.name && String(mod.name).toLowerCase() !== 'undefined' && String(mod.name).trim()) ? String(mod.name).trim() : cleanJar);

    // Si el texto resultante es solo un loader o versión suelta, preferimos el nombre limpio del archivo JAR
    if (/^(?:neoforge|forge|fabric|quilt|\d+\.)/i.test(candidate)) {
      return cleanJar;
    }
    if (!candidate || candidate.toLowerCase() === 'undefined') {
      return cleanJar || 'Mod Desconocido';
    }
    return candidate;
  }

  // =======================================================
  // GESTOR DE MODS DE LA INSTANCIA (LISTADO, VISTAS Y CONTROL)
  // =======================================================
  function parseModSizeToBytes(str) {
    if (!str || typeof str !== 'string') return 0;
    const clean = str.trim().toUpperCase();
    const match = clean.match(/^([\d.]+)\s*(MB|KB|GB|B)?$/);
    if (!match) return 0;
    const val = parseFloat(match[1]);
    const unit = match[2] || 'B';
    if (unit === 'GB') return val * 1024 * 1024 * 1024;
    if (unit === 'MB') return val * 1024 * 1024;
    if (unit === 'KB') return val * 1024;
    return val;
  }

  function renderFilteredInstalledMods() {
    if (!modsInstalledList) return;

    const searchTerm = (inputSearchInstalledMods ? inputSearchInstalledMods.value.trim().toLowerCase() : '');
    const sortBy = (selectInstalledModsSort ? selectInstalledModsSort.value : 'name');

    // 1. Filtrado local en tiempo real
    let filtered = currentInstalledModsList.filter((mod) => {
      if (!searchTerm) return true;
      const fn = (mod.fileName || '').toLowerCase();
      const dn = (mod.displayName || '').toLowerCase();
      const n = (mod.name || '').toLowerCase();
      const auth = (mod.author || '').toLowerCase();
      return fn.includes(searchTerm) || dn.includes(searchTerm) || n.includes(searchTerm) || auth.includes(searchTerm);
    });

    // 2. Ordenamiento configurable
    filtered.sort((a, b) => {
      const titleA = resolveModTitle(a, a.fileName || '').toLowerCase();
      const titleB = resolveModTitle(b, b.fileName || '').toLowerCase();

      if (sortBy === 'name') {
        return titleA.localeCompare(titleB);
      } else if (sortBy === 'status') {
        const enA = a.enabled !== false ? 1 : 0;
        const enB = b.enabled !== false ? 1 : 0;
        if (enA !== enB) return enB - enA;
        return titleA.localeCompare(titleB);
      } else if (sortBy === 'size') {
        const sizeA = parseModSizeToBytes(a.sizeFormatted);
        const sizeB = parseModSizeToBytes(b.sizeFormatted);
        if (sizeA !== sizeB) return sizeB - sizeA;
        return titleA.localeCompare(titleB);
      } else if (sortBy === 'platform') {
        const pA = (a.source || 'custom').toLowerCase();
        const pB = (b.source || 'custom').toLowerCase();
        if (pA !== pB) return pA.localeCompare(pB);
        return titleA.localeCompare(titleB);
      }
      return 0;
    });

    if (installedModsCount) installedModsCount.textContent = filtered.length;
    const badgeSubtabMods = document.getElementById('badge-subtab-mods');
    if (badgeSubtabMods) badgeSubtabMods.textContent = currentInstalledModsList.length;

    if (filtered.length === 0) {
      const msg = searchTerm ? 'No se encontraron mods que coincidan con la búsqueda.' : 'No hay mods instalados en esta instancia todavía.';
      modsInstalledList.innerHTML = `<div class="empty-state">${escapeHtml(msg)}</div>`;
      return;
    }

    // Si hay actualizaciones disponibles, ordenar los mods afectados arriba del todo
    if (activeAvailableUpdates.length > 0) {
      filtered.sort((a, b) => {
        const aHasUp = activeAvailableUpdates.some((u) => u.currentFileName === a.fileName || (u.projectId && String(u.projectId) === String(a.projectId)));
        const bHasUp = activeAvailableUpdates.some((u) => u.currentFileName === b.fileName || (u.projectId && String(u.projectId) === String(b.projectId)));
        if (aHasUp && !bHasUp) return -1;
        if (!aHasUp && bHasUp) return 1;
        return 0;
      });
    }

    modsInstalledList.innerHTML = '';
    const targetInstance = currentActiveProfile?.instancePath || null;

    filtered.forEach((mod) => {
      const rawFileName = mod.fileName ?? 'mod.jar';
      const modTitle = resolveModTitle(mod, rawFileName);
      const modAuthor = mod.author ? `por ${mod.author}` : '';

      const source = (mod.source ?? 'custom').toLowerCase();
      const sourceLabel = source === 'curseforge' ? 'CURSEFORGE' : (source === 'modrinth' ? 'MODRINTH' : 'CUSTOM');
      const sourceClass = source === 'curseforge' ? 'badge-curseforge' : (source === 'modrinth' ? 'badge-modrinth' : 'badge-idle');

      const isChecked = mod.enabled !== false ? 'checked' : '';

      // Comprobar actualización disponible
      const modUpdate = activeAvailableUpdates.find((u) => u.currentFileName === rawFileName || (u.projectId && String(u.projectId) === String(mod.projectId)));
      let cleanNewV = '';
      if (modUpdate) {
        const rawNew = (modUpdate.latestFile.versionNumber || modUpdate.latestFile.displayName || '').trim();
        cleanNewV = rawNew.replace(/^v+/i, '').trim();
      }
      const updateBtn = modUpdate
        ? `<button class="btn btn-small btn-update-mod" data-filename="${escapeHtml(rawFileName)}" title="Actualizar a la versión ${escapeHtml(cleanNewV ? 'v' + cleanNewV : 'más reciente')}">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
             <span>Actualizar${cleanNewV ? ' a v' + escapeHtml(cleanNewV) : ''}</span>
           </button>`
        : '';

      // Icono o fallback SVG estilizado
      const iconHtml = mod.iconUrl
        ? `<img src="${escapeHtml(mod.iconUrl)}" alt="${escapeHtml(modTitle)}" onerror="this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.style.display='block';" /><svg class="mod-avatar-fallback" style="display:none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`
        : `<svg class="mod-avatar-fallback" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`;

      // Botón de detalle
      const inspectBtn = mod.projectId
        ? `<button class="btn btn-small btn-secondary btn-inspect-mod" data-projectid="${escapeHtml(String(mod.projectId))}" data-source="${escapeHtml(source)}" data-title="${escapeHtml(modTitle)}" data-icon="${escapeHtml(mod.iconUrl || '')}" data-author="${escapeHtml(mod.author || '')}" data-summary="${escapeHtml(mod.summary || '')}" title="Ver detalles y capturas">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
           </button>`
        : '';

      const deleteBtn = `<button class="btn btn-small btn-danger btn-delete-mod" data-filename="${escapeHtml(rawFileName)}" title="Eliminar mod">
                           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                         </button>`;

      if (currentModsViewMode === 'grid') {
        const card = document.createElement('div');
        card.className = 'installed-mod-grid-card';
        card.innerHTML = `
          <div class="grid-card-top">
            <div class="grid-card-icon-title">
              <div class="grid-card-avatar">${iconHtml}</div>
              <div class="grid-card-info">
                <span class="grid-card-title" title="${escapeHtml(modTitle)}">${escapeHtml(modTitle)}</span>
                ${modAuthor ? `<span class="grid-card-author">${escapeHtml(modAuthor)}</span>` : ''}
                <span class="grid-card-filename" title="${escapeHtml(rawFileName)}">${escapeHtml(rawFileName)}</span>
              </div>
            </div>
            <label class="switch-container" title="Habilitar / Deshabilitar">
              <input type="checkbox" class="mod-toggle-check" data-filename="${escapeHtml(rawFileName)}" ${isChecked}>
              <span class="switch-slider"></span>
            </label>
          </div>
          <div class="grid-card-bottom">
            <div class="grid-card-tags">
              <span class="badge ${sourceClass}">${sourceLabel}</span>
              ${mod.sizeFormatted ? `<span class="badge badge-idle">${escapeHtml(mod.sizeFormatted)}</span>` : ''}
            </div>
            <div class="grid-card-actions">
              ${updateBtn}
              ${inspectBtn}
              ${deleteBtn}
            </div>
          </div>
        `;
        card.addEventListener('click', (e) => {
          if (e.target.closest('.switch-container') || e.target.closest('.btn-update-mod') || e.target.closest('.btn-delete-mod')) {
            return;
          }
          openModDetailModal({
            id: mod.projectId,
            source: source,
            title: modTitle,
            iconUrl: mod.iconUrl,
            author: mod.author,
            summary: mod.summary || mod.description || '',
            fileName: rawFileName,
            sizeFormatted: mod.sizeFormatted
          });
        });
        modsInstalledList.appendChild(card);
      } else {
        const row = document.createElement('div');
        row.className = 'installed-mod-row';
        row.innerHTML = `
          <div class="installed-mod-left">
            <label class="switch-container" title="Habilitar / Deshabilitar">
              <input type="checkbox" class="mod-toggle-check" data-filename="${escapeHtml(rawFileName)}" ${isChecked}>
              <span class="switch-slider"></span>
            </label>
            <div class="mod-avatar-box">${iconHtml}</div>
            <div class="mod-info-col">
              <div class="installed-mod-name-row">
                <span class="installed-mod-name">${escapeHtml(modTitle)}</span>
                ${modAuthor ? `<span class="installed-mod-author">${escapeHtml(modAuthor)}</span>` : ''}
              </div>
              <div class="installed-mod-meta-row">
                <span class="installed-mod-filename">${escapeHtml(rawFileName)}</span>
                ${mod.sizeFormatted ? `<span class="installed-mod-size">· ${escapeHtml(mod.sizeFormatted)}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="installed-mod-right">
            ${updateBtn}
            <span class="badge ${sourceClass}">${sourceLabel}</span>
            ${inspectBtn}
            ${deleteBtn}
          </div>
        `;
        row.addEventListener('click', (e) => {
          if (e.target.closest('.switch-container') || e.target.closest('.btn-update-mod') || e.target.closest('.btn-delete-mod')) {
            return;
          }
          openModDetailModal({
            id: mod.projectId,
            source: source,
            title: modTitle,
            iconUrl: mod.iconUrl,
            author: mod.author,
            summary: mod.summary || mod.description || '',
            fileName: rawFileName,
            sizeFormatted: mod.sizeFormatted
          });
        });
        modsInstalledList.appendChild(row);
      }
    });

    // Eventos de botones
    modsInstalledList.querySelectorAll('.btn-update-mod').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const fn = e.currentTarget.getAttribute('data-filename');
        const modUp = activeAvailableUpdates.find((u) => u.currentFileName === fn);
        if (!modUp) return;

        e.currentTarget.disabled = true;
        e.currentTarget.innerHTML = '<span>Actualizando...</span>';
        appendLog(`[Mods] Actualizando "${modUp.name}" a ${modUp.latestFile.versionNumber || modUp.latestFile.displayName}...`, 'info');

        try {
          await api.mods.installVersion({
            projectId: modUp.projectId,
            source: modUp.source,
            fileId: modUp.latestFile.fileId,
            downloadUrl: modUp.latestFile.downloadUrl,
            fileName: modUp.latestFile.fileName,
            displayName: modUp.latestFile.displayName,
            versionNumber: modUp.latestFile.versionNumber,
            instancePath: targetInstance,
            mcVersion: currentActiveProfile?.mcVersion,
            loader: currentActiveProfile?.loader,
            oldFileName: modUp.currentFileName || fn
          });

          appendLog(`[Mods] ¡"${modUp.name}" actualizado con éxito!`, 'success');
          activeAvailableUpdates = activeAvailableUpdates.filter((u) => u.currentFileName !== fn && u.currentFileName !== modUp.currentFileName);
          if (updatesAvailableCount) updatesAvailableCount.textContent = activeAvailableUpdates.length;
          if (btnUpdateAllMods) {
            if (activeAvailableUpdates.length > 0) {
              btnUpdateAllMods.classList.add('has-updates');
            } else {
              btnUpdateAllMods.classList.remove('has-updates');
            }
          }
          await loadInstalledMods();
        } catch (err) {
          appendLog(`[Mods Error] No se pudo actualizar ${modUp.name}: ${err.message}`, 'error');
          alert(`Error al actualizar mod: ${err.message}`);
        }
      });
    });

    modsInstalledList.querySelectorAll('.switch-container').forEach((sw) => {
      sw.addEventListener('click', (e) => e.stopPropagation());
    });

    modsInstalledList.querySelectorAll('.mod-toggle-check').forEach((chk) => {
      chk.addEventListener('click', (e) => e.stopPropagation());
      chk.addEventListener('change', async (e) => {
        const fn = e.target.getAttribute('data-filename');
        const enabled = e.target.checked;
        await api.mods.toggle(fn, enabled, targetInstance);
        const item = currentInstalledModsList.find((m) => m.fileName === fn);
        if (item) item.enabled = enabled;
        appendLog(`[Mods] Mod "${fn}": ${enabled ? 'Habilitado' : 'Deshabilitado'}`, 'info');
      });
    });

    modsInstalledList.querySelectorAll('.btn-inspect-mod').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const b = e.currentTarget;
        openModDetailModal({
          id: b.getAttribute('data-projectid'),
          source: b.getAttribute('data-source'),
          title: b.getAttribute('data-title'),
          iconUrl: b.getAttribute('data-icon'),
          author: b.getAttribute('data-author'),
          summary: b.getAttribute('data-summary')
        });
      });
    });

    modsInstalledList.querySelectorAll('.btn-delete-mod').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const fn = e.currentTarget.getAttribute('data-filename');
        if (confirm(`¿Eliminar el mod "${fn}" de la instancia?`)) {
          await api.mods.delete(fn, targetInstance);
          appendLog(`[Mods] Mod "${fn}" eliminado.`, 'info');
          await loadInstalledMods();
        }
      });
    });
  }

  async function loadInstalledMods() {
    try {
      // 1. Actualizar barra de contexto
      if (currentActiveProfile) {
        if (installedModsInstanceName) installedModsInstanceName.textContent = currentActiveProfile.name || 'Instancia Activa';
        const loaderCap = (currentActiveProfile.loader || 'neoforge').charAt(0).toUpperCase() + (currentActiveProfile.loader || 'neoforge').slice(1);
        if (instanceContextBadge) instanceContextBadge.textContent = `Minecraft ${currentActiveProfile.mcVersion || '1.21.1'} · ${loaderCap}`;
        if (instanceContextIcon) {
          const pIcon = currentActiveProfile.icon || 'assets/logo.png';
          instanceContextIcon.onerror = () => {
            instanceContextIcon.onerror = null;
            instanceContextIcon.src = 'assets/logo.png';
          };
          instanceContextIcon.src = pIcon;
        }
      }

      const targetInstance = currentActiveProfile?.instancePath || null;
      const mods = await api.mods.listInstalled(targetInstance);
      currentInstalledModsList = Array.isArray(mods) ? mods : [];
      renderFilteredInstalledMods();

      // Actualizar contadores de sub-pestañas en segundo plano
      if (api.instancePacks) {
        api.instancePacks.list({ instancePath: targetInstance, type: 'shaders' }).then((sh) => {
          const badge = document.getElementById('badge-subtab-shaders');
          if (badge) badge.textContent = Array.isArray(sh) ? sh.length : 0;
        }).catch(() => {});
        api.instancePacks.list({ instancePath: targetInstance, type: 'resourcepacks' }).then((rp) => {
          const badge = document.getElementById('badge-subtab-resourcepacks');
          if (badge) badge.textContent = Array.isArray(rp) ? rp.length : 0;
        }).catch(() => {});
      }
      if (api.worlds) {
        api.worlds.list(targetInstance).then((w) => {
          const badge = document.getElementById('badge-subtab-worlds');
          if (badge) badge.textContent = Array.isArray(w) ? w.length : 0;
        }).catch(() => {});
      }

      // 2. Resolver iconos faltantes en segundo plano
      api.mods.resolveIcons(targetInstance).then((res) => {
        if (res && res.updatedCount > 0) {
          api.mods.listInstalled(targetInstance).then((updated) => {
            currentInstalledModsList = Array.isArray(updated) ? updated : [];
            renderFilteredInstalledMods();
          });
        }
      }).catch((e) => console.debug('Icon resolution background:', e.message));
    } catch (err) {
      appendLog(`Error al cargar mods instalados: ${err.message}`, 'error');
    }
  }

  // Controles de Vista y Barra de Contexto
  if (btnAddMoreMods) {
    btnAddMoreMods.addEventListener('click', () => {
      switchMainView('catalog');
    });
  }

  if (btnOpenModsFolder) {
    btnOpenModsFolder.addEventListener('click', async () => {
      const targetInstance = currentActiveProfile?.instancePath || null;
      await api.mods.openFolder(targetInstance);
    });
  }

  // =======================================================
  // SUB-PESTAÑAS DE INSTANCIA (MODS | SHADERS | TEXTURAS | MUNDOS)
  // =======================================================
  let currentInstanceSubtab = 'mods';
  let currentManagingWorldFolderName = null;
  let currentManagingWorldName = null;

  function switchInstanceSubtab(tabName) {
    currentInstanceSubtab = tabName;
    document.querySelectorAll('.instance-subtab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-subtab') === tabName);
    });

    const subpanels = {
      mods: document.getElementById('subpanel-instance-mods'),
      shaders: document.getElementById('subpanel-instance-shaders'),
      resourcepacks: document.getElementById('subpanel-instance-resourcepacks'),
      worlds: document.getElementById('subpanel-instance-worlds'),
      hud: document.getElementById('subpanel-instance-hud')
    };

    Object.keys(subpanels).forEach((k) => {
      if (subpanels[k]) {
        const isActive = (k === tabName);
        subpanels[k].style.display = isActive ? 'flex' : 'none';
        subpanels[k].classList.toggle('active', isActive);
      }
    });

    if (tabName === 'mods') {
      loadInstalledMods();
    } else if (tabName === 'shaders') {
      loadInstalledShaders();
    } else if (tabName === 'resourcepacks') {
      loadInstalledResourcePacks();
    } else if (tabName === 'worlds') {
      loadInstalledWorlds();
    } else if (tabName === 'hud') {
      loadHudState();
    }
  }

  document.querySelectorAll('.instance-subtab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-subtab');
      if (target) switchInstanceSubtab(target);
    });
  });

  // --- GESTOR DE SHADERS INSTALADOS ---
  async function loadInstalledShaders() {
    const targetInstance = currentActiveProfile?.instancePath || null;
    const container = document.getElementById('shaders-installed-list');
    const badgeCount = document.getElementById('badge-subtab-shaders');
    const headerBadge = document.getElementById('installed-shaders-count-badge');
    if (!container) return;

    container.innerHTML = '<div class="empty-state">Buscando shaders instalados en shaderpacks/...</div>';

    try {
      const shaders = await api.instancePacks.list({ instancePath: targetInstance, type: 'shaders' });
      const list = Array.isArray(shaders) ? shaders : [];
      if (badgeCount) badgeCount.textContent = list.length;
      if (headerBadge) headerBadge.textContent = `${list.length} shader${list.length === 1 ? '' : 's'}`;

      if (list.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 30px 20px;">
            <p style="font-size: 14px; margin-bottom: 6px;">No hay shaders instalados en esta instancia todavía.</p>
            <small style="color: var(--text-dim);">Haz clic en "➕ Buscar Shaders en Catálogo" para explorar e instalar shaders compatibles.</small>
          </div>
        `;
        return;
      }

      container.innerHTML = '';
      list.forEach((pack) => {
        const card = document.createElement('div');
        card.className = 'pack-card';

        const iconSrc = pack.icon || 'assets/logo.png';
        const formattedDate = new Date(pack.modifiedAt).toLocaleDateString();

        card.innerHTML = `
          <div class="pack-card-left">
            <img src="${escapeHtml(iconSrc)}" class="pack-card-icon" alt="Pack Icon" onerror="this.src='assets/logo.png'">
            <div class="pack-card-info">
              <div class="pack-card-title-row">
                <span class="pack-card-title" title="${escapeHtml(pack.fileName)}">${escapeHtml(pack.name)}</span>
                <span class="badge badge-secondary" style="font-size: 10px;">${pack.isZip ? 'ZIP' : 'CARPETA'}</span>
              </div>
              <div class="pack-card-desc" title="${escapeHtml(pack.description)}">${escapeHtml(pack.description)}</div>
              <div class="pack-card-meta">
                <span>📁 ${escapeHtml(pack.fileName)}</span>
                <span>·</span>
                <span>📦 ${escapeHtml(pack.formattedSize)}</span>
                <span>·</span>
                <span>📅 ${formattedDate}</span>
              </div>
            </div>
          </div>
          <div class="pack-card-actions">
            <button class="btn btn-small btn-danger btn-icon-square btn-delete-pack" data-filename="${escapeHtml(pack.fileName)}" data-type="shaders" title="Eliminar shader">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        `;

        container.appendChild(card);
      });

      container.querySelectorAll('.btn-delete-pack').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const fn = e.currentTarget.getAttribute('data-filename');
          if (confirm(`¿Deseas eliminar el shader "${fn}" de esta instancia?`)) {
            await api.instancePacks.delete({ instancePath: targetInstance, type: 'shaders', fileName: fn });
            appendLog(`[Shaders] Shader "${fn}" eliminado.`, 'info');
            await loadInstalledShaders();
          }
        });
      });

    } catch (err) {
      container.innerHTML = `<div class="empty-state">Error al cargar shaders: ${escapeHtml(err.message)}</div>`;
      appendLog(`[Shaders Error] ${err.message}`, 'error');
    }
  }

  // --- GESTOR DE RESOURCE PACKS INSTALADOS ---
  async function loadInstalledResourcePacks() {
    const targetInstance = currentActiveProfile?.instancePath || null;
    const container = document.getElementById('resourcepacks-installed-list');
    const badgeCount = document.getElementById('badge-subtab-resourcepacks');
    const headerBadge = document.getElementById('installed-resourcepacks-count-badge');
    if (!container) return;

    container.innerHTML = '<div class="empty-state">Buscando texturas instaladas en resourcepacks/...</div>';

    try {
      const packs = await api.instancePacks.list({ instancePath: targetInstance, type: 'resourcepacks' });
      const list = Array.isArray(packs) ? packs : [];
      if (badgeCount) badgeCount.textContent = list.length;
      if (headerBadge) headerBadge.textContent = `${list.length} textura${list.length === 1 ? '' : 's'}`;

      if (list.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 30px 20px;">
            <p style="font-size: 14px; margin-bottom: 6px;">No hay resource packs instalados en esta instancia todavía.</p>
            <small style="color: var(--text-dim);">Haz clic en "➕ Buscar Texturas en Catálogo" para explorar e instalar paquetes de texturas.</small>
          </div>
        `;
        return;
      }

      container.innerHTML = '';
      list.forEach((pack) => {
        const card = document.createElement('div');
        card.className = 'pack-card';

        const iconSrc = pack.icon || 'assets/logo.png';
        const formattedDate = new Date(pack.modifiedAt).toLocaleDateString();

        card.innerHTML = `
          <div class="pack-card-left">
            <img src="${escapeHtml(iconSrc)}" class="pack-card-icon" alt="Pack Icon" onerror="this.src='assets/logo.png'">
            <div class="pack-card-info">
              <div class="pack-card-title-row">
                <span class="pack-card-title" title="${escapeHtml(pack.fileName)}">${escapeHtml(pack.name)}</span>
                ${pack.packFormat ? `<span class="badge badge-secondary" style="font-size: 10px;">Format ${pack.packFormat}</span>` : ''}
              </div>
              <div class="pack-card-desc" title="${escapeHtml(pack.description)}">${escapeHtml(pack.description)}</div>
              <div class="pack-card-meta">
                <span>📁 ${escapeHtml(pack.fileName)}</span>
                <span>·</span>
                <span>📦 ${escapeHtml(pack.formattedSize)}</span>
                <span>·</span>
                <span>📅 ${formattedDate}</span>
              </div>
            </div>
          </div>
          <div class="pack-card-actions">
            <button class="btn btn-small btn-danger btn-icon-square btn-delete-pack" data-filename="${escapeHtml(pack.fileName)}" data-type="resourcepacks" title="Eliminar paquete de texturas">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        `;

        container.appendChild(card);
      });

      container.querySelectorAll('.btn-delete-pack').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const fn = e.currentTarget.getAttribute('data-filename');
          if (confirm(`¿Deseas eliminar el resource pack "${fn}" de esta instancia?`)) {
            await api.instancePacks.delete({ instancePath: targetInstance, type: 'resourcepacks', fileName: fn });
            appendLog(`[ResourcePacks] Textura "${fn}" eliminada.`, 'info');
            await loadInstalledResourcePacks();
          }
        });
      });

    } catch (err) {
      container.innerHTML = `<div class="empty-state">Error al cargar texturas: ${escapeHtml(err.message)}</div>`;
      appendLog(`[ResourcePacks Error] ${err.message}`, 'error');
    }
  }

  // --- GESTOR DE MUNDOS Y BACKUPS (SAVES) ---
  async function loadInstalledWorlds() {
    const targetInstance = currentActiveProfile?.instancePath || null;
    const container = document.getElementById('worlds-installed-list');
    const badgeCount = document.getElementById('badge-subtab-worlds');
    const headerBadge = document.getElementById('installed-worlds-count-badge');
    if (!container) return;

    container.innerHTML = '<div class="empty-state">Buscando mundos guardados en saves/...</div>';

    try {
      const worlds = await api.worlds.list(targetInstance);
      const list = Array.isArray(worlds) ? worlds : [];
      if (badgeCount) badgeCount.textContent = list.length;
      if (headerBadge) headerBadge.textContent = `${list.length} mundo${list.length === 1 ? '' : 's'}`;

      if (list.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="padding: 30px 20px;">
            <p style="font-size: 14px; margin-bottom: 6px;">No hay partidas guardadas en esta instancia todavía.</p>
            <small style="color: var(--text-dim);">Crea un nuevo mundo en el juego o copia una carpeta de mundo en <code>saves/</code>.</small>
          </div>
        `;
        return;
      }

      container.innerHTML = '';
      list.forEach((world) => {
        const card = document.createElement('div');
        card.className = 'world-card';

        const iconSrc = world.icon || 'assets/logo.png';

        card.innerHTML = `
          <div class="world-card-left">
            <img src="${escapeHtml(iconSrc)}" class="world-card-icon" alt="World Icon" onerror="this.src='assets/logo.png'">
            <div class="world-card-info">
              <div class="world-card-title-row">
                <span class="world-card-title" title="${escapeHtml(world.worldName)}">${escapeHtml(world.worldName)}</span>
                <span class="badge badge-secondary" style="font-size: 10.5px;">📁 ${escapeHtml(world.folderName)}</span>
                ${world.backupsCount > 0 ? `<span class="badge badge-success" style="font-size: 10px;">💾 ${world.backupsCount} backup${world.backupsCount === 1 ? '' : 's'}</span>` : ''}
              </div>
              <div class="world-card-meta">
                <span>⏱ Última partida: <strong>${escapeHtml(world.lastPlayedFormatted)}</strong></span>
                <span>·</span>
                <span>📦 Tamaño: <strong>${escapeHtml(world.formattedSize)}</strong></span>
              </div>
            </div>
          </div>
          <div class="world-card-actions">
            <button class="btn btn-small btn-primary btn-quickplay-world" data-folder="${escapeHtml(world.folderName)}" data-name="${escapeHtml(world.worldName)}" title="Cargar y entrar directamente a este mundo sin pasar por el menú">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>▶ Entrar Directo</span>
            </button>
            <button class="btn btn-small btn-secondary btn-backup-world" data-folder="${escapeHtml(world.folderName)}" data-name="${escapeHtml(world.worldName)}" title="Crear backup .zip inmediato de este mundo">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              <span>💾 Backup</span>
            </button>
            <button class="btn btn-small btn-secondary btn-restore-world-backups" data-folder="${escapeHtml(world.folderName)}" data-name="${escapeHtml(world.worldName)}" title="Ver y restaurar backups de este mundo">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              <span>♻ Backups (${world.backupsCount})</span>
            </button>
            <button class="btn btn-small btn-secondary btn-icon-square btn-open-world-folder" data-folder="${escapeHtml(world.folderName)}" title="Abrir carpeta del mundo en Windows">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </button>
          </div>
        `;

        container.appendChild(card);
      });

      // Listeners de mundos
      container.querySelectorAll('.btn-quickplay-world').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const folder = e.currentTarget.getAttribute('data-folder');
          const name = e.currentTarget.getAttribute('data-name');
          if (!folder) return;

          appendLog(`[QuickPlay] Iniciando entrada directa al mundo "${name}" (${folder})...`, 'info');
          try {
            await api.launcher.launch({
              profileId: currentActiveProfile?.id,
              quickPlaySingleplayer: folder
            });
          } catch (err) {
            appendLog(`[QuickPlay Error] ${err.message}`, 'error');
            alert(`Error al iniciar con QuickPlay: ${err.message}`);
          }
        });
      });

      container.querySelectorAll('.btn-backup-world').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const folder = e.currentTarget.getAttribute('data-folder');
          const name = e.currentTarget.getAttribute('data-name');
          if (!folder) return;

          btn.disabled = true;
          btn.innerHTML = '<span>Comprimiendo...</span>';
          appendLog(`[Backups] Creando backup para "${name}"...`, 'info');

          try {
            const res = await api.worlds.backup({ instancePath: targetInstance, folderName: folder });
            if (res.success) {
              appendLog(`[Backups] ¡Backup creado con éxito! Archivo: ${res.backupFileName} (${res.formattedSize})`, 'success');
              await loadInstalledWorlds();
            } else {
              throw new Error(res.error || 'Error al crear backup.');
            }
          } catch (err) {
            appendLog(`[Backups Error] ${err.message}`, 'error');
            alert(`Error al crear backup: ${err.message}`);
          } finally {
            btn.disabled = false;
          }
        });
      });

      container.querySelectorAll('.btn-restore-world-backups').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const folder = e.currentTarget.getAttribute('data-folder');
          const name = e.currentTarget.getAttribute('data-name');
          openWorldBackupsModal(folder, name);
        });
      });

      container.querySelectorAll('.btn-open-world-folder').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const folder = e.currentTarget.getAttribute('data-folder');
          await api.worlds.openFolder({ instancePath: targetInstance, folderName: folder });
        });
      });

    } catch (err) {
      container.innerHTML = `<div class="empty-state">Error al cargar mundos: ${escapeHtml(err.message)}</div>`;
      appendLog(`[Worlds Error] ${err.message}`, 'error');
    }
  }

  // --- BOTONES DE TOOLBAR DE SHADERS, RESOURCE PACKS Y MUNDOS ---
  const btnAddShadersCatalog = document.getElementById('btn-add-shaders-catalog');
  const btnOpenShadersFolder = document.getElementById('btn-open-shaders-folder');
  const btnRefreshShaders = document.getElementById('btn-refresh-shaders');

  if (btnAddShadersCatalog) {
    btnAddShadersCatalog.addEventListener('click', () => {
      switchMainView('catalog');
      catPills.forEach((p) => p.classList.remove('active'));
      const shaderPill = document.querySelector('.cat-pill[data-cat="shaders"]');
      if (shaderPill) shaderPill.classList.add('active');
      currentContentType = 'shaders';
      if (selectModSource && selectModSource.value === 'github') selectModSource.value = 'both';
      currentContentPage = 1;
      performModSearch();
    });
  }

  if (btnOpenShadersFolder) {
    btnOpenShadersFolder.addEventListener('click', async () => {
      const targetInstance = currentActiveProfile?.instancePath || null;
      await api.instancePacks.openFolder({ instancePath: targetInstance, type: 'shaders' });
    });
  }

  if (btnRefreshShaders) {
    btnRefreshShaders.addEventListener('click', () => loadInstalledShaders());
  }

  const btnAddResourcepacksCatalog = document.getElementById('btn-add-resourcepacks-catalog');
  const btnOpenResourcepacksFolder = document.getElementById('btn-open-resourcepacks-folder');
  const btnRefreshResourcepacks = document.getElementById('btn-refresh-resourcepacks');

  if (btnAddResourcepacksCatalog) {
    btnAddResourcepacksCatalog.addEventListener('click', () => {
      switchMainView('catalog');
      catPills.forEach((p) => p.classList.remove('active'));
      const rpPill = document.querySelector('.cat-pill[data-cat="resourcepacks"]');
      if (rpPill) rpPill.classList.add('active');
      currentContentType = 'resourcepacks';
      if (selectModSource && selectModSource.value === 'github') selectModSource.value = 'both';
      currentContentPage = 1;
      performModSearch();
    });
  }

  if (btnOpenResourcepacksFolder) {
    btnOpenResourcepacksFolder.addEventListener('click', async () => {
      const targetInstance = currentActiveProfile?.instancePath || null;
      await api.instancePacks.openFolder({ instancePath: targetInstance, type: 'resourcepacks' });
    });
  }

  if (btnRefreshResourcepacks) {
    btnRefreshResourcepacks.addEventListener('click', () => loadInstalledResourcePacks());
  }

  const btnBackupAllWorldsTop = document.getElementById('btn-backup-all-worlds-top');
  const btnOpenWorldsFolder = document.getElementById('btn-open-worlds-folder');
  const btnRefreshWorlds = document.getElementById('btn-refresh-worlds');

  if (btnBackupAllWorldsTop) {
    btnBackupAllWorldsTop.addEventListener('click', async () => {
      const targetInstance = currentActiveProfile?.instancePath || null;
      btnBackupAllWorldsTop.disabled = true;
      btnBackupAllWorldsTop.innerHTML = '<span>Comprimiendo mundos...</span>';
      try {
        const res = await api.worlds.backupAll(targetInstance);
        if (res.success) {
          appendLog(`[Backups] ¡${res.backedUpCount} mundo(s) respaldados correctamente en backups/!`, 'success');
          alert(`¡${res.backedUpCount} mundo(s) respaldados exitosamente en la carpeta backups/!`);
          await loadInstalledWorlds();
        }
      } catch (err) {
        alert(`Error al realizar backup: ${err.message}`);
      } finally {
        btnBackupAllWorldsTop.disabled = false;
        btnBackupAllWorldsTop.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          <span>💾 Backup de Todos los Mundos</span>
        `;
      }
    });
  }

  if (btnOpenWorldsFolder) {
    btnOpenWorldsFolder.addEventListener('click', async () => {
      const targetInstance = currentActiveProfile?.instancePath || null;
      await api.worlds.openFolder({ instancePath: targetInstance });
    });
  }

  if (btnRefreshWorlds) {
    btnRefreshWorlds.addEventListener('click', () => loadInstalledWorlds());
  }

  // --- MODAL DE BACKUPS DE UN MUNDO ---
  const modalWorldBackups = document.getElementById('modal-world-backups');
  const btnCloseWorldBackupsModal = document.getElementById('btn-close-world-backups-modal');
  const btnDismissWorldBackupsModal = document.getElementById('btn-dismiss-world-backups-modal');
  const modalBackupWorldName = document.getElementById('modal-backup-world-name');
  const modalBackupWorldMeta = document.getElementById('modal-backup-world-meta');
  const btnCreateSingleBackup = document.getElementById('btn-create-single-backup');
  const worldBackupsList = document.getElementById('world-backups-list');

  async function openWorldBackupsModal(folderName, worldName) {
    if (!modalWorldBackups) return;
    currentManagingWorldFolderName = folderName;
    currentManagingWorldName = worldName || folderName;

    if (modalBackupWorldName) modalBackupWorldName.textContent = currentManagingWorldName;
    if (modalBackupWorldMeta) modalBackupWorldMeta.textContent = `Carpeta interna: ${folderName}`;

    modalWorldBackups.style.display = 'flex';
    await loadModalBackupsList();
  }

  function closeWorldBackupsModal() {
    if (modalWorldBackups) modalWorldBackups.style.display = 'none';
    currentManagingWorldFolderName = null;
    currentManagingWorldName = null;
  }

  if (btnCloseWorldBackupsModal) btnCloseWorldBackupsModal.addEventListener('click', closeWorldBackupsModal);
  if (btnDismissWorldBackupsModal) btnDismissWorldBackupsModal.addEventListener('click', closeWorldBackupsModal);

  async function loadModalBackupsList() {
    if (!worldBackupsList || !currentManagingWorldFolderName) return;
    const targetInstance = currentActiveProfile?.instancePath || null;
    worldBackupsList.innerHTML = '<div class="empty-state">Consultando backups disponibles...</div>';

    try {
      const backups = await api.worlds.listBackups({ instancePath: targetInstance, folderName: currentManagingWorldFolderName });
      const list = Array.isArray(backups) ? backups : [];

      if (list.length === 0) {
        worldBackupsList.innerHTML = `
          <div class="empty-state" style="padding: 24px;">
            <p style="font-size: 13.5px; margin-bottom: 4px;">No hay backups guardados para este mundo.</p>
            <small style="color: var(--text-dim);">Haz clic en "Crear Backup Ahora" arriba para generar una copia de seguridad .zip.</small>
          </div>
        `;
        return;
      }

      worldBackupsList.innerHTML = '';
      list.forEach((b) => {
        const card = document.createElement('div');
        card.className = 'backup-item-card';

        card.innerHTML = `
          <div style="min-width: 0; flex: 1;">
            <div style="font-weight: 600; color: var(--text-primary); font-size: 13px; font-family: var(--font-mono);">${escapeHtml(b.fileName)}</div>
            <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">
              <span>📅 ${escapeHtml(b.createdAtFormatted)}</span> · <span>📦 ${escapeHtml(b.formattedSize)}</span>
            </div>
          </div>
          <div style="display: flex; gap: 6px; flex-shrink: 0;">
            <button class="btn btn-small btn-primary btn-restore-single-backup" data-filename="${escapeHtml(b.fileName)}" title="Restaurar este backup sobre la partida actual">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              <span>Restaurar</span>
            </button>
            <button class="btn btn-small btn-danger btn-icon-square btn-delete-single-backup" data-filename="${escapeHtml(b.fileName)}" title="Eliminar este archivo de backup">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        `;

        worldBackupsList.appendChild(card);
      });

      worldBackupsList.querySelectorAll('.btn-restore-single-backup').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const fn = e.currentTarget.getAttribute('data-filename');
          if (confirm(`¿Estás seguro de restaurar el backup "${fn}"?\nSe sobreescribirá la partida actual del mundo "${currentManagingWorldName}".`)) {
            try {
              const res = await api.worlds.restoreBackup({
                instancePath: targetInstance,
                backupFileName: fn,
                targetFolderName: currentManagingWorldFolderName
              });
              if (res.success) {
                appendLog(`[Backups] ¡Mundo "${currentManagingWorldName}" restaurado exitosamente desde "${fn}"!`, 'success');
                alert(`¡Mundo restaurado con éxito desde el backup!`);
                await loadInstalledWorlds();
                await loadModalBackupsList();
              }
            } catch (err) {
              alert(`Error al restaurar backup: ${err.message}`);
            }
          }
        });
      });

      worldBackupsList.querySelectorAll('.btn-delete-single-backup').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const fn = e.currentTarget.getAttribute('data-filename');
          if (confirm(`¿Eliminar permanentemente el archivo de backup "${fn}"?`)) {
            await api.worlds.deleteBackup({ instancePath: targetInstance, backupFileName: fn });
            appendLog(`[Backups] Archivo de backup "${fn}" eliminado.`, 'info');
            await loadModalBackupsList();
            await loadInstalledWorlds();
          }
        });
      });

    } catch (err) {
      worldBackupsList.innerHTML = `<div class="empty-state">Error al cargar backups: ${escapeHtml(err.message)}</div>`;
    }
  }

  if (btnCreateSingleBackup) {
    btnCreateSingleBackup.addEventListener('click', async () => {
      if (!currentManagingWorldFolderName) return;
      const targetInstance = currentActiveProfile?.instancePath || null;
      btnCreateSingleBackup.disabled = true;
      btnCreateSingleBackup.textContent = 'Creando...';
      try {
        const res = await api.worlds.backup({ instancePath: targetInstance, folderName: currentManagingWorldFolderName });
        if (res.success) {
          appendLog(`[Backups] Backup creado: ${res.backupFileName} (${res.formattedSize})`, 'success');
          await loadModalBackupsList();
          await loadInstalledWorlds();
        }
      } catch (err) {
        alert(`Error al crear backup: ${err.message}`);
      } finally {
        btnCreateSingleBackup.disabled = false;
        btnCreateSingleBackup.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>Crear Backup Ahora</span>
        `;
      }
    });
  }

  if (btnViewModeList) {
    btnViewModeList.addEventListener('click', () => {
      currentModsViewMode = 'list';
      btnViewModeList.classList.add('active');
      if (btnViewModeGrid) btnViewModeGrid.classList.remove('active');
      if (modsInstalledList) {
        modsInstalledList.classList.add('view-list');
        modsInstalledList.classList.remove('view-grid');
      }
      renderFilteredInstalledMods();
    });
  }

  if (btnViewModeGrid) {
    btnViewModeGrid.addEventListener('click', () => {
      currentModsViewMode = 'grid';
      btnViewModeGrid.classList.add('active');
      if (btnViewModeList) btnViewModeList.classList.remove('active');
      if (modsInstalledList) {
        modsInstalledList.classList.add('view-grid');
        modsInstalledList.classList.remove('view-list');
      }
      renderFilteredInstalledMods();
    });
  }

  if (inputSearchInstalledMods) {
    inputSearchInstalledMods.addEventListener('input', () => {
      renderFilteredInstalledMods();
    });
  }

  if (selectInstalledModsSort) {
    selectInstalledModsSort.addEventListener('change', () => {
      renderFilteredInstalledMods();
    });
  }

  const btnPurgeDuplicates = document.getElementById('btn-purge-duplicates');
  if (btnPurgeDuplicates) {
    btnPurgeDuplicates.addEventListener('click', async () => {
      btnPurgeDuplicates.disabled = true;
      const originalHtml = btnPurgeDuplicates.innerHTML;
      btnPurgeDuplicates.innerHTML = '<span>Purgando...</span>';
      appendLog('[Mods] Analizando mods en busca de versiones duplicadas antiguas...', 'info');

      try {
        const targetInstance = currentActiveProfile?.instancePath || null;
        const res = await api.mods.purgeDuplicates(targetInstance);
        if (res && res.purgedCount > 0) {
          appendLog(`[Mods] ¡Se purgaron ${res.purgedCount} versiones duplicadas antiguas con éxito! Archivos eliminados: ${res.removedFiles.join(', ')}`, 'success');
          alert(`¡Purga completada! Se eliminaron ${res.purgedCount} mod(s) duplicados antiguos:\n- ${res.removedFiles.join('\n- ')}`);
        } else {
          appendLog('[Mods] No se encontraron mods duplicados. La carpeta de mods está limpia y optimizada.', 'info');
          alert('No se encontraron mods duplicados en esta instancia.');
        }
        await loadInstalledMods();
      } catch (err) {
        appendLog(`[Mods Error] Error al purgar mods duplicados: ${err.message}`, 'error');
        alert(`Error al purgar duplicados: ${err.message}`);
      } finally {
        btnPurgeDuplicates.disabled = false;
        btnPurgeDuplicates.innerHTML = originalHtml;
      }
    });
  }

  btnRefreshInstalledMods.addEventListener('click', async () => {
    btnRefreshInstalledMods.disabled = true;
    try {
      const targetInstance = currentActiveProfile?.instancePath || null;
      const purgeRes = await api.mods.purgeDuplicates(targetInstance);
      if (purgeRes && purgeRes.purgedCount > 0) {
        appendLog(`[Mods] Sincronización: Se purgaron ${purgeRes.purgedCount} versiones duplicadas antiguas (${purgeRes.removedFiles.join(', ')}).`, 'info');
      }
    } catch (_) {}
    await loadInstalledMods();
    btnRefreshInstalledMods.disabled = false;
  });

  if (btnCheckModUpdates) {
    btnCheckModUpdates.addEventListener('click', async () => {
      btnCheckModUpdates.disabled = true;
      const originalHtml = btnCheckModUpdates.innerHTML;
      btnCheckModUpdates.innerHTML = '<span>Buscando...</span>';
      const channel = 'release';
      appendLog(`[Mods] Comprobando versiones compatibles más recientes en CurseForge y Modrinth (Solo Estables)...`, 'info');

      try {
        const targetInstance = currentActiveProfile?.instancePath || null;
        const res = await api.mods.checkUpdates({
          instancePath: targetInstance,
          mcVersion: currentActiveProfile?.mcVersion,
          loader: currentActiveProfile?.loader,
          channel: 'release'
        });

        activeAvailableUpdates = res.updates || [];
        const countSpan = document.getElementById('updates-available-count');
        if (countSpan) countSpan.textContent = activeAvailableUpdates.length;

        if (activeAvailableUpdates.length > 0) {
          appendLog(`[Mods] ¡Se encontraron ${activeAvailableUpdates.length} actualizaciones disponibles!`, 'success');
          if (btnUpdateAllMods) {
            btnUpdateAllMods.classList.add('has-updates');
            btnUpdateAllMods.innerHTML = `
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span>Actualizar Todos (<span id="updates-available-count">${activeAvailableUpdates.length}</span>)</span>
            `;
          }
        } else {
          appendLog('[Mods] Todos los mods instalados están al día con la última versión compatible.', 'info');
          if (btnUpdateAllMods) {
            btnUpdateAllMods.classList.remove('has-updates');
            btnUpdateAllMods.innerHTML = `
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span>Actualizar Todos (<span id="updates-available-count">0</span>)</span>
            `;
          }
        }

        await loadInstalledMods();
      } catch (err) {
        appendLog(`[Mods Error] Error al buscar actualizaciones: ${err.message}`, 'error');
      } finally {
        btnCheckModUpdates.disabled = false;
        btnCheckModUpdates.innerHTML = originalHtml;
      }
    });
  }

  if (btnUpdateAllMods) {
    btnUpdateAllMods.addEventListener('click', async () => {
      const targetInstance = currentActiveProfile?.instancePath || null;
      const mcVer = currentActiveProfile?.mcVersion || '1.21.1';
      const loader = currentActiveProfile?.loader || 'neoforge';
      const channel = 'release';

      // 1. Si el usuario hace clic sin haber escaneado previamente, ejecutar escaneo primero
      if (!activeAvailableUpdates || activeAvailableUpdates.length === 0) {
        btnUpdateAllMods.disabled = true;
        const originalBtnHtml = btnUpdateAllMods.innerHTML;
        btnUpdateAllMods.innerHTML = '<span>Buscando...</span>';
        appendLog(`[Mods] Comprobando versiones compatibles más recientes en CurseForge y Modrinth (Solo Estables)...`, 'info');

        try {
          const res = await api.mods.checkUpdates({
            instancePath: targetInstance,
            mcVersion: mcVer,
            loader: loader,
            channel: 'release'
          });

          activeAvailableUpdates = res.updates || [];
          const countSpan = document.getElementById('updates-available-count');
          if (countSpan) countSpan.textContent = activeAvailableUpdates.length;

          if (activeAvailableUpdates.length === 0) {
            appendLog('[Mods] Todos los mods instalados están al día con la última versión compatible.', 'info');
            btnUpdateAllMods.classList.remove('has-updates');
            btnUpdateAllMods.innerHTML = originalBtnHtml;
            btnUpdateAllMods.disabled = false;
            await loadInstalledMods();
            return;
          }

          appendLog(`[Mods] ¡Se encontraron ${activeAvailableUpdates.length} actualizaciones disponibles! Iniciando actualización...`, 'success');
          btnUpdateAllMods.classList.add('has-updates');
          btnUpdateAllMods.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <span>Actualizar Todos (<span id="updates-available-count">${activeAvailableUpdates.length}</span>)</span>
          `;
          await loadInstalledMods();
        } catch (err) {
          appendLog(`[Mods Error] Error al comprobar actualizaciones: ${err.message}`, 'error');
          btnUpdateAllMods.innerHTML = originalBtnHtml;
          btnUpdateAllMods.disabled = false;
          return;
        }
      }

      // 2. Proceder a actualizar todos los mods encontrados
      btnUpdateAllMods.disabled = true;
      btnUpdateAllMods.innerHTML = '<span>Actualizando todos...</span>';
      appendLog(`[Mods] Iniciando actualización en lote de ${activeAvailableUpdates.length} mods...`, 'info');

      // Checkbox preventivo: Crear backup rápido de mundos antes de actualizar mods
      const checkBackup = document.getElementById('check-backup-before-update');
      if (checkBackup && checkBackup.checked && api.worlds) {
        appendLog(`[Backups] Creando copia de seguridad preventiva de los mundos antes de actualizar...`, 'info');
        try {
          const bRes = await api.worlds.backupAll(targetInstance);
          if (bRes.success && bRes.backedUpCount > 0) {
            appendLog(`[Backups] ¡${bRes.backedUpCount} mundo(s) respaldados preventivamente en backups/!`, 'success');
          }
        } catch (bErr) {
          appendLog(`[Backups Aviso] No se pudo completar el backup preventivo: ${bErr.message}`, 'warn');
        }
      }

      // Barra de progreso visual
      const progressContainer = document.getElementById('mods-update-progress-container');
      const progressTitle = document.getElementById('update-progress-title');
      const progressPercent = document.getElementById('update-progress-percent');
      const progressFill = document.getElementById('update-progress-fill');

      if (progressContainer) {
        progressContainer.classList.remove('hidden');
        if (progressFill) progressFill.style.width = '0%';
        if (progressPercent) progressPercent.textContent = '0%';
        if (progressTitle) progressTitle.textContent = `Actualizando 0/${activeAvailableUpdates.length}...`;
      }

      const removeListener = (api.mods && typeof api.mods.onUpdateProgress === 'function')
        ? api.mods.onUpdateProgress((prog) => {
            if (progressFill) progressFill.style.width = `${prog.percent || 0}%`;
            if (progressPercent) progressPercent.textContent = `${prog.percent || 0}%`;
            if (progressTitle) progressTitle.textContent = `Actualizando (${prog.current}/${prog.total}): ${prog.name}...`;
            appendLog(`[Mods Update] (${prog.current}/${prog.total}) ${prog.name} (${prog.percent}%)`, 'info');
          })
        : null;

      try {
        const res = await api.mods.updateAll({
          updates: activeAvailableUpdates,
          instancePath: targetInstance,
          mcVersion: mcVer,
          loader: loader,
          channel
        });

        appendLog(`[Mods] ¡Actualización en lote completada! ${res.updatedCount} mods actualizados con éxito.`, 'success');
        activeAvailableUpdates = [];
        const countSpan = document.getElementById('updates-available-count');
        if (countSpan) countSpan.textContent = '0';
        btnUpdateAllMods.classList.remove('has-updates');
        await loadInstalledMods();
      } catch (err) {
        appendLog(`[Mods Error] Error al actualizar todos los mods: ${err.message}`, 'error');
        alert(`Error al actualizar mods: ${err.message}`);
      } finally {
        if (typeof removeListener === 'function') {
          removeListener();
        }

        setTimeout(() => {
          if (progressContainer) progressContainer.classList.add('hidden');
        }, 1500);

        btnUpdateAllMods.disabled = false;
        btnUpdateAllMods.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span>Actualizar Todos (<span id="updates-available-count">0</span>)</span>
        `;
      }
    });
  }

  btnInstallPerformancePack.addEventListener('click', async () => {
    btnInstallPerformancePack.disabled = true;
    appendLog(`[Optimización] Instalando optimizadores de rendimiento en "${currentActiveProfile.name}"...`, 'info');

    try {
      const res = await api.mods.installPerformancePack({
        mcVersion: currentActiveProfile.mcVersion,
        loader: currentActiveProfile.loader,
        instancePath: currentActiveProfile.instancePath || null
      });

      if (res.success) {
        appendLog(`[Optimización] ¡Completado! ${res.installedCount} optimizadores instalados.`, 'success');
        await loadInstalledMods();
      } else {
        throw new Error('No se pudo completar la instalación del pack base.');
      }
    } catch (err) {
      appendLog(`[Optimización Error] ${err.message}`, 'error');
    } finally {
      btnInstallPerformancePack.disabled = false;
    }
  });

  if (btnInstallModpack) {
    btnInstallModpack.addEventListener('click', async () => {
      try {
        const selectRes = await api.mods.selectModpackFile();
        if (!selectRes.canceled && selectRes.path) {
          appendLog(`[Modpacks] Instalando modpack "${selectRes.path}" en instancia activa...`, 'info');
          btnInstallModpack.disabled = true;

          const installRes = await api.mods.installModpackFile({
            packPath: selectRes.path,
            instancePath: currentActiveProfile?.instancePath || null,
            createProfile: false
          });
          if (installRes.success) {
            appendLog(`[Modpacks] ¡Modpack "${installRes.name}" instalado con éxito! (${installRes.filesCount || 0} archivos)`, 'success');
            await loadInstalledMods();
          } else {
            throw new Error(installRes.error || 'Error al procesar el archivo del modpack.');
          }
        }
      } catch (err) {
        appendLog(`[Modpack Error] ${err.message}`, 'error');
        alert(`Error al instalar modpack: ${err.message}`);
      } finally {
        btnInstallModpack.disabled = false;
      }
    });
  }

  // =======================================================
  // EXPLORADOR TOTAL DE CATÁLOGO (MODS, MODPACKS, TEXTURAS, SHADERS)
  // =======================================================
  catPills.forEach((btn) => {
    btn.addEventListener('click', () => {
      catPills.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentContentType = btn.getAttribute('data-cat') || 'mods';
      if (currentContentType === 'github') {
        if (selectModSource) selectModSource.value = 'github';
      } else if (selectModSource && selectModSource.value === 'github') {
        selectModSource.value = 'both';
      }
      currentContentPage = 1;
      performModSearch();
    });
  });

  btnPrevPage.addEventListener('click', () => {
    if (currentContentPage > 1) {
      currentContentPage--;
      performModSearch();
    }
  });

  btnNextPage.addEventListener('click', () => {
    if (currentContentPage < totalContentPages) {
      currentContentPage++;
      performModSearch();
    }
  });

  async function performModSearch() {
    const query = inputModSearch.value.trim();
    const source = selectModSource.value;
    const sortBy = selectModSort ? selectModSort.value : 'popular';
    const category = selectModCategory ? selectModCategory.value : 'all';
    const mcVersion = currentActiveProfile?.mcVersion || '1.21.1';
    const loader = (currentActiveProfile?.loader || 'neoforge').toLowerCase();

    btnSearchMods.disabled = true;

    const isGithub = (source === 'github' || currentContentType === 'github');
    if (btnRefreshGithubMods) btnRefreshGithubMods.style.display = isGithub ? 'inline-flex' : 'none';
    if (btnConfigGithubRepo) btnConfigGithubRepo.style.display = isGithub ? 'inline-flex' : 'none';

    if (isGithub) {
      if (query) {
        resultsHeadline.textContent = `Resultados para "${query}" (Mods Custom GitHub)`;
        resultsSubhint.textContent = `Filtrando en repositorio de GitHub`;
      } else {
        resultsHeadline.textContent = `🔥 Mods Custom (GitHub Repository)`;
        resultsSubhint.textContent = `Directos desde el repositorio comunitario de GitHub`;
      }
      modsSearchResults.innerHTML = '<div class="empty-state">Consultando mods custom en GitHub...</div>';

      try {
        const ghMods = await api.githubMods.fetch();
        const targetInstance = currentActiveProfile?.instancePath || null;
        let installedMods = [];
        try {
          if (targetInstance) {
            installedMods = await api.mods.listInstalled(targetInstance);
          }
        } catch (_) {}
        const installedFileMap = new Map((installedMods || []).map(m => [m.fileName?.toLowerCase(), m]));

        let filtered = Array.isArray(ghMods) ? ghMods : [];
        if (query) {
          const q = query.toLowerCase();
          filtered = filtered.filter(m =>
            (m.title || m.name || '').toLowerCase().includes(q) ||
            (m.fileName || '').toLowerCase().includes(q) ||
            (m.summary || m.description || '').toLowerCase().includes(q)
          );
        }

        totalContentCount = filtered.length;
        totalContentPages = 1;
        spanPageIndicator.textContent = `Página 1 de 1 (${totalContentCount} mods)`;

        if (filtered.length === 0) {
          modsSearchResults.innerHTML = `
            <div class="empty-state" style="padding: 30px 20px;">
              <p style="font-size: 14px; margin-bottom: 8px;">No se encontraron mods custom en el repositorio de GitHub.</p>
              <small style="color: var(--text-dim);">Sube archivos .jar a la carpeta <code>mods/</code> o crea un Release en tu repositorio de GitHub.</small>
              <div style="margin-top: 14px;">
                <button class="btn btn-secondary btn-small" id="btn-empty-config-gh">Configurar Repositorio</button>
              </div>
            </div>`;
          const emptyCfg = document.getElementById('btn-empty-config-gh');
          if (emptyCfg) emptyCfg.addEventListener('click', openGhRepoModal);
          return;
        }

        modsSearchResults.innerHTML = '';
        filtered.forEach((item) => {
          const card = document.createElement('div');
          card.className = 'mod-card';

          const isInstalled = installedFileMap.has(item.fileName?.toLowerCase());
          const installedMod = isInstalled ? installedFileMap.get(item.fileName?.toLowerCase()) : null;
          const isOutdated = isInstalled && installedMod && (installedMod.version && item.version && installedMod.version !== item.version);

          let actionBtnHtml = '';
          if (!isInstalled) {
            actionBtnHtml = `
              <button class="btn btn-small btn-secondary btn-download-gh-mod" data-filename="${escapeHtml(item.fileName)}" data-url="${escapeHtml(item.downloadUrl || '')}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                <span>Instalar</span>
              </button>
            `;
          } else if (isOutdated) {
            actionBtnHtml = `
              <button class="btn btn-small btn-primary btn-download-gh-mod" data-filename="${escapeHtml(item.fileName)}" data-url="${escapeHtml(item.downloadUrl || '')}" style="background: var(--accent-emerald);">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="18"/></svg>
                <span>Actualizar Custom</span>
              </button>
            `;
          } else {
            actionBtnHtml = `
              <button class="btn btn-small btn-secondary btn-download-gh-mod" disabled style="opacity: 0.7; cursor: default;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Instalado</span>
              </button>
            `;
          }

          const formattedSize = item.size ? (item.size > 1048576 ? `${(item.size / (1024 * 1024)).toFixed(1)} MB` : `${(item.size / 1024).toFixed(0)} KB`) : '';

          card.innerHTML = `
            <div class="mod-card-top">
              <img src="assets/logo.png" class="mod-card-icon" alt="Icon" onerror="this.src='assets/logo.png'">
              <div class="mod-card-body">
                <div class="mod-card-title-row">
                  <span class="mod-card-title" title="${escapeHtml(item.title || item.name)}">${escapeHtml(item.title || item.name)}</span>
                  <span class="badge badge-github">GITHUB CUSTOM</span>
                </div>
                <div class="mod-card-author">por ${escapeHtml(item.author || 'Landa6543')} · v${escapeHtml(item.version || '1.0.0')}</div>
                <div class="mod-card-desc" title="${escapeHtml(item.summary || item.description)}">${escapeHtml(item.summary || item.description || 'Mod custom de la comunidad.')}</div>
              </div>
            </div>
            <div class="mod-card-footer">
              <span class="hint" style="font-family: var(--font-mono); font-size: 11px;">${escapeHtml(item.fileName)} ${formattedSize ? '· ' + formattedSize : ''}</span>
              ${actionBtnHtml}
            </div>
          `;

          card.addEventListener('click', (e) => {
            if (e.target.closest('.btn-download-gh-mod')) return;
            openModDetailModal({
              ...item,
              title: item.title || item.name,
              summary: item.summary || item.description,
              author: item.author || 'Landa6543',
              source: 'github',
              iconUrl: 'assets/logo.png',
              downloads: item.downloads || 1,
              websiteUrl: item.htmlUrl || 'https://github.com/Landa6543/ShubaCore-Mods'
            });
          });

          modsSearchResults.appendChild(card);
        });

        document.querySelectorAll('.btn-download-gh-mod').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const btnEl = e.currentTarget;
            const fName = btnEl.getAttribute('data-filename');
            const dUrl = btnEl.getAttribute('data-url');
            if (!fName || !dUrl) return;

            btnEl.disabled = true;
            btnEl.innerHTML = `<span>Descargando...</span>`;
            appendLog(`[GitHub Mods] Descargando mod custom "${fName}"...`, 'info');

            try {
              const res = await api.githubMods.install({
                downloadUrl: dUrl,
                fileName: fName,
                instancePath: currentActiveProfile?.instancePath || null
              });

              if (res.success) {
                appendLog(`[GitHub Mods] ¡Mod "${fName}" instalado correctamente!`, 'success');
                btnEl.className = 'btn btn-small btn-secondary btn-download-gh-mod';
                btnEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg><span>Instalado</span>`;
                btnEl.disabled = true;
                await loadInstalledMods();
              } else {
                throw new Error(res.error || 'Error al descargar mod custom.');
              }
            } catch (dlErr) {
              btnEl.disabled = false;
              btnEl.innerHTML = `<span>Reintentar</span>`;
              appendLog(`[GitHub Mods Error] ${dlErr.message}`, 'error');
              alert(`Error al descargar mod custom: ${dlErr.message}`);
            }
          });
        });

      } catch (err) {
        modsSearchResults.innerHTML = `<div class="empty-state">Error al consultar GitHub: ${escapeHtml(err.message)}</div>`;
        appendLog(`[GitHub Mods Error] ${err.message}`, 'error');
      } finally {
        btnSearchMods.disabled = false;
        if (btnPrevPage) btnPrevPage.disabled = true;
        if (btnNextPage) btnNextPage.disabled = true;
      }
      return;
    }

    const catLabels = {
      mods: 'Mods',
      modpacks: 'Modpacks',
      resourcepacks: 'Texturas',
      shaders: 'Shaders'
    };
    const catLabel = catLabels[currentContentType] || 'Proyectos';

    if (query) {
      resultsHeadline.textContent = `Resultados para "${query}" (${catLabel})`;
      resultsSubhint.textContent = `Página ${currentContentPage} de ~${totalContentPages}`;
    } else {
      resultsHeadline.textContent = `${catLabel} Más Populares`;
      resultsSubhint.textContent = `Compatibles con Minecraft ${mcVersion}`;
    }

    modsSearchResults.innerHTML = '<div class="empty-state">Consultando catálogo en tiempo real...</div>';

    try {
      const data = await api.content.search({
        query,
        mcVersion,
        loader,
        source,
        contentType: currentContentType,
        page: currentContentPage,
        pageSize: contentPageSize,
        sortBy,
        category
      });

      const results = Array.isArray(data) ? data : (data.results || []);
      totalContentCount = data.totalCount !== undefined ? data.totalCount : results.length;
      totalContentPages = data.totalPages || Math.max(1, Math.ceil(totalContentCount / contentPageSize));
      spanPageIndicator.textContent = `Página ${currentContentPage} de ${totalContentPages}`;

      if (!results || results.length === 0) {
        modsSearchResults.innerHTML = `<div class="empty-state">No se encontraron ${catLabel.toLowerCase()} compatibles con Minecraft ${mcVersion}.</div>`;
        return;
      }

      modsSearchResults.innerHTML = '';
      results.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'mod-card';

        const sourceClass = item.source === 'curseforge' ? 'badge-curseforge' : 'badge-modrinth';
        const iconSrc = item.iconUrl || 'https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/cube.svg';
        const formattedDownloads = formatDownloads(item.downloads);

        let actionButtonText = 'Instalar';
        if (currentContentType === 'resourcepacks') actionButtonText = 'Descargar';
        else if (currentContentType === 'shaders') actionButtonText = 'Descargar';
        else if (currentContentType === 'modpacks') actionButtonText = 'Instalar Pack';

        card.innerHTML = `
          <div class="mod-card-top">
            <img src="${escapeHtml(iconSrc)}" class="mod-card-icon" alt="Icon" onerror="this.src='https://mc-heads.net/avatar/Steve/48'">
            <div class="mod-card-body">
              <div class="mod-card-title-row">
                <span class="mod-card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</span>
                <span class="badge ${sourceClass}">${escapeHtml((item.source || 'modrinth').toUpperCase())}</span>
              </div>
              <div class="mod-card-author">de ${escapeHtml(item.author)}</div>
              <div class="mod-card-desc" title="${escapeHtml(item.summary)}">${escapeHtml(item.summary || 'Sin descripción disponible.')}</div>
            </div>
          </div>
          <div class="mod-card-footer">
            <span class="hint">${escapeHtml(formattedDownloads)} descargas</span>
            <button class="btn btn-small btn-secondary btn-download-content" data-id="${escapeHtml(item.id)}" data-source="${escapeHtml(item.source)}" data-title="${escapeHtml(item.title)}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              <span>${actionButtonText}</span>
            </button>
          </div>
        `;

        card.addEventListener('click', (e) => {
          if (e.target.closest('.btn-download-content')) return;
          openModDetailModal(item);
        });

        modsSearchResults.appendChild(card);
      });

      document.querySelectorAll('.btn-download-content').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const target = e.currentTarget;
          const projectId = target.getAttribute('data-id');
          const itemSource = target.getAttribute('data-source');
          const itemTitle = target.getAttribute('data-title');

          target.disabled = true;
          target.textContent = 'Descargando...';

          appendLog(`[Descarga] Obteniendo "${itemTitle}" (${catLabel})...`, 'info');

          try {
            const targetInstance = currentActiveProfile?.instancePath || null;
            const res = await api.content.download({
              projectId,
              source: itemSource,
              contentType: currentContentType,
              mcVersion,
              loader,
              instancePath: targetInstance
            });

            if (res.success) {
              if (currentContentType === 'modpacks') {
                const packName = res.profile?.name || res.item?.profile?.name || itemTitle;
                appendLog(`[Modpack] ¡Modpack "${packName}" instalado con éxito como nueva instancia!`, 'success');
                target.textContent = 'Instalado';
                try {
                  const newProfileId = res.profile?.id || res.item?.profile?.id;
                  if (newProfileId) {
                    await api.profiles.setActive(newProfileId);
                  }
                  await loadProfiles();
                  switchMainView('profiles');
                } catch (uiErr) {
                  console.warn('[Modpack UI] Advertencia al refrescar vista de instancias:', uiErr);
                  appendLog(`[Modpack UI] Advertencia al refrescar vista de instancias: ${uiErr.message}`, 'warn');
                }
              } else {
                appendLog(`[Descarga] ¡"${itemTitle}" instalado con éxito! Archivo: ${res.fileName}`, 'success');
                target.textContent = 'Instalado';
              }
            } else {
              throw new Error(res.error || 'Error desconocido al descargar.');
            }
          } catch (err) {
            target.disabled = false;
            target.textContent = 'Reintentar';
            appendLog(`[Descarga Error] ${err.message}`, 'error');
            alert(`Error al descargar ${itemTitle}: ${err.message}`);
          }
        });
      });
    } catch (err) {
      modsSearchResults.innerHTML = `<div class="empty-state">Error al buscar ${catLabel.toLowerCase()}: ${err.message}</div>`;
      appendLog(`[Catálogo Error] ${err.message}`, 'error');
    } finally {
      btnSearchMods.disabled = false;
      if (btnPrevPage) btnPrevPage.disabled = currentContentPage <= 1;
      if (btnNextPage) btnNextPage.disabled = currentContentPage >= totalContentPages;
    }
  }

  btnSearchMods.addEventListener('click', performModSearch);
  inputModSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performModSearch();
  });
  selectModSource.addEventListener('change', () => {
    currentContentPage = 1;
    if (selectModSource.value === 'github') {
      catPills.forEach((b) => b.classList.remove('active'));
      if (pillCatGithub) pillCatGithub.classList.add('active');
      currentContentType = 'github';
    } else {
      if (pillCatGithub) pillCatGithub.classList.remove('active');
      if (currentContentType === 'github') {
        currentContentType = 'mods';
        const modPill = document.querySelector('.cat-pill[data-cat="mods"]');
        if (modPill) modPill.classList.add('active');
      }
    }
    performModSearch();
  });

  if (btnRefreshGithubMods) {
    btnRefreshGithubMods.addEventListener('click', async () => {
      btnRefreshGithubMods.disabled = true;
      appendLog('[GitHub Mods] Refrescando catálogo de mods desde GitHub...', 'info');
      try {
        await api.githubMods.fetch(true);
        await performModSearch();
      } finally {
        btnRefreshGithubMods.disabled = false;
      }
    });
  }

  if (selectModSort) {
    selectModSort.addEventListener('change', () => {
      currentContentPage = 1;
      performModSearch();
    });
  }

  if (selectModCategory) {
    selectModCategory.addEventListener('change', () => {
      currentContentPage = 1;
      performModSearch();
    });
  }

  // =======================================================
  // MODAL DE DETALLE DE PROYECTO Y SELECTOR DE VERSIONES
  // =======================================================
  function closeModDetailModal() {
    if (modalModDetail) modalModDetail.classList.remove('active');
    currentProjectDetail = null;
  }

  if (btnCloseModDetail) btnCloseModDetail.addEventListener('click', closeModDetailModal);
  if (btnDismissModDetail) btnDismissModDetail.addEventListener('click', closeModDetailModal);

  if (tabDetailDesc && tabDetailVersions) {
    tabDetailDesc.addEventListener('click', () => {
      tabDetailDesc.classList.add('active');
      tabDetailVersions.classList.remove('active');
      panelDetailDesc.classList.add('active');
      panelDetailVersions.classList.remove('active');
      panelDetailVersions.style.display = 'none';
      panelDetailDesc.style.display = 'flex';
    });

    tabDetailVersions.addEventListener('click', () => {
      tabDetailVersions.classList.add('active');
      tabDetailDesc.classList.remove('active');
      panelDetailVersions.classList.add('active');
      panelDetailDesc.classList.remove('active');
      panelDetailDesc.style.display = 'none';
      panelDetailVersions.style.display = 'flex';
    });
  }

  if (btnOpenModWeb) {
    btnOpenModWeb.addEventListener('click', async () => {
      if (currentProjectDetail && currentProjectDetail.websiteUrl) {
        await api.system.openExternal(currentProjectDetail.websiteUrl);
      }
    });
  }

  async function openModDetailModal(item) {
    if (!modalModDetail) return;
    currentProjectDetail = item;

    // Reset de pestañas y estilos
    modalModDetail.classList.add('active');
    if (tabDetailDesc) tabDetailDesc.click();

    const mcVersion = currentActiveProfile?.mcVersion || '1.21.1';
    const loader = (currentActiveProfile?.loader || 'neoforge').toLowerCase();

    if (detailModIcon) detailModIcon.src = item.iconUrl || 'https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/cube.svg';
    if (detailModTitle) detailModTitle.textContent = item.title || 'Detalle del Proyecto';
    if (detailModBadge) {
      detailModBadge.textContent = (item.source || 'modrinth').toUpperCase();
      detailModBadge.className = `badge ${item.source === 'curseforge' ? 'badge-curseforge' : 'badge-modrinth'}`;
    }
    if (detailModAuthor) detailModAuthor.textContent = item.author || 'Autor desconocido';
    if (detailModDownloads) detailModDownloads.textContent = `${formatDownloads(item.downloads || 0)} descargas`;
    if (detailModSummary) detailModSummary.textContent = item.summary || '';
    if (detailModBody) detailModBody.innerHTML = '<div class="empty-state">Cargando descripción completa...</div>';
    if (detailGalleryContainer) detailGalleryContainer.style.display = 'none';
    if (detailGalleryScroll) detailGalleryScroll.innerHTML = '';
    if (detailVersionsList) detailVersionsList.innerHTML = '<div class="empty-state">Consultando versiones disponibles...</div>';
    if (detailVersionsCount) detailVersionsCount.textContent = '...';
    if (detailCompatBadge) detailCompatBadge.textContent = `Minecraft ${mcVersion} (${loader.toUpperCase()})`;

    // Si es un mod local o personalizado de GitHub sin API de versiones de terceros
    if (item.source === 'github') {
      if (detailModBadge) {
        detailModBadge.textContent = 'GITHUB CUSTOM';
        detailModBadge.className = 'badge badge-github';
      }
      if (detailModBody) {
        detailModBody.innerHTML = `
          <div class="empty-state" style="padding: 24px; text-align: left;">
            <h4 style="margin-bottom: 8px; color: var(--text-primary); font-size: 15px;">Mod Custom de GitHub</h4>
            <p style="color: var(--text-secondary); font-size: 13px; line-height: 1.5; margin-bottom: 12px;">
              ${escapeHtml(item.summary || item.description || 'Mod personalizado distribuido a través del repositorio privado de GitHub.')}
            </p>
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 8px; padding: 12px; font-size: 12px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 6px;">
              <span><strong>Archivo:</strong> ${escapeHtml(item.fileName || 'custom.jar')}</span>
              <span><strong>Versión:</strong> ${escapeHtml(item.version || '1.0.0')}</span>
              <span><strong>Autor:</strong> ${escapeHtml(item.author || 'Landa6543')}</span>
              ${item.size ? `<span><strong>Tamaño:</strong> ${item.size > 1048576 ? (item.size / 1048576).toFixed(1) + ' MB' : (item.size / 1024).toFixed(0) + ' KB'}</span>` : ''}
              ${item.downloadUrl ? `<span style="word-break: break-all;"><strong>Origen:</strong> <a href="#" style="color: var(--accent-emerald);" onclick="window.shubaCoreAPI.system.openExternal('${escapeHtml(item.downloadUrl)}'); return false;">Enlace directo GitHub</a></span>` : ''}
            </div>
          </div>
        `;
      }
      if (detailGalleryContainer) detailGalleryContainer.style.display = 'none';
      if (detailVersionsList) {
        detailVersionsList.innerHTML = '<div class="empty-state">Este mod custom se distribuye directamente como archivo .jar único desde el repositorio de GitHub.</div>';
      }
      if (detailVersionsCount) detailVersionsCount.textContent = '1';
      return;
    }

    // Si es un mod local o personalizado sin ID público en CurseForge o Modrinth
    const targetProjId = item.id || item.projectId || item.slug;
    if (!targetProjId || targetProjId === 'undefined' || item.source === 'custom') {
      if (detailModBody) {
        detailModBody.innerHTML = `
          <div class="empty-state" style="padding: 24px; text-align: left;">
            <h4 style="margin-bottom: 8px; color: var(--text-primary); font-size: 15px;">Mod Local / Personalizado</h4>
            <p style="color: var(--text-muted); font-size: 13px; line-height: 1.5;">
              Este archivo (<strong>${escapeHtml(item.fileName || item.title || 'mod.jar')}</strong>) fue instalado manualmente en la carpeta <code>mods/</code> de la instancia y no posee una ficha pública en CurseForge o Modrinth.
            </p>
            <div style="margin-top: 14px; font-size: 12px; color: var(--text-dim); display: flex; gap: 16px;">
              <span><strong>Archivo:</strong> ${escapeHtml(item.fileName || 'desconocido.jar')}</span>
              ${item.sizeFormatted ? `<span><strong>Tamaño:</strong> ${escapeHtml(item.sizeFormatted)}</span>` : ''}
              ${item.author ? `<span><strong>Autor:</strong> ${escapeHtml(item.author)}</span>` : ''}
            </div>
          </div>
        `;
      }
      if (detailGalleryContainer) detailGalleryContainer.style.display = 'none';
      if (detailVersionsList) {
        detailVersionsList.innerHTML = '<div class="empty-state">No hay versiones remotas para mods personalizados locales.</div>';
      }
      if (detailVersionsCount) detailVersionsCount.textContent = '0';
      return;
    }

    try {
      const details = await api.mods.getProjectDetails({
        projectId: targetProjId,
        source: item.source,
        mcVersion,
        loader
      });

      if (!details || details.error) {
        throw new Error(details?.error || 'No se pudieron consultar los detalles del proyecto.');
      }

      currentProjectDetail = { ...item, ...details };

      if (detailModAuthor && details.author) detailModAuthor.textContent = details.author;
      if (detailModSummary && details.summary) detailModSummary.textContent = details.summary;

      // Galería de capturas
      if (Array.isArray(details.screenshots) && details.screenshots.length > 0) {
        detailGalleryScroll.innerHTML = '';
        details.screenshots.forEach((url) => {
          const img = document.createElement('img');
          img.src = url;
          img.className = 'mod-gallery-thumb';
          img.alt = 'Screenshot';
          img.addEventListener('click', () => {
            if (lightboxImage && imageLightbox) {
              lightboxImage.src = url;
              imageLightbox.classList.add('active');
            } else {
              api.system.openExternal(url);
            }
          });
          detailGalleryScroll.appendChild(img);
        });
        detailGalleryContainer.style.display = 'flex';
      } else {
        detailGalleryContainer.style.display = 'none';
      }

      // Descripción
      const bodyHtml = details.descriptionHtml || details.summary || 'Sin descripción detallada disponible.';
      detailModBody.innerHTML = bodyHtml;

      // Consultar mods instalados para verificar coincidencia de versión
      const targetInstance = currentActiveProfile?.instancePath || null;
      const installedMods = await api.mods.listInstalled(targetInstance);
      const installedMatch = installedMods.find((m) =>
        (m.projectId && String(m.projectId) === String(targetProjId)) ||
        (m.name && m.name.toLowerCase() === (item.title || '').toLowerCase())
      );

      // Renderizar versiones y archivos con filtrado dinámico por canal
      const allFiles = details.files || [];

      function renderDetailVersions(channel = 'release') {
        const cLow = (channel || 'release').toLowerCase();
        let filteredFiles = allFiles;
        if (cLow === 'release') {
          filteredFiles = allFiles.filter((f) => (f.releaseType || '').toLowerCase() === 'release');
        } else if (cLow === 'beta') {
          filteredFiles = allFiles.filter((f) => {
            const rt = (f.releaseType || '').toLowerCase();
            return rt === 'release' || rt === 'beta';
          });
        }
        detailVersionsCount.textContent = filteredFiles.length;

        if (filteredFiles.length === 0) {
          detailVersionsList.innerHTML = `<div class="empty-state">No hay versiones en el canal "${cLow.toUpperCase()}" para Minecraft ${mcVersion} (${loader.toUpperCase()}).</div>`;
          return;
        }

        detailVersionsList.innerHTML = '';
        filteredFiles.forEach((f) => {
          const row = document.createElement('div');
          row.className = 'version-row-item';

          const isCurrent = installedMatch && (
            (f.fileId && String(f.fileId) === String(installedMatch.fileId)) ||
            (f.fileName && f.fileName === installedMatch.fileName)
          );

          const badgeTypeClass = f.releaseType === 'Release' ? 'badge-release' : (f.releaseType === 'Beta' ? 'badge-beta' : 'badge-alpha');

          row.innerHTML = `
            <div class="version-row-left">
              <div class="version-row-title">
                <span>${escapeHtml(f.displayName || f.versionNumber || f.fileName)}</span>
                <span class="${badgeTypeClass}">${escapeHtml(f.releaseType)}</span>
              </div>
              <div class="version-row-meta">
                <span>${escapeHtml(f.fileName)}</span>
                ${f.sizeFormatted ? ` • <span>${escapeHtml(f.sizeFormatted)}</span>` : ''}
                ${f.releaseDate ? ` • <span>${escapeHtml(f.releaseDate)}</span>` : ''}
              </div>
            </div>
            <div class="version-row-right">
              ${isCurrent
                ? '<span class="badge-installed-now">✔ Instalada actualmente</span>'
                : `<button class="btn btn-small btn-secondary btn-install-ver" data-fileid="${escapeHtml(f.fileId)}" data-filename="${escapeHtml(f.fileName)}" data-display="${escapeHtml(f.displayName || f.fileName)}" data-version="${escapeHtml(f.versionNumber || '')}" data-url="${escapeHtml(f.downloadUrl || '')}">Instalar esta versión</button>`
              }
            </div>
          `;
          detailVersionsList.appendChild(row);
        });

        detailVersionsList.querySelectorAll('.btn-install-ver').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            const b = e.currentTarget;
            const fileId = b.getAttribute('data-fileid');
            const fileName = b.getAttribute('data-filename');
            const displayName = b.getAttribute('data-display');
            const versionNumber = b.getAttribute('data-version');
            const downloadUrl = b.getAttribute('data-url');

            b.disabled = true;
            b.textContent = 'Instalando...';
            appendLog(`[Versión] Instalando versión "${displayName}" (${fileName})...`, 'info');

            try {
              const installRes = await api.mods.installVersion({
                projectId: targetProjId,
                source: item.source,
                fileId,
                downloadUrl,
                fileName,
                displayName,
                versionNumber,
                instancePath: targetInstance,
                mcVersion,
                loader
              });

              if (installRes.success) {
                appendLog(`[Versión] ¡Mod "${displayName}" instalado exitosamente!`, 'success');
                await openModDetailModal(item);
                if (tabDetailVersions) tabDetailVersions.click();
              } else {
                throw new Error(installRes.error || 'Error al instalar versión.');
              }
            } catch (err) {
              appendLog(`[Versión Error] ${err.message}`, 'error');
              alert(`Error al instalar versión: ${err.message}`);
              b.disabled = false;
              b.textContent = 'Instalar esta versión';
            }
          });
        });
      }

      const selectDetailChannel = document.getElementById('select-detail-channel');
      if (selectDetailChannel) {
        selectDetailChannel.value = 'release';
        selectDetailChannel.onchange = () => {
          renderDetailVersions(selectDetailChannel.value);
        };
      }
      renderDetailVersions('release');
    } catch (err) {
      detailModBody.innerHTML = `<div class="empty-state" style="color: var(--accent-danger);">Error al cargar detalles: ${err.message}</div>`;
      detailVersionsList.innerHTML = `<div class="empty-state" style="color: var(--accent-danger);">Error al cargar versiones: ${err.message}</div>`;
      appendLog(`[Error Detalle] ${err.message}`, 'error');
    }
  }

  // =======================================================
  // MOTOR DE LANZAMIENTO (JUGAR INSTANCIA ACTIVA & MULTI-SESIÓN)
  // =======================================================
  let activeSessionsCount = 0;

  function updateLaunchUIState(count) {
    activeSessionsCount = count || 0;
    if (activeSessionsCount > 0) {
      btnLaunch.disabled = false;
      btnLaunch.classList.add('btn-launch-multi');
      if (btnLaunchText) {
        btnLaunchText.textContent = `➕ LANZAR OTRA SESIÓN (${activeSessionsCount} en juego)`;
      }
      if (btnStopSessions) {
        btnStopSessions.style.display = 'inline-flex';
      }
      launchBadge.textContent = `${activeSessionsCount} en juego`;
      launchBadge.className = 'badge badge-running';
    } else {
      btnLaunch.disabled = false;
      btnLaunch.classList.remove('btn-launch-multi');
      if (btnLaunchText) {
        btnLaunchText.textContent = 'JUGAR';
      }
      if (btnStopSessions) {
        btnStopSessions.style.display = 'none';
      }
      launchBadge.textContent = 'En espera';
      launchBadge.className = 'badge badge-idle';
    }
  }

  if (btnStopSessions) {
    btnStopSessions.addEventListener('click', async () => {
      btnStopSessions.disabled = true;
      btnStopSessions.innerHTML = '<span>Deteniendo...</span>';
      try {
        await api.launcher.killAll();
      } catch (err) {
        appendLog(`[Detener] Error al detener instancias: ${err.message}`, 'error');
      } finally {
        btnStopSessions.disabled = false;
        btnStopSessions.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="5" y="5" width="14" height="14" rx="2"/>
          </svg>
          <span>Detener</span>
        `;
      }
    });
  }

  btnLaunch.addEventListener('click', async () => {
    btnLaunch.disabled = true;
    if (btnLaunchText) btnLaunchText.textContent = 'INICIANDO...';
    launchBadge.textContent = 'Iniciando';
    launchBadge.className = 'badge badge-launching';

    if (dockLaunchProgress) dockLaunchProgress.style.display = 'flex';
    progressBar.style.width = '10%';
    progressTaskLabel.textContent = 'Preparando entorno...';
    progressPercentLabel.textContent = '10%';

    appendLog('===========================================================', 'info');
    appendLog(`[Lanzador] Iniciando instancia "${currentActiveProfile?.name || 'Minecraft'}"...`, 'info');

    try {
      const launchRes = await api.launcher.launch({
        instancePath: currentActiveProfile?.instancePath || null,
        mcVersion: currentActiveProfile?.mcVersion,
        loader: currentActiveProfile?.loader,
        loaderVersion: currentActiveProfile?.loaderVersion,
        memoryMin: inputMinRam.value.trim() || '2G',
        memoryMax: inputMaxRam.value.trim() || '8G',
        javaSelection: currentActiveProfile?.javaSelection || selectGlobalJava.value || 'auto',
        javaPath: currentActiveProfile?.javaPath || inputCustomJava?.value || ''
      });

      if (!launchRes.success) {
        throw new Error(launchRes.error || 'Fallo desconocido en el motor de lanzamiento.');
      }
    } catch (err) {
      appendLog(`[Error Crítico de Lanzamiento] ${err.message}`, 'error');
      launchBadge.textContent = 'Error';
      launchBadge.className = 'badge badge-idle';
      updateLaunchUIState(activeSessionsCount);
      if (dockLaunchProgress) dockLaunchProgress.style.display = 'none';
      alert(`Error al lanzar Minecraft:\n${err.message}`);
    }
  });

  // =======================================================
  // EVENTOS DEL BACKEND EN TIEMPO REAL
  // =======================================================
  api.events.on('launch:status', (data) => {
    progressTaskLabel.textContent = data.message;
    appendLog(`[Estado] ${data.message}`, 'info');
  });

  api.events.on('launch:progress', (data) => {
    if (data.percent !== undefined) {
      progressBar.style.width = `${data.percent}%`;
      progressPercentLabel.textContent = `${data.percent}%`;
    }
    if (data.message) {
      progressTaskLabel.textContent = data.message;
    }
  });

  api.events.on('launch:download-status', (data) => {
    if (data.current && data.total) {
      const pct = Math.round((data.current / data.total) * 100);
      progressBar.style.width = `${pct}%`;
      progressPercentLabel.textContent = `${pct}%`;
      progressTaskLabel.textContent = `Descargando: ${data.name || 'recursos'} (${pct}%)`;
    }
  });

  api.events.on('launch:started', (data) => {
    appendLog(`[ShubaCore] Proceso de Minecraft (${data.profile} - ${data.username}) iniciado con PID: ${data.pid}`, 'success');
    if (dockLaunchProgress) dockLaunchProgress.style.display = 'none';
    progressBar.style.width = '0%';
    updateLaunchUIState(data.runningCount);
  });

  api.events.on('game:sessions-changed', (data) => {
    updateLaunchUIState(data.runningCount);
  });

  api.events.on('launch:log', (line) => {
    appendLog(line, 'game');
  });

  api.events.on('launch:log-batch', (batch) => {
    appendLogBatch(batch, 'game');
  });

  api.events.on('app:freeze-ui', (freeze) => {
    if (freeze) {
      document.body.classList.add('app-frozen');
    } else {
      document.body.classList.remove('app-frozen');
    }
  });

  api.events.on('launch:debug', (line) => {
    if (line.includes('Launching') || line.includes('Version') || line.includes('Natives')) {
      appendLog(`[Debug] ${line}`, 'info');
    }
  });

  api.events.on('launch:game-ready', (data) => {
    appendLog(`[ShubaCore] ¡Ventana de Minecraft (${data?.profile || 'Sesión'}) abierta y lista!`, 'success');
    if (dockLaunchProgress) dockLaunchProgress.style.display = 'none';
    progressBar.style.width = '0%';
    if (data?.runningCount !== undefined) {
      updateLaunchUIState(data.runningCount);
    }
  });

  api.events.on('launch:closing-launcher', (data) => {
    appendLog(`[Rendimiento] ${data.message}`, 'warn');
    launchBadge.textContent = 'En juego';
    launchBadge.className = 'badge badge-running';
    progressTaskLabel.textContent = 'Liberando 100% de RAM y CPU para Minecraft...';
  });

  api.events.on('launch:close', (data) => {
    appendLog(`[Launcher] El proceso de Minecraft finalizó con código: ${data.code}`, 'info');
    if (dockLaunchProgress) dockLaunchProgress.style.display = 'none';
    progressBar.style.width = '0%';
    progressPercentLabel.textContent = '0%';
    progressTaskLabel.textContent = 'Listo';
    updateLaunchUIState(data.runningCount !== undefined ? data.runningCount : 0);
  });

  api.events.on('mods:performance-pack-progress', (progress) => {
    if (progress.message) appendLog(`[Optimización] ${progress.message}`, 'info');
  });

  api.events.on('mods:modpack-progress', (progress) => {
    if (progress.message) {
      appendLog(`[Modpack] ${progress.message}`, 'info');
    } else if (progress.name) {
      appendLog(`[Modpack] Instalando archivo ${progress.current}/${progress.total}: ${progress.name} (${progress.percent || 0}%)`, 'info');
    }
  });

  api.events.on('content:download-progress', (progress) => {
    if (progress.message) appendLog(`[Descarga] ${progress.message}`, 'info');
  });

  api.events.on('packs:export-progress', (progress) => {
    if (progress.message) appendLog(`[PackPorter] ${progress.message}`, 'info');
  });

  api.events.on('packs:import-progress', (progress) => {
    if (progress.message) appendLog(`[PackPorter] ${progress.message}`, 'info');
  });

  api.events.on('jvm:download-progress', (progress) => {
    if (!javaInstallStatusBox) return;
    javaInstallStatusBox.style.display = 'flex';
    if (progress.percent !== undefined) {
      if (javaInstallProgressBar) javaInstallProgressBar.style.width = `${progress.percent}%`;
    }
    if (progress.message) {
      if (javaInstallStatusText) javaInstallStatusText.textContent = progress.message;
    }
  });

  api.events.on('app:log', (entry) => {
    if (entry.level === 'ERROR') {
      appendLog(`[Error Backend] ${entry.message}`, 'error');
    }
  });

  // =======================================================
  // LIGHTBOX DE IMÁGENES / CAPTURAS
  // =======================================================
  if (btnCloseLightbox) {
    btnCloseLightbox.addEventListener('click', () => {
      if (imageLightbox) imageLightbox.classList.remove('active');
    });
  }

  if (imageLightbox) {
    imageLightbox.addEventListener('click', (e) => {
      if (e.target === imageLightbox) {
        imageLightbox.classList.remove('active');
      }
    });
  }

  // =======================================================
  // ATAJO GLOBAL CON LA TECLA "ESCAPE" (PRIORIDAD EN CASCADA)
  // =======================================================
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;

    // Prioridad 1: Cerrar lightbox / visor de imágenes a pantalla completa
    if (imageLightbox && imageLightbox.classList.contains('active')) {
      imageLightbox.classList.remove('active');
      return;
    }

    // Prioridad 2: Cerrar cualquier modal activo
    if (modalMsDeviceCode && modalMsDeviceCode.classList.contains('active')) {
      closeMsDeviceModal();
      return;
    }
    if (modalModDetail && modalModDetail.classList.contains('active')) {
      modalModDetail.classList.remove('active');
      return;
    }
    if (modalAccountManager && modalAccountManager.classList.contains('active')) {
      modalAccountManager.classList.remove('active');
      return;
    }
    if (modalCreateProfile && modalCreateProfile.classList.contains('active')) {
      closeCreateProfileModal();
      return;
    }
    if (modalEditProfile && modalEditProfile.classList.contains('active')) {
      closeEditProfileModal();
      return;
    }
    const genericModal = document.querySelector('.modal-overlay.active');
    if (genericModal) {
      genericModal.classList.remove('active');
      return;
    }

    // Prioridad 3: Sub-vista abierta (e.g. view-mods) -> volver a "profiles"
    const activeViewPanel = document.querySelector('.view-panel.active');
    if (activeViewPanel && activeViewPanel.id === 'view-mods') {
      switchMainView('profiles');
    }
  });

  // =======================================================
  // MOTOR DE AUTO-ACTUALIZACIÓN (ELECTRON-UPDATER)
  // =======================================================
  async function initLauncherUpdater() {
    try {
      const ver = await api.updater.getVersion();
      if (launcherCurrentVersion && ver) {
        launcherCurrentVersion.textContent = 'v' + ver;
      }
    } catch (_) {}
  }

  if (btnCheckLauncherUpdates) {
    btnCheckLauncherUpdates.addEventListener('click', async () => {
      btnCheckLauncherUpdates.disabled = true;
      if (launcherUpdateStatus) launcherUpdateStatus.style.display = 'flex';
      if (launcherUpdateStatusText) launcherUpdateStatusText.textContent = 'Consultando GitHub Releases...';

      try {
        const res = await api.updater.check();
        if (res && res.isDev) {
          if (launcherUpdateStatusText) {
            launcherUpdateStatusText.textContent = 'Estás en entorno de desarrollo. Las actualizaciones automáticas se aplican en ejecutables empaquetados.';
          }
        }
      } catch (err) {
        if (launcherUpdateStatusText) {
          launcherUpdateStatusText.textContent = `Error al comprobar actualizaciones: ${err.message}`;
        }
      } finally {
        setTimeout(() => {
          btnCheckLauncherUpdates.disabled = false;
        }, 3000);
      }
    });
  }

  if (btnInstallLauncherUpdate) {
    btnInstallLauncherUpdate.addEventListener('click', async () => {
      btnInstallLauncherUpdate.disabled = true;
      btnInstallLauncherUpdate.textContent = 'Reiniciando...';
      appendLog('[AutoUpdater] Reiniciando ShubaCore para instalar la nueva versión...', 'success');
      await api.updater.quitAndInstall();
    });
  }

  if (btnDismissUpdateBanner) {
    btnDismissUpdateBanner.addEventListener('click', () => {
      if (launcherUpdateBanner) launcherUpdateBanner.style.display = 'none';
    });
  }

  // Eventos de auto-actualización emitidos desde Main Process
  api.events.on('updater:checking', () => {
    appendLog('[AutoUpdater] Buscando actualizaciones en GitHub Releases...', 'info');
    if (launcherUpdateStatus) launcherUpdateStatus.style.display = 'flex';
    if (launcherUpdateStatusText) launcherUpdateStatusText.textContent = 'Buscando actualizaciones en GitHub Releases...';
  });

  api.events.on('updater:update-available', (info) => {
    appendLog(`[AutoUpdater] ¡Nueva versión v${info.version} disponible! Descargando...`, 'success');
    if (launcherUpdateBanner) launcherUpdateBanner.style.display = 'block';
    if (updateBannerVersion) updateBannerVersion.textContent = 'v' + info.version;
    if (updateBannerDesc) updateBannerDesc.textContent = 'Descargando nueva versión en segundo plano...';
    if (updateBannerProgressWrap) updateBannerProgressWrap.style.display = 'block';
    if (updateBannerProgressBar) updateBannerProgressBar.style.width = '2%';
    if (btnInstallLauncherUpdate) btnInstallLauncherUpdate.style.display = 'none';

    if (launcherUpdateStatus) launcherUpdateStatus.style.display = 'flex';
    if (launcherUpdateStatusText) launcherUpdateStatusText.textContent = `Nueva versión v${info.version} encontrada. Descargando instalador...`;
  });

  api.events.on('updater:update-not-available', (info) => {
    const msg = info?.message || `El launcher está en la versión más reciente (${info?.version ? 'v' + info.version : 'v1.1.0'}).`;
    appendLog(`[AutoUpdater] ${msg}`, 'info');
    if (launcherUpdateStatus) launcherUpdateStatus.style.display = 'flex';
    if (launcherUpdateStatusText) launcherUpdateStatusText.textContent = msg;
    setTimeout(() => {
      if (launcherUpdateStatus && launcherUpdateBanner && !launcherUpdateBanner.style.display.includes('block')) {
        launcherUpdateStatus.style.display = 'none';
      }
    }, 6000);
  });

  api.events.on('updater:download-progress', (progress) => {
    if (updateBannerProgressBar) updateBannerProgressBar.style.width = `${progress.percent}%`;
    const speed = progress.bytesPerSecond ? ` (${(progress.bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s)` : '';
    if (updateBannerDesc) updateBannerDesc.textContent = `Descargando actualización: ${progress.percent}%${speed}`;
    if (launcherUpdateStatusText) launcherUpdateStatusText.textContent = `Descargando actualización: ${progress.percent}%${speed}`;
  });

  api.events.on('updater:update-downloaded', (info) => {
    appendLog(`[AutoUpdater] ¡Versión v${info.version} descargada y lista para instalar!`, 'success');
    if (launcherUpdateBanner) launcherUpdateBanner.style.display = 'block';
    if (updateBannerVersion) updateBannerVersion.textContent = 'v' + info.version;
    if (updateBannerDesc) updateBannerDesc.textContent = '¡Descarga completa! Reinicia para aplicar los cambios.';
    if (updateBannerProgressWrap) updateBannerProgressWrap.style.display = 'none';
    if (btnInstallLauncherUpdate) btnInstallLauncherUpdate.style.display = 'inline-flex';

    if (launcherUpdateStatus) launcherUpdateStatus.style.display = 'flex';
    if (launcherUpdateStatusText) launcherUpdateStatusText.textContent = `¡Versión v${info.version} lista para instalar! Haz clic en el botón flotante para reiniciar.`;
  });

  api.events.on('updater:error', (data) => {
    const errorMsg = data?.message || 'Error desconocido';
    if (errorMsg.includes('dev-app-update.yml') || errorMsg.includes('cannot check for updates') || errorMsg.includes('not packaged')) {
      console.debug('[AutoUpdater Dev]', errorMsg);
    } else {
      appendLog(`[AutoUpdater Error] ${errorMsg}`, 'warn');
      if (launcherUpdateStatus) launcherUpdateStatus.style.display = 'flex';
      if (launcherUpdateStatusText) launcherUpdateStatusText.textContent = `Aviso del actualizador: ${errorMsg}`;
    }
  });

  // =======================================================
  // CONFIGURACIÓN DE REPOSITORIO DE GITHUB
  // =======================================================
  async function openGhRepoModal() {
    if (!modalGithubRepo) return;
    try {
      const repoInfo = await api.githubMods.getRepo();
      if (inputGhRepoOwner) inputGhRepoOwner.value = repoInfo?.owner || 'Landa6543';
      if (inputGhRepoName) inputGhRepoName.value = repoInfo?.repo || 'ShubaCore-Mods';
      if (inputGhCustomToken) inputGhCustomToken.value = '';
    } catch (_) {}
    modalGithubRepo.style.display = 'flex';
  }

  function closeGhRepoModal() {
    if (modalGithubRepo) modalGithubRepo.style.display = 'none';
  }

  if (btnConfigGithubRepo) btnConfigGithubRepo.addEventListener('click', openGhRepoModal);
  if (btnCloseGhRepoModal) btnCloseGhRepoModal.addEventListener('click', closeGhRepoModal);
  if (btnCancelGhRepo) btnCancelGhRepo.addEventListener('click', closeGhRepoModal);

  if (btnSaveGhRepo) {
    btnSaveGhRepo.addEventListener('click', async () => {
      const owner = (inputGhRepoOwner?.value || 'Landa6543').trim();
      const repo = (inputGhRepoName?.value || 'ShubaCore-Mods').trim();
      const token = inputGhCustomToken?.value?.trim() || undefined;

      btnSaveGhRepo.disabled = true;
      btnSaveGhRepo.textContent = 'Guardando...';
      try {
        await api.githubMods.setRepo({ owner, repo, token });
        appendLog(`[GitHub] Repositorio configurado: https://github.com/${owner}/${repo}`, 'success');
        closeGhRepoModal();
        if (selectModSource.value === 'github' || currentContentType === 'github') {
          await api.githubMods.fetch(true);
          performModSearch();
        }
      } catch (err) {
        alert(`Error al guardar configuración: ${err.message}`);
      } finally {
        btnSaveGhRepo.disabled = false;
        btnSaveGhRepo.textContent = 'Guardar Configuración';
      }
    });
  }

  // =======================================================
  // PUBLICAR PERFIL PARA AMIGOS (.shubasync.json)
  // =======================================================
  async function openPublishProfileModal(profileId) {
    if (!modalPublishProfile) return;
    const allProfiles = await api.profiles.getAll();
    const targetId = profileId || currentActiveProfile?.id;
    const targetProfile = targetId ? allProfiles.find(p => p.id === targetId) : currentActiveProfile;
    if (!targetProfile) {
      alert('Selecciona una instancia antes de publicar.');
      return;
    }

    currentPublishTargetProfileId = targetProfile.id;
    if (publishProfileTargetName) publishProfileTargetName.textContent = targetProfile.name || 'Mi Instancia';

    let count = 0;
    try {
      const mods = await api.mods.listInstalled(targetProfile.instancePath);
      count = Array.isArray(mods) ? mods.length : 0;
    } catch (_) {}

    if (publishProfileModCount) publishProfileModCount.textContent = `${count} mods`;
    if (publishProfileTargetMeta) {
      const loaderCap = (targetProfile.loader || 'NeoForge').toUpperCase();
      publishProfileTargetMeta.textContent = `Minecraft ${targetProfile.mcVersion || '1.21.1'} · ${loaderCap}`;
    }

    if (publishSuccessBox) publishSuccessBox.style.display = 'none';
    if (publishStatusText) publishStatusText.style.display = 'none';
    if (btnConfirmPublishProfile) {
      btnConfirmPublishProfile.disabled = false;
      btnConfirmPublishProfile.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><polyline points="12 13 12 7 9 10"/><polyline points="12 7 15 10"/></svg>
        <span>☁ Publicar para Amigos</span>
      `;
    }

    modalPublishProfile.style.display = 'flex';
  }

  function closePublishProfileModal() {
    if (modalPublishProfile) modalPublishProfile.style.display = 'none';
  }

  if (btnPublishProfileMods) {
    btnPublishProfileMods.addEventListener('click', () => openPublishProfileModal(currentActiveProfile?.id));
  }
  if (btnClosePublishModal) btnClosePublishModal.addEventListener('click', closePublishProfileModal);
  if (btnCancelPublishProfile) btnCancelPublishProfile.addEventListener('click', closePublishProfileModal);

  if (btnConfirmPublishProfile) {
    btnConfirmPublishProfile.addEventListener('click', async () => {
      if (!currentPublishTargetProfileId) return;
      btnConfirmPublishProfile.disabled = true;
      btnConfirmPublishProfile.innerHTML = `<span>Publicando en GitHub...</span>`;
      if (publishStatusText) {
        publishStatusText.style.display = 'block';
        publishStatusText.style.color = 'var(--text-secondary)';
        publishStatusText.textContent = 'Analizando mods y empaquetando configuraciones...';
      }

      const includeConfigs = checkPublishIncludeConfigs ? checkPublishIncludeConfigs.checked : true;

      try {
        const res = await api.sync.publish({
          profileId: currentPublishTargetProfileId,
          includeConfigs
        });

        if (res.success) {
          appendLog(`[ProfileSync] ¡Perfil "${res.profileName}" publicado exitosamente con ${res.modCount} mods!`, 'success');
          if (publishStatusText) publishStatusText.style.display = 'none';
          if (publishSuccessBox) {
            publishSuccessBox.style.display = 'block';
            if (inputPublishShareCode) inputPublishShareCode.value = res.shareCode;
          }
          btnConfirmPublishProfile.innerHTML = `<span>✓ Publicado</span>`;
        } else {
          throw new Error(res.error || 'Error al publicar el perfil en GitHub.');
        }
      } catch (pubErr) {
        btnConfirmPublishProfile.disabled = false;
        btnConfirmPublishProfile.innerHTML = `<span>Reintentar</span>`;
        if (publishStatusText) {
          publishStatusText.textContent = `Error: ${pubErr.message}`;
          publishStatusText.style.color = 'var(--accent-red)';
        }
        appendLog(`[ProfileSync Error] ${pubErr.message}`, 'error');
        alert(`Error al publicar perfil: ${pubErr.message}`);
      }
    });
  }

  if (btnCopyShareCode && inputPublishShareCode) {
    btnCopyShareCode.addEventListener('click', () => {
      inputPublishShareCode.select();
      navigator.clipboard.writeText(inputPublishShareCode.value);
      btnCopyShareCode.textContent = '¡Copiado!';
      setTimeout(() => { btnCopyShareCode.textContent = 'Copiar'; }, 2000);
    });
  }

  // =======================================================
  // SINCRONIZADOR DE PERFILES EN 1 CLIC (MODPACK SYNC)
  // =======================================================
  async function openSyncProfileModal(targetProfileId) {
    if (!modalSyncProfile) return;
    const allProfiles = await api.profiles.getAll();
    const targetId = targetProfileId || currentActiveProfile?.id;
    const targetProfile = targetId ? allProfiles.find(p => p.id === targetId) : currentActiveProfile;
    if (!targetProfile) {
      alert('Selecciona una instancia antes de sincronizar.');
      return;
    }

    currentSyncTargetProfileId = targetProfile.id;
    if (syncTargetInstanceName) syncTargetInstanceName.textContent = targetProfile.name || 'Mi Instancia';
    if (syncProgressBox) syncProgressBox.style.display = 'none';

    modalSyncProfile.style.display = 'flex';
    await loadSharedProfilesList();
  }

  function closeSyncProfileModal() {
    if (modalSyncProfile) modalSyncProfile.style.display = 'none';
  }

  if (btnSyncCloudInstances) {
    btnSyncCloudInstances.addEventListener('click', () => openSyncProfileModal(currentActiveProfile?.id));
  }
  if (btnSyncProfileMods) {
    btnSyncProfileMods.addEventListener('click', () => openSyncProfileModal(currentActiveProfile?.id));
  }
  if (btnCloseSyncModal) btnCloseSyncModal.addEventListener('click', closeSyncProfileModal);
  if (btnDismissSyncModal) btnDismissSyncModal.addEventListener('click', closeSyncProfileModal);
  if (btnRefreshSharedList) btnRefreshSharedList.addEventListener('click', () => loadSharedProfilesList());

  async function loadSharedProfilesList() {
    if (!sharedProfilesList) return;
    sharedProfilesList.innerHTML = '<div class="empty-state">Consultando perfiles compartidos en GitHub...</div>';

    try {
      const list = await api.sync.listShared();
      if (!list || list.length === 0) {
        sharedProfilesList.innerHTML = `
          <div class="empty-state" style="padding: 24px;">
            <p style="font-size: 13.5px; margin-bottom: 6px;">No hay perfiles compartidos publicados aún.</p>
            <small style="color: var(--text-dim);">Usa el botón "☁ Publicar Perfil" para ser el primero en compartir tu configuración con amigos.</small>
          </div>
        `;
        return;
      }

      sharedProfilesList.innerHTML = '';
      list.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'shared-profile-card';

        const pubDate = new Date(item.publishedAt).toLocaleDateString();
        const loaderUpper = (item.loader || 'neoforge').toUpperCase();

        card.innerHTML = `
          <div class="shared-profile-left">
            <div style="display: flex; align-items: center; gap: 8px;">
              <strong style="color: var(--text-primary); font-size: 14px;">${escapeHtml(item.name)}</strong>
              <span class="badge badge-success">${item.modCount} mods</span>
              <span class="badge badge-secondary">${escapeHtml(loaderUpper)} ${escapeHtml(item.mcVersion)}</span>
            </div>
            <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 4px;">
              Por <strong>${escapeHtml(item.author)}</strong> · Publicado el ${pubDate}
              ${item.hasConfigs ? ' · <span style="color: var(--accent-emerald);">Incluye configs</span>' : ''}
            </div>
          </div>
          <div class="shared-profile-right">
            <button class="btn btn-small btn-primary btn-apply-sync" data-slug="${escapeHtml(item.slug)}" data-name="${escapeHtml(item.name)}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 15 16 10 5 21"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/></svg>
              <span>Sincronizar</span>
            </button>
          </div>
        `;

        sharedProfilesList.appendChild(card);
      });

      document.querySelectorAll('.btn-apply-sync').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const targetSlug = e.currentTarget.getAttribute('data-slug');
          const targetName = e.currentTarget.getAttribute('data-name');
          if (!targetSlug || !currentSyncTargetProfileId) return;

          if (!confirm(`¿Deseas sincronizar tu instancia con "${targetName}"?\nSe descargarán los mods faltantes y se actualizarán las configs.`)) {
            return;
          }

          if (syncProgressBox) syncProgressBox.style.display = 'block';
          if (syncProgressLabel) syncProgressLabel.textContent = `Iniciando sincronización con "${targetName}"...`;
          if (syncProgressBar) syncProgressBar.style.width = '0%';
          if (syncProgressPct) syncProgressPct.textContent = '0%';

          document.querySelectorAll('.btn-apply-sync').forEach(b => b.disabled = true);

          try {
            const res = await api.sync.apply({
              profileId: currentSyncTargetProfileId,
              slugOrManifest: targetSlug
            });

            if (res.success) {
              if (syncProgressLabel) syncProgressLabel.textContent = `¡Sincronización completada! (${res.downloadedCount || 0} mods descargados)`;
              if (syncProgressBar) syncProgressBar.style.width = '100%';
              if (syncProgressPct) syncProgressPct.textContent = '100%';
              appendLog(`[ProfileSync] ¡Instancia sincronizada exitosamente con "${targetName}"!`, 'success');

              await loadProfiles();
              await loadInstalledMods();

              setTimeout(() => {
                closeSyncProfileModal();
              }, 1500);
            } else {
              throw new Error(res.error || 'Error al aplicar sincronización.');
            }
          } catch (syncErr) {
            if (syncProgressLabel) syncProgressLabel.textContent = `Error: ${syncErr.message}`;
            appendLog(`[ProfileSync Error] ${syncErr.message}`, 'error');
            alert(`Error durante la sincronización: ${syncErr.message}`);
          } finally {
            document.querySelectorAll('.btn-apply-sync').forEach(b => b.disabled = false);
          }
        });
      });

    } catch (err) {
      sharedProfilesList.innerHTML = `<div class="empty-state">Error al cargar perfiles: ${escapeHtml(err.message)}</div>`;
      appendLog(`[ProfileSync Error] ${err.message}`, 'error');
    }
  }

  // Listener de eventos de sincronización y descarga
  api.events.on('sync:progress', (progress) => {
    if (!syncProgressBox || syncProgressBox.style.display === 'none') return;
    if (progress.message && syncProgressLabel) {
      syncProgressLabel.textContent = progress.message;
    }
    if (progress.pct !== undefined) {
      const pctVal = Math.min(100, Math.max(0, Math.round(progress.pct)));
      if (syncProgressBar) syncProgressBar.style.width = `${pctVal}%`;
      if (syncProgressPct) syncProgressPct.textContent = `${pctVal}%`;
    }
  });

  api.events.on('github-mods:download-progress', (progress) => {
    if (progress.message) {
      appendLog(`[GitHub Mods] ${progress.message}`, 'info');
    }
  });

  // =======================================================
  // 🖥 MIS SERVIDORES DEDICADOS LOCALES (HOST LOCAL)
  // =======================================================
  let currentSelectedServerId = null;
  let currentServerSubtab = 'console';
  let localServersCache = [];

  const serversListContainer = document.getElementById('servers-list-container');
  const badgeTotalServers = document.getElementById('badge-total-servers');
  const btnOpenCreateServerModal = document.getElementById('btn-open-create-server-modal');
  const btnEmptyCreateServer = document.getElementById('btn-empty-create-server');
  const btnRefreshServersList = document.getElementById('btn-refresh-servers-list');

  const serverDashboardEmpty = document.getElementById('server-dashboard-empty');
  const serverDashboardContent = document.getElementById('server-dashboard-content');
  const serverStatusPill = document.getElementById('server-status-pill');
  const serverDetailName = document.getElementById('server-detail-name');
  const serverDetailLoaderBadge = document.getElementById('server-detail-loader-badge');
  const serverDetailPort = document.getElementById('server-detail-port');
  const serverDetailRam = document.getElementById('server-detail-ram');
  const serverDetailModsCount = document.getElementById('server-detail-mods-count');

  const btnStartServer = document.getElementById('btn-start-server');
  const btnStartServerText = document.getElementById('btn-start-server-text');
  const btnStopServer = document.getElementById('btn-stop-server');
  const btnSyncServerModsTop = document.getElementById('btn-sync-server-mods-top');
  const btnExportServerPack = document.getElementById('btn-export-server-pack');
  const btnOpenServerFolder = document.getElementById('btn-open-server-folder');
  const btnDeleteServer = document.getElementById('btn-delete-server');

  // Métricas y Consola
  const serverStatRam = document.getElementById('server-stat-ram');
  const serverStatRamMax = document.getElementById('server-stat-ram-max');
  const serverStatCpu = document.getElementById('server-stat-cpu');
  const serverStatPlayersCount = document.getElementById('server-stat-players-count');
  const serverStatIp = document.getElementById('server-stat-ip');
  const btnCopyServerIp = document.getElementById('btn-copy-server-ip');

  const serverPlayersList = document.getElementById('server-players-list');
  const serverPlayersHeaderCount = document.getElementById('server-players-header-count');
  const serverTerminalLogs = document.getElementById('server-terminal-logs');
  const inputServerCmd = document.getElementById('input-server-cmd');
  const btnSendServerCmd = document.getElementById('btn-send-server-cmd');

  // Modal Crear Servidor
  const modalCreateServer = document.getElementById('modal-create-server');
  const btnCloseCreateServerModal = document.getElementById('btn-close-create-server-modal');
  const btnCancelCreateServer = document.getElementById('btn-cancel-create-server');
  const btnSubmitCreateServer = document.getElementById('btn-submit-create-server');
  const inputServerCreateName = document.getElementById('input-server-create-name');
  const selectServerCreateMc = document.getElementById('select-server-create-mc');
  const selectServerCreateLoader = document.getElementById('select-server-create-loader');
  const selectServerCreateRam = document.getElementById('select-server-create-ram');
  const inputServerCreatePort = document.getElementById('input-server-create-port');
  const checkServerSyncModsOnCreate = document.getElementById('check-server-sync-mods-on-create');
  const boxServerSyncInstanceSelector = document.getElementById('box-server-sync-instance-selector');
  const selectServerSyncInstance = document.getElementById('select-server-sync-instance');
  const serverInstallProgressBox = document.getElementById('server-install-progress-box');
  const serverInstallProgressFill = document.getElementById('server-install-progress-fill');
  const serverInstallProgressText = document.getElementById('server-install-progress-text');

  // Modal Sincronizar Mods
  const modalSyncServerMods = document.getElementById('modal-sync-server-mods');
  const btnCloseSyncServerModal = document.getElementById('btn-close-sync-server-modal');
  const btnCancelSyncServer = document.getElementById('btn-cancel-sync-server');
  const btnExecuteSyncServer = document.getElementById('btn-execute-sync-server');
  const btnExecuteSyncServerText = document.getElementById('btn-execute-sync-server-text');
  const selectSyncSourceInstance = document.getElementById('select-sync-source-instance');
  const checkSyncCopyConfigs = document.getElementById('check-sync-copy-configs');
  const syncServerResultBox = document.getElementById('sync-server-result-box');
  const syncServerResultText = document.getElementById('sync-server-result-text');

  async function loadDedicatedServers() {
    if (!api.servers) return;
    try {
      const servers = await api.servers.list();
      localServersCache = Array.isArray(servers) ? servers : [];
      if (badgeTotalServers) badgeTotalServers.textContent = localServersCache.length;

      renderServersList();

      if (localServersCache.length === 0) {
        currentSelectedServerId = null;
        if (serverDashboardEmpty) serverDashboardEmpty.style.display = 'flex';
        if (serverDashboardContent) serverDashboardContent.style.display = 'none';
      } else {
        const found = localServersCache.find((s) => s.id === currentSelectedServerId);
        if (found) {
          selectDedicatedServer(found.id);
        } else {
          selectDedicatedServer(localServersCache[0].id);
        }
      }
    } catch (err) {
      appendLog(`[Servers] Error al listar servidores: ${err.message}`, 'error');
    }
  }

  function renderServersList() {
    if (!serversListContainer) return;
    if (localServersCache.length === 0) {
      serversListContainer.innerHTML = '<div class="empty-state" style="padding: 24px 12px; font-size: 13px;">No hay servidores creados aún. Haz clic en "➕ Crear Nuevo Servidor".</div>';
      return;
    }

    serversListContainer.innerHTML = '';
    localServersCache.forEach((server) => {
      const card = document.createElement('div');
      card.className = `server-item-card ${server.id === currentSelectedServerId ? 'active' : ''}`;
      card.setAttribute('data-server-id', server.id);

      let statusBadge = '<span class="badge badge-idle" style="font-size: 10px;">🔴 Apagado</span>';
      if (server.status === 'online') {
        statusBadge = '<span class="badge badge-success" style="font-size: 10px;">🟢 En línea</span>';
      } else if (server.status === 'starting') {
        statusBadge = '<span class="badge badge-warning" style="font-size: 10px;">🟡 Iniciando...</span>';
      } else if (server.status === 'stopping') {
        statusBadge = '<span class="badge badge-danger" style="font-size: 10px;">🟡 Deteniendo...</span>';
      }

      card.innerHTML = `
        <div class="server-item-title-row">
          <span class="server-item-name" title="${escapeHtml(server.name)}">${escapeHtml(server.name)}</span>
          ${statusBadge}
        </div>
        <div class="server-item-meta">
          <span>${escapeHtml(server.loader.toUpperCase())} ${escapeHtml(server.mcVersion)}</span>
          <span>·</span>
          <span>:${escapeHtml(server.port)}</span>
          <span>·</span>
          <span>${server.modsCount} mods</span>
        </div>
      `;

      card.addEventListener('click', () => {
        selectDedicatedServer(server.id);
      });

      serversListContainer.appendChild(card);
    });
  }

  async function selectDedicatedServer(id) {
    currentSelectedServerId = id;
    const server = localServersCache.find((s) => s.id === id);
    if (!server) return;

    // Actualizar clase activa en la lista lateral
    document.querySelectorAll('.server-item-card').forEach((c) => {
      c.classList.toggle('active', c.getAttribute('data-server-id') === id);
    });

    if (serverDashboardEmpty) serverDashboardEmpty.style.display = 'none';
    if (serverDashboardContent) serverDashboardContent.style.display = 'flex';

    if (serverDetailName) serverDetailName.textContent = server.name;
    if (serverDetailLoaderBadge) serverDetailLoaderBadge.textContent = `${server.loader.toUpperCase()} ${server.mcVersion}`;
    if (serverDetailPort) serverDetailPort.textContent = server.port;
    if (serverDetailRam) serverDetailRam.textContent = server.ram || '6G';
    if (serverDetailModsCount) serverDetailModsCount.textContent = server.modsCount || 0;
    if (serverStatRamMax) serverStatRamMax.textContent = `Límite: ${server.ram || '6G'}`;
    if (serverStatIp) serverStatIp.textContent = `localhost:${server.port}`;

    updateServerStatusUI(server.status);
    updateServerPlayersUI(server.players || []);

    if (currentServerSubtab === 'properties') {
      loadServerProperties(id);
    } else if (currentServerSubtab === 'mods') {
      loadServerMods(id);
    }
  }

  function updateServerStatusUI(status) {
    if (!serverStatusPill) return;

    if (status === 'online') {
      serverStatusPill.className = 'badge badge-success';
      serverStatusPill.textContent = '🟢 EN LÍNEA';
      if (btnStartServer) btnStartServer.style.display = 'none';
      if (btnStopServer) btnStopServer.style.display = 'inline-flex';
    } else if (status === 'starting') {
      serverStatusPill.className = 'badge badge-warning';
      serverStatusPill.textContent = '🟡 INICIANDO...';
      if (btnStartServer) {
        btnStartServer.style.display = 'inline-flex';
        btnStartServer.disabled = true;
        if (btnStartServerText) btnStartServerText.textContent = 'Iniciando...';
      }
      if (btnStopServer) btnStopServer.style.display = 'none';
    } else if (status === 'stopping') {
      serverStatusPill.className = 'badge badge-danger';
      serverStatusPill.textContent = '🟡 DETENIENDO...';
      if (btnStartServer) btnStartServer.style.display = 'none';
      if (btnStopServer) {
        btnStopServer.style.display = 'inline-flex';
        btnStopServer.disabled = true;
      }
    } else {
      serverStatusPill.className = 'badge badge-idle';
      serverStatusPill.textContent = '🔴 APAGADO';
      if (btnStartServer) {
        btnStartServer.style.display = 'inline-flex';
        btnStartServer.disabled = false;
        if (btnStartServerText) btnStartServerText.textContent = 'Iniciar Servidor';
      }
      if (btnStopServer) {
        btnStopServer.style.display = 'none';
        btnStopServer.disabled = false;
      }
    }
  }

  function updateServerPlayersUI(players) {
    const list = Array.isArray(players) ? players : [];
    if (serverPlayersHeaderCount) serverPlayersHeaderCount.textContent = `${list.length} jugador${list.length === 1 ? '' : 'es'}`;
    if (serverStatPlayersCount) serverStatPlayersCount.textContent = `${list.length} / 20`;
    if (!serverPlayersList) return;

    if (list.length === 0) {
      serverPlayersList.innerHTML = '<div class="empty-state" style="padding: 12px; font-size: 12.5px;">Sin jugadores conectados en este momento.</div>';
      return;
    }

    serverPlayersList.innerHTML = '';
    list.forEach((player) => {
      const row = document.createElement('div');
      row.className = 'server-player-row';
      const avatarUrl = `https://mc-heads.net/avatar/${encodeURIComponent(player)}/28`;

      row.innerHTML = `
        <div class="server-player-left">
          <img src="${avatarUrl}" class="server-player-avatar" alt="${escapeHtml(player)}" onerror="this.src='assets/logo.png'">
          <span class="server-player-name">${escapeHtml(player)}</span>
        </div>
        <div class="server-player-actions">
          <button class="btn btn-small btn-secondary btn-player-op" data-player="${escapeHtml(player)}" title="Dar Operador (OP)">👑 OP</button>
          <button class="btn btn-small btn-secondary btn-player-tp" data-player="${escapeHtml(player)}" title="Teletransportar">📍 TP</button>
          <button class="btn btn-small btn-secondary btn-player-kick" data-player="${escapeHtml(player)}" title="Expulsar">🥾 Kick</button>
          <button class="btn btn-small btn-danger btn-player-ban" data-player="${escapeHtml(player)}" title="Banear">🚫 Ban</button>
        </div>
      `;

      row.querySelector('.btn-player-op').addEventListener('click', async () => {
        if (confirm(`¿Dar permisos de Operador (OP) a "${player}"?`)) {
          await api.servers.sendCommand(currentSelectedServerId, `op ${player}`);
        }
      });

      row.querySelector('.btn-player-tp').addEventListener('click', async () => {
        const target = prompt(`Teletransportar a "${player}" hacia jugador o coordenadas (x y z):`, '0 100 0');
        if (target) {
          await api.servers.sendCommand(currentSelectedServerId, `tp ${player} ${target}`);
        }
      });

      row.querySelector('.btn-player-kick').addEventListener('click', async () => {
        if (confirm(`¿Expulsar a "${player}" del servidor?`)) {
          await api.servers.sendCommand(currentSelectedServerId, `kick ${player} Expulsado por el host`);
        }
      });

      row.querySelector('.btn-player-ban').addEventListener('click', async () => {
        if (confirm(`¿Banear permanentemente a "${player}"?`)) {
          await api.servers.sendCommand(currentSelectedServerId, `ban ${player}`);
        }
      });

      serverPlayersList.appendChild(row);
    });
  }

  function appendServerLog(line, isError = false) {
    if (!serverTerminalLogs) return;
    const div = document.createElement('div');
    div.className = `log-line ${isError ? 'log-error' : 'log-info'}`;

    // Estilizar niveles de log conocidos
    if (line.includes('WARN')) div.className = 'log-line log-warn';
    else if (line.includes('ERROR') || line.includes('Exception') || isError) div.className = 'log-line log-error';
    else if (line.includes('Done (') || line.includes('joined the game')) div.className = 'log-line log-success';

    div.textContent = line;
    serverTerminalLogs.appendChild(div);

    // Limitar histórico de logs en el DOM a 800 líneas
    if (serverTerminalLogs.children.length > 800) {
      serverTerminalLogs.removeChild(serverTerminalLogs.children[0]);
    }

    serverTerminalLogs.scrollTop = serverTerminalLogs.scrollHeight;
  }

  // Sub-pestañas dentro del servidor (Consola | server.properties | Mods)
  function switchServerSubtab(tabName) {
    currentServerSubtab = tabName;
    document.querySelectorAll('.server-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-server-tab') === tabName);
    });

    const panels = {
      console: document.getElementById('server-subpanel-console'),
      properties: document.getElementById('server-subpanel-properties'),
      mods: document.getElementById('server-subpanel-mods')
    };

    Object.keys(panels).forEach((k) => {
      if (panels[k]) {
        panels[k].style.display = (k === tabName) ? 'flex' : 'none';
        panels[k].classList.toggle('active', k === tabName);
      }
    });

    if (currentSelectedServerId) {
      if (tabName === 'properties') loadServerProperties(currentSelectedServerId);
      if (tabName === 'mods') loadServerMods(currentSelectedServerId);
    }
  }

  document.querySelectorAll('.server-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-server-tab');
      if (target) switchServerSubtab(target);
    });
  });

  // Consola Interactiva: Enviar comandos
  async function sendServerCommandFromUI() {
    if (!currentSelectedServerId || !inputServerCmd) return;
    const cmd = inputServerCmd.value.trim();
    if (!cmd) return;

    try {
      inputServerCmd.value = '';
      await api.servers.sendCommand(currentSelectedServerId, cmd);
    } catch (err) {
      appendServerLog(`[Error] ${err.message}`, true);
    }
  }

  if (btnSendServerCmd) btnSendServerCmd.addEventListener('click', sendServerCommandFromUI);
  if (inputServerCmd) {
    inputServerCmd.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendServerCommandFromUI();
      }
    });
  }

  // Botones Rápidos de Comandos (Día, Lluvia, Guardar, Stop)
  document.querySelectorAll('.btn-quick-cmd').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const cmd = btn.getAttribute('data-cmd');
      if (cmd && currentSelectedServerId) {
        await api.servers.sendCommand(currentSelectedServerId, cmd);
      }
    });
  });

  // Copiar IP local
  if (btnCopyServerIp) {
    btnCopyServerIp.addEventListener('click', () => {
      const text = serverStatIp ? serverStatIp.textContent : 'localhost:25565';
      navigator.clipboard.writeText(text);
      btnCopyServerIp.textContent = '¡Copiado!';
      setTimeout(() => { btnCopyServerIp.textContent = 'Copiar IP'; }, 2000);
    });
  }

  // Iniciar y Detener Servidor
  if (btnStartServer) {
    btnStartServer.addEventListener('click', async () => {
      if (!currentSelectedServerId) return;
      btnStartServer.disabled = true;
      if (btnStartServerText) btnStartServerText.textContent = 'Iniciando...';
      try {
        appendServerLog(`[ShubaCore] Lanzando servidor dedicado...`);
        const res = await api.servers.start(currentSelectedServerId);
        if (res.success) {
          updateServerStatusUI('starting');
        }
      } catch (err) {
        alert(`Error al iniciar servidor: ${err.message}`);
        appendServerLog(`[Error al Iniciar] ${err.message}`, true);
        updateServerStatusUI('offline');
      }
    });
  }

  if (btnStopServer) {
    btnStopServer.addEventListener('click', async () => {
      if (!currentSelectedServerId) return;
      btnStopServer.disabled = true;
      try {
        appendServerLog(`[ShubaCore] Enviando comando "stop" al servidor...`);
        await api.servers.stop(currentSelectedServerId);
      } catch (err) {
        alert(`Error al detener servidor: ${err.message}`);
      }
    });
  }

  // Abrir carpeta del servidor
  if (btnOpenServerFolder) {
    btnOpenServerFolder.addEventListener('click', async () => {
      if (currentSelectedServerId) await api.servers.openFolder(currentSelectedServerId);
    });
  }

  // Exportar Pack de Servidor para VPS/Hosting
  if (btnExportServerPack) {
    btnExportServerPack.addEventListener('click', async () => {
      if (!currentSelectedServerId) return;
      const server = localServersCache.find((s) => s.id === currentSelectedServerId);
      const targetPath = await api.servers.selectExportZip(server?.name || 'Servidor');
      if (!targetPath) return;

      btnExportServerPack.disabled = true;
      btnExportServerPack.innerHTML = '<span>Empaquetando...</span>';

      try {
        const res = await api.servers.exportPack(currentSelectedServerId, targetPath);
        if (res.success) {
          alert(`¡Pack de servidor exportado con éxito!\n\nArchivo: ${targetPath}\nTamaño: ${res.sizeFormatted}\n\nListo para subir a tu VPS, Aternos o hosting.`);
          appendLog(`[Server Export] Pack exportado: "${targetPath}" (${res.sizeFormatted})`, 'success');
        }
      } catch (err) {
        alert(`Error al exportar pack de servidor: ${err.message}`);
      } finally {
        btnExportServerPack.disabled = false;
        btnExportServerPack.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          <span>📤 Exportar Pack</span>
        `;
      }
    });
  }

  // Eliminar Servidor
  if (btnDeleteServer) {
    btnDeleteServer.addEventListener('click', async () => {
      if (!currentSelectedServerId) return;
      const server = localServersCache.find((s) => s.id === currentSelectedServerId);
      if (confirm(`¿Estás seguro de eliminar el servidor "${server?.name}"?\nEsta acción no se puede deshacer.`)) {
        await api.servers.delete(currentSelectedServerId, true);
        appendLog(`[Servers] Servidor "${server?.name}" eliminado.`, 'info');
        currentSelectedServerId = null;
        await loadDedicatedServers();
      }
    });
  }

  // --- EDITOR VISUAL SERVER.PROPERTIES ---
  async function loadServerProperties(id) {
    try {
      const props = await api.servers.getProperties(id);
      const setVal = (elId, val) => {
        const el = document.getElementById(elId);
        if (el) el.value = String(val !== undefined ? val : '');
      };

      setVal('prop-online-mode', props['online-mode'] !== undefined ? props['online-mode'] : 'false');
      setVal('prop-server-port', props['server-port'] || 25565);
      setVal('prop-difficulty', props['difficulty'] || 'normal');
      setVal('prop-gamemode', props['gamemode'] || 'survival');
      setVal('prop-pvp', props['pvp'] !== undefined ? props['pvp'] : 'true');
      setVal('prop-max-players', props['max-players'] || 20);
      setVal('prop-view-distance', props['view-distance'] || 10);
      setVal('prop-simulation-distance', props['simulation-distance'] || 10);
      setVal('prop-motd', props['motd'] || 'Servidor de Minecraft - ShubaCore');
      setVal('prop-white-list', props['white-list'] !== undefined ? props['white-list'] : 'false');
      setVal('prop-command-blocks', props['enable-command-block'] !== undefined ? props['enable-command-block'] : 'true');
    } catch (err) {
      appendLog(`[Properties Error] ${err.message}`, 'error');
    }
  }

  const btnSaveServerProperties = document.getElementById('btn-save-server-properties');
  if (btnSaveServerProperties) {
    btnSaveServerProperties.addEventListener('click', async () => {
      if (!currentSelectedServerId) return;

      const getVal = (elId) => {
        const el = document.getElementById(elId);
        return el ? el.value : '';
      };

      const props = {
        'online-mode': getVal('prop-online-mode') === 'true',
        'server-port': Number(getVal('prop-server-port')) || 25565,
        'difficulty': getVal('prop-difficulty'),
        'gamemode': getVal('prop-gamemode'),
        'pvp': getVal('prop-pvp') === 'true',
        'max-players': Number(getVal('prop-max-players')) || 20,
        'view-distance': Number(getVal('prop-view-distance')) || 10,
        'simulation-distance': Number(getVal('prop-simulation-distance')) || 10,
        'motd': getVal('prop-motd'),
        'white-list': getVal('prop-white-list') === 'true',
        'enable-command-block': getVal('prop-command-blocks') === 'true'
      };

      btnSaveServerProperties.disabled = true;
      btnSaveServerProperties.textContent = 'Guardando...';

      try {
        await api.servers.saveProperties(currentSelectedServerId, props);
        alert('¡server.properties guardado exitosamente!');
        appendLog(`[Servers] Configuración server.properties actualizada.`, 'success');
        if (serverDetailPort) serverDetailPort.textContent = props['server-port'];
        if (serverStatIp) serverStatIp.textContent = `localhost:${props['server-port']}`;
      } catch (err) {
        alert(`Error al guardar propiedades: ${err.message}`);
      } finally {
        btnSaveServerProperties.disabled = false;
        btnSaveServerProperties.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          <span>💾 Guardar Propiedades</span>
        `;
      }
    });
  }

  // --- MODS DEL SERVIDOR ---
  const serverModsListContainer = document.getElementById('server-mods-list-container');
  const serverInstalledModsBadge = document.getElementById('server-installed-mods-badge');
  const btnOpenServerModsDir = document.getElementById('btn-open-server-mods-dir');

  async function loadServerMods(id) {
    if (!serverModsListContainer) return;
    serverModsListContainer.innerHTML = '<div class="empty-state">Consultando mods del servidor...</div>';

    try {
      const server = localServersCache.find((s) => s.id === id);
      if (!server) return;

      const modsDir = `${server.serverDir}/mods`;
      // Listar mediante InstancePacks
      const mods = await api.instancePacks.list({ instancePath: server.serverDir, type: 'mods' }).catch(() => []);
      const list = Array.isArray(mods) ? mods : [];

      if (serverInstalledModsBadge) serverInstalledModsBadge.textContent = `${list.length} mods`;
      if (serverDetailModsCount) serverDetailModsCount.textContent = list.length;

      if (list.length === 0) {
        serverModsListContainer.innerHTML = `
          <div class="empty-state" style="padding: 28px 16px;">
            <p style="font-size: 14px; margin-bottom: 6px;">No hay mods instalados en este servidor todavía.</p>
            <small style="color: var(--text-dim);">Haz clic en "🔄 Sincronizar desde Instancia Cliente" para copiar todos los mods compatibles automáticamente con filtro anti-crash.</small>
          </div>
        `;
        return;
      }

      serverModsListContainer.innerHTML = '';
      list.forEach((mod) => {
        const card = document.createElement('div');
        card.className = 'pack-card';
        card.innerHTML = `
          <div class="pack-card-left">
            <img src="assets/logo.png" class="pack-card-icon" alt="Mod">
            <div class="pack-card-info">
              <span class="pack-card-title">${escapeHtml(mod.name || mod.fileName)}</span>
              <div class="pack-card-meta">
                <span>📁 ${escapeHtml(mod.fileName)}</span>
                <span>·</span>
                <span>📦 ${escapeHtml(mod.formattedSize || '')}</span>
              </div>
            </div>
          </div>
          <div class="pack-card-actions">
            <button class="btn btn-small btn-danger btn-icon-square btn-del-server-mod" data-filename="${escapeHtml(mod.fileName)}" title="Eliminar mod del servidor">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        `;

        card.querySelector('.btn-del-server-mod').addEventListener('click', async (e) => {
          e.stopPropagation();
          const fn = e.currentTarget.getAttribute('data-filename');
          if (confirm(`¿Eliminar el mod "${fn}" del servidor?`)) {
            await api.instancePacks.delete({ instancePath: server.serverDir, type: 'mods', fileName: fn });
            appendLog(`[Servers] Mod "${fn}" eliminado del servidor.`, 'info');
            await loadServerMods(id);
          }
        });

        serverModsListContainer.appendChild(card);
      });
    } catch (err) {
      serverModsListContainer.innerHTML = `<div class="empty-state">Error al cargar mods: ${escapeHtml(err.message)}</div>`;
    }
  }

  if (btnOpenServerModsDir) {
    btnOpenServerModsDir.addEventListener('click', async () => {
      if (currentSelectedServerId) await api.servers.openFolder(currentSelectedServerId);
    });
  }

  // --- MODAL: CREAR NUEVO SERVIDOR ---
  async function populateInstancesDropdown(selectElement) {
    if (!selectElement) return;
    try {
      const profiles = await api.profiles.getAll();
      const list = Array.isArray(profiles) ? profiles : [];
      selectElement.innerHTML = '';
      list.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.instancePath;
        opt.textContent = `${p.name} (${(p.loader || 'vanilla').toUpperCase()} ${p.gameVersion || p.mcVersion})`;
        selectElement.appendChild(opt);
      });
    } catch (_) {}
  }

  if (btnOpenCreateServerModal) {
    btnOpenCreateServerModal.addEventListener('click', async () => {
      if (modalCreateServer) modalCreateServer.style.display = 'flex';
      await populateInstancesDropdown(selectServerSyncInstance);
    });
  }

  if (btnEmptyCreateServer) {
    btnEmptyCreateServer.addEventListener('click', async () => {
      if (modalCreateServer) modalCreateServer.style.display = 'flex';
      await populateInstancesDropdown(selectServerSyncInstance);
    });
  }

  if (btnCloseCreateServerModal) btnCloseCreateServerModal.addEventListener('click', () => { if (modalCreateServer) modalCreateServer.style.display = 'none'; });
  if (btnCancelCreateServer) btnCancelCreateServer.addEventListener('click', () => { if (modalCreateServer) modalCreateServer.style.display = 'none'; });

  if (btnSubmitCreateServer) {
    btnSubmitCreateServer.addEventListener('click', async () => {
      const name = inputServerCreateName ? inputServerCreateName.value.trim() : 'Mi Servidor';
      const mcVersion = selectServerCreateMc ? selectServerCreateMc.value : '1.21.1';
      const loader = selectServerCreateLoader ? selectServerCreateLoader.value : 'neoforge';
      const ram = selectServerCreateRam ? selectServerCreateRam.value : '6G';
      const port = inputServerCreatePort ? Number(inputServerCreatePort.value) || 25565 : 25565;
      const syncMods = Boolean(checkServerSyncModsOnCreate && checkServerSyncModsOnCreate.checked);
      const sourceInstancePath = selectServerSyncInstance ? selectServerSyncInstance.value : null;

      btnSubmitCreateServer.disabled = true;
      if (btnCancelCreateServer) btnCancelCreateServer.disabled = true;
      if (serverInstallProgressBox) serverInstallProgressBox.style.display = 'block';

      try {
        const res = await api.servers.create({
          name,
          mcVersion,
          loader,
          ram,
          port,
          syncMods,
          sourceInstancePath
        });

        if (res.success) {
          appendLog(`[Servers] ¡Servidor "${name}" creado exitosamente!`, 'success');
          if (res.server?.syncStats) {
            appendLog(`[ServerModFilter] Sincronizados ${res.server.syncStats.totalCopied} mods al servidor (${res.server.syncStats.totalSkipped} mods exclusivos de cliente omitidos).`, 'info');
          }
          if (modalCreateServer) modalCreateServer.style.display = 'none';
          await loadDedicatedServers();
          if (res.server?.id) selectDedicatedServer(res.server.id);
        } else {
          throw new Error(res.error || 'Error desconocido al crear servidor.');
        }
      } catch (err) {
        alert(`Error al crear servidor: ${err.message}`);
        appendLog(`[Server Error] ${err.message}`, 'error');
      } finally {
        btnSubmitCreateServer.disabled = false;
        if (btnCancelCreateServer) btnCancelCreateServer.disabled = false;
        if (serverInstallProgressBox) serverInstallProgressBox.style.display = 'none';
      }
    });
  }

  // --- MODAL: SINCRONIZAR MODS DESDE INSTANCIA CLIENTE ---
  async function openSyncServerModal() {
    if (!currentSelectedServerId || !modalSyncServerMods) return;
    modalSyncServerMods.style.display = 'flex';
    if (syncServerResultBox) syncServerResultBox.style.display = 'none';
    await populateInstancesDropdown(selectSyncSourceInstance);
  }

  const btnSyncServerMods = document.getElementById('btn-sync-server-mods');
  if (btnSyncServerMods) btnSyncServerMods.addEventListener('click', openSyncServerModal);
  if (btnSyncServerModsTop) btnSyncServerModsTop.addEventListener('click', openSyncServerModal);

  if (btnCloseSyncServerModal) btnCloseSyncServerModal.addEventListener('click', () => { if (modalSyncServerMods) modalSyncServerMods.style.display = 'none'; });
  if (btnCancelSyncServer) btnCancelSyncServer.addEventListener('click', () => { if (modalSyncServerMods) modalSyncServerMods.style.display = 'none'; });

  if (btnExecuteSyncServer) {
    btnExecuteSyncServer.addEventListener('click', async () => {
      if (!currentSelectedServerId) return;
      const instancePath = selectSyncSourceInstance ? selectSyncSourceInstance.value : null;
      if (!instancePath) {
        alert('Por favor selecciona una instancia cliente de origen.');
        return;
      }
      const copyConfigs = checkSyncCopyConfigs ? checkSyncCopyConfigs.checked : true;

      btnExecuteSyncServer.disabled = true;
      if (btnExecuteSyncServerText) btnExecuteSyncServerText.textContent = 'Sincronizando...';

      try {
        const res = await api.servers.syncMods(currentSelectedServerId, instancePath, copyConfigs);
        if (res.success) {
          const msg = `⚡ ¡Sincronización completada! ${res.totalCopied} mods copiados al servidor (${res.totalSkipped} mods exclusivos de cliente omitidos automáticamente para evitar crasheos).`;
          if (syncServerResultBox) syncServerResultBox.style.display = 'block';
          if (syncServerResultText) syncServerResultText.innerHTML = `<span style="color: #34d399;">${escapeHtml(msg)}</span>`;
          appendLog(`[ServerModFilter] ${msg}`, 'success');
          await loadDedicatedServers();
          await loadServerMods(currentSelectedServerId);
          setTimeout(() => {
            if (modalSyncServerMods) modalSyncServerMods.style.display = 'none';
          }, 1800);
        }
      } catch (err) {
        alert(`Error al sincronizar mods: ${err.message}`);
        appendLog(`[Sync Error] ${err.message}`, 'error');
      } finally {
        btnExecuteSyncServer.disabled = false;
        if (btnExecuteSyncServerText) btnExecuteSyncServerText.textContent = 'Iniciar Sincronización';
      }
    });
  }

  if (btnRefreshServersList) {
    btnRefreshServersList.addEventListener('click', () => loadDedicatedServers());
  }

  // --- LISTENERS DE EVENTOS EN TIEMPO REAL DEL SERVIDOR ---
  api.events.on('server:log', ({ serverId, line, isError }) => {
    if (serverId === currentSelectedServerId) {
      appendServerLog(line, isError);
    }
  });

  api.events.on('server:status', ({ serverId, status }) => {
    const s = localServersCache.find((x) => x.id === serverId);
    if (s) s.status = status;
    renderServersList();

    if (serverId === currentSelectedServerId) {
      updateServerStatusUI(status);
    }
  });

  api.events.on('server:players', ({ serverId, players }) => {
    const s = localServersCache.find((x) => x.id === serverId);
    if (s) s.players = players;

    if (serverId === currentSelectedServerId) {
      updateServerPlayersUI(players);
    }
  });

  api.events.on('server:stats', ({ serverId, memoryMb, cpuPercent, uptime }) => {
    if (serverId === currentSelectedServerId) {
      if (serverStatRam) serverStatRam.textContent = `${memoryMb} MB`;
      if (serverStatCpu) serverStatCpu.textContent = `${cpuPercent}%`;
    }
  });

  api.events.on('server:install-progress', ({ serverId, message, percent }) => {
    if (serverInstallProgressFill && percent !== undefined) {
      serverInstallProgressFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }
    if (serverInstallProgressText && message) {
      serverInstallProgressText.textContent = message;
    }
  });

  // =======================================================
  // GALERÍA DE CAPTURAS DE PANTALLA (SCREENSHOTS)
  // =======================================================
  const selectScreenshotsInstanceFilter = document.getElementById('select-screenshots-instance-filter');
  const btnOpenActiveScreenshotsFolder = document.getElementById('btn-open-active-screenshots-folder');
  const btnRefreshScreenshots = document.getElementById('btn-refresh-screenshots');
  const screenshotsGridContainer = document.getElementById('screenshots-grid-container');

  // Modal Lightbox
  const modalScreenshotLightbox = document.getElementById('modal-screenshot-lightbox');
  const btnCloseScreenshotLightbox = document.getElementById('btn-close-lightbox');
  const lightboxFilename = document.getElementById('lightbox-filename');
  const lightboxMeta = document.getElementById('lightbox-meta');
  const btnLightboxCopy = document.getElementById('btn-lightbox-copy');
  const btnLightboxFolder = document.getElementById('btn-lightbox-folder');
  const btnLightboxDelete = document.getElementById('btn-lightbox-delete');

  let currentActiveLightboxScreenshot = null;

  async function loadScreenshotsInstancesFilter() {
    if (!selectScreenshotsInstanceFilter) return;
    try {
      const profiles = await api.profiles.getAll();
      const currentVal = selectScreenshotsInstanceFilter.value || 'all';
      selectScreenshotsInstanceFilter.innerHTML = '<option value="all">Todas las instancias</option>';
      (profiles || []).forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name || 'Instancia';
        selectScreenshotsInstanceFilter.appendChild(opt);
      });
      selectScreenshotsInstanceFilter.value = currentVal;
    } catch (_) {}
  }

  async function loadScreenshotsGallery() {
    if (!screenshotsGridContainer) return;
    const filterId = selectScreenshotsInstanceFilter?.value || 'all';
    screenshotsGridContainer.innerHTML = '<div class="empty-state">Escaneando capturas de pantalla...</div>';

    try {
      const items = await api.screenshots.list({ instanceId: filterId });

      if (!items || items.length === 0) {
        screenshotsGridContainer.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1; padding: 48px 16px;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--text-dim); margin-bottom: 12px;">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <p style="margin: 0; font-size: 14px; color: var(--text-primary); font-weight: 500;">No se encontraron capturas de pantalla</p>
            <small style="color: var(--text-muted); margin-top: 4px; display: block;">Presiona F2 mientras juegas Minecraft para tomar capturas de alta resolución.</small>
          </div>
        `;
        return;
      }

      screenshotsGridContainer.innerHTML = '';
      items.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'screenshot-card';
        card.innerHTML = `
          <div class="screenshot-thumb-box" title="Clic para ampliar en pantalla completa">
            <img class="screenshot-thumb" src="${escapeHtml(item.fileUrl)}" alt="${escapeHtml(item.fileName)}" loading="lazy" />
            <span class="screenshot-badge-instance">${escapeHtml(item.instanceName)}</span>
          </div>
          <div class="screenshot-card-body">
            <span class="screenshot-card-filename" title="${escapeHtml(item.fileName)}">${escapeHtml(item.fileName)}</span>
            <div class="screenshot-card-meta">
              <span>${escapeHtml(item.dateFormatted)}</span>
              <span>${escapeHtml(item.sizeFormatted)}</span>
            </div>
          </div>
          <div class="screenshot-card-actions">
            <button class="btn btn-secondary btn-compact btn-card-copy" title="Copiar imagen al portapapeles para pegar directo en Discord (Ctrl+V)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              <span>Copiar</span>
            </button>
            <button class="btn btn-secondary btn-compact btn-card-folder" title="Mostrar en el Explorador de Windows">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              <span>Carpeta</span>
            </button>
            <button class="btn btn-danger btn-compact btn-card-delete" title="Eliminar captura">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        `;

        // Click en thumbnail para lightbox
        card.querySelector('.screenshot-thumb-box').addEventListener('click', () => {
          openScreenshotLightbox(item);
        });

        // Botón copiar al portapapeles
        const btnCopy = card.querySelector('.btn-card-copy');
        btnCopy.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            await api.screenshots.copyToClipboard(item.filePath);
            btnCopy.innerHTML = '<span>✔ ¡Copiada!</span>';
            setTimeout(() => {
              btnCopy.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg><span>Copiar</span>';
            }, 2000);
            appendLog('[Capturas] Imagen copiada al portapapeles. Pégala directamente con Ctrl+V en Discord o Paint.', 'success');
          } catch (err) {
            alert(`Error al copiar: ${err.message}`);
          }
        });

        // Botón mostrar en carpeta
        card.querySelector('.btn-card-folder').addEventListener('click', async (e) => {
          e.stopPropagation();
          await api.screenshots.showInFolder(item.filePath);
        });

        // Botón eliminar
        card.querySelector('.btn-card-delete').addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm(`¿Eliminar la captura "${item.fileName}"?`)) {
            await api.screenshots.delete(item.filePath);
            loadScreenshotsGallery();
          }
        });

        screenshotsGridContainer.appendChild(card);
      });
    } catch (err) {
      screenshotsGridContainer.innerHTML = `<div class="empty-state">Error cargando capturas: ${escapeHtml(err.message)}</div>`;
    }
  }

  function openScreenshotLightbox(item) {
    if (!modalScreenshotLightbox) return;
    currentActiveLightboxScreenshot = item;
    if (lightboxImage) lightboxImage.src = item.fileUrl;
    if (lightboxFilename) lightboxFilename.textContent = item.fileName;
    if (lightboxMeta) lightboxMeta.textContent = `Instancia: ${item.instanceName} · ${item.sizeFormatted} · ${item.dateFormatted}`;
    modalScreenshotLightbox.classList.remove('hidden');
  }

  function closeScreenshotLightbox() {
    if (!modalScreenshotLightbox) return;
    modalScreenshotLightbox.classList.add('hidden');
    currentActiveLightboxScreenshot = null;
    if (lightboxImage) lightboxImage.src = '';
  }

  if (btnCloseScreenshotLightbox) {
    btnCloseScreenshotLightbox.addEventListener('click', closeScreenshotLightbox);
  }

  if (modalScreenshotLightbox) {
    modalScreenshotLightbox.addEventListener('click', (e) => {
      if (e.target === modalScreenshotLightbox) {
        closeScreenshotLightbox();
      }
    });
  }

  if (btnLightboxCopy) {
    btnLightboxCopy.addEventListener('click', async () => {
      if (!currentActiveLightboxScreenshot) return;
      try {
        await api.screenshots.copyToClipboard(currentActiveLightboxScreenshot.filePath);
        const originalText = btnLightboxCopy.innerHTML;
        btnLightboxCopy.innerHTML = '<span>✔ ¡Copiada al Portapapeles!</span>';
        setTimeout(() => {
          btnLightboxCopy.innerHTML = originalText;
        }, 2200);
        appendLog('[Capturas] Captura copiada al portapapeles. Pégala con Ctrl+V en Discord.', 'success');
      } catch (err) {
        alert(`Error al copiar: ${err.message}`);
      }
    });
  }

  if (btnLightboxFolder) {
    btnLightboxFolder.addEventListener('click', async () => {
      if (currentActiveLightboxScreenshot) {
        await api.screenshots.showInFolder(currentActiveLightboxScreenshot.filePath);
      }
    });
  }

  if (btnLightboxDelete) {
    btnLightboxDelete.addEventListener('click', async () => {
      if (!currentActiveLightboxScreenshot) return;
      if (confirm(`¿Eliminar definitivamente la captura "${currentActiveLightboxScreenshot.fileName}"?`)) {
        await api.screenshots.delete(currentActiveLightboxScreenshot.filePath);
        closeScreenshotLightbox();
        loadScreenshotsGallery();
      }
    });
  }

  if (selectScreenshotsInstanceFilter) {
    selectScreenshotsInstanceFilter.addEventListener('change', () => {
      loadScreenshotsGallery();
    });
  }

  if (btnRefreshScreenshots) {
    btnRefreshScreenshots.addEventListener('click', () => {
      loadScreenshotsGallery();
    });
  }

  if (btnOpenActiveScreenshotsFolder) {
    btnOpenActiveScreenshotsFolder.addEventListener('click', async () => {
      const filterId = selectScreenshotsInstanceFilter?.value || 'all';
      await api.screenshots.openFolder(filterId);
    });
  }

  // =======================================================
  // UTILIDADES HUD / VANILLA+ (LUNAR CLIENT STYLE)
  // =======================================================
  const switchHudFullbright = document.getElementById('switch-hud-fullbright');
  const switchHudAutosprint = document.getElementById('switch-hud-autosprint');
  const switchHudNoclouds = document.getElementById('switch-hud-noclouds');
  const switchHudNovsync = document.getElementById('switch-hud-novsync');

  const switchHudCoords = document.getElementById('switch-hud-coords');
  const switchHudZoom = document.getElementById('switch-hud-zoom');
  const switchHudArmor = document.getElementById('switch-hud-armor');
  const switchHudFps = document.getElementById('switch-hud-fps');
  const btnRefreshHudState = document.getElementById('btn-refresh-hud-state');

  async function loadHudState() {
    try {
      const activeProfile = await api.profiles.getActive();
      if (!activeProfile) return;
      const instanceDir = activeProfile.gameDirectory;
      if (!instanceDir) return;

      const res = await api.hud.getState(instanceDir);
      if (res && res.success) {
        if (switchHudFullbright) switchHudFullbright.checked = !!res.options.fullbright;
        if (switchHudAutosprint) switchHudAutosprint.checked = !!res.options.autoSprint;
        if (switchHudNoclouds) switchHudNoclouds.checked = !!res.options.noClouds;
        if (switchHudNovsync) switchHudNovsync.checked = !!res.options.noVsync;

        if (switchHudCoords) switchHudCoords.checked = !!res.mods.coords;
        if (switchHudZoom) switchHudZoom.checked = !!res.mods.zoom;
        if (switchHudArmor) switchHudArmor.checked = !!res.mods.armor;
        if (switchHudFps) switchHudFps.checked = !!res.mods.fps;
      }
    } catch (err) {
      console.warn('Error cargando estado HUD:', err.message);
    }
  }

  async function handleOptionToggle(optionKey, value) {
    try {
      const activeProfile = await api.profiles.getActive();
      if (!activeProfile || !activeProfile.gameDirectory) return;
      await api.hud.setOption(activeProfile.gameDirectory, optionKey, value);
      appendLog(`[HUD] Ajuste "${optionKey}" ${value ? 'ACTIVADO' : 'DESACTIVADO'} en options.txt de la instancia.`, 'info');
    } catch (err) {
      alert(`Error al actualizar options.txt: ${err.message}`);
    }
  }

  async function handleModToggle(modType, enable, switchElem) {
    try {
      const activeProfile = await api.profiles.getActive();
      if (!activeProfile) return;
      if (switchElem) switchElem.disabled = true;
      appendLog(`[HUD Mods] ${enable ? 'Instalando y activando' : 'Desactivando'} módulo "${modType}"...`, 'info');
      const res = await api.hud.toggleMod(activeProfile.id, modType, enable);
      if (res && res.success) {
        appendLog(`[HUD Mods] Módulo "${modType}" ${enable ? 'activado' : 'desactivado'} con éxito.`, 'success');
      }
    } catch (err) {
      alert(`Error en módulo HUD: ${err.message}`);
      if (switchElem) switchElem.checked = !enable;
    } finally {
      if (switchElem) switchElem.disabled = false;
      loadHudState();
    }
  }

  if (switchHudFullbright) {
    switchHudFullbright.addEventListener('change', (e) => handleOptionToggle('fullbright', e.target.checked));
  }
  if (switchHudAutosprint) {
    switchHudAutosprint.addEventListener('change', (e) => handleOptionToggle('autoSprint', e.target.checked));
  }
  if (switchHudNoclouds) {
    switchHudNoclouds.addEventListener('change', (e) => handleOptionToggle('noClouds', e.target.checked));
  }
  if (switchHudNovsync) {
    switchHudNovsync.addEventListener('change', (e) => handleOptionToggle('noVsync', e.target.checked));
  }

  if (switchHudCoords) {
    switchHudCoords.addEventListener('change', (e) => handleModToggle('coords', e.target.checked, switchHudCoords));
  }
  if (switchHudZoom) {
    switchHudZoom.addEventListener('change', (e) => handleModToggle('zoom', e.target.checked, switchHudZoom));
  }
  if (switchHudArmor) {
    switchHudArmor.addEventListener('change', (e) => handleModToggle('armor', e.target.checked, switchHudArmor));
  }
  if (switchHudFps) {
    switchHudFps.addEventListener('change', (e) => handleModToggle('fps', e.target.checked, switchHudFps));
  }
  if (btnRefreshHudState) {
    btnRefreshHudState.addEventListener('click', () => loadHudState());
  }

  // Inicialización
  await initLauncherUpdater();
  await loadConfig();
  await detectJava();
  try {
    const running = await api.launcher.getRunning();
    updateLaunchUIState(running ? running.length : 0);
  } catch (_) {}
});
