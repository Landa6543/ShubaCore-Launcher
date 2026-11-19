const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log('🧪 PRUEBAS: FASE 30 - RESOLUCIÓN DE CRASHEOS, VESTIDOR Y IDIOMAS');
console.log('====================================================\n');

// 1. Verificación del Parche de Seguridad de Teclas (InputConstants Bounds Check)
console.log('▶ [1/5] Verificando parche InputConstants (previene IndexOutOfBoundsException en SDL/26.3)...');
const patchPath = path.join(__dirname, '..', 'src', 'main', 'launcher', 'patches', 'InputConstants_26.3.class');
assert(fs.existsSync(patchPath), 'Debe existir InputConstants_26.3.class en src/main/launcher/patches');
const patchBuf = fs.readFileSync(patchPath);
assert(patchBuf.includes(Buffer.from([0x11, 0x02, 0x00])), 'El parche debe incluir el chequeo sipush 512');
console.log('   ✔ Parche de clase verificado con chequeo estricto de límites para SDL.\n');

// 2. Verificación de Importación de Códigos CurseForge Directos (UUIDs sin enlace)
console.log('▶ [2/5] Verificando ProfileCodeSharer para códigos y UUIDs directos de CurseForge...');
const { ProfileCodeSharer } = require('../src/main/sync/ProfileCodeSharer');
const sharer = new ProfileCodeSharer();
const testUuid = '18d87a41-3968-4663-8a90-3ce4802c2e0b';
const testCfLink = 'https://www.curseforge.com/minecraft/share/18d87a41-3968-4663-8a90-3ce4802c2e0b';
assert(sharer.isValidProfileReference(testUuid), 'Un UUID directo debe ser reconocido como referencia válida de perfil');
assert(sharer.isValidProfileReference(testCfLink), 'Un enlace de CurseForge share debe ser reconocido como referencia válida');
console.log('   ✔ Detección directa de UUIDs y enlaces compartidos de CurseForge validada.\n');

// 3. Verificación de Persistencia y Modal de Bienvenida de Idioma
console.log('▶ [3/5] Verificando src/renderer/i18n.js y control de arranque del modal de bienvenida...');
const i18nCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'i18n.js'), 'utf8');
assert(i18nCode.includes('btn-confirm-welcome-lang'), 'i18n.js debe controlar el botón btn-confirm-welcome-lang');
assert(i18nCode.includes('setupWelcomeLanguageModal'), 'i18n.js debe vincular las tarjetas de idioma');
assert(i18nCode.includes('btn-launch-text'), 'i18n.js debe actualizar dinámicamente el botón principal de jugar');
console.log('   ✔ Modal de bienvenida e inicialización de idiomas asegurada sin repetición molesta.\n');

// 4. Verificación de Lógica de Élitros en el Vestidor
console.log('▶ [4/5] Verificando lógica de Élitros en renderer.js...');
const rendererCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'renderer.js'), 'utf8');
assert(rendererCode.includes('vanillaElytraDataUrl'), 'renderer.js debe cargar textura vanilla de élitros');
assert(rendererCode.includes("switchTab('profiles')"), "renderer.js debe inicializar vista 'profiles' en startup");
console.log('   ✔ Élitros y aislamiento inicial de pestañas validados en el frontend.\n');

// 5. Verificación de index.html: Vistas inactivas con display: none !important
console.log('▶ [5/7] Verificando aislamiento de vistas y data-i18n en index.html...');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'index.html'), 'utf8');
assert(indexHtml.includes('id="view-skins" class="view-panel view-container hidden" style="display: none !important;"'), 'view-skins debe estar oculto con estilo inline');
assert(indexHtml.includes('id="btn-launch-text" data-i18n="launch.play"'), 'btn-launch-text debe tener data-i18n');
console.log('   ✔ Aislamiento DOM y atributos i18n en index.html verificados.\n');

// 6. Verificación de Auto-Parche de ShubaHost Fabric en LaunchManager
console.log('▶ [6/7] Verificando auto-parche de ShubaHost Fabric en LaunchManager.js...');
const launchMgrCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'launcher', 'LaunchManager.js'), 'utf8');
assert(launchMgrCode.includes('shubahost-fabric'), 'LaunchManager debe auto-parchear shubahost-fabric');
assert(launchMgrCode.includes('link/e4mc/fabric/E4mcClientFabric.class'), 'LaunchManager debe parchear E4mcClientFabric.class');
console.log('   ✔ Auto-parcheo de compatibilidad de ShubaHost Fabric verificado.\n');

// 7. Verificación de Modal Elegir Icono e Historial + Lightbox de Screenshots
console.log('▶ [7/7] Verificando modal de elegir icono, historial y visor de screenshots...');
assert(rendererCode.includes('modalChooseProfileIcon'), 'renderer.js debe manejar modalChooseProfileIcon');
assert(rendererCode.includes('loadUserIconHistory'), 'renderer.js debe cargar historial de iconos');
assert(rendererCode.includes('simple-lightbox-image'), 'renderer.js debe controlar simple-lightbox-image');
console.log('   ✔ Modal de selección de iconos, historial y visor de screenshots validados.\n');

console.log('====================================================');
console.log('🎉 TODAS LAS PRUEBAS DE LA FASE 30 PASARON CON ÉXITO');
console.log('====================================================');
