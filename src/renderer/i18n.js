/**
 * ShubaCore - Sistema de Internacionalización (i18n) Bilingüe (Español / Inglés)
 * Desarrollado por SHUBATECH
 */

const translations = {
  es: {
    // Navegación
    'nav.instances': 'Instancias',
    'nav.catalog': 'Explorar Catálogo',
    'nav.instanceManager': 'Gestor de Instancia',
    'nav.servers': 'Mis Servidores',
    'nav.social': 'Amigos & Social',
    'nav.screenshots': 'Capturas',
    'nav.wardrobe': 'Vestidor de Skins',
    'nav.controller': 'Configurar Mando',
    'nav.settings': 'Java y Ajustes',
    'nav.console': 'Consola & Logs',

    // Barra de Lanzamiento
    'launch.play': 'JUGAR',
    'launch.stop': 'Detener',
    'launch.playing': 'JUGANDO...',
    'launch.launching': 'INICIANDO...',
    'launch.installing': 'INSTALANDO...',
    'launch.selectInstance': 'Seleccionar instancia',

    // Cabecera de Instancia
    'header.backToInstance': 'Volver a la Instancia',
    'header.play': 'JUGAR',

    // Pestañas y Acciones de Catálogo y Mods
    'catalog.tabMods': 'Mods',
    'catalog.tabModpacks': 'Modpacks',
    'catalog.tabTextures': 'Texturas',
    'catalog.tabShaders': 'Shaders',
    'catalog.tabCustomMods': '🔥 Mods Custom (GitHub)',
    'catalog.filters': '⏳ Filtros',
    'common.prev': 'Anterior',
    'common.next': 'Siguiente',
    'common.search': 'Buscar',
    'common.refresh': 'Refrescar',
    'common.options': 'Opciones',
    'mods.purgeDuplicates': 'Purgar Duplicados',
    'mods.fpsOptimization': 'Optimización FPS',
    'mods.openModsFolder': 'Abrir Carpeta de Mods',
    'mods.uploadMod': '☁ Subir Mod (.jar)',

    // Vistas: Instancias
    'instances.title': 'Tus Instancias',
    'instances.subtitle': 'Perfiles independientes con sus propios mods, configuraciones y mundos.',
    'instances.newInstance': 'Nueva Instancia',
    'instances.shareCode': 'Compartir Código',
    'instances.importCode': 'Importar Código',
    'instances.importModpack': 'Importar Modpack',
    'instances.importShubapack': 'Importar .shubapack',
    'instances.searchPlaceholder': 'Buscar instancia...',
    'instances.empty': 'No tienes instancias creadas todavía.',

    // Tarjeta de Instancia
    'card.play': 'Jugar',
    'card.mods': 'Mods',
    'card.edit': 'Editar instancia',
    'card.logs': 'Ver logs y reportes',
    'card.openFolder': 'Abrir carpeta',
    'card.export': 'Exportar como .shubapack',
    'card.share': 'Compartir con amigos por código corto',
    'card.duplicate': 'Duplicar',
    'card.delete': 'Eliminar instancia',
    'card.modsCount': 'mods',

    // Tablón de Novedades
    'news.title': 'Tablón de Anuncios y Novedades',
    'news.minimize': '➖ Minimizar',
    'news.expand': '➕ Expandir',
    'news.refresh': '🔄 Actualizar',
    'news.readGithub': 'Leer en GitHub →',

    // Vestidor de Skins
    'wardrobe.title': 'Vestidor de Skins & Capas 3D',
    'wardrobe.subtitle': 'Personalización visual 100% nativa para Minecraft Vanilla y Modloaders con soporte para Élitros y Capas oficiales.',
    'wardrobe.removeSkin': 'Quitar Skin',
    'wardrobe.saveApply': 'Guardar y Aplicar',
    'wardrobe.hintRotate': '🖱 Arrastra para rotar · 🖱 Scroll para zoom',
    'wardrobe.capes': '🧥 Capas ▾',
    'wardrobe.selectCape': 'Seleccionar Capa',
    'wardrobe.uploadCape': 'Subir Capa (.png)',
    'wardrobe.noCape': 'Sin Capa',
    'wardrobe.elytra': '🪽 Élitros',
    'wardrobe.pause': '⏸ Pausa',
    'wardrobe.classic': '💪 Clásico (4px)',
    'wardrobe.slim': '⚡ Delgado (3px)',
    'wardrobe.reset': '🔄 Reset',
    'wardrobe.mySkins': 'Mis Skins',
    'wardrobe.mySkinsSubtitle': 'Skins que has usado o subido localmente.',
    'wardrobe.uploadSkin': '+ Subir Skin (.png)',
    'wardrobe.defaultSkins': 'Skins por Defecto',
    'wardrobe.defaultSkinsSubtitle': 'Las 9 skins oficiales de Minecraft (clásicas y slim).',
    'wardrobe.cloneTitle': 'Clonar Skin de Jugador Premium',
    'wardrobe.cloneSubtitle': 'Descarga las texturas oficiales desde la API de Mojang.',
    'wardrobe.clonePlaceholder': 'Nombre de usuario (ej. Notch, Technoblade)',
    'wardrobe.cloneBtn': 'Obtener',

    // Modales de Perfil
    'modal.createTitle': 'Crea el perfil',
    'modal.editTitle': 'Editar el perfil',
    'modal.packName': 'Nombre del Modpack',
    'modal.mcVersion': 'Versión de Minecraft',
    'modal.modLoader': 'Cargador de mods',
    'modal.loaderVersion': 'Versión del cargador de mods',
    'modal.ramMin': 'RAM Mínima:',
    'modal.ramMax': 'RAM Máxima:',
    'modal.javaRuntime': 'Runtime de Java:',
    'modal.cancel': 'Cancelar',
    'modal.create': 'Crear',
    'modal.save': 'Guardar Cambios',
    'modal.snapshots': '🧪 Incluir Snapshots',

    // Modal Elegir Icono
    'chooseIcon.title': 'Elegir imagen del perfil',
    'chooseIcon.tabOfficial': 'Galería Oficial',
    'chooseIcon.tabUser': 'Mis Imágenes',
    'chooseIcon.uploadTitle': 'Sube o arrastra una imagen',
    'chooseIcon.uploadHint': 'Mínimo 150x150 JPG o PNG',
    'chooseIcon.choose': 'Elegir',

    // Modal Importar Código / Modpack
    'importCode.title': '📥 Importar Instancia por Código o Archivo',
    'importCode.desc': 'Introduce un código de amigo (ej. SHUBA-9F2A), un código (UUID) o enlace de CurseForge / Modrinth, o selecciona un archivo (.zip o .mrpack).',
    'importCode.label': 'Código o Enlace del Modpack:',
    'importCode.placeholder': 'Pega el código de CurseForge (UUID o 7 días), enlace o código de amigo...',
    'importCode.browse': '📁 Archivo local...',
    'importCode.customName': 'Nombre de la Nueva Instancia (Opcional):',
    'importCode.btnInstall': '⚡ Descargar e Instalar',

    // Catálogo
    'catalog.title': 'Catálogo de Contenido',
    'catalog.subtitle': 'Explora y descarga miles de mods, modpacks, resource packs y shaders con instalación en 1 clic.',
    'catalog.searchPlaceholder': 'Buscar mods, modpacks, shaders, texturas...',
    'catalog.install': 'Instalar',
    'catalog.installModpack': 'Instalar Modpack',
    'catalog.update': 'Actualizar',
    'catalog.installed': 'Instalado',
    'catalog.hiddenGem': '💎 Joya Oculta',

    // Ajustes
    'settings.title': 'Java y Ajustes',
    'settings.subtitle': 'Gestión de runtimes oficiales de Adoptium Temurin, asignación de memoria y rendimiento.',
    'settings.scanRuntimes': 'Escanear Runtimes',
    'settings.detectedJava': 'Versiones de Java Detectadas',
    'settings.performance': 'Rendimiento y Asignación de Memoria',
    'settings.languageTitle': '🌐 Idioma del Launcher',
    'settings.languageDesc': 'Selecciona el idioma de la interfaz de usuario de ShubaCore.',
    'settings.languageSelectLabel': 'Idioma / Language:',
    'settings.globalJava': 'Selector Global de Java:',
    'settings.customJava': 'Ruta Personalizada (javaw.exe):',
    'settings.cleanStandby': '🧹 Limpiar Memoria Ahora',
    'settings.discordRpc': 'Activar actividad en Discord (Rich Presence)',
    'settings.controller': '🎮 Soporte para Mando (Inyección Nativa JVM)',

    // Modal Inicial de Bienvenida de Idioma
    'welcomeLang.title': '¡Bienvenido a ShubaCore Launcher!',
    'welcomeLang.subtitle': 'Por favor, selecciona tu idioma preferido para la interfaz / Please choose your preferred interface language:',
    'welcomeLang.esTitle': 'Español',
    'welcomeLang.esDesc': 'Interfaz, optimizaciones y notificaciones en español.',
    'welcomeLang.enTitle': 'English',
    'welcomeLang.enDesc': 'User interface, optimizations and notifications in English.',
    'welcomeLang.btnConfirm': 'Continuar'
  },
  en: {
    // Navigation
    'nav.instances': 'Instances',
    'nav.catalog': 'Explore Catalog',
    'nav.instanceManager': 'Instance Manager',
    'nav.servers': 'My Servers',
    'nav.social': 'Friends & Social',
    'nav.screenshots': 'Screenshots',
    'nav.wardrobe': 'Skin Wardrobe',
    'nav.controller': 'Controller Setup',
    'nav.settings': 'Java & Settings',
    'nav.console': 'Console & Logs',

    // Launch Bar
    'launch.play': 'PLAY',
    'launch.stop': 'Stop',
    'launch.playing': 'PLAYING...',
    'launch.launching': 'LAUNCHING...',
    'launch.installing': 'INSTALLING...',
    'launch.selectInstance': 'Select instance',

    // Instance Header
    'header.backToInstance': 'Back to Instance',
    'header.play': 'PLAY',

    // Catalog & Mods Tabs and Actions
    'catalog.tabMods': 'Mods',
    'catalog.tabModpacks': 'Modpacks',
    'catalog.tabTextures': 'Resource Packs',
    'catalog.tabShaders': 'Shaderpacks',
    'catalog.tabCustomMods': '🔥 Custom Mods (GitHub)',
    'catalog.filters': '⏳ Filters',
    'common.prev': 'Previous',
    'common.next': 'Next',
    'common.search': 'Search',
    'common.refresh': 'Refresh',
    'common.options': 'Options',
    'mods.purgeDuplicates': 'Purge Duplicates',
    'mods.fpsOptimization': 'FPS Optimization',
    'mods.openModsFolder': 'Open Mods Folder',
    'mods.uploadMod': '☁ Upload Mod (.jar)',

    // Views: Instances
    'instances.title': 'Your Instances',
    'instances.subtitle': 'Isolated profiles with their own mods, configurations, and save worlds.',
    'instances.newInstance': 'New Instance',
    'instances.shareCode': 'Share Code',
    'instances.importCode': 'Import Code',
    'instances.importModpack': 'Import Modpack',
    'instances.importShubapack': 'Import .shubapack',
    'instances.searchPlaceholder': 'Search instances...',
    'instances.empty': 'You have no instances created yet.',

    // Instance Card
    'card.play': 'Play',
    'card.mods': 'Mods',
    'card.edit': 'Edit instance',
    'card.logs': 'View logs & reports',
    'card.openFolder': 'Open folder',
    'card.export': 'Export as .shubapack',
    'card.share': 'Share short code',
    'card.duplicate': 'Duplicate',
    'card.delete': 'Delete instance',
    'card.modsCount': 'mods',

    // News & Changelogs
    'news.title': 'News & Changelogs Board',
    'news.minimize': '➖ Minimize',
    'news.expand': '➕ Expand',
    'news.refresh': '🔄 Refresh',
    'news.readGithub': 'Read on GitHub →',

    // Wardrobe & Skins
    'wardrobe.title': '3D Skin & Cape Wardrobe',
    'wardrobe.subtitle': '100% native visual customization for Minecraft Vanilla and Modloaders with official Elytra and Cape support.',
    'wardrobe.removeSkin': 'Remove Skin',
    'wardrobe.saveApply': 'Save & Apply',
    'wardrobe.hintRotate': '🖱 Drag to rotate · 🖱 Scroll to zoom',
    'wardrobe.capes': '🧥 Capes ▾',
    'wardrobe.selectCape': 'Select Cape',
    'wardrobe.uploadCape': 'Upload Cape (.png)',
    'wardrobe.noCape': 'No Cape',
    'wardrobe.elytra': '🪽 Elytra',
    'wardrobe.pause': '⏸ Pause',
    'wardrobe.classic': '💪 Classic (4px)',
    'wardrobe.slim': '⚡ Slim (3px)',
    'wardrobe.reset': '🔄 Reset',
    'wardrobe.mySkins': 'My Skins',
    'wardrobe.mySkinsSubtitle': 'Skins you have used or uploaded locally.',
    'wardrobe.uploadSkin': '+ Upload Skin (.png)',
    'wardrobe.defaultSkins': 'Default Skins',
    'wardrobe.defaultSkinsSubtitle': 'The 9 official Minecraft skins (classic & slim).',
    'wardrobe.cloneTitle': 'Clone Premium Player Skin',
    'wardrobe.cloneSubtitle': 'Download official textures directly from the Mojang API.',
    'wardrobe.clonePlaceholder': 'Player username (e.g. Notch, Technoblade)',
    'wardrobe.cloneBtn': 'Fetch',

    // Profile Modals
    'modal.createTitle': 'Create Profile',
    'modal.editTitle': 'Edit Profile',
    'modal.packName': 'Modpack Name',
    'modal.mcVersion': 'Minecraft Version',
    'modal.modLoader': 'Mod Loader',
    'modal.loaderVersion': 'Mod Loader Version',
    'modal.ramMin': 'Min RAM:',
    'modal.ramMax': 'Max RAM:',
    'modal.javaRuntime': 'Java Runtime:',
    'modal.cancel': 'Cancel',
    'modal.create': 'Create',
    'modal.save': 'Save Changes',
    'modal.snapshots': '🧪 Include Snapshots',

    // Choose Icon Modal
    'chooseIcon.title': 'Choose Profile Icon',
    'chooseIcon.tabOfficial': 'Official Gallery',
    'chooseIcon.tabUser': 'My Images',
    'chooseIcon.uploadTitle': 'Upload or drop an image',
    'chooseIcon.uploadHint': 'Minimum 150x150 JPG or PNG',
    'chooseIcon.choose': 'Choose',

    // Import Code / Modpack Modal
    'importCode.title': '📥 Import Instance by Code or File',
    'importCode.desc': 'Enter a friend share code (e.g. SHUBA-9F2A), a CurseForge/Modrinth code (UUID) or URL, or select a file (.zip or .mrpack).',
    'importCode.label': 'Modpack Code or Link:',
    'importCode.placeholder': 'Paste CurseForge code (UUID or 7-day share), link or friend code...',
    'importCode.browse': '📁 Local file...',
    'importCode.customName': 'New Instance Name (Optional):',
    'importCode.btnInstall': '⚡ Download & Install',

    // Catalog
    'catalog.title': 'Content Catalog',
    'catalog.subtitle': 'Browse and download thousands of mods, modpacks, resource packs, and shaders with 1-click install.',
    'catalog.searchPlaceholder': 'Search mods, modpacks, shaders, textures...',
    'catalog.install': 'Install',
    'catalog.installModpack': 'Install Modpack',
    'catalog.update': 'Update',
    'catalog.installed': 'Installed',
    'catalog.hiddenGem': '💎 Hidden Gem',

    // Settings
    'settings.title': 'Java & Settings',
    'settings.subtitle': 'Management of official Adoptium Temurin runtimes, memory allocation, and performance.',
    'settings.scanRuntimes': 'Scan Runtimes',
    'settings.detectedJava': 'Detected Java Versions',
    'settings.performance': 'Performance & Memory Allocation',
    'settings.languageTitle': '🌐 Launcher Language',
    'settings.languageDesc': 'Select the ShubaCore user interface language.',
    'settings.languageSelectLabel': 'Language / Idioma:',
    'settings.globalJava': 'Global Java Selector:',
    'settings.customJava': 'Custom javaw.exe Path:',
    'settings.cleanStandby': '🧹 Clean Memory Now',
    'settings.discordRpc': 'Enable Discord Activity (Rich Presence)',
    'settings.controller': '🎮 Controller Support (Native JVM Injection)',

    // Initial Language Welcome Modal
    'welcomeLang.title': 'Welcome to ShubaCore Launcher!',
    'welcomeLang.subtitle': 'Please choose your preferred interface language / Por favor, selecciona tu idioma preferido:',
    'welcomeLang.esTitle': 'Español',
    'welcomeLang.esDesc': 'Interfaz, optimizaciones y notificaciones en español.',
    'welcomeLang.enTitle': 'English',
    'welcomeLang.enDesc': 'User interface, optimizations and notifications in English.',
    'welcomeLang.btnConfirm': 'Continue'
  }
};

let currentLanguage = 'es';

function t(key, defaultValue = '') {
  const langDict = translations[currentLanguage] || translations.es;
  if (langDict && langDict[key] !== undefined) {
    return langDict[key];
  }
  const fallbackDict = translations.es;
  if (fallbackDict && fallbackDict[key] !== undefined) {
    return fallbackDict[key];
  }
  return defaultValue || key;
}

function getLanguage() {
  return currentLanguage;
}

function applyTranslationsToDOM() {
  if (typeof document === 'undefined') return;

  // Traducir texto de elementos con data-i18n
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const trans = t(key);
    if (trans) {
      el.textContent = trans;
    }
  });

  // Traducir placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    const trans = t(key);
    if (trans) {
      el.setAttribute('placeholder', trans);
    }
  });

  // Traducir títulos (tooltips)
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    const trans = t(key);
    if (trans) {
      el.setAttribute('title', trans);
    }
  });

  // Traducir dinámicamente elementos clave que no tienen atributo
  const playBtnText = document.getElementById('play-btn-text') || document.getElementById('btn-launch-text');
  if (playBtnText) {
    playBtnText.textContent = t('launch.play');
  }

  // Notificar al resto del frontend
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('shubacore:language-changed', { detail: { language: currentLanguage } }));
  }
}

async function setLanguage(lang, persist = true) {
  if (lang !== 'es' && lang !== 'en') lang = 'es';
  currentLanguage = lang;
  applyTranslationsToDOM();

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('shubacore_language', lang);
      localStorage.setItem('shubacore_language_chosen', 'true');
    } catch (_) {}
  }

  if (persist && typeof window !== 'undefined') {
    const api = window.shubaCoreAPI || window.api;
    if (api && api.config) {
      try {
        if (typeof api.config.setKey === 'function') {
          await api.config.setKey('general.language', lang);
          await api.config.setKey('general.languageChosen', true);
        } else if (typeof api.config.set === 'function') {
          await api.config.set('general.language', lang);
          await api.config.set('general.languageChosen', true);
        }
      } catch (e) {
        console.warn('[i18n] No se pudo persistir idioma en config:', e);
      }
    }
  }

  if (typeof document !== 'undefined') {
    const selectEl = document.getElementById('select-launcher-language');
    if (selectEl && selectEl.value !== lang) {
      selectEl.value = lang;
    }
  }
}

async function initI18n() {
  let savedLang = 'es';
  let languageChosen = false;

  // 1. Revisar localStorage primero para respuesta síncrona instantánea
  if (typeof localStorage !== 'undefined') {
    try {
      const lsLang = localStorage.getItem('shubacore_language');
      const lsChosen = localStorage.getItem('shubacore_language_chosen');
      if (lsLang) savedLang = lsLang;
      if (lsChosen === 'true') languageChosen = true;
    } catch (_) {}
  }

  // 2. Revisar API oficial del launcher (config.json)
  const api = (typeof window !== 'undefined' && (window.shubaCoreAPI || window.api)) || null;
  if (api && api.config) {
    try {
      if (typeof api.config.getKey === 'function') {
        const cfgLang = await api.config.getKey('general.language', null);
        const cfgChosen = await api.config.getKey('general.languageChosen', null);
        if (cfgLang) savedLang = cfgLang;
        if (cfgChosen === true) languageChosen = true;
      }
    } catch (_) {}
  }

  currentLanguage = savedLang === 'en' ? 'en' : 'es';
  applyTranslationsToDOM();

  const selectEl = document.getElementById('select-launcher-language');
  if (selectEl) {
    selectEl.value = currentLanguage;
    selectEl.addEventListener('change', (e) => {
      setLanguage(e.target.value, true);
    });
  }

  // Vincular eventos del modal de bienvenida
  setupWelcomeLanguageModal();

  // Si no se ha elegido idioma previamente (primer arranque), mostrar el modal de selección inicial
  if (!languageChosen) {
    showWelcomeLanguageModal();
  }
}

let welcomeModalSetup = false;
function setupWelcomeLanguageModal() {
  if (welcomeModalSetup) return;
  welcomeModalSetup = true;

  const cardEs = document.getElementById('card-welcome-lang-es');
  const cardEn = document.getElementById('card-welcome-lang-en');
  const btnConfirm = document.getElementById('btn-confirm-welcome-lang');
  let selectedWelcomeLang = currentLanguage || 'es';

  if (cardEs && cardEn) {
    if (selectedWelcomeLang === 'en') {
      cardEn.classList.add('selected');
      cardEs.classList.remove('selected');
    } else {
      cardEs.classList.add('selected');
      cardEn.classList.remove('selected');
    }

    cardEs.addEventListener('click', () => {
      selectedWelcomeLang = 'es';
      cardEs.classList.add('selected');
      cardEn.classList.remove('selected');
    });

    cardEn.addEventListener('click', () => {
      selectedWelcomeLang = 'en';
      cardEn.classList.add('selected');
      cardEs.classList.remove('selected');
    });
  }

  if (btnConfirm) {
    btnConfirm.addEventListener('click', async () => {
      await setLanguage(selectedWelcomeLang, true);
      closeWelcomeLanguageModal();
    });
  }
}

function showWelcomeLanguageModal() {
  const modal = document.getElementById('modal-language-welcome');
  if (!modal) return;
  modal.classList.add('active');
  modal.style.setProperty('display', 'flex', 'important');
}

function closeWelcomeLanguageModal() {
  const modal = document.getElementById('modal-language-welcome');
  if (!modal) return;
  modal.classList.remove('active');
  modal.style.setProperty('display', 'none', 'important');
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem('shubacore_language_chosen', 'true'); } catch (_) {}
  }
  const api = (typeof window !== 'undefined' && (window.shubaCoreAPI || window.api)) || null;
  if (api && api.config) {
    try {
      if (typeof api.config.setKey === 'function') {
        api.config.setKey('general.languageChosen', true);
      }
    } catch (_) {}
  }
}

// Exportar globalmente para renderer.js y navegador
if (typeof window !== 'undefined') {
  window.i18n = {
    t,
    getLanguage,
    setLanguage,
    initI18n,
    applyTranslationsToDOM,
    showWelcomeLanguageModal,
    closeWelcomeLanguageModal,
    translations
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    translations,
    t,
    getLanguage,
    setLanguage
  };
}
