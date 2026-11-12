/**
 * ShubaCore - Client Mod Extractor, Patcher & Rebrander Test Suite
 * Developed by SHUBATECH
 *
 * Tests:
 * 1. Automatic detection of OneClient in system AppData / clusters / mod cache
 * 2. Extraction of polyplus JAR and companion dependencies
 * 3. Rebranding of metadata (fabric.mod.json), lang files (en_us & es_es), and SVGs
 * 4. Safe bytecode constant pool patching (ONECLIENT -> SHUBACORE)
 * 5. In-game instance injection and oneconfig 3D lobby defaults setup
 * 6. UI toggle elements in settings and instance modals
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');

const { getClientModPatcher } = require('../src/main/client/ClientModPatcher');

const TEST_DIR = path.join(__dirname, '.test-shubaclient-patcher');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 PRUEBAS: EXTRACCIÓN, REBRANDING E INYECCIÓN SHUBACLIENT');
  console.log('====================================================\n');

  if (fs.existsSync(TEST_DIR)) {
    try { fs.rmSync(TEST_DIR, { recursive: true, force: true }); } catch (_) {}
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });

  const patcher = getClientModPatcher();

  // ----------------------------------------------------
  // 1. DETECCIÓN AUTOMÁTICA DE ONECLIENT
  // ----------------------------------------------------
  console.log('▶ [1/6] Verificando detección de OneClient en el sistema...');
  const discovery = patcher.findOneClientInstallation();
  assert.ok(discovery.found, 'OneClient debe ser detectado en el PC');
  assert.ok(discovery.baseJar && fs.existsSync(discovery.baseJar), 'El JAR base de polyplus debe existir');
  assert.ok(discovery.companionJars.length > 0, 'Debe identificar OneConfig y dependencias');
  console.log(`   ✔ OneClient localizado con éxito en: ${discovery.baseJar}`);
  console.log(`   ✔ Dependencias identificadas: ${discovery.companionJars.length} | Optimizadores: ${discovery.optJars.length}\n`);

  // ----------------------------------------------------
  // 2. EXTRACCIÓN DE JAR BASE Y DEPENDENCIAS
  // ----------------------------------------------------
  console.log('▶ [2/6] Verificando extracción de shubaclient-base.jar y dependencias...');
  const extractionDir = path.join(TEST_DIR, 'runtime-client-mods');
  const extraction = patcher.extractBaseJar(extractionDir);

  assert.ok(extraction.success, 'La extracción debe ser exitosa');
  assert.ok(fs.existsSync(extraction.baseJarPath), 'shubaclient-base.jar debe existir en destino');
  assert.strictEqual(path.basename(extraction.baseJarPath), 'shubaclient-base.jar');
  assert.ok(fs.statSync(extraction.baseJarPath).size > 1000000, 'shubaclient-base.jar debe tener un tamaño válido (>1MB)');

  const depsDir = path.join(extractionDir, 'deps');
  const optDir = path.join(extractionDir, 'opt');
  assert.ok(fs.existsSync(depsDir), 'Carpeta deps/ debe existir');
  assert.ok(fs.existsSync(optDir), 'Carpeta opt/ debe existir');
  console.log(`   ✔ shubaclient-base.jar extraído correctamente (${fs.statSync(extraction.baseJarPath).size} bytes).\n`);

  // ----------------------------------------------------
  // 3. PARCHEO Y REBRANDING A SHUBACORE / SHUBATECH
  // ----------------------------------------------------
  console.log('▶ [3/6] Verificando parcheo y rebranding a ShubaClient-UI.jar...');
  const customJarPath = path.join(extractionDir, 'ShubaClient-UI.jar');
  const patchResult = patcher.patchClientMod(extraction.baseJarPath, customJarPath);

  assert.ok(patchResult.success, 'El parcheo debe completarse con éxito');
  assert.ok(fs.existsSync(customJarPath), 'ShubaClient-UI.jar debe generarse en disco');

  // Inspeccionar interior del JAR generado
  const customZip = new AdmZip(customJarPath);

  // A) Firmas eliminadas y MANIFEST saneado
  const sigEntries = customZip.getEntries().filter(e =>
    /\.(SF|RSA|DSA)$/i.test(e.entryName) || /^META-INF\/SIG-/i.test(e.entryName)
  );
  assert.strictEqual(sigEntries.length, 0, 'No deben existir firmas digitales (.SF, .RSA, .DSA) que rompan el classloader');
  const mfStr = customZip.readAsText('META-INF/MANIFEST.MF');
  assert.ok(!mfStr.includes('SHA-256-Digest:'), 'MANIFEST.MF no debe contener digests para evitar SecurityException');

  // B) Metadata fabric.mod.json
  const metaStr = customZip.readAsText('fabric.mod.json');
  assert.ok(metaStr, 'fabric.mod.json debe existir en el JAR');
  const meta = JSON.parse(metaStr);
  assert.strictEqual(meta.name, 'ShubaClient UI', 'El nombre del mod debe ser "ShubaClient UI"');
  assert.strictEqual(meta.description, 'Interfaz moderna y utilidades exclusivas desarrolladas por SHUBATECH');
  assert.ok(meta.authors.includes('SHUBATECH') && meta.authors.includes('LanderAlo'), 'Los autores deben ser SHUBATECH y LanderAlo');

  // C) Idiomas (en_us y es_es 100% traducidos al español con marca SHUBACORE)
  const enUsStr = customZip.readAsText('assets/polyplus/lang/en_us.json');
  assert.ok(enUsStr.includes('ShubaClient'), 'en_us.json debe contener ShubaClient');
  assert.ok(!enUsStr.includes('ONECLIENT'), 'en_us.json no debe contener ONECLIENT');
  const enUs = JSON.parse(enUsStr);
  assert.strictEqual(enUs['polyplus.hostWorld'], 'Hostear Mundo', 'en_us.json debe contener Hostear Mundo');
  assert.strictEqual(enUs['menu.play'], 'Jugar', 'en_us.json debe contener Jugar');

  const esEsStr = customZip.readAsText('assets/polyplus/lang/es_es.json');
  assert.ok(esEsStr, 'es_es.json debe ser creado');
  const esEs = JSON.parse(esEsStr);
  assert.strictEqual(esEs['polyplus.hostWorld'], 'Hostear Mundo');
  assert.strictEqual(esEs['polyplus.page.wardrobe'], 'Vestidor');
  assert.strictEqual(esEs['polyplus.page.social'], 'Amigos');
  assert.strictEqual(esEs['polyplus.page.marketplace'], 'Vestidor');
  assert.strictEqual(esEs['polyplus.mainmenu.play'], 'Jugar');
  assert.strictEqual(esEs['polyplus.mainmenu.keepOneClient'], 'Usar ShubaClient');
  assert.strictEqual(esEs['menu.returnToGame'], 'Volver al juego');

  // D) Texturas y Logos Vectoriales
  const brandSvg = customZip.readAsText('assets/polyplus/brand/oneclient.svg');
  assert.ok(brandSvg.includes('SHUBACORE'), 'oneclient.svg debe ser reemplazado por logo SHUBACORE');

  const mainLogoSvg = customZip.readAsText('assets/polyplus/mainmenu/logo.svg');
  assert.ok(mainLogoSvg.includes('shubaStar'), 'logo.svg debe contener el vector de SHUBATECH');

  const footerLogoSvg = customZip.readAsText('assets/polyplus/mainmenu/footer-logo.svg');
  assert.ok(footerLogoSvg.includes('shubaFoot'), 'footer-logo.svg debe contener el vector de SHUBATECH');

  const polyplusSvg = customZip.readAsText('assets/polyplus/modicons/polyplus.svg');
  assert.ok(polyplusSvg.includes('shubaStar'), 'polyplus.svg debe contener el vector de SHUBATECH');

  // E) Bytecode Constant Pool y Parches de Juego (Vestidor Gratis & Marketplace Redirigido)
  // Prueba de Constant Pool Parser binario formal
  const dummyClass = Buffer.concat([
    Buffer.from([0xca, 0xfe, 0xba, 0xbe]), // magic
    Buffer.from([0x00, 0x00]),             // minor
    Buffer.from([0x00, 0x3d]),             // major
    Buffer.from([0x00, 0x02]),             // count (2 entries => 1 slot)
    Buffer.from([0x01, 0x00, 0x09]),       // tag Utf8, len 9
    Buffer.from('ONECLIENT', 'utf8')
  ]);
  const cpTestRes = patcher._patchClassConstantPool(dummyClass, { 'ONECLIENT': 'SHUBACORE' });
  assert.ok(cpTestRes.modified, 'CP Parser debe detectar y modificar ONECLIENT');
  assert.ok(cpTestRes.buffer.includes('SHUBACORE'), 'CP Parser debe escribir SHUBACORE');

  const menuCls = customZip.readFile('org/polyfrost/polyplus/client/gui/PolyPlusMainMenuScreenKt.class');
  assert.ok(menuCls.includes('SHUBACORE'), 'Clase PolyPlusMainMenuScreenKt debe contener SHUBACORE');
  assert.ok(!menuCls.includes('ONECLIENT'), 'Clase PolyPlusMainMenuScreenKt no debe contener ONECLIENT');

  const cuiCls = customZip.readFile('org/polyfrost/polyplus/client/gui/wardrobe/CosmeticUiItem.class');
  assert.ok(cuiCls.includes(Buffer.from([0x04, 0xac])), 'CosmeticUiItem.getOwned debe retornar true (iconst_1; ireturn) para cosméticos gratis');

  const lcCls = customZip.readFile('org/polyfrost/polyplus/client/gui/lobbyshell/LobbyChromeKt.class');
  assert.ok(lcCls.includes('Vestidor'), 'LobbyChromeKt debe renombrar Marketplace a Vestidor');
  console.log('   ✔ Metadatos, firmas saneadas, idiomas, logos SVG y constantes JVM verificadas al 100%.\n');

  // ----------------------------------------------------
  // 4. CONFIGURACIÓN IN-GAME (ONECONFIG 3D LOBBY Y PAUSA)
  // ----------------------------------------------------
  console.log('▶ [4/6] Verificando generación de opciones por defecto (Menú 3D y Pausa)...');
  const mockInstanceDir = path.join(TEST_DIR, 'mock-instance');
  fs.mkdirSync(mockInstanceDir, { recursive: true });

  patcher.prepareInstanceConfig(mockInstanceDir);

  const oneconfigMainMenu = path.join(mockInstanceDir, 'oneconfig', 'polyplus-mainmenu.json');
  const oneconfigPause = path.join(mockInstanceDir, 'oneconfig', 'polyplus-pause.json');
  assert.ok(fs.existsSync(oneconfigMainMenu), 'polyplus-mainmenu.json debe existir');
  assert.ok(fs.existsSync(oneconfigPause), 'polyplus-pause.json debe existir');

  const mainMenuData = JSON.parse(fs.readFileSync(oneconfigMainMenu, 'utf8'));
  assert.strictEqual(mainMenuData.mainMenu.value, 'LOBBY', 'El menú principal 3D debe estar fijado en LOBBY');
  assert.strictEqual(mainMenuData.customPanorama, true, 'customPanorama debe ser true');

  const pauseData = JSON.parse(fs.readFileSync(oneconfigPause, 'utf8'));
  assert.strictEqual(pauseData.pauseScreenStyle.value, 'STEP_BACK_FLAT', 'La pausa debe ser panorámica (STEP_BACK_FLAT)');
  console.log('   ✔ Configuración 3D de ShubaClient validada correctamente.\n');

  // ----------------------------------------------------
  // 5. PARCHEO EN VIVO DESACTIVADO (MODS VÍA GITHUB CATALOG)
  // ----------------------------------------------------
  console.log('▶ [5/6] Verificando desactivación segura del parcheo en vivo...');
  const injectResult = patcher.injectIntoInstance(mockInstanceDir);
  assert.strictEqual(injectResult.injected, false, 'El parcheo en vivo debe estar desactivado');
  assert.strictEqual(injectResult.disabled, true, 'El estado disabled debe ser true');
  console.log('   ✔ Parcheo en vivo desactivado para evitar roturas de UI; mods se gestionan vía GitHub.\n');

  // ----------------------------------------------------
  // 6. VERIFICACIÓN DE CONTROLES EN LA INTERFAZ (DOM)
  // ----------------------------------------------------
  console.log('▶ [6/6] Verificando switches en la interfaz (General, Crear y Editar)...');
  const indexHtml = fs.readFileSync(path.join(__dirname, '../src/renderer/index.html'), 'utf8');
  assert.ok(indexHtml.includes('id="check-enable-shubaclient-ui"'), 'Switch global en ajustes generales debe existir');
  assert.ok(indexHtml.includes('id="check-create-shubaclient-ui"'), 'Switch en modal de crear instancia debe existir');
  assert.ok(indexHtml.includes('id="check-edit-shubaclient-ui"'), 'Switch en modal de editar instancia debe existir');

  const rendererJs = fs.readFileSync(path.join(__dirname, '../src/renderer/renderer.js'), 'utf8');
  assert.ok(rendererJs.includes('check-enable-shubaclient-ui'), 'renderer.js debe conectar el switch global');
  assert.ok(rendererJs.includes('check-create-shubaclient-ui'), 'renderer.js debe conectar el switch de creación');
  assert.ok(rendererJs.includes('check-edit-shubaclient-ui'), 'renderer.js debe conectar el switch de edición');

  const launchManagerJs = fs.readFileSync(path.join(__dirname, '../src/main/launcher/LaunchManager.js'), 'utf8');
  assert.ok(launchManagerJs.includes('ClientModPatcher'), 'LaunchManager debe invocar ClientModPatcher');
  assert.ok(launchManagerJs.includes('isShubaClientEnabled'), 'LaunchManager debe verificar isShubaClientEnabled');

  console.log('   ✔ Todos los componentes UI e integración en LaunchManager verificados.\n');

  // ----------------------------------------------------
  // 7. PANORAMA Y CATÁLOGO DE MODS CUSTOM EN GITHUB
  // ----------------------------------------------------
  console.log('▶ [7/7] Verificando inyección de capturas en panorama y mod en GitHub catalog...');
  const mockScreenshotsDir = path.join(mockInstanceDir, 'screenshots');
  fs.mkdirSync(mockScreenshotsDir, { recursive: true });
  fs.writeFileSync(path.join(mockScreenshotsDir, 'test-screen.png'), 'fake-png-data');
  const panoRes = patcher.injectScreenshotsAsPanorama(mockInstanceDir);
  assert.ok(panoRes.applied, 'injectScreenshotsAsPanorama debe aplicar la captura');
  assert.ok(fs.existsSync(path.join(mockInstanceDir, 'polyplus', 'panorama', 'my-screenshots', 'panorama_0.png')), 'panorama_0.png debe existir');
  assert.ok(fs.existsSync(path.join(mockInstanceDir, 'resourcepacks', 'ShubaPanorama', 'pack.mcmeta')), 'Resource pack ShubaPanorama de fallback para NeoForge debe existir');

  const { GitHubModsManager } = require('../src/main/github/GitHubModsManager');
  const ghMgr = new GitHubModsManager();
  const customMods = await ghMgr.fetchCustomMods(true);
  const foundShubaUi = customMods.find(m => m.fileName.toLowerCase() === 'shubaclient-ui.jar');
  assert.ok(foundShubaUi, 'ShubaClient UI debe estar presente en el catálogo de mods custom de GitHub');
  console.log('   ✔ Panorama con capturas y catálogo custom de GitHub validados con éxito.\n');

  // Limpieza
  try {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  } catch (_) {}

  console.log('====================================================');
  console.log('🎉 TODAS LAS PRUEBAS DE SHUBACLIENT PASARON AL 100%');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ ERROR EN PRUEBAS:', err);
  process.exit(1);
});
