/**
 * ShubaCore - Test Suite: Corrección de 4 Errores Críticos (v1.1.0)
 * SHUBATECH
 *
 * 1. Navegación en Barra Lateral y Blindaje contra Pantalla Negra
 * 2. Orden Cronológico Estricto de Versiones de Minecraft (sin snapshots ni '26.3')
 * 3. Integridad de Instancias Vanilla en HUD (sin forzar Fabric) y options.txt
 * 4. Extracción y Caché de Iconos de Mods Custom de GitHub
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const { ServerInstaller } = require('../src/main/servers/ServerInstaller');
const { HudOptionsManager } = require('../src/main/hud/HudOptionsManager');
const { GitHubModsManager } = require('../src/main/github/GitHubModsManager');

async function runCriticalFixesTests() {
  console.log('====================================================');
  console.log('🧪 PRUEBAS DE VERIFICACIÓN: 4 ERRORES CRÍTICOS (v1.1.0)');
  console.log('====================================================\n');

  const testDir = path.join(__dirname, '.test-critical-fixes');
  if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  fs.mkdirSync(testDir, { recursive: true });

  // --------------------------------------------------------------------------
  // TEST 1: Catálogo de versiones ordenado cronológicamente y sin '26.3'
  // --------------------------------------------------------------------------
  console.log('▶ [1/4] Verificando filtro y orden cronológico de versiones de Minecraft...');
  const versions = await ServerInstaller.getAvailableMinecraftVersions();
  assert(Array.isArray(versions) && versions.length > 0, 'Debe devolver un arreglo de versiones');
  assert(!versions.includes('26.3'), 'PROHIBIDO: No debe incluir "26.3" ni snapshots experimentales');
  
  // Todos deben cumplir formato oficial 1.x o 1.x.x
  const invalidFormat = versions.filter((v) => !/^1\.\d+(\.\d+)?$/.test(v));
  assert.strictEqual(invalidFormat.length, 0, `Ninguna versión debe tener formato inválido: ${invalidFormat.join(', ')}`);

  // Debe incluir versiones clave
  assert(versions.includes('1.21.1'), 'Debe incluir 1.21.1');
  assert(versions.includes('1.20.1'), 'Debe incluir 1.20.1');
  assert(versions.includes('1.7.10'), 'Debe incluir 1.7.10');

  // Primer elemento debe ser la versión release más reciente (ej. 1.21.4 o 1.21.x)
  assert(versions[0].startsWith('1.21'), `La primera versión debe ser reciente de la rama 1.21.x (obtenido: ${versions[0]})`);
  console.log(`   ✔ Versiones filtradas y ordenadas de forma cronológica (${versions.length} releases, más reciente: ${versions[0]}).`);

  // --------------------------------------------------------------------------
  // TEST 2: Instancias Vanilla NO deben forzar Fabric al interactuar con HUD
  // --------------------------------------------------------------------------
  console.log('▶ [2/4] Verificando que HUD no modifique el loader de instancias Vanilla...');
  const hudManager = new HudOptionsManager();
  const vanillaInstanceDir = path.join(testDir, 'vanilla-instance');
  fs.mkdirSync(vanillaInstanceDir, { recursive: true });

  const mockVanillaProfile = {
    id: 'test_vanilla_01',
    name: 'Vanilla Puro',
    loader: 'vanilla',
    loaderVersion: null,
    gameVersion: '1.21.1',
    instancePath: vanillaInstanceDir
  };

  // Mockear getById y getActive
  hudManager.profileManager = {
    getById: () => mockVanillaProfile,
    getActive: () => mockVanillaProfile,
    updateProfile: (id, updates) => {
      Object.assign(mockVanillaProfile, updates);
    },
    getDataDirectory: () => testDir
  };

  // Intentar activar mod HUD en Vanilla debe rechazar sin alterar loader
  let threwExpected = false;
  try {
    await hudManager.toggleHudMod({
      profileId: 'test_vanilla_01',
      modType: 'keystrokes',
      enable: true
    });
  } catch (err) {
    threwExpected = true;
    assert(err.message.includes('requieren un entorno con mods'), `Mensaje debe explicar el requerimiento de modloader: ${err.message}`);
  }
  assert(threwExpected, 'Debe lanzar un error al intentar instalar mods HUD en una instancia Vanilla pura');
  assert.strictEqual(mockVanillaProfile.loader, 'vanilla', 'PROHIBIDO: El loader de la instancia Vanilla NO debe ser alterado a Fabric');

  // Los ajustes de options.txt deben funcionar al 100% en la instancia Vanilla
  hudManager.setOption(vanillaInstanceDir, 'fullbright', true);
  hudManager.setOption(vanillaInstanceDir, 'autoSprint', true);
  hudManager.setOption(vanillaInstanceDir, 'noClouds', true);
  hudManager.setOption(vanillaInstanceDir, 'noVsync', true);

  const optsState = hudManager.readOptions(vanillaInstanceDir);
  assert.strictEqual(optsState.fullbright, true, 'Fullbright debe guardarse en options.txt de Vanilla');
  assert.strictEqual(optsState.autoSprint, true, 'AutoSprint debe guardarse en options.txt de Vanilla');
  assert.strictEqual(optsState.noClouds, true, 'Sin nubes debe guardarse en options.txt de Vanilla');
  assert.strictEqual(optsState.noVsync, true, 'Sin VSync debe guardarse en options.txt de Vanilla');
  console.log('   ✔ Instancias Vanilla protegidas: loader permanece Vanilla y options.txt se aplica de forma nativa.');

  // --------------------------------------------------------------------------
  // TEST 3: Extracción de metadatos e iconos de mods .jar (NeoForge logoFile)
  // --------------------------------------------------------------------------
  console.log('▶ [3/4] Verificando extracción de icono de mod .jar y almacenamiento en caché...');
  const ghManager = new GitHubModsManager();
  ghManager.userDataPath = testDir;
  ghManager.iconsCacheDir = path.join(testDir, 'cache', 'mod-icons');
  fs.mkdirSync(ghManager.iconsCacheDir, { recursive: true });

  // Crear un .jar mock que emule un mod NeoForge con logoFile
  const mockJarPath = path.join(testDir, 'Saintsdragons-1.21.1-1.0.jar');
  const zip = new AdmZip();

  const mockModsToml = `
[[mods]]
modId = "saintsdragons"
version = "1.0.0"
displayName = "Saints Dragons"
authors = "DragonLord"
description = "Dragones épicos para Minecraft."
logoFile = "dragon_icon.png"
`;
  zip.addFile('META-INF/neoforge.mods.toml', Buffer.from(mockModsToml, 'utf8'));

  // Añadir un PNG dummy de 1x1 píxel transparente
  const dummyPng = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2d450000000049454e44ae426082', 'hex');
  zip.addFile('dragon_icon.png', dummyPng);
  zip.writeZip(mockJarPath);

  const meta = ghManager._extractJarMetadata(mockJarPath);
  assert(meta, 'Debe extraer metadatos del .jar');
  assert.strictEqual(meta.name, 'Saints Dragons', 'Debe extraer displayName');
  assert.strictEqual(meta.version, '1.0.0', 'Debe extraer versión');
  assert(meta.iconBase64 && meta.iconBase64.startsWith('data:image/png;base64,'), 'Debe extraer icono en base64');

  // Verificar que el icono se guardó en la caché persistente en disco
  const cachedIconFile = ghManager.getIconPath('Saintsdragons-1.21.1-1.0.jar');
  assert(fs.existsSync(cachedIconFile), 'El icono extraído debe persistir en disco en cache/mod-icons/');
  assert(fs.statSync(cachedIconFile).size > 0, 'El archivo de icono en caché no debe estar vacío');
  console.log('   ✔ Icono extraído correctamente de neoforge.mods.toml (logoFile) y cacheado en disco.');

  // --------------------------------------------------------------------------
  // TEST 4: Estructura DOM y Enrutador de Navegación en frontend
  // --------------------------------------------------------------------------
  console.log('▶ [4/4] Verificando elementos DOM y scripts de navegación en frontend...');
  const indexHtml = fs.readFileSync(path.join(__dirname, '../src/renderer/index.html'), 'utf8');
  const rendererJs = fs.readFileSync(path.join(__dirname, '../src/renderer/renderer.js'), 'utf8');

  // Las 8 vistas deben estar presentes en el DOM
  const requiredViews = [
    'view-profiles', 'view-catalog', 'view-mods', 'view-servers',
    'view-screenshots', 'view-skins', 'view-settings', 'view-console'
  ];
  for (const vId of requiredViews) {
    assert(indexHtml.includes(`id="${vId}"`), `index.html debe contener el elemento #${vId}`);
  }

  // El aviso de Vanilla debe existir en el DOM
  assert(indexHtml.includes('id="hud-vanilla-warning"'), 'index.html debe contener #hud-vanilla-warning');

  // renderer.js debe exponer las funciones globales y manejar alias
  assert(rendererJs.includes('window.switchTab = switchMainView;'), 'renderer.js debe definir window.switchTab');
  assert(rendererJs.includes('window.navigateTo = switchMainView;'), 'renderer.js debe definir window.navigateTo');
  assert(rendererJs.includes("if (viewName === 'instances') viewName = 'profiles';"), 'renderer.js debe normalizar el alias instances');

  console.log('   ✔ Todas las 8 vistas existen y los handlers de navegación están blindados.');

  // Limpieza
  try { fs.rmSync(testDir, { recursive: true, force: true }); } catch (_) {}

  console.log('\n====================================================');
  console.log('🎉 TODAS LAS PRUEBAS DE LOS 4 ERRORES CRÍTICOS PASARON');
  console.log('====================================================\n');
}

runCriticalFixesTests().catch((err) => {
  console.error('\n❌ ERROR EN LAS PRUEBAS:', err);
  process.exit(1);
});
