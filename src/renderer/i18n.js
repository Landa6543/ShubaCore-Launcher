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
    'mods.uploadMod': 'Subir Mod (.jar)',
    'mods.syncMods': 'Sincronizar Mods',

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
    'modal.edition': 'Edición de Minecraft',
    'modal.editionJava': 'Java Edition',
    'modal.editionBedrock': 'Bedrock Edition',
    'card.addons': 'Add-ons',
    'bedrock.officialBadge': 'Minecraft Bedrock Edition (Windows)',
    'bedrock.infoDesc': 'Se ejecuta nativamente con tu instalación oficial de la Microsoft Store / app de Xbox. Permite importar y gestionar Add-ons (.mcpack, .mcaddon y .mcworld).',
    'bedrock.detecting': 'Comprobando instalación de Windows...',
    'bedrock.installed': '✔ Instalación oficial de Bedrock detectada en Windows.',
    'bedrock.notInstalled': '⚠ No detectado en este equipo. Requiere instalación desde Microsoft Store.',
    'bedrock.getInStore': 'Obtener en Microsoft Store',
    'bedrock.notInstalledTitle': 'Minecraft Bedrock no detectado',
    'bedrock.notInstalledDesc': 'Para jugar con este perfil se requiere tener instalado Minecraft for Windows (Bedrock Edition) en este equipo a través de la Microsoft Store o la app de Xbox.',
    'bedrock.openStoreBtn': 'Abrir Microsoft Store',
    'bedrock.orderDownloadBtn': '⚡ Ordenar Descarga e Instalar',
    'bedrock.viewDownloadsBtn': 'Ver Descargas Activas',
    'bedrock.launchNowBtn': '🚀 Jugar Bedrock Ahora',
    'bedrock.statusSending': 'Enviando orden a Microsoft Store...',
    'bedrock.statusDownloading': 'Descargando paquetes de Minecraft Bedrock en tu equipo...',
    'bedrock.statusInstalledSuccess': '¡Minecraft Bedrock se ha detectado e instalado con éxito!',
    'bedrock.addonsTitle': 'Gestor de Add-ons de Bedrock',
    'bedrock.addonsSubtitle': 'Packs de comportamiento, texturas y mundos para Bedrock Edition',
    'bedrock.tabBehavior': 'Behavior Packs',
    'bedrock.tabResource': 'Resource Packs',
    'bedrock.tabWorlds': 'Mundos',
    'bedrock.importBtn': '+ Importar Add-on (.mcpack / .mcaddon)',
    'bedrock.openMojangBtn': '📂 Abrir com.mojang',
    'bedrock.noAddons': 'No hay packs instalados en esta categoría.',
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
    'modal.snapshotsTooltip': 'Muestra versiones de prueba y snapshots de Mojang',

    // Modal Elegir Icono
    'chooseIcon.title': 'Elegir imagen del perfil',
    'chooseIcon.tabOfficial': 'Galería Oficial',
    'chooseIcon.tabUser': 'Mis Imágenes',
    'chooseIcon.uploadTitle': 'Sube o arrastra una imagen',
    'chooseIcon.uploadHint': 'Mínimo 150x150 JPG o PNG',
    'chooseIcon.choose': 'Elegir',
    'chooseIcon.uploadCardTooltip': 'Haz clic o arrastra un archivo',
    'chooseIcon.chooseTooltip': 'Haz clic para elegir imagen de perfil',
    'chooseIcon.editTooltip': 'Elegir imagen de perfil',
    'chooseIcon.officialShubaCore': 'ShubaCore Oficial',
    'chooseIcon.officialShubaClient': 'ShubaClient Mod',
    'chooseIcon.prevIcon': 'Icono previo',

    // Modal Importar Código / Modpack
    'importCode.title': '📥 Importar Instancia por Código o Archivo',
    'importCode.desc': 'Introduce un código de amigo (ej. SHUBA-9F2A), un código (UUID) o enlace de CurseForge / Modrinth, o selecciona un archivo (.zip o .mrpack).',
    'importCode.label': 'Código o Enlace del Modpack:',
    'importCode.placeholder': 'Pega el código de CurseForge (UUID o 7 días), enlace o código de amigo...',
    'importCode.browse': '📁 Archivo local...',
    'importCode.customName': 'Nombre de la Nueva Instancia (Opcional):',
    'importCode.customNamePlaceholder': 'Dejar en blanco para usar el nombre original',
    'importCode.browseTooltip': 'Opcional: Si tienes un archivo .zip o .mrpack descargado, elígelo aquí',
    'importCode.btnInstall': '⚡ Descargar e Instalar',
    'importCode.downloadingMods': 'Descargando mods...',
    'importCode.downloadingManifest': 'Descargando manifiesto de la instancia...',

    // Modal Exportar Código
    'exportCode.title': '📤 Compartir Instancia por Código',
    'exportCode.desc': 'Genera un código corto único para compartir tu modpack con tus amigos. Se subirán las referencias de mods de Modrinth, CurseForge y GitHub sin subir archivos pesados.',
    'exportCode.selectLabel': 'Elige la Instancia a Compartir:',
    'exportCode.noInstances': 'No hay instancias disponibles para compartir.',
    'exportCode.successTitle': '¡Código Generado con Éxito!',
    'exportCode.copyBtn': '📋 Copiar',
    'exportCode.copyTitle': 'Copiar código',
    'exportCode.copiedBtn': '¡Copiado!',
    'exportCode.loading': 'Generando manifiesto y subiendo a GitHub...',
    'exportCode.generated': '✔ Generado',
    'exportCode.retry': '🚀 Reintentar',

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
    'servers.createModalTitle': '🖥 Crear Servidor Dedicado Local',
    'servers.createNameLabel': 'Nombre del Servidor:',
    'servers.createNamePlaceholder': 'ej. Mi Super Servidor',
    'servers.createMcLabel': 'Versión de Minecraft:',
    'servers.createLoaderLabel': 'Modloader:',
    'servers.createRamLabel': 'Memoria RAM Asignada:',
    'servers.customRamLabel': 'Cantidad de RAM personalizada (GB):',
    'servers.portLabel': 'Puerto de Red:',
    'servers.syncModsLabel': '🔄 Sincronizar mods automáticamente desde mi instancia activa',
    'servers.syncSourceLabel': 'Instancia origen de los mods:',
    'servers.syncNotice': 'Los mods exclusivos de cliente (gráficos, shaders, HUDs) serán omitidos automáticamente para evitar crasheos.',
    'servers.installProgressText': 'Descargando e instalando componentes oficiales...',
    'servers.syncModalTitle': '🔄 Sincronizador de Mods Cliente ➔ Servidor',
    'servers.syncFilterDesc': '🛡 Filtro Anti-Crash Inteligente: ShubaCore inspeccionará todos los mods de tu cliente y omitirá automáticamente los que sean solo de cliente (Sodium, Iris, EntityCulling, SoundPhysics, HUDs, etc.), copiando solo mods de contenido/servidor.',
    'servers.syncSourceInstanceLabel': 'Selecciona la Instancia Origen:',
    'servers.syncConfigsLabel': 'Sincronizar también configuraciones (carpetas config/ y defaultconfigs/)',
    'servers.portPrefix': 'Puerto:',
    'servers.modsCountSuffix': 'mods',
    'servers.starting': 'Iniciando...',
    'servers.stopping': 'Deteniendo...',
    'servers.playJoin': '🎮 Jugar y Entrar Directo',
    'servers.playJoinTooltip': 'Lanza Minecraft con una instancia compatible y entra directo a localhost',
    'servers.syncModsBtn': '🔄 Sincronizar Mods',
    'servers.syncModsTooltip': 'Sincronizar mods desde una instancia cliente con filtro anti-crash',
    'servers.exportPackBtn': '📤 Exportar Pack',
    'servers.exportPackTooltip': 'Exportar paquete de servidor (.zip) listo para subir a un hosting/VPS',
    'servers.openFolderTooltip': 'Abrir carpeta del servidor en el Explorador de Windows',
    'servers.deleteServerTooltip': 'Eliminar servidor',
    'servers.copyIp': 'Copiar IP',
    'servers.ipCopied': '¡Copiado!',
    'servers.limitLabel': 'Límite:',
    'servers.limitDefault': 'Límite: 6G',
    'servers.javaProcess': 'Proceso Java',
    'servers.onlineSub': 'En línea',
    'servers.playerSingular': 'jugador',
    'servers.playerPlural': 'jugadores',
    'servers.noPlayersConnected': 'Sin jugadores conectados en este momento.',
    'servers.cmdDay': '☀ Día',
    'servers.cmdClearWeather': '🌧 Quitar Lluvia',
    'servers.cmdSaveWorld': '💾 Guardar Mundo',
    'servers.cmdStop': '⏹ Stop',
    'servers.initialLog': '[ShubaCore] Servidor listo. Haz clic en "Iniciar Servidor" para arrancar.',

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
    'account.deviceModalSubtitle': 'Vinculación Oficial Xbox Live',

    // Claves Generales Comunes
    'common.close': 'Cerrar',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.copy': 'Copiar',
    'common.copyCode': 'Copiar Código',
    'common.openFolder': 'Abrir Carpeta',
    'common.browse': 'Examinar',
    'common.loading': 'Cargando...',
    'modal.createBackupNow': 'Crear Backup Ahora',
    'modal.installCreateServer': 'Instalar y Crear Servidor',
    'modal.startSync': 'Iniciar Sincronización',
    'modal.generateCode': '🚀 Generar Código',
    'modal.stopTunnel': '🛑 Detener Túnel',
    'modal.startTunnel': '🚀 Iniciar Túnel PlayIt',
    'modal.saveAndCheck': 'Guardar y Comprobar',
    'modal.deleteItem': '🗑 Eliminar',
    'modal.restartUpdate': '⚡ Reiniciar e Instalar Actualización',
    'modal.saveConfig': 'Guardar Configuración',

    // Controlador adicional
    'controller.disconnectedPrompt': '⚠️ Ningún mando conectado (Mueve un joystick o pulsa un botón)',
    'controller.standardPad': 'Mando Estándar',
    'controller.connectedStatus': 'Conectado',
    'controller.rebindTitle': '🎮 Reasignar Botón',

    // Tablón de Novedades adicional
    'news.countBadge': 'disponibles',
    'news.readDetails': 'Leer detalles →',
    'news.openExternal': 'Abrir en el Navegador',
    'news.tagUpdate': 'NOVEDAD',
    'news.tagRelease': 'LANZAMIENTO',
    'news.tagCatalog': 'CATÁLOGO',

    // Catálogo adicional
    'catalog.tabDataPacks': 'Data Packs',
    'catalog.popularHeadline': 'Más Populares',
    'catalog.resultsFor': 'Resultados para',
    'catalog.compatibleWith': 'Compatibles con la versión activa',
    'catalog.compatibleWithMc': 'Compatibles con Minecraft',
    'catalog.pageOf': 'Página',
    'catalog.searching': 'Consultando catálogo en tiempo real...',
    'catalog.projectsFound': 'proyectos encontrados',
    'catalog.allPlatforms': 'Todas las plataformas',
    'catalog.platformAll': '🌐 Plataforma: Todas',
    'catalog.platformModrinth': '🟢 Solo Modrinth',
    'catalog.platformCurseforge': '🔥 Solo CurseForge',
    'catalog.sortFeatured': '⇅ Ordenar: Destacado',
    'catalog.sortRecent': '⇅ Más Recientes',
    'catalog.sortDownloads': '⇅ Más Descargados',
    'catalog.sortName': '⇅ Nombre (A-Z)',
    'catalog.categoryLabel': 'Categoría:',
    'catalog.allCategories': 'Todas las categorías',
    'catalog.catOptimization': 'Rendimiento y Optimización',
    'catalog.catAdventure': 'Aventura y RPG',
    'catalog.catTechnology': 'Tecnología y Magia',
    'catalog.catWorldgen': 'Mundo, Biomas y Estructuras',
    'catalog.catUtility': 'Utilidades e Interfaz (UI/Minimap)',
    'catalog.catLibrary': 'Librerías y APIs',
    'catalog.envLabel': 'Entorno:',
    'catalog.allEnvironments': 'Todos los entornos',
    'catalog.clientOnly': 'Solo Cliente',
    'catalog.serverOnly': 'Solo Servidor',
    'catalog.clientAndServer': 'Cliente y Servidor',
    'catalog.followActive': 'Seguir instancia activa',
    'catalog.anyModloader': 'Cualquiera / Todos',
    'catalog.allVersions': 'Todas las versiones',
    'catalog.configRepo': 'Configurar Repo',
    'catalog.installBtn': 'Instalar',
    'catalog.downloadBtn': 'Descargar',
    'catalog.installPackBtn': 'Instalar Pack',
    'catalog.updateBtn': 'Actualizar',
    'catalog.updatedBadge': 'Actualizado',
    'catalog.byAuthor': 'por',
    'catalog.downloads': 'descargas',

    // Gestor de Instancia adicional
    'manager.tabDataPacks': 'Data Packs',
    'manager.tabWorlds': 'Mundos & Backups',
    'manager.tabOptions': 'Optimizaciones (options.txt)',
    'manager.addContent': '+ Añadir contenido',
    'manager.searchPlaceholder': 'Buscar entre los mods instalados...',
    'manager.platformLabel': 'Plataforma:',
    'manager.envLabel': 'Entorno (Env):',
    'manager.sortBy': 'Ordenar por:',
    'manager.sortName': 'Nombre (A - Z)',
    'manager.sortStatus': 'Estado (Habilitados primero)',
    'manager.sortSize': 'Tamaño de archivo',
    'manager.sortPlatform': 'Plataforma (CF / Modrinth / Custom)',
    'manager.checkUpdates': 'Detectar Actualizaciones',
    'manager.updateAll': 'Actualizar Todos',
    'manager.backupBtn': '💾 Backup',
    'manager.backupBeforeUpdate': 'Auto-backup al actualizar',
    'manager.backupBeforeUpdateTitle': 'Crear automáticamente un punto de restauración antes de actualizar mods',
    'manager.backupHeaderTitle': 'Puntos de restauración y copias de seguridad de mods, configs y mundos',
    'manager.backupInstanceTitle': 'Crear o restaurar una copia de seguridad (backup) de mods, configs y mundos',
    'manager.backupAllWorlds': '💾 Backup de Todos los Mundos',
    'manager.viewList': 'Lista',
    'manager.viewGrid': 'Cuadrícula',
    'manager.colAddon': 'Complemento',
    'manager.colAction': 'Acción',
    'manager.colAuthor': 'Autor',
    'manager.colEnv': 'Env',
    'manager.colActive': 'Activo',
    'manager.emptyMods': 'No hay mods instalados en esta instancia todavía.',
    'manager.emptyDataPacks': 'No hay data packs instalados en esta instancia todavía.',
    'manager.installedDataPacks': 'Data Packs Instalados',
    'manager.installedShaders': 'Shaders Instalados',
    'manager.installedResourcePacks': 'Resource Packs Instalados',
    'manager.playitTunnel': 'Túnel LAN PlayIt',
    'manager.cleanGarbage': '🧹 Limpiar Basura',
    'manager.autoOptimize': '⚡ Auto-Optimizar para mi PC',
    'manager.emptyShaders': 'No hay shaders instalados en esta instancia todavía.',
    'manager.emptyResourcePacks': 'No hay resource packs instalados en esta instancia todavía.',
    'manager.searchShaders': '➕ Buscar Shaders en Catálogo',
    'manager.searchTextures': '➕ Buscar Texturas en Catálogo',
    'manager.backupAllWorlds': '💾 Backup de Todos los Mundos',
    'manager.openSavesFolder': 'Abrir Carpeta saves/',
    'manager.savesTitle': 'Partidas Guardadas (Saves)',
    'manager.installedDatapacksTitle': 'Data Packs Instalados',
    'manager.installedShadersTitle': 'Paquetes de Shaders Instalados',
    'manager.installedResourcepacksTitle': 'Paquetes de Texturas Instalados',
    'manager.noDatapacks': 'No hay datapacks instalados en esta instancia todavía.',
    'manager.noShaders': 'No hay shaders instalados en esta instancia todavía.',
    'manager.noResourcepacks': 'No hay resource packs instalados en esta instancia todavía.',
    'manager.noWorlds': 'No se encontraron mundos en esta instancia todavía.',
    'manager.openDatapacksFolder': 'Abrir carpeta datapacks en el explorador',
    'manager.openShadersFolder': 'Abrir carpeta shaderpacks en el explorador',
    'manager.openResourcepacksFolder': 'Abrir carpeta resourcepacks en el explorador',
    'manager.optionsSubtitle': 'Ajustes directos de rendimiento y comodidad visual aplicados nativamente en options.txt sin mods externos ni descargas automáticas.',
    'manager.cleanGarbageDesc': 'Limpia logs antiguos (.log.gz), crash-reports y caché de esta instancia',
    'manager.autoOptimizeDesc': 'Auto-detecta CPU y RAM y aplica el perfil ideal en options.txt',
    'manager.hardwareDetected': 'Hardware detectado',
    'manager.fullbrightTitle': 'Fullbright (Brillo Máximo)',
    'manager.fullbrightDesc': 'Ajusta el brillo interno de Minecraft (gamma: 100.0) para ver con claridad total en cuevas, minas y en el Nether sin colocar antorchas.',
    'manager.autosprintTitle': 'Auto-Sprint (Toggle Sprint)',
    'manager.autosprintDesc': 'Mantiene el sprint activado automáticamente al caminar hacia adelante (toggleSprint: true) sin necesidad de mantener presionado Ctrl.',
    'manager.nocloudsTitle': 'Ocultar Nubes',
    'manager.nocloudsDesc': 'Desactiva el renderizado de nubes en el cielo (renderClouds: "false") para aumentar los FPS y despejar la visión en alturas elevadas.',
    'manager.entityshadowsTitle': 'Desactivar Sombras de Entidades',
    'manager.entityshadowsDesc': 'Desactiva las sombras circulares bajo mobs y jugadores (entityShadows: false) para maximizar los FPS en granjas masivas.',
    'manager.novsyncTitle': 'Desactivar VSync',
    'manager.novsyncDesc': 'Desactiva la sincronización vertical (enableVsync: false) para eliminar el input lag del ratón y liberar la tasa de cuadros por segundo.',
    'manager.launchInstance': 'Jugar con esta instancia ahora',
    'manager.moreOptions': 'Más opciones de la instancia',
    'manager.importModpack': 'Importar Modpack CurseForge (.zip) o Modrinth (.mrpack) en esta instancia',
    'manager.openModsFolder': 'Abrir carpeta /mods en el explorador de archivos',
    'manager.playitTunnelTitle': 'Abrir Túnel LAN P2P con PlayIt.gg para invitar amigos a jugar',
    'manager.deleteInstanceTitle': 'Eliminar permanentemente esta instancia y todos sus archivos',
    'manager.refreshServerTitle': 'Refrescar estado del servidor ahora',
    'manager.editServerTitle': 'Cambiar la IP del servidor a monitorizar',
    'manager.addMoreModsTitle': 'Explorar y añadir contenido a esta instancia',
    'manager.updateAllModsTitle': 'Actualizar todos los mods a la versión más reciente compatible',
    'modal.exportCodeTitle': 'Generar un código corto para compartir tu perfil en GitHub con amigos',
    'modal.importCodeTitle': 'Descargar e instalar un perfil usando un código corto de un amigo',
    'catalog.viewGrid': 'Vista Cuadrícula',
    'common.enabled': 'Activado',
    'common.disabled': 'Desactivado',

    // Servidores adicional
    'servers.emptyCreate': '➕ Crear Nuevo Servidor',
    'servers.emptyImport': '📂 Importar Servidor Existente',
    'servers.noServers': 'No hay servidores creados aún. Haz clic en "➕ Crear Nuevo Servidor".',
    'servers.statusOff': '🔴 APAGADO',
    'servers.statusRunning': '🟢 EN LÍNEA',
    'servers.statusStarting': '🟡 INICIANDO...',
    'servers.statusStopping': '🟠 DETENIENDO...',

    // Social & Amigos adicional
    'social.directoryTitle': 'Directorio de Jugadores ShubaCore',
    'social.directorySubtitle': 'Jugadores registrados en la red oficial de ShubaCore.',
    'social.noPlayersFound': 'No se encontraron otros jugadores registrados aún.',
    'social.requestsReceived': 'Solicitudes Recibidas:',
    'social.noRequestsReceived': 'No tienes solicitudes pendientes.',
    'social.requestsSent': 'Solicitudes Enviadas:',
    'social.noRequestsSent': 'No hay solicitudes enviadas en espera.',
    'social.invitesTitle': 'Invitaciones a Partidas ShubaHost',
    'social.invitesSubtitle': 'Únete con un solo clic a los mundos compartidos por tus amigos.',
    'social.invitesEmpty': 'No tienes invitaciones de partida pendientes.',
    'social.invitesEmptyHint': 'Cuando un amigo abra su partida con ShubaHost y te invite in-game o desde el launcher, aparecerá aquí.',
    'social.uploadCustomAvatar': 'Subir Foto Personalizada',
    'social.useSkinAvatar': 'Usar Cara de mi Skin',
    'social.displayNameLabel': 'Nombre Visible / Display Name:',
    'social.displayNamePlaceholder': 'Tu nombre público en ShubaCore',
    'social.modloaderFavLabel': 'Modloader Favorito:',
    'social.playstyleLabel': 'Estilo de Juego Principal:',
    'social.bioLabel': 'Descripción Personal (Bio):',
    'social.bioNotice': 'Visible para todos los jugadores que busquen tu perfil o te tengan de amigo.',
    'social.chatBtn': 'Chat',
    'social.profileBtn': 'Perfil',
    'social.inviteBtn': '🎮 Invitar',
    'social.joinBtn': '🚀 Unirse',
    'social.playingStatus': 'Jugando a Minecraft',
    'social.friendsBadge': '✔ Amigos',
    'social.addFriend': '+ Agregar Amigo',
    'social.removeFriendTooltip': 'Eliminar de amigos',
    'social.viewProfileTooltip': 'Ver perfil detallado',
    'social.inviteTooltip': 'Invitar a tu partida abierta con ShubaHost',
    'social.memberSince': '📅 Miembro desde:',
    'social.timePlayed': '⏱ Tiempo jugado:',

    // Capturas adicional
    'screenshots.emptyTitle': 'No se encontraron capturas de pantalla',
    'screenshots.emptyDesc': 'Presiona F2 en el juego para tomar fotos de tus mundos y servidores.',
    'screenshots.searching': 'Buscando capturas de pantalla...',

    // Vestidor adicional
    'wardrobe.hintRotate': '🖱 Arrastra para rotar · 🖱 Scroll para zoom',
    'wardrobe.face': 'Cara',
    'wardrobe.profileLabel': 'Perfil:',
    'wardrobe.defaultSkinLabel': 'Skin por defecto',
    'wardrobe.officialCount': '9 oficiales',

    // Fechas y Tamaños
    'time.recent': 'Reciente',
    'time.hoursAgo': 'hace unas horas',
    'time.dayAgo': 'hace 1 día',
    'time.daysAgo': 'hace {days} días',
    'time.monthAgo': 'hace 1 mes',
    'time.monthsAgo': 'hace {months} meses',

    // Botón de lanzamiento adicional
    'launch.session': '+ Sesión',
    'launch.inGame': 'en juego',
    'launch.idle': 'En espera',
    'launch.launchingShort': 'Iniciando',
    'launch.connecting': 'CONECTANDO...',

    // Social & Amigos adicional
    'social.avatarCustom': 'Personalizado',
    'social.avatarOfficial': 'Skin Oficial',
    'social.refreshListTitle': 'Actualizar lista',
    'social.playerProfileModalTitle': 'Perfil de Jugador',
    'social.memberSinceTitle': 'Miembro Desde',
    'social.timePlayedTitle': 'Tiempo Jugado',
    'social.favModloaderTitle': 'Modloader Favorito',
    'social.playstyleTitle': 'Estilo de Juego',
    'social.bioTitle': 'Descripción Personal:',
    'social.openChat': '💬 Abrir Chat',
    'social.sendGameIp': '🚀 Enviar IP de mi Partida',
    'social.closeChatTitle': 'Cerrar chat',
    'social.backToFriendsTitle': 'Volver a la lista de amigos',
    'news.refreshTitle': 'Actualizar anuncios',

    // Selects de Modloader y Estilo de Juego
    'social.modloaderFabric': 'Fabric (Recomendado / ShubaClient)',
    'social.modloaderNeoForge': 'NeoForge',
    'social.modloaderForge': 'Forge',
    'social.modloaderQuilt': 'Quilt',
    'social.modloaderVanilla': 'Vanilla (Sin mods)',
    'social.playstyleModded': 'Modded (Con mods y shaders)',
    'social.playstyleVanilla': 'Vanilla (Puro)',
    'social.playstylePvp': 'PvP / Competitivo',
    'social.playstyleTech': 'Survival Técnico',
    'social.playstyleCreative': 'Creativo & Construcción',
    'social.playstyleHardcore': 'Hardcore',
    'social.searchResultTitle': 'Resultado de Búsqueda',
    'social.clearBtn': '✕ Limpiar',
    'social.favModloaderShort': '⚙ Modloader fav:',
    'social.playstyleShort': '🎮 Estilo:',
    'social.ownProfile': 'Este es tu propio perfil',
    'social.alreadyFriends': '✔ Ya son amigos'
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
    'mods.uploadMod': 'Upload Mod (.jar)',
    'mods.syncMods': 'Sync Mods',

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
    'modal.edition': 'Minecraft Edition',
    'modal.editionJava': 'Java Edition',
    'modal.editionBedrock': 'Bedrock Edition',
    'card.addons': 'Add-ons',
    'bedrock.officialBadge': 'Minecraft Bedrock Edition (Windows)',
    'bedrock.infoDesc': 'Runs natively using your official Microsoft Store / Xbox App installation. Allows importing and managing Add-ons (.mcpack, .mcaddon, and .mcworld).',
    'bedrock.detecting': 'Checking Windows installation...',
    'bedrock.installed': '✔ Official Bedrock installation detected on Windows.',
    'bedrock.notInstalled': '⚠ Not detected on this PC. Requires installation from Microsoft Store.',
    'bedrock.getInStore': 'Get in Microsoft Store',
    'bedrock.notInstalledTitle': 'Minecraft Bedrock Not Detected',
    'bedrock.notInstalledDesc': 'To play this profile, Minecraft for Windows (Bedrock Edition) must be installed on this computer via the Microsoft Store or Xbox app.',
    'bedrock.openStoreBtn': 'Open Microsoft Store',
    'bedrock.orderDownloadBtn': '⚡ Send Install Order & Download',
    'bedrock.viewDownloadsBtn': 'View Active Downloads',
    'bedrock.launchNowBtn': '🚀 Play Bedrock Now',
    'bedrock.statusSending': 'Sending order to Microsoft Store...',
    'bedrock.statusDownloading': 'Downloading Minecraft Bedrock packages to your PC...',
    'bedrock.statusInstalledSuccess': 'Minecraft Bedrock has been detected and installed successfully!',
    'bedrock.addonsTitle': 'Bedrock Add-ons Manager',
    'bedrock.addonsSubtitle': 'Behavior packs, resource packs, and worlds for Bedrock Edition',
    'bedrock.tabBehavior': 'Behavior Packs',
    'bedrock.tabResource': 'Resource Packs',
    'bedrock.tabWorlds': 'Worlds',
    'bedrock.importBtn': '+ Import Add-on (.mcpack / .mcaddon)',
    'bedrock.openMojangBtn': '📂 Open com.mojang',
    'bedrock.noAddons': 'No packs installed in this category.',
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
    'modal.snapshotsTooltip': 'Show development versions and Mojang snapshots',

    // Choose Icon Modal
    'chooseIcon.title': 'Choose Profile Icon',
    'chooseIcon.tabOfficial': 'Official Gallery',
    'chooseIcon.tabUser': 'My Images',
    'chooseIcon.uploadTitle': 'Upload or drop an image',
    'chooseIcon.uploadHint': 'Minimum 150x150 JPG or PNG',
    'chooseIcon.choose': 'Choose',
    'chooseIcon.uploadCardTooltip': 'Click or drop a file',
    'chooseIcon.chooseTooltip': 'Click to choose profile icon',
    'chooseIcon.editTooltip': 'Choose profile icon',
    'chooseIcon.officialShubaCore': 'Official ShubaCore',
    'chooseIcon.officialShubaClient': 'ShubaClient Mod',
    'chooseIcon.prevIcon': 'Previous icon',

    // Import Code / Modpack Modal
    'importCode.title': '📥 Import Instance by Code or File',
    'importCode.desc': 'Enter a friend share code (e.g. SHUBA-9F2A), a CurseForge/Modrinth code (UUID) or URL, or select a file (.zip or .mrpack).',
    'importCode.label': 'Modpack Code or Link:',
    'importCode.placeholder': 'Paste CurseForge code (UUID or 7-day share), link or friend code...',
    'importCode.browse': '📁 Local file...',
    'importCode.customName': 'New Instance Name (Optional):',
    'importCode.customNamePlaceholder': 'Leave blank to use original name',
    'importCode.browseTooltip': 'Optional: If you have a downloaded .zip or .mrpack file, choose it here',
    'importCode.btnInstall': '⚡ Download & Install',
    'importCode.downloadingMods': 'Downloading mods...',
    'importCode.downloadingManifest': 'Downloading instance manifest...',

    // Export Code Modal
    'exportCode.title': '📤 Share Instance by Code',
    'exportCode.desc': 'Generate a unique short code to share your modpack with friends. Modrinth, CurseForge, and GitHub mod references will be shared without uploading heavy files.',
    'exportCode.selectLabel': 'Choose Instance to Share:',
    'exportCode.noInstances': 'No instances available to share.',
    'exportCode.successTitle': 'Code Generated Successfully!',
    'exportCode.copyBtn': '📋 Copy',
    'exportCode.copyTitle': 'Copy code',
    'exportCode.copiedBtn': 'Copied!',
    'exportCode.loading': 'Generating manifest and uploading to GitHub...',
    'exportCode.generated': '✔ Generated',
    'exportCode.retry': '🚀 Retry',

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
    'servers.createModalTitle': '🖥 Create Dedicated Local Server',
    'servers.createNameLabel': 'Server Name:',
    'servers.createNamePlaceholder': 'e.g. My Super Server',
    'servers.createMcLabel': 'Minecraft Version:',
    'servers.createLoaderLabel': 'Modloader:',
    'servers.createRamLabel': 'Allocated RAM:',
    'servers.customRamLabel': 'Custom RAM amount (GB):',
    'servers.portLabel': 'Network Port:',
    'servers.syncModsLabel': '🔄 Automatically sync mods from my active instance',
    'servers.syncSourceLabel': 'Source instance for mods:',
    'servers.syncNotice': 'Client-only mods (graphics, shaders, HUDs) will be automatically skipped to prevent crashes.',
    'servers.installProgressText': 'Downloading and installing official components...',
    'servers.syncModalTitle': '🔄 Client ➔ Server Mod Synchronizer',
    'servers.syncFilterDesc': '🛡 Smart Anti-Crash Filter: ShubaCore will inspect all client mods and automatically skip client-only mods (Sodium, Iris, EntityCulling, SoundPhysics, HUDs, etc.), copying only content and server mods.',
    'servers.syncSourceInstanceLabel': 'Select Source Instance:',
    'servers.syncConfigsLabel': 'Also sync configurations (config/ and defaultconfigs/ folders)',
    'servers.portPrefix': 'Port:',
    'servers.modsCountSuffix': 'mods',
    'servers.starting': 'Starting...',
    'servers.stopping': 'Stopping...',
    'servers.playJoin': '🎮 Play & Join Directly',
    'servers.playJoinTooltip': 'Launch Minecraft with a compatible instance and join localhost directly',
    'servers.syncModsBtn': '🔄 Sync Mods',
    'servers.syncModsTooltip': 'Sync mods from a client instance with smart anti-crash filter',
    'servers.exportPackBtn': '📤 Export Pack',
    'servers.exportPackTooltip': 'Export server package (.zip) ready to upload to a hosting/VPS',
    'servers.openFolderTooltip': 'Open server folder in Windows Explorer',
    'servers.deleteServerTooltip': 'Delete server',
    'servers.copyIp': 'Copy IP',
    'servers.ipCopied': 'Copied!',
    'servers.limitLabel': 'Limit:',
    'servers.limitDefault': 'Limit: 6G',
    'servers.javaProcess': 'Java Process',
    'servers.onlineSub': 'Online',
    'servers.playerSingular': 'player',
    'servers.playerPlural': 'players',
    'servers.noPlayersConnected': 'No players connected at this time.',
    'servers.cmdDay': '☀ Day',
    'servers.cmdClearWeather': '🌧 Clear Rain',
    'servers.cmdSaveWorld': '💾 Save World',
    'servers.cmdStop': '⏹ Stop',
    'servers.initialLog': '[ShubaCore] Server ready. Click "Start Server" to run.',

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
    'account.deviceModalSubtitle': 'Official Xbox Live Link',

    // General Common Keys
    'common.close': 'Close',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.copy': 'Copy',
    'common.copyCode': 'Copy Code',
    'common.openFolder': 'Open Folder',
    'common.browse': 'Browse',
    'common.loading': 'Loading...',
    'modal.createBackupNow': 'Create Backup Now',
    'modal.installCreateServer': 'Install & Create Server',
    'modal.startSync': 'Start Sync',
    'modal.generateCode': '🚀 Generate Code',
    'modal.stopTunnel': '🛑 Stop Tunnel',
    'modal.startTunnel': '🚀 Start PlayIt Tunnel',
    'modal.saveAndCheck': 'Save and Check',
    'modal.deleteItem': '🗑 Delete',
    'modal.restartUpdate': '⚡ Restart & Install Update',
    'modal.saveConfig': 'Save Settings',

    // Additional Controller
    'controller.disconnectedPrompt': '⚠️ No controller connected (Move a joystick or press a button)',
    'controller.standardPad': 'Standard Controller',
    'controller.connectedStatus': 'Connected',
    'controller.rebindTitle': '🎮 Reassign Button',

    // Additional News & Changelogs
    'news.countBadge': 'AVAILABLE',
    'news.readDetails': 'Read details →',
    'news.openExternal': 'Open in Browser',
    'news.tagUpdate': 'UPDATE',
    'news.tagRelease': 'RELEASE',
    'news.tagCatalog': 'CATALOG',

    // Additional Catalog
    'catalog.tabDataPacks': 'Data Packs',
    'catalog.popularHeadline': 'Most Popular',
    'catalog.resultsFor': 'Results for',
    'catalog.compatibleWith': 'Compatible with active version',
    'catalog.compatibleWithMc': 'Compatible with Minecraft',
    'catalog.pageOf': 'Page',
    'catalog.searching': 'Searching catalog in real-time...',
    'catalog.projectsFound': 'projects found',
    'catalog.allPlatforms': 'All Platforms',
    'catalog.platformAll': '🌐 Platform: All',
    'catalog.platformModrinth': '🟢 Modrinth Only',
    'catalog.platformCurseforge': '🔥 CurseForge Only',
    'catalog.sortFeatured': '⇅ Sort: Featured',
    'catalog.sortRecent': '⇅ Most Recent',
    'catalog.sortDownloads': '⇅ Most Downloaded',
    'catalog.sortName': '⇅ Name (A-Z)',
    'catalog.categoryLabel': 'Category:',
    'catalog.allCategories': 'All Categories',
    'catalog.catOptimization': 'Performance & Optimization',
    'catalog.catAdventure': 'Adventure & RPG',
    'catalog.catTechnology': 'Technology & Magic',
    'catalog.catWorldgen': 'World Gen, Biomes & Structures',
    'catalog.catUtility': 'Utility & Interface (UI/Minimap)',
    'catalog.catLibrary': 'Libraries & APIs',
    'catalog.envLabel': 'Environment:',
    'catalog.allEnvironments': 'All Environments',
    'catalog.clientOnly': 'Client Only',
    'catalog.serverOnly': 'Server Only',
    'catalog.clientAndServer': 'Client & Server',
    'catalog.followActive': 'Follow active instance',
    'catalog.anyModloader': 'Any / All',
    'catalog.allVersions': 'All versions',
    'catalog.configRepo': 'Configure Repo',
    'catalog.installBtn': 'Install',
    'catalog.downloadBtn': 'Download',
    'catalog.installPackBtn': 'Install Pack',
    'catalog.updateBtn': 'Update',
    'catalog.updatedBadge': 'Up to date',
    'catalog.byAuthor': 'by',
    'catalog.downloads': 'downloads',

    // Additional Instance Manager
    'manager.tabDataPacks': 'Data Packs',
    'manager.tabWorlds': 'Worlds & Backups',
    'manager.tabOptions': 'Optimizations (options.txt)',
    'manager.addContent': '+ Add Content',
    'manager.searchPlaceholder': 'Search installed mods...',
    'manager.platformLabel': 'Platform:',
    'manager.envLabel': 'Environment (Env):',
    'manager.sortBy': 'Sort by:',
    'manager.sortName': 'Name (A - Z)',
    'manager.sortStatus': 'Status (Enabled first)',
    'manager.sortSize': 'File size',
    'manager.sortPlatform': 'Platform (CF / Modrinth / Custom)',
    'manager.checkUpdates': 'Check for Updates',
    'manager.updateAll': 'Update All',
    'manager.backupBtn': '💾 Backup',
    'manager.backupBeforeUpdate': 'Auto-backup on update',
    'manager.backupBeforeUpdateTitle': 'Automatically create a restore point before updating mods',
    'manager.backupHeaderTitle': 'Restore points and backups for mods, configs and worlds',
    'manager.backupInstanceTitle': 'Create or restore a backup of mods, configs and worlds',
    'manager.backupAllWorlds': '💾 Backup All Worlds',
    'manager.viewList': 'List',
    'manager.viewGrid': 'Grid',
    'manager.colAddon': 'Addon / Mod',
    'manager.colAction': 'Action',
    'manager.colAuthor': 'Author',
    'manager.colEnv': 'Env',
    'manager.colActive': 'Active',
    'manager.emptyMods': 'No mods installed in this instance yet.',
    'manager.emptyDataPacks': 'No data packs installed in this instance yet.',
    'manager.installedDataPacks': 'Installed Data Packs',
    'manager.installedShaders': 'Installed Shaders',
    'manager.installedResourcePacks': 'Installed Resource Packs',
    'manager.playitTunnel': 'PlayIt LAN Tunnel',
    'manager.cleanGarbage': '🧹 Clean Junk',
    'manager.autoOptimize': '⚡ Auto-Tune for my PC',
    'manager.emptyShaders': 'No shaders installed in this instance yet.',
    'manager.emptyResourcePacks': 'No resource packs installed in this instance yet.',
    'manager.searchShaders': '➕ Browse Shaders in Catalog',
    'manager.searchTextures': '➕ Browse Textures in Catalog',
    'manager.backupAllWorlds': '💾 Backup All Worlds',
    'manager.openSavesFolder': 'Open saves/ Folder',
    'manager.savesTitle': 'Saved Worlds (Saves)',
    'manager.installedDatapacksTitle': 'Installed Data Packs',
    'manager.installedShadersTitle': 'Installed Shader Packs',
    'manager.installedResourcepacksTitle': 'Installed Resource Packs',
    'manager.noDatapacks': 'No data packs installed in this instance yet.',
    'manager.noShaders': 'No shaders installed in this instance yet.',
    'manager.noResourcepacks': 'No resource packs installed in this instance yet.',
    'manager.noWorlds': 'No worlds found in this instance yet.',
    'manager.openDatapacksFolder': 'Open datapacks folder in file explorer',
    'manager.openShadersFolder': 'Open shaderpacks folder in file explorer',
    'manager.openResourcepacksFolder': 'Open resourcepacks folder in file explorer',
    'manager.optionsSubtitle': 'Direct performance and visual comfort tweaks applied natively in options.txt without external mods or automatic downloads.',
    'manager.cleanGarbageDesc': 'Cleans old logs (.log.gz), crash reports, and cache for this instance',
    'manager.autoOptimizeDesc': 'Auto-detects CPU and RAM and applies ideal profile in options.txt',
    'manager.hardwareDetected': 'Detected Hardware',
    'manager.fullbrightTitle': 'Fullbright (Maximum Brightness)',
    'manager.fullbrightDesc': 'Adjusts internal Minecraft brightness (gamma: 100.0) for clear vision in caves, mines, and the Nether without placing torches.',
    'manager.autosprintTitle': 'Auto-Sprint (Toggle Sprint)',
    'manager.autosprintDesc': 'Keeps sprint active automatically when walking forward (toggleSprint: true) without needing to hold Ctrl.',
    'manager.nocloudsTitle': 'Hide Clouds',
    'manager.nocloudsDesc': 'Disables cloud rendering in the sky (renderClouds: "false") to boost FPS and clear vision at high altitudes.',
    'manager.entityshadowsTitle': 'Disable Entity Shadows',
    'manager.entityshadowsDesc': 'Disables circular shadows beneath mobs and players (entityShadows: false) to maximize FPS around large mob farms.',
    'manager.novsyncTitle': 'Disable VSync',
    'manager.novsyncDesc': 'Disables vertical sync (enableVsync: false) to eliminate mouse input lag and unlock framerate.',
    'manager.launchInstance': 'Launch this instance now',
    'manager.moreOptions': 'More instance options',
    'manager.importModpack': 'Import CurseForge (.zip) or Modrinth (.mrpack) Modpack into this instance',
    'manager.openModsFolder': 'Open /mods folder in file explorer',
    'manager.playitTunnelTitle': 'Open P2P LAN Tunnel with PlayIt.gg to invite friends to play',
    'manager.deleteInstanceTitle': 'Permanently delete this instance and all its files',
    'manager.refreshServerTitle': 'Refresh server status now',
    'manager.editServerTitle': 'Change monitored server IP',
    'manager.addMoreModsTitle': 'Browse and add content to this instance',
    'manager.updateAllModsTitle': 'Update all mods to newest compatible version',
    'modal.exportCodeTitle': 'Generate a short code to share your profile via GitHub with friends',
    'modal.importCodeTitle': 'Download and install a profile using a friend\'s short code',
    'catalog.viewGrid': 'Grid View',
    'common.enabled': 'Enabled',
    'common.disabled': 'Disabled',

    // Additional Servers
    'servers.emptyCreate': '➕ Create New Server',
    'servers.emptyImport': '📂 Import Existing Server',
    'servers.noServers': 'No servers created yet. Click "➕ Create New Server".',
    'servers.statusOff': '🔴 STOPPED',
    'servers.statusRunning': '🟢 RUNNING',
    'servers.statusStarting': '🟡 STARTING...',
    'servers.statusStopping': '🟠 STOPPING...',

    // Additional Social & Friends
    'social.directoryTitle': 'ShubaCore Player Directory',
    'social.directorySubtitle': 'Players registered on the official ShubaCore network.',
    'social.noPlayersFound': 'No other registered players found yet.',
    'social.requestsReceived': 'Received Requests:',
    'social.noRequestsReceived': 'No pending requests.',
    'social.requestsSent': 'Sent Requests:',
    'social.noRequestsSent': 'No pending sent requests.',
    'social.invitesTitle': 'ShubaHost Game Invites',
    'social.invitesSubtitle': 'Join worlds shared by your friends with a single click.',
    'social.invitesEmpty': 'You have no pending game invites.',
    'social.invitesEmptyHint': 'When a friend opens their game with ShubaHost and invites you in-game or from the launcher, it will appear here.',
    'social.uploadCustomAvatar': 'Upload Custom Photo',
    'social.useSkinAvatar': 'Use Skin Face',
    'social.displayNameLabel': 'Display Name:',
    'social.displayNamePlaceholder': 'Your public name in ShubaCore',
    'social.modloaderFavLabel': 'Favorite Modloader:',
    'social.playstyleLabel': 'Primary Playstyle:',
    'social.bioLabel': 'Personal Bio:',
    'social.bioNotice': 'Visible to all players who search your profile or have you as a friend.',
    'social.chatBtn': 'Chat',
    'social.profileBtn': 'Profile',
    'social.inviteBtn': '🎮 Invite',
    'social.joinBtn': '🚀 Join',
    'social.playingStatus': 'Playing Minecraft',
    'social.friendsBadge': '✔ Friends',
    'social.addFriend': '+ Add Friend',
    'social.removeFriendTooltip': 'Remove from friends',
    'social.viewProfileTooltip': 'View detailed profile',
    'social.inviteTooltip': 'Invite to your open ShubaHost game',
    'social.memberSince': '📅 Member since:',
    'social.timePlayed': '⏱ Time played:',

    // Additional Screenshots
    'screenshots.emptyTitle': 'No screenshots found',
    'screenshots.emptyDesc': 'Press F2 in-game to capture photos of your worlds and servers.',
    'screenshots.searching': 'Searching for screenshots...',

    // Additional Wardrobe
    'wardrobe.hintRotate': '🖱 Drag to rotate · 🖱 Scroll to zoom',
    'wardrobe.face': 'Face',
    'wardrobe.profileLabel': 'Profile:',
    'wardrobe.defaultSkinLabel': 'Default skin',
    'wardrobe.officialCount': '9 official',

    // Dates and Sizes
    'time.recent': 'Recent',
    'time.hoursAgo': 'a few hours ago',
    'time.dayAgo': '1 day ago',
    'time.daysAgo': '{days} days ago',
    'time.monthAgo': '1 month ago',
    'time.monthsAgo': '{months} months ago',

    // Launch button additional
    'launch.session': '+ Session',
    'launch.inGame': 'in game',
    'launch.idle': 'Idle',
    'launch.launchingShort': 'Launching',
    'launch.connecting': 'CONNECTING...',

    // Social & Friends additional
    'social.avatarCustom': 'Custom',
    'social.avatarOfficial': 'Official Skin',
    'social.refreshListTitle': 'Refresh list',
    'social.playerProfileModalTitle': 'Player Profile',
    'social.memberSinceTitle': 'Member Since',
    'social.timePlayedTitle': 'Time Played',
    'social.favModloaderTitle': 'Favorite Modloader',
    'social.playstyleTitle': 'Playstyle',
    'social.bioTitle': 'Personal Bio:',
    'social.openChat': '💬 Open Chat',
    'social.sendGameIp': '🚀 Send Game IP',
    'social.closeChatTitle': 'Close chat',
    'social.backToFriendsTitle': 'Back to friends list',
    'news.refreshTitle': 'Refresh announcements',

    // Modloader and Playstyle select options
    'social.modloaderFabric': 'Fabric (Recommended / ShubaClient)',
    'social.modloaderNeoForge': 'NeoForge',
    'social.modloaderForge': 'Forge',
    'social.modloaderQuilt': 'Quilt',
    'social.modloaderVanilla': 'Vanilla (No mods)',
    'social.playstyleModded': 'Modded (With mods & shaders)',
    'social.playstyleVanilla': 'Vanilla (Pure)',
    'social.playstylePvp': 'PvP / Competitive',
    'social.playstyleTech': 'Technical Survival',
    'social.playstyleCreative': 'Creative & Building',
    'social.playstyleHardcore': 'Hardcore',
    'social.searchResultTitle': 'Search Result',
    'social.clearBtn': '✕ Clear',
    'social.favModloaderShort': '⚙ Fav Modloader:',
    'social.playstyleShort': '🎮 Playstyle:',
    'social.ownProfile': 'This is your own profile',
    'social.alreadyFriends': '✔ Already friends'
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

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('shubacore:language-changed', { detail: { language: lang } }));
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    } catch (_) {}
  }

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
