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
  console.log('▶ [3/6] Verificando parcheo y rebranding a shubaclient-custom.jar...');
  const customJarPath = path.join(extractionDir, 'shubaclient-custom.jar');
  const patchResult = patcher.patchClientMod(extraction.baseJarPath, customJarPath);

  assert.ok(patchResult.success, 'El parcheo debe completarse con éxito');
  assert.ok(fs.existsSync(customJarPath), 'shubaclient-custom.jar debe generarse en disco');

  // Inspeccionar interior del JAR generado
  const customZip = new AdmZip(customJarPath);

  // A) Metadata fabric.mod.json
  const metaStr = customZip.readAsText('fabric.mod.json');
  assert.ok(metaStr, 'fabric.mod.json debe existir en el JAR');
  const meta = JSON.parse(metaStr);
  assert.strictEqual(meta.name, 'ShubaClient UI', 'El nombre del mod debe ser "ShubaClient UI"');
  assert.strictEqual(meta.description, 'Interfaz nativa y utilidades exclusivas de SHUBATECH');
  assert.ok(meta.authors.includes('SHUBATECH') && meta.authors.includes('LanderAlo'), 'Los autores deben ser SHUBATECH y LanderAlo');

  // B) Idiomas (en_us y es_es)
  const enUsStr = customZip.readAsText('assets/polyplus/lang/en_us.json');
  assert.ok(enUsStr.includes('ShubaClient'), 'en_us.json debe contener ShubaClient');
  assert.ok(!enUsStr.includes('ONECLIENT'), 'en_us.json no debe contener ONECLIENT');

  const esEsStr = customZip.readAsText('assets/polyplus/lang/es_es.json');
  assert.ok(esEsStr, 'es_es.json debe ser creado');
  const esEs = JSON.parse(esEsStr);
  assert.strictEqual(esEs['polyplus.hostWorld'], 'Hostear Mundo');
  assert.strictEqual(esEs['polyplus.page.wardrobe'], 'Vestidor');
  assert.strictEqual(esEs['polyplus.page.social'], 'Amigos');
  assert.strictEqual(esEs['polyplus.mainmenu.play'], 'Jugar');
  assert.strictEqual(esEs['polyplus.mainmenu.keepOneClient'], 'Usar ShubaClient');

  // C) Texturas y Logos Vectoriales
  const brandSvg = customZip.readAsText('assets/polyplus/brand/oneclient.svg');
  assert.ok(brandSvg.includes('SHUBACORE'), 'oneclient.svg debe ser reemplazado por logo SHUBACORE');

  const mainLogoSvg = customZip.readAsText('assets/polyplus/mainmenu/logo.svg');
  assert.ok(mainLogoSvg.includes('shubaStar'), 'logo.svg debe contener el vector de SHUBATECH');

  const footerLogoSvg = customZip.readAsText('assets/polyplus/mainmenu/footer-logo.svg');
  assert.ok(footerLogoSvg.includes('shubaFoot'), 'footer-logo.svg debe contener el vector de SHUBATECH');

  // D) Bytecode Constant Pool
  const menuCls = customZip.readFile('org/polyfrost/polyplus/client/gui/PolyPlusMainMenuScreenKt.class');
  assert.ok(menuCls.includes('SHUBACORE'), 'Clase PolyPlusMainMenuScreenKt debe contener SHUBACORE');
  assert.ok(!menuCls.includes('ONECLIENT'), 'Clase PolyPlusMainMenuScreenKt no debe contener ONECLIENT');
  console.log('   ✔ Metadatos, archivos de idioma, logos SVG y constantes JVM verificadas al 100%.\n');

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
  // 5. INYECCIÓN AUTOMÁTICA EN INSTANCIA
  // ----------------------------------------------------
  console.log('▶ [5/6] Verificando inyección en instancia (mods/ y opt/)...');
  const injectResult = patcher.injectIntoInstance(mockInstanceDir);
  assert.ok(injectResult.injected, 'La inyección debe completarse con éxito');

  const instanceModsDir = path.join(mockInstanceDir, 'mods');
  assert.ok(fs.existsSync(path.join(instanceModsDir, 'shubaclient-custom.jar')), 'shubaclient-custom.jar debe estar en /mods');
  console.log(`   ✔ Inyección validada: ${injectResult.injectedFiles.length} mods inyectados en la instancia.\n`);

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
