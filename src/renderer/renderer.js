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

  // =======================================================
  // REFERENCIAS DOM: VENTANA Y NAVEGACIÓN
  // =======================================================
  const btnMinimize = document.getElementById('btn-minimize');
  const btnMaximize = document.getElementById('btn-maximize');
  const btnClose = document.getElementById('btn-close');

  // Vistas Principales (6 Vistas)
  const tabViewProfiles = document.getElementById('tab-view-profiles');
  const tabViewCatalog = document.getElementById('tab-view-catalog');
  const tabViewMods = document.getElementById('tab-view-mods');
  const tabViewSkins = document.getElementById('tab-view-skins');
  const tabViewSettings = document.getElementById('tab-view-settings');
  const tabViewConsole = document.getElementById('tab-view-console');

  const viewProfiles = document.getElementById('view-profiles');
  const viewCatalog = document.getElementById('view-catalog');
  const viewMods = document.getElementById('view-mods');
  const viewSkins = document.getElementById('view-skins');
  const viewSettings = document.getElementById('view-settings');
  const viewConsole = document.getElementById('view-console');

  // Cuenta y Avatar Canvas
  const accountStatus = document.getElementById('account-status');
  const sidebarAvatarCanvas = document.getElementById('sidebar-avatar-canvas');
  const playerName = document.getElementById('player-name');
  const playerType = document.getElementById('player-type');
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
  function renderSkinFaceToCanvas(imageSource, targetCanvas) {
    if (!targetCanvas) return;
    const ctx = targetCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

    if (!imageSource) {
      drawDefaultSteveFace(targetCanvas);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      // 1. Capa base de la cara (x:8, y:8, w:8, h:8)
      ctx.drawImage(img, 8, 8, 8, 8, 0, 0, targetCanvas.width, targetCanvas.height);
      // 2. Capa superior de pelo/sombrero (x:40, y:8, w:8, h:8)
      ctx.drawImage(img, 40, 8, 8, 8, 0, 0, targetCanvas.width, targetCanvas.height);
    };
    img.onerror = () => {
      drawDefaultSteveFace(targetCanvas);
    };
    img.src = imageSource;
  }

  function renderSkinBodyToCanvas(imageSource, targetCanvas) {
    if (!targetCanvas) return;
    const ctx = targetCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

    if (!imageSource) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
      const is64x64 = img.height >= 64;
      const s = targetCanvas.width / 16; // Normalizado 16x32

      // Cabeza: 8x8 en (4, 0)
      ctx.drawImage(img, 8, 8, 8, 8, 4 * s, 0 * s, 8 * s, 8 * s);
      ctx.drawImage(img, 40, 8, 8, 8, 4 * s, 0 * s, 8 * s, 8 * s);

      // Torso: 8x12 en (4, 8)
      ctx.drawImage(img, 20, 20, 8, 12, 4 * s, 8 * s, 8 * s, 12 * s);
      if (is64x64) {
        ctx.drawImage(img, 20, 36, 8, 12, 4 * s, 8 * s, 8 * s, 12 * s);
      }

      // Brazo Derecho: 4x12 en (0, 8)
      ctx.drawImage(img, 44, 20, 4, 12, 0 * s, 8 * s, 4 * s, 12 * s);
      if (is64x64) {
        ctx.drawImage(img, 44, 36, 4, 12, 0 * s, 8 * s, 4 * s, 12 * s);
      }

      // Brazo Izquierdo: 4x12 en (12, 8)
      if (is64x64) {
        ctx.drawImage(img, 36, 52, 4, 12, 12 * s, 8 * s, 4 * s, 12 * s);
        ctx.drawImage(img, 52, 52, 4, 12, 12 * s, 8 * s, 4 * s, 12 * s);
      } else {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(img, 44, 20, 4, 12, -(16 * s), 8 * s, 4 * s, 12 * s);
        ctx.restore();
      }

      // Pierna Derecha: 4x12 en (4, 20)
      ctx.drawImage(img, 4, 20, 4, 12, 4 * s, 20 * s, 4 * s, 12 * s);
      if (is64x64) {
        ctx.drawImage(img, 4, 36, 4, 12, 4 * s, 20 * s, 4 * s, 12 * s);
      }

      // Pierna Izquierda: 4x12 en (8, 20)
      if (is64x64) {
        ctx.drawImage(img, 20, 52, 4, 12, 8 * s, 20 * s, 4 * s, 12 * s);
        ctx.drawImage(img, 4, 52, 4, 12, 8 * s, 20 * s, 4 * s, 12 * s);
      } else {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(img, 4, 20, 4, 12, -(12 * s), 20 * s, 4 * s, 12 * s);
        ctx.restore();
      }
    };
    img.src = imageSource;
  }

  function drawDefaultSteveFace(targetCanvas) {
    if (!targetCanvas) return;
    const ctx = targetCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const w = targetCanvas.width;
    const h = targetCanvas.height;
    const p = w / 8;

    ctx.fillStyle = '#b78258';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#4a321d';
    ctx.fillRect(0, 0, w, p * 2);
    ctx.fillRect(0, p * 2, p, p);
    ctx.fillRect(w - p, p * 2, p, p);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(p, p * 4, p * 2, p);
    ctx.fillRect(p * 5, p * 4, p * 2, p);
    ctx.fillStyle = '#2c357b';
    ctx.fillRect(p * 2, p * 4, p, p);
    ctx.fillRect(p * 5, p * 4, p, p);

    ctx.fillStyle = '#9b6c46';
    ctx.fillRect(p * 3, p * 5, p * 2, p);

    ctx.fillStyle = '#5c3924';
    ctx.fillRect(p * 2, p * 6, p * 4, p);
    ctx.fillRect(p * 3, p * 7, p * 2, p);
  }

  // =======================================================
  // NAVEGACIÓN DE VISTAS (6 VISTAS DE ESCRITORIO)
  // =======================================================
  const navItems = [
    { btn: tabViewProfiles, view: viewProfiles, name: 'profiles' },
    { btn: tabViewCatalog, view: viewCatalog, name: 'catalog' },
    { btn: tabViewMods, view: viewMods, name: 'mods' },
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
      const msAccount = await api.auth.getMsAccount();
      const currentAccount = await api.auth.getCurrent();

      if (msAccount && (msAccount.name || msAccount.username)) {
        const msName = msAccount.name || msAccount.username;
        const msUuid = msAccount.uuid || '-';
        if (msActiveAccountCard) msActiveAccountCard.style.display = 'flex';
        if (msLoginPrompt) msLoginPrompt.style.display = 'none';
        if (msActiveGamertag) msActiveGamertag.textContent = msName;
        if (msActiveUuid) msActiveUuid.textContent = msUuid;

        // Renderizar cara en el canvas
        const skinUrl = msAccount.skinUrl || `https://mc-heads.net/skin/${msName}`;
        if (msActiveAvatarCanvas) renderSkinFaceToCanvas(skinUrl, msActiveAvatarCanvas);

        // Si la cuenta activa actual es esta cuenta Microsoft
        const isCurrentActive = currentAccount && currentAccount.uuid === msUuid && (currentAccount.type === 'premium' || currentAccount.type === 'microsoft');
        if (btnMsUseAccount) {
          btnMsUseAccount.style.display = 'inline-flex';
          if (isCurrentActive) {
            btnMsUseAccount.textContent = '✔ Cuenta Activa';
            btnMsUseAccount.disabled = true;
            btnMsUseAccount.style.opacity = '0.65';
          } else {
            btnMsUseAccount.textContent = 'Activar esta cuenta Microsoft';
            btnMsUseAccount.disabled = false;
            btnMsUseAccount.style.opacity = '1';
          }
        }
      } else {
        if (msActiveAccountCard) msActiveAccountCard.style.display = 'none';
        if (msLoginPrompt) msLoginPrompt.style.display = 'block';
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
        await api.auth.switchAccount(msAccount.uuid);
        const res = await api.auth.setActiveMode('microsoft');
        if (res && res.account) {
          await updatePlayerBadge(res.account);
          await refreshMicrosoftAccountState();
          appendLog(`[Auth] Sesión cambiada a cuenta Microsoft: "${res.account.name}"`, 'success');
          if (modalAccountManager) modalAccountManager.classList.remove('active');
        }
      } catch (err) {
        appendLog(`[Auth Error] ${err.message}`, 'error');
        btnMsUseAccount.disabled = false;
        btnMsUseAccount.textContent = 'Activar esta cuenta Microsoft';
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
      await api.auth.logoutMs();
      appendLog('[Auth] Sesión de Microsoft cerrada y desvinculada.', 'info');
      const current = await api.auth.getCurrent();
      if (!current) {
        await handleOfflineLogin('LanderAlo');
      } else {
        await updatePlayerBadge(current);
      }
      await refreshMicrosoftAccountState();
    });
  }

  async function handleOfflineLogin(username) {
    if (!username || username.trim().length < 3) {
      alert('Ingresa un nombre de usuario válido de al menos 3 caracteres.');
      return;
    }
    const result = await api.auth.loginOffline(username.trim());
    if (result.success) {
      updatePlayerBadge(result.account);
      appendLog(`[Auth] Sesión offline establecida para: ${result.account.name}`, 'info');
      if (modalAccountManager) modalAccountManager.classList.remove('active');
    } else {
      appendLog(`[Auth Error] ${result.error}`, 'error');
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

  async function updatePlayerBadge(account) {
    if (!account) return;
    const accName = account.name || account.username || 'Steve';
    playerName.textContent = accName;
    if (playerUuid) playerUuid.textContent = `UUID: ${account.uuid || '-'}`;
    if (skinModalUsername) skinModalUsername.textContent = accName;

    let skinToRender = account.skinUrl || `https://mc-heads.net/skin/${accName}`;
    const isPremium = account.type === 'premium' || account.type === 'microsoft';

    if (isPremium) {
      playerType.textContent = 'MICROSOFT';
      playerType.className = 'badge badge-premium';
      switchAccountModalTab('premium');
    } else {
      playerType.textContent = 'OFFLINE';
      playerType.className = 'badge badge-offline';
      if (inputOfflineUser) inputOfflineUser.value = accName;
      if (previewOfflineUuid) previewOfflineUuid.textContent = account.uuid || '-';
      switchAccountModalTab('offline');

      try {
        const customSkin = await api.skins.get(accName);
        if (customSkin && customSkin.exists && customSkin.dataUrl) {
          skinToRender = customSkin.dataUrl;
          if (skinAppliedStatus) skinAppliedStatus.textContent = 'Skin personalizada activa';
          if (skinPreviewLabel) skinPreviewLabel.textContent = 'Personalizada';
        } else {
          if (skinAppliedStatus) skinAppliedStatus.textContent = 'Skin predeterminada de Minecraft';
          if (skinPreviewLabel) skinPreviewLabel.textContent = 'Steve';
        }
      } catch (_) {}
    }

    // Renderizar cara en la barra lateral y en el vestidor
    renderSkinFaceToCanvas(skinToRender, sidebarAvatarCanvas);
    renderSkinFaceToCanvas(skinToRender, vestidorFaceCanvas);
    renderSkinBodyToCanvas(skinToRender, vestidorBodyCanvas);
  }

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
          if (skinAppliedStatus) skinAppliedStatus.textContent = 'Skin activa en el juego';
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
        const isValidUser = (u) => Boolean(u && typeof u === 'string' && u.trim() !== '' && u.trim() !== 'undefined');

        if (savedSession && savedSession.success) {
          const msUser = savedSession.microsoftAccount?.username || savedSession.microsoftAccount?.name;
          const offUser = savedSession.offlineAccount?.username || savedSession.offlineAccount?.name;

          if (savedSession.activeMode === 'microsoft' && isValidUser(msUser)) {
            const cleanMs = msUser.trim();
            const msAcc = savedSession.account || {
              name: cleanMs,
              username: cleanMs,
              uuid: savedSession.microsoftAccount.uuid,
              type: 'premium',
              skinUrl: savedSession.microsoftAccount.skinUrl
            };
            if (tabPremium && tabOffline && formPremium && formOffline) {
              tabPremium.classList.add('active');
              tabOffline.classList.remove('active');
              formPremium.classList.add('active');
              formOffline.classList.remove('active');
            }
            await updatePlayerBadge(msAcc);
            await refreshMicrosoftAccountState();
            appendLog(`[Auth] Sesión Microsoft restaurada automáticamente: "${cleanMs}" (Premium)`, 'info');
          } else if (isValidUser(offUser)) {
            const cleanOff = offUser.trim();
            const offAcc = savedSession.account || {
              name: cleanOff,
              username: cleanOff,
              uuid: savedSession.offlineAccount.uuid,
              type: 'offline'
            };
            if (inputOfflineUser) inputOfflineUser.value = cleanOff;
            if (tabPremium && tabOffline && formPremium && formOffline) {
              tabOffline.classList.add('active');
              tabPremium.classList.remove('active');
              formOffline.classList.add('active');
              formPremium.classList.remove('active');
            }
            await updatePlayerBadge(offAcc);
            appendLog(`[Auth] Sesión Offline restaurada: "${cleanOff}"`, 'info');
          } else if (isValidUser(msUser)) {
            const cleanMs = msUser.trim();
            const msAcc = savedSession.account || {
              name: cleanMs,
              username: cleanMs,
              uuid: savedSession.microsoftAccount.uuid,
              type: 'premium',
              skinUrl: savedSession.microsoftAccount.skinUrl
            };
            if (tabPremium && tabOffline && formPremium && formOffline) {
              tabPremium.classList.add('active');
              tabOffline.classList.remove('active');
              formPremium.classList.add('active');
              formOffline.classList.remove('active');
            }
            await updatePlayerBadge(msAcc);
            await refreshMicrosoftAccountState();
            appendLog(`[Auth] Sesión Microsoft restaurada: "${cleanMs}" (Premium)`, 'info');
          } else if (config.auth?.currentUser && isValidUser(config.auth.currentUser.name)) {
            await updatePlayerBadge(config.auth.currentUser);
          } else {
            const fallbackNick = (inputOfflineUser && isValidUser(inputOfflineUser.value))
              ? inputOfflineUser.value.trim()
              : 'LanderAlo';
            await handleOfflineLogin(fallbackNick);
          }
        } else if (config.auth?.currentUser && isValidUser(config.auth.currentUser.name)) {
          await updatePlayerBadge(config.auth.currentUser);
        } else {
          const fallbackNick = (inputOfflineUser && isValidUser(inputOfflineUser.value))
            ? inputOfflineUser.value.trim()
            : 'LanderAlo';
          await handleOfflineLogin(fallbackNick);
        }
      } catch (authInitErr) {
        console.warn('Error al cargar sesión persistente:', authInitErr);
        if (config.auth?.currentUser && config.auth.currentUser.name && config.auth.currentUser.name !== 'undefined') {
          await updatePlayerBadge(config.auth.currentUser);
        } else {
          await handleOfflineLogin('LanderAlo');
        }
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
      const channel = document.getElementById('select-update-channel')?.value || 'release';
      appendLog(`[Mods] Comprobando versiones compatibles más recientes en CurseForge y Modrinth (Canal: ${channel.toUpperCase()})...`, 'info');

      try {
        const targetInstance = currentActiveProfile?.instancePath || null;
        const res = await api.mods.checkUpdates({
          instancePath: targetInstance,
          mcVersion: currentActiveProfile?.mcVersion,
          loader: currentActiveProfile?.loader,
          channel
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
              <span>⚡ Actualizar Todos (<span id="updates-available-count">${activeAvailableUpdates.length}</span>)</span>
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

  const selectUpdateChannel = document.getElementById('select-update-channel');
  if (selectUpdateChannel) {
    selectUpdateChannel.addEventListener('change', () => {
      if (btnCheckModUpdates && !btnCheckModUpdates.disabled) {
        btnCheckModUpdates.click();
      }
    });
  }

  if (btnUpdateAllMods) {
    btnUpdateAllMods.addEventListener('click', async () => {
      const targetInstance = currentActiveProfile?.instancePath || null;
      const mcVer = currentActiveProfile?.mcVersion || '1.21.1';
      const loader = currentActiveProfile?.loader || 'neoforge';
      const channel = document.getElementById('select-update-channel')?.value || 'release';

      // 1. Si el usuario hace clic sin haber escaneado previamente, ejecutar escaneo primero
      if (!activeAvailableUpdates || activeAvailableUpdates.length === 0) {
        btnUpdateAllMods.disabled = true;
        const originalBtnHtml = btnUpdateAllMods.innerHTML;
        btnUpdateAllMods.innerHTML = '<span>Buscando...</span>';
        appendLog(`[Mods] Comprobando versiones compatibles más recientes en CurseForge y Modrinth (Canal: ${channel.toUpperCase()})...`, 'info');

        try {
          const res = await api.mods.checkUpdates({
            instancePath: targetInstance,
            mcVersion: mcVer,
            loader: loader,
            channel
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
            <span>⚡ Actualizar Todos (<span id="updates-available-count">${activeAvailableUpdates.length}</span>)</span>
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
    performModSearch();
  });

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
  // MOTOR DE LANZAMIENTO (JUGAR INSTANCIA ACTIVA)
  // =======================================================
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
      btnLaunch.disabled = false;
      if (btnLaunchText) btnLaunchText.textContent = 'JUGAR';
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

  api.events.on('launch:game-ready', () => {
    appendLog('[ShubaCore] ¡Ventana de Minecraft abierta y lista!', 'success');
  });

  api.events.on('launch:closing-launcher', (data) => {
    appendLog(`[Rendimiento] ${data.message}`, 'warn');
    launchBadge.textContent = 'En juego';
    launchBadge.className = 'badge badge-running';
    progressTaskLabel.textContent = 'Liberando 100% de RAM y CPU para Minecraft...';
  });

  api.events.on('launch:close', (data) => {
    appendLog(`[Launcher] El proceso de Minecraft finalizó con código: ${data.code}`, 'info');
    launchBadge.textContent = 'Finalizado';
    launchBadge.className = 'badge badge-idle';
    btnLaunch.disabled = false;
    if (btnLaunchText) btnLaunchText.textContent = 'JUGAR';
    if (dockLaunchProgress) dockLaunchProgress.style.display = 'none';
    progressBar.style.width = '0%';
    progressPercentLabel.textContent = '0%';
    progressTaskLabel.textContent = 'Listo';
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
    const msg = info?.message || `El launcher está en la versión más reciente (${info?.version ? 'v' + info.version : 'v1.0.0'}).`;
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

  // Inicialización
  await initLauncherUpdater();
  await loadConfig();
  await detectJava();
});
