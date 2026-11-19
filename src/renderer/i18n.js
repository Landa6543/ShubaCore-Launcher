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
    'settings.detectedJavaDesc': 'Escaneadas en el sistema operativo y en la carpeta portable de ShubaCore.',
    'settings.javaInstallHeader': 'Descarga e Instalación Oficial 1-Clic (Eclipse Temurin Windows x64):',
    'settings.installJava25': 'Instalar Java 25 (MC 26+ / Snapshots)',
    'settings.installJava21': 'Instalar Java 21 (MC 1.21.x)',
    'settings.installJava17': 'Instalar Java 17 (MC 1.20.x)',
    'settings.installJava8': 'Instalar Java 8 (MC 1.16.5 y anteriores)',
    'settings.autoDetect': 'Automático (Según versión de Minecraft)',
    'settings.forceJava25': 'Forzar Java 25 Global',
    'settings.forceJava21': 'Forzar Java 21 Global',
    'settings.forceJava17': 'Forzar Java 17 Global',
    'settings.forceJava8': 'Forzar Java 8 Global',
    'settings.customPath': 'Ruta Personalizada...',
    'settings.minRam': 'RAM Mínima Global:',
    'settings.maxRam': 'RAM Máxima Global:',
    'settings.launchBehaviorLabel': 'Al iniciar el juego (launchBehavior):',
    'settings.launchBehaviorHide': 'Ocultar launcher en segundo plano y volver a mostrar al cerrar Minecraft (Por defecto)',
    'settings.launchBehaviorKeep': 'Mantener la ventana del launcher abierta',
    'settings.launchBehaviorClose': 'Cerrar el launcher completamente al abrir el juego',
    'settings.launchBehaviorHelp': 'Controla si ShubaCore se oculta para optimizar GPU/RAM y reaparece al salir de Minecraft, o si se mantiene abierto.',
    'settings.discordRpcDesc': 'Muestra en tu perfil de Discord qué estás jugando, tiempo de sesión y mods activos en tiempo real.',
    'settings.controllerDesc': 'Permite usar mando de Xbox/PS de forma nativa sin instalar mods en la carpeta del juego. 100% libre de conflictos con mochilas e inventarios.',
    'settings.standbyTitle': 'Limpieza de Memoria Standby (Anti-Stuttering)',
    'settings.standbyDesc': 'Trimea los Working Sets y vacía la caché Standby de Windows para evitar micro-tirones y congelamientos durante el juego.',
    'settings.sharedFolderTitle': 'Carpeta de Almacenamiento Compartida (.shubacore)',
    'settings.examine': 'Examinar',
    'settings.diskCleanerTitle': '🧹 Limpiador de Basura y Logs Antiguos',
    'settings.diskCleanerDesc': 'Libera espacio en disco eliminando logs comprimidos (.log.gz), crash-reports antiguos y caché temporal sin tocar mundos, mods ni capturas.',
    'settings.scan': '🔍 Escanear',
    'settings.cleanNow': '🧹 Limpiar Ahora',
    'settings.updatesTitle': 'Actualizaciones del Launcher (ShubaCore)',
    'settings.updatesDesc': 'Motor Auto-Updater integrado vía GitHub Releases.',
    'settings.checkUpdates': 'Buscar actualizaciones del Launcher',
    'settings.customBgTitle': '🎨 Personalización de Interfaz',
    'settings.customBgDesc': 'Personaliza la apariencia del launcher con una imagen o GIF animado de fondo, ajustando la opacidad y el desenfoque.',
    'settings.selectBg': '🖼 Seleccionar Imagen / GIF de Fondo',
    'settings.resetBg': '↺ Restablecer Fondo Original',
    'settings.bgOpacity': 'Oscurecimiento / Opacidad:',
    'settings.bgBlur': 'Desenfoque (Blur):',

    // Consola y Logs
    'console.title': 'Consola del Juego',
    'console.filterPlaceholder': 'Filtrar logs...',
    'console.copyLog': 'Copiar Log',
    'console.openLatestLog': 'Abrir latest.log',
    'console.logsFolder': 'Carpeta Logs',
    'console.jvmDiag': 'Diagnóstico JVM',
    'console.clear': 'Limpiar',
    'console.idle': 'En espera',
    'console.activeJvmArgs': 'Argumentos JVM Activos:',

    // Modal de Detalle de Mod
    'detail.tabSummary': 'Resumen',
    'detail.tabContent': 'Contenido',
    'detail.tabChangelog': 'Registro de cambios',
    'detail.tabGallery': 'Galería',
    'detail.tabVersions': 'Versiones',
    'detail.website': 'Sitio Web',
    'detail.downloadServer': 'Descargar Servidor',

    // Advertencia de Instancia Vanilla en Catálogo de Mods
    'catalog.vanillaWarningTitle': 'Instancia Vanilla Seleccionada',
    'catalog.vanillaWarningDesc': 'Minecraft Vanilla no cuenta con un cargador de mods y no admite la instalación de mods. Para usar mods, cambia el cargador a Fabric, NeoForge o Forge en Editar Instancia, o explora Texturas y Shaders.',
    'catalog.viewTextures': 'Ver Texturas (Resource Packs)',
    'catalog.viewShaders': 'Ver Shaders',
    'catalog.changeToFabric': 'Cambiar Cargador a Fabric',
    'catalog.addingContent': 'Añadiendo contenido a la instancia:',

    // Claves adicionales
    'settings.browse': 'Buscar',
    'createProfile.namePlaceholder': 'Nombre del perfil',
    'account.switchAccount': 'Cambiar Cuenta',
    'account.defaultPlayer': 'Jugador',
    'btn.launch': 'JUGAR',

    // Modal Inicial de Bienvenida de Idioma
    'welcomeLang.title': '¡Bienvenido a ShubaCore Launcher!',
    'welcomeLang.subtitle': 'Por favor, selecciona tu idioma preferido para la interfaz / Please choose your preferred interface language:',
    'welcomeLang.esTitle': 'Español',
    'welcomeLang.esDesc': 'Interfaz, optimizaciones y notificaciones en español.',
    'welcomeLang.enTitle': 'English',
    'welcomeLang.enDesc': 'User interface, optimizations and notifications in English.',
    'welcomeLang.btnConfirm': 'Continuar',
// Controller Setup
    'controller.title': '🎮 Configurar Mando (Controlador)',
    'controller.subtitle': 'Soporte nativo para mandos de Xbox y PlayStation vía Win32 a 60Hz. 100% libre de mods en /mods.',
    'controller.disconnected': '⚠️ Ningún mando conectado',
    'controller.connected': '🎮 Mando conectado',
    'controller.supportLabel': 'Soporte de Mando:',
    'controller.testInjection': '⚡ Probar Inyección (5 seg)',
    'controller.resetDefault': '🔄 Predeterminado Xbox',
    'controller.saveMapping': '💾 Guardar Mapeo',
    'controller.leftStick': 'Stick Izquierdo (Movimiento)',
    'controller.leftStickSim': 'Simula W, A, S, D',
    'controller.deadzone': 'Zona Muerta (Deadzone):',
    'controller.deadzoneHelp': 'Evita derivas indeseadas al soltar el joystick.',
    'controller.rightStick': 'Stick Derecho (Cámara & Ratón)',
    'controller.sensitivity': 'Sensibilidad de Cámara:',
    'controller.invertY': 'Invertir Eje Y (Cámara)',
    'controller.assignedActions': 'Acciones de Minecraft Asignadas',
    'controller.hintMap': 'Presiona botones en tu mando físico para iluminarlos en verde o haz clic en cualquier botón de disparo para cambiar su acción de Minecraft.',
    'controller.action.jump': 'Saltar',
    'controller.action.attack': 'Atacar / Romper',
    'controller.action.use': 'Usar / Poner Bloque',
    'controller.action.inventory': 'Inventario',
    'controller.action.sneak': 'Agacharse',
    'controller.action.sprint': 'Correr',
    'controller.action.drop': 'Soltar Ítem',
    'controller.action.pause': 'Menú / Pausa',
    'controller.action.f5': 'Cambiar Perspectiva (F5)',
    'controller.action.chat': 'Abrir Chat (T)',
    'controller.action.swap_hand': 'Cambiar de Mano (F)',
    'controller.action.prev_item': 'Hotbar Izquierda',
    'controller.action.next_item': 'Hotbar Derecha',
    'controller.action.player_list': 'Lista Jugadores (Tab)',
    'controller.action.f3': 'Pantalla Debug (F3)',
    'controller.action.advancements': 'Logros (L)',
    'controller.action.zoom': 'Zoom Óptico (C)',
    'controller.action.none': 'Sin Asignar',

    // Screenshots Gallery
    'screenshots.title': 'Galería de Capturas',
    'screenshots.subtitle': 'Explora las fotos y capturas de pantalla tomadas en el juego (F2) de tus mundos y servidores.',
    'screenshots.allInstances': 'Todas las instancias',
    'screenshots.openFolder': 'Abrir Carpeta',
    'screenshots.empty': 'No se han encontrado capturas de pantalla aún. Presiona F2 en el juego para capturar momentos épicos.',

    // Social & Friends
    'social.title': 'Red Social & Amigos',
    'social.subtitle': 'Conéctate con amigos de ShubaCore, revisa quién está jugando en tiempo real y únete a sus mundos.',
    'social.refresh': 'Actualizar',
    'social.guestTitle': 'Conéctate a la Red ShubaCore',
    'social.guestDesc': 'Inicia sesión o crea tu cuenta gratuita de ShubaCore (solo necesitas usuario y contraseña) para agregar amigos, ver quién está jugando y recibir invitaciones a mundos.',
    'social.connectAccount': 'Conectar Cuenta ShubaCore',
    'social.searchPlaceholder': 'Buscar jugador por @usuario para ver su perfil o agregarlo...',
    'social.viewProfile': 'Ver Perfil',
    'social.sendRequest': 'Enviar Solicitud',
    'social.tabFriends': 'Mis Amigos',
    'social.tabExplore': 'Explorar Jugadores',
    'social.tabRequests': 'Solicitudes',
    'social.tabInvites': 'Invitaciones a Partidas',
    'social.tabMyProfile': 'Mi Perfil Social',
    'social.saveProfile': 'Guardar Perfil Social',
    'social.chatWith': 'Chat con',
    'social.sendMessage': 'Enviar',
    'social.chatPlaceholder': 'Escribe un mensaje a tu amigo...',
    'social.online': 'En línea',
    'social.offline': 'Desconectado',
    'social.playing': 'Jugando',
    'social.back': 'Volver',
    'social.noFriends': 'No tienes amigos agregados aún.',
    'social.noRequests': 'No tienes solicitudes pendientes.',
    'social.noInvites': 'No tienes invitaciones a partidas.',
    'social.bioLabel': 'Descripción Personal (Bio):',
    'social.bioPlaceholder': 'Escribe algo sobre ti (ej: ¡Fanático de los shaders, construcciones épicas y servidores técnicos!)...',
    'social.bioHelp': 'Visible para todos los jugadores que busquen tu perfil o te tengan de amigo.',
    'social.playstyleLabel': 'Estilo de Juego Principal:',

    // My Servers
    'servers.title': '🖥 Mis Servidores (Host Local)',
    'servers.subtitle': 'Crea, sincroniza mods y hostea servidores dedicados de Minecraft con consola interactiva y métricas en vivo.',
    'servers.lanTunnel': '🌐 Túnel LAN PlayIt',
    'servers.createServer': '➕ Crear Nuevo Servidor',
    'servers.importServer': '📂 Importar Servidor Existente',
    'servers.paneTitle': 'Servidores Creados',
    'servers.noServers': 'No hay servidores creados aún. Haz clic en "➕ Crear Nuevo Servidor".',
    'servers.noSelectedTitle': 'Ningún servidor seleccionado',
    'servers.noSelectedDesc': 'Selecciona un servidor de la columna izquierda, crea uno nuevo o importa una carpeta existente.',
    'servers.tabConsole': 'Consola & Control en Vivo',
    'servers.tabProps': 'Editar server.properties',
    'servers.tabMods': 'Mods del Servidor',
    'servers.start': 'Iniciar Servidor',
    'servers.stop': 'Detener Servidor',
    'servers.restart': 'Reiniciar',
    'servers.openFolder': 'Carpeta',
    'servers.ramUsage': 'USO DE RAM',
    'servers.cpuUsage': 'USO DE CPU',
    'servers.players': 'JUGADORES',
    'servers.localAddress': 'DIRECCIÓN LOCAL',
    'servers.realtimePlayers': 'Jugadores Conectados en Tiempo Real',
    'servers.serverConsole': 'Consola del Servidor',
    'servers.sendCmdPlaceholder': 'Escribe un comando de Minecraft (ej: op MiNick, gamemode creative MiNick, say Hola!)...',
    'servers.sendCmdBtn': 'Enviar',

    // Player Account Modal
    'account.modalTitle': 'Cuenta de Jugador',
    'account.tabShubacore': '⭐ ShubaCore Network',
    'account.tabMicrosoft': '🎮 Microsoft',
    'account.tabOffline': '👤 Offline',
    'account.offlineNicknameLabel': '👤 Nickname No-Premium en el Juego:',
    'account.saveNickname': 'Guardar',
    'account.linkMsDesc': '¿Tienes Minecraft comprado? Vincula tu cuenta de Microsoft para verificar tu perfil y jugar con amigos en cualquier servidor oficial.',
    'account.linkMsBtn': 'Vincular Cuenta Microsoft Oficial',
    'account.unlinkMsBtn': 'Desvincular Microsoft (Volver a Modo Libre)',
    'account.verifiedPremium': 'VERIFICADO (PREMIUM)',
    'account.launchAsLabel': 'Al pulsar JUGAR, entrar como:',
    'account.modeOffline': '👤 No-Premium',
    'account.modePremium': '🎮 Microsoft',
    'account.useAccount': 'Usar esta cuenta para jugar',
    'account.logout': 'Cerrar Sesión',
    'account.login': 'Iniciar Sesión',
    'account.register': 'Crear Cuenta',
    'account.username': 'Nombre de Usuario:',
    'account.password': 'Contraseña:',
    'account.passwordHint': 'Mínimo 6 caracteres',
    'account.guestDesc': 'Crea tu perfil en la Red ShubaCore con solo usuario y contraseña (sin correo real). Podrás agregar amigos y conectarte a sus partidas.',
    'account.saveAndUseOffline': 'Guardar y Usar Cuenta Offline',
    'account.offlineUsernameLabel': 'Nombre de Usuario Offline:',
    'account.assignedUuid': 'UUID asignado:',
    'account.activeAccount': 'Cuenta Activa',
    'account.switchOrAdd': 'Cambiar / Añadir cuenta',
    'account.officialXbox': 'Vinculación Oficial Xbox Live',
    'account.msLoginDesc': 'Conecta tu cuenta oficial de Minecraft / Xbox Live para jugar en servidores que requieran autenticación oficial.',
    'account.loginMsBtn': 'Iniciar sesión con Microsoft',
    'account.deviceModalTitle': 'Iniciar sesión con Microsoft',
    'account.deviceModalSubtitle': 'Vinculación Oficial Xbox Live'
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
    'settings.detectedJavaDesc': 'Scanned across the operating system and ShubaCore portable directory.',
    'settings.javaInstallHeader': 'Official 1-Click Download & Installation (Eclipse Temurin Windows x64):',
    'settings.installJava25': 'Install Java 25 (MC 26+ / Snapshots)',
    'settings.installJava21': 'Install Java 21 (MC 1.21.x)',
    'settings.installJava17': 'Install Java 17 (MC 1.20.x)',
    'settings.installJava8': 'Install Java 8 (MC 1.16.5 and older)',
    'settings.autoDetect': 'Automatic (Based on Minecraft version)',
    'settings.forceJava25': 'Force Global Java 25',
    'settings.forceJava21': 'Force Global Java 21',
    'settings.forceJava17': 'Force Global Java 17',
    'settings.forceJava8': 'Force Global Java 8',
    'settings.customPath': 'Custom Path...',
    'settings.minRam': 'Global Minimum RAM:',
    'settings.maxRam': 'Global Maximum RAM:',
    'settings.launchBehaviorLabel': 'When launching Minecraft (launchBehavior):',
    'settings.launchBehaviorHide': 'Hide launcher in background and restore on Minecraft exit (Default)',
    'settings.launchBehaviorKeep': 'Keep launcher window open',
    'settings.launchBehaviorClose': 'Close launcher completely on game launch',
    'settings.launchBehaviorHelp': 'Controls whether ShubaCore hides to conserve GPU/RAM and reappears on exit, or remains open.',
    'settings.discordRpcDesc': 'Displays in Discord what you are playing, session duration, and active mods in real time.',
    'settings.controllerDesc': 'Enables native Xbox/PlayStation controller support without game mods. 100% free of inventory or backpack conflicts.',
    'settings.standbyTitle': 'Standby Memory Cleaner (Anti-Stuttering)',
    'settings.standbyDesc': 'Trims Working Sets and purges Windows Standby Cache to eliminate micro-stutters and frame drops.',
    'settings.sharedFolderTitle': 'Shared Storage Directory (.shubacore)',
    'settings.examine': 'Browse',
    'settings.diskCleanerTitle': '🧹 Junk & Old Logs Cleaner',
    'settings.diskCleanerDesc': 'Frees up disk space by removing compressed logs (.log.gz), old crash reports, and temp caches without touching worlds, mods, or screenshots.',
    'settings.scan': '🔍 Scan',
    'settings.cleanNow': '🧹 Clean Now',
    'settings.updatesTitle': 'Launcher Updates (ShubaCore)',
    'settings.updatesDesc': 'Built-in Auto-Updater powered by GitHub Releases.',
    'settings.checkUpdates': 'Check for Launcher Updates',
    'settings.customBgTitle': '🎨 Interface Customization',
    'settings.customBgDesc': 'Customize the launcher appearance with an image or animated GIF background, tuning opacity and blur.',
    'settings.selectBg': '🖼 Select Background Image / GIF',
    'settings.resetBg': '↺ Reset Original Background',
    'settings.bgOpacity': 'Dimming / Opacity:',
    'settings.bgBlur': 'Blur Effect:',

    // Console & Logs
    'console.title': 'Game Console',
    'console.filterPlaceholder': 'Filter logs...',
    'console.copyLog': 'Copy Log',
    'console.openLatestLog': 'Open latest.log',
    'console.logsFolder': 'Logs Folder',
    'console.jvmDiag': 'JVM Diagnostics',
    'console.clear': 'Clear',
    'console.idle': 'Idle',
    'console.activeJvmArgs': 'Active JVM Arguments:',

    // Mod Detail Modal
    'detail.tabSummary': 'Summary',
    'detail.tabContent': 'Content',
    'detail.tabChangelog': 'Changelog',
    'detail.tabGallery': 'Gallery',
    'detail.tabVersions': 'Versions',
    'detail.website': 'Official Website',
    'detail.downloadServer': 'Download Server',

    // Vanilla Instance Warning in Mods Catalog
    'catalog.vanillaWarningTitle': 'Vanilla Instance Selected',
    'catalog.vanillaWarningDesc': 'Vanilla Minecraft does not feature a modloader and cannot run mods. To play with mods, switch this instance to Fabric, NeoForge, or Forge in Edit Instance, or explore Resource Packs and Shaders.',
    'catalog.viewTextures': 'View Resource Packs',
    'catalog.viewShaders': 'View Shaders',
    'catalog.changeToFabric': 'Switch Modloader to Fabric',
    'catalog.addingContent': 'Adding content to instance:',

    // Additional keys
    'settings.browse': 'Browse',
    'createProfile.namePlaceholder': 'Profile name',
    'account.switchAccount': 'Switch Account',
    'account.defaultPlayer': 'Player',
    'btn.launch': 'PLAY',

    // Initial Language Welcome Modal
    'welcomeLang.title': 'Welcome to ShubaCore Launcher!',
    'welcomeLang.subtitle': 'Please choose your preferred interface language / Por favor, selecciona tu idioma preferido:',
    'welcomeLang.esTitle': 'Español',
    'welcomeLang.esDesc': 'Interfaz, optimizaciones y notificaciones en español.',
    'welcomeLang.enTitle': 'English',
    'welcomeLang.enDesc': 'User interface, optimizations and notifications in English.',
    'welcomeLang.btnConfirm': 'Continue',
// Controller Setup
    'controller.title': '🎮 Controller Setup (Gamepad)',
    'controller.subtitle': 'Native Xbox & PlayStation controller support via Win32 at 60Hz. 100% mod-free in /mods.',
    'controller.disconnected': '⚠️ No controller connected',
    'controller.connected': '🎮 Controller connected',
    'controller.supportLabel': 'Controller Support:',
    'controller.testInjection': '⚡ Test Injection (5 sec)',
    'controller.resetDefault': '🔄 Xbox Defaults',
    'controller.saveMapping': '💾 Save Mapping',
    'controller.leftStick': 'Left Stick (Movement)',
    'controller.leftStickSim': 'Simulates W, A, S, D',
    'controller.deadzone': 'Deadzone:',
    'controller.deadzoneHelp': 'Prevents unwanted stick drift when released.',
    'controller.rightStick': 'Right Stick (Camera & Mouse)',
    'controller.sensitivity': 'Camera Sensitivity:',
    'controller.invertY': 'Invert Y Axis (Camera)',
    'controller.assignedActions': 'Assigned Minecraft Actions',
    'controller.hintMap': 'Press buttons on your controller to highlight them green or click any button to change its Minecraft action.',
    'controller.action.jump': 'Jump',
    'controller.action.attack': 'Attack / Break',
    'controller.action.use': 'Use / Place Block',
    'controller.action.inventory': 'Inventory',
    'controller.action.sneak': 'Sneak',
    'controller.action.sprint': 'Sprint',
    'controller.action.drop': 'Drop Item',
    'controller.action.pause': 'Menu / Pause',
    'controller.action.f5': 'Toggle Perspective (F5)',
    'controller.action.chat': 'Open Chat (T)',
    'controller.action.swap_hand': 'Swap Hand (F)',
    'controller.action.prev_item': 'Hotbar Left',
    'controller.action.next_item': 'Hotbar Right',
    'controller.action.player_list': 'Player List (Tab)',
    'controller.action.f3': 'Debug Screen (F3)',
    'controller.action.advancements': 'Advancements (L)',
    'controller.action.zoom': 'Optical Zoom (C)',
    'controller.action.none': 'Unassigned',

    // Screenshots Gallery
    'screenshots.title': 'Screenshots Gallery',
    'screenshots.subtitle': 'Explore in-game screenshots (F2) taken from your worlds and servers.',
    'screenshots.allInstances': 'All instances',
    'screenshots.openFolder': 'Open Folder',
    'screenshots.empty': 'No screenshots found yet. Press F2 in-game to capture epic moments.',

    // Social & Friends
    'social.title': 'Friends & Social Network',
    'social.subtitle': 'Connect with ShubaCore friends, see who is playing in real-time, and join their worlds.',
    'social.refresh': 'Refresh',
    'social.guestTitle': 'Connect to ShubaCore Network',
    'social.guestDesc': 'Sign in or create your free ShubaCore account (only username & password needed) to add friends, see who is playing, and receive world invites.',
    'social.connectAccount': 'Connect ShubaCore Account',
    'social.searchPlaceholder': 'Search player by @username to view profile or add...',
    'social.viewProfile': 'View Profile',
    'social.sendRequest': 'Send Request',
    'social.tabFriends': 'My Friends',
    'social.tabExplore': 'Explore Players',
    'social.tabRequests': 'Requests',
    'social.tabInvites': 'Game Invites',
    'social.tabMyProfile': 'My Social Profile',
    'social.saveProfile': 'Save Social Profile',
    'social.chatWith': 'Chat with',
    'social.sendMessage': 'Send',
    'social.chatPlaceholder': 'Type a message to your friend...',
    'social.online': 'Online',
    'social.offline': 'Offline',
    'social.playing': 'Playing',
    'social.back': 'Back',
    'social.noFriends': 'No friends added yet.',
    'social.noRequests': 'No pending requests.',
    'social.noInvites': 'No game invites.',
    'social.bioLabel': 'Personal Bio:',
    'social.bioPlaceholder': 'Write something about yourself (e.g. Shaders fan, epic builder and technical servers!)...',
    'social.bioHelp': 'Visible to all players who search your profile or have you as a friend.',
    'social.playstyleLabel': 'Primary Playstyle:',

    // My Servers
    'servers.title': '🖥 My Servers (Local Host)',
    'servers.subtitle': 'Create, sync mods, and host dedicated Minecraft servers with live console and real-time metrics.',
    'servers.lanTunnel': '🌐 PlayIt LAN Tunnel',
    'servers.createServer': '➕ Create New Server',
    'servers.importServer': '📂 Import Existing Server',
    'servers.paneTitle': 'Created Servers',
    'servers.noServers': 'No servers created yet. Click "➕ Create New Server".',
    'servers.noSelectedTitle': 'No server selected',
    'servers.noSelectedDesc': 'Select a server from the left column, create a new one, or import an existing folder.',
    'servers.tabConsole': 'Live Console & Control',
    'servers.tabProps': 'Edit server.properties',
    'servers.tabMods': 'Server Mods',
    'servers.start': 'Start Server',
    'servers.stop': 'Stop Server',
    'servers.restart': 'Restart',
    'servers.openFolder': 'Folder',
    'servers.ramUsage': 'RAM USAGE',
    'servers.cpuUsage': 'CPU USAGE',
    'servers.players': 'PLAYERS',
    'servers.localAddress': 'LOCAL ADDRESS',
    'servers.realtimePlayers': 'Real-Time Connected Players',
    'servers.serverConsole': 'Server Console',
    'servers.sendCmdPlaceholder': 'Type a Minecraft command (e.g. op MyNick, gamemode creative, say Hello!)...',
    'servers.sendCmdBtn': 'Send',

    // Player Account Modal
    'account.modalTitle': 'Player Account',
    'account.tabShubacore': '⭐ ShubaCore Network',
    'account.tabMicrosoft': '🎮 Microsoft',
    'account.tabOffline': '👤 Offline',
    'account.offlineNicknameLabel': '👤 In-Game Offline Nickname:',
    'account.saveNickname': 'Save',
    'account.linkMsDesc': 'Own official Minecraft? Link your Microsoft account to verify your profile and join official servers with friends.',
    'account.linkMsBtn': 'Link Official Microsoft Account',
    'account.unlinkMsBtn': 'Unlink Microsoft (Return to Free Mode)',
    'account.verifiedPremium': 'VERIFIED (PREMIUM)',
    'account.launchAsLabel': 'When clicking PLAY, join as:',
    'account.modeOffline': '👤 No-Premium',
    'account.modePremium': '🎮 Microsoft',
    'account.useAccount': 'Use this account to play',
    'account.logout': 'Sign Out',
    'account.login': 'Sign In',
    'account.register': 'Create Account',
    'account.username': 'Username:',
    'account.password': 'Password:',
    'account.passwordHint': 'Minimum 6 characters',
    'account.guestDesc': 'Create your profile on ShubaCore Network with username and password only (no real email required). Add friends and join their games.',
    'account.saveAndUseOffline': 'Save & Use Offline Account',
    'account.offlineUsernameLabel': 'Offline Username:',
    'account.assignedUuid': 'Assigned UUID:',
    'account.activeAccount': 'Active Account',
    'account.switchOrAdd': 'Switch / Add Account',
    'account.officialXbox': 'Official Xbox Live Link',
    'account.msLoginDesc': 'Connect your official Minecraft / Xbox Live account to play on servers requiring official authentication.',
    'account.loginMsBtn': 'Sign in with Microsoft',
    'account.deviceModalTitle': 'Sign in with Microsoft',
    'account.deviceModalSubtitle': 'Official Xbox Live Link'
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

let isTranslating = false;
function applyTranslationsToDOM() {
  if (typeof document === 'undefined' || isTranslating) return;
  isTranslating = true;
  try {
    // Actualizar atributo lang en <html>
    if (document.documentElement) {
      document.documentElement.lang = currentLanguage;
    }

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

    // Sincronizar el select de idioma
    const selectEl = document.getElementById('select-launcher-language');
    if (selectEl && selectEl.value !== currentLanguage) {
      selectEl.value = currentLanguage;
    }

    // Traducir dinámicamente elementos clave que no tienen atributo
    const playBtnText = document.getElementById('btn-launch-text') || document.getElementById('play-btn-text');
    if (playBtnText) {
      playBtnText.textContent = t('launch.play', 'JUGAR');
    }
  } finally {
    isTranslating = false;
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

  // Notificar al resto del frontend de manera limpia una sola vez
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('shubacore:language-changed', { detail: { language: currentLanguage } }));
  }
}

let i18nInitialized = false;
async function initI18n() {
  let savedLang = 'es';
  let languageChosen = false;

  // 1. Revisar localStorage primero para respuesta síncrona instantánea
  if (typeof localStorage !== 'undefined') {
    try {
      const lsLang = localStorage.getItem('shubacore_language');
      const lsChosen = localStorage.getItem('shubacore_language_chosen');
      if (lsLang) {
        savedLang = lsLang;
        languageChosen = true; // Si ya hay un idioma en localStorage, ya fue configurado
      }
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
        if (cfgLang) {
          savedLang = cfgLang;
          languageChosen = true; // Si ya está en config.json, ya fue seleccionado
        }
        if (cfgChosen === true) languageChosen = true;
      }
    } catch (_) {}
  }

  currentLanguage = savedLang === 'en' ? 'en' : 'es';
  applyTranslationsToDOM();

  const selectEl = document.getElementById('select-launcher-language');
  if (selectEl) {
    selectEl.value = currentLanguage;
    if (!selectEl._i18nBound) {
      selectEl._i18nBound = true;
      selectEl.addEventListener('change', (e) => {
        setLanguage(e.target.value, true);
      });
    }
  }

  // Vincular eventos del modal de bienvenida
  setupWelcomeLanguageModal();

  // Si no se ha elegido idioma previamente (primer arranque), mostrar el modal de selección inicial
  if (!languageChosen) {
    showWelcomeLanguageModal();
  }
  i18nInitialized = true;
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
      } else if (typeof api.config.set === 'function') {
        api.config.set('general.languageChosen', true);
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

// Auto-ejecución inmediata de i18n para inicializar y registrar el delegado de eventos en el navegador
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initI18n();
    });
  } else {
    initI18n();
  }

  // Listener delegado global en document para #select-launcher-language
  document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'select-launcher-language') {
      setLanguage(e.target.value, true);
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    translations,
    t,
    getLanguage,
    setLanguage,
    initI18n,
    applyTranslationsToDOM
  };
}
