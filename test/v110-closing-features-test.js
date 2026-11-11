/**
 * ShubaCore - Unit Tests for 3D Skin Viewer, Screenshots Gallery & Vanilla+ HUD Utilities (Bloque 5 v1.1.0)
 * Developed by SHUBATECH
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const skinview3d = require('skinview3d');
const { getScreenshotsManager } = require('../src/main/screenshots/ScreenshotsManager');
const { getHudOptionsManager, HUD_MOD_PROJECTS } = require('../src/main/hud/HudOptionsManager');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 PRUEBAS: VISOR 3D, CAPTURAS & UTILIDADES HUD (v1.1.0)');
  console.log('====================================================\n');

  const testDir = path.join(__dirname, '.test-closing-features');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  // ---------------------------------------------------------
  // 1. Verificación del Visor 3D y Bundle empaquetado (skinview3d)
  // ---------------------------------------------------------
  console.log('▶ [1/3] Verificando Visor 3D de Skins y Librería skinview3d...');
  assert.ok(skinview3d.SkinViewer, 'SkinViewer debe estar exportado por skinview3d');
  assert.ok(skinview3d.WalkingAnimation, 'WalkingAnimation debe estar exportado');
  assert.ok(skinview3d.RunningAnimation, 'RunningAnimation debe estar exportado');

  const bundlePath = path.join(__dirname, '../src/renderer/libs/skinview3d.bundle.js');
  assert.ok(fs.existsSync(bundlePath), 'El bundle empaquetado para el renderer debe existir en src/renderer/libs/');
  const bundleSize = fs.statSync(bundlePath).size;
  assert.ok(bundleSize > 200000, `El tamaño del bundle (${bundleSize} bytes) debe ser válido (>200KB)`);

  console.log(`   ✔ skinview3d bundle validado (${(bundleSize / 1024).toFixed(1)} KB) y clases de animación confirmadas.`);

  // ---------------------------------------------------------
  // 2. Verificación de la Galería de Capturas (ScreenshotsManager)
  // ---------------------------------------------------------
  console.log('\n▶ [2/3] Verificando ScreenshotsManager (Escaneo, Filtrado y Borrado)...');
  const screenshotsManager = getScreenshotsManager();

  // Crear carpetas de prueba con capturas .png simuladas
  const mockInstanceDir = path.join(testDir, 'instancia-supervivencia');
  const mockScreenshotsDir = path.join(mockInstanceDir, 'screenshots');
  fs.mkdirSync(mockScreenshotsDir, { recursive: true });

  const testPng1 = path.join(mockScreenshotsDir, '2026-11-11_04.10.15.png');
  const testPng2 = path.join(mockScreenshotsDir, '2026-11-11_04.15.30.png');
  const testTxtDummy = path.join(mockScreenshotsDir, 'ignore_me.txt');

  fs.writeFileSync(testPng1, Buffer.alloc(1024 * 100)); // 100 KB
  fs.writeFileSync(testPng2, Buffer.alloc(1024 * 500)); // 500 KB
  fs.writeFileSync(testTxtDummy, 'dummy content');

  // Sobrescribir temporalmente _getScreenshotDirectories para la prueba
  const originalGetDirs = screenshotsManager._getScreenshotDirectories;
  screenshotsManager._getScreenshotDirectories = () => [
    {
      instanceId: 'inst-01',
      instanceName: 'Instancia Supervivencia',
      dirPath: mockScreenshotsDir
    }
  ];

  const allScreenshots = screenshotsManager.listScreenshots({ instanceId: 'all' });
  assert.strictEqual(allScreenshots.length, 2, 'Debe encontrar exactamente 2 capturas .png');
  assert.ok(allScreenshots.some((s) => s.fileName === '2026-11-11_04.10.15.png'));
  assert.ok(allScreenshots.some((s) => s.fileName === '2026-11-11_04.15.30.png'));
  assert.ok(allScreenshots[0].fileUrl.startsWith('file:///'), 'fileUrl debe tener formato file:///');

  // Filtrado por ID de instancia
  const filteredScreenshots = screenshotsManager.listScreenshots({ instanceId: 'inst-01' });
  assert.strictEqual(filteredScreenshots.length, 2);

  const nonExistentFilter = screenshotsManager.listScreenshots({ instanceId: 'otra-instancia' });
  assert.strictEqual(nonExistentFilter.length, 0);

  // Borrado de captura
  const deleteRes = screenshotsManager.deleteScreenshot(testPng1);
  assert.strictEqual(deleteRes.success, true);
  assert.strictEqual(fs.existsSync(testPng1), false, 'El archivo borrado ya no debe existir');

  const afterDeleteList = screenshotsManager.listScreenshots({ instanceId: 'all' });
  assert.strictEqual(afterDeleteList.length, 1);
  assert.strictEqual(afterDeleteList[0].fileName, '2026-11-11_04.15.30.png');

  // Restaurar método
  screenshotsManager._getScreenshotDirectories = originalGetDirs;
  console.log('   ✔ Escaneo de directorios, filtrado por instancia y eliminación probados con éxito.');

  // ---------------------------------------------------------
  // 3. Verificación de Utilidades HUD / Vanilla+ (HudOptionsManager)
  // ---------------------------------------------------------
  console.log('\n▶ [3/3] Verificando HudOptionsManager (Ajustes options.txt y Módulos HUD)...');
  const hudManager = getHudOptionsManager();

  // Test lectura inicial sin options.txt
  const initialOpts = hudManager.readOptions(mockInstanceDir);
  assert.strictEqual(initialOpts.fullbright, false);
  assert.strictEqual(initialOpts.autoSprint, false);
  assert.strictEqual(initialOpts.noClouds, false);
  assert.strictEqual(initialOpts.noVsync, false);

  // Test activar Fullbright (Gamma 1000%)
  hudManager.setOption(mockInstanceDir, 'fullbright', true);
  let updatedOpts = hudManager.readOptions(mockInstanceDir);
  assert.strictEqual(updatedOpts.fullbright, true, 'Fullbright debe estar activo');

  const rawOptionsText = fs.readFileSync(path.join(mockInstanceDir, 'options.txt'), 'utf8');
  assert.ok(rawOptionsText.includes('gamma:10.0'), 'options.txt debe contener gamma:10.0');

  // Test activar Auto-Sprint, Ocultar Nubes y Desactivar VSync
  hudManager.setOption(mockInstanceDir, 'autoSprint', true);
  hudManager.setOption(mockInstanceDir, 'noClouds', true);
  hudManager.setOption(mockInstanceDir, 'noVsync', true);

  updatedOpts = hudManager.readOptions(mockInstanceDir);
  assert.strictEqual(updatedOpts.autoSprint, true, 'Auto-Sprint debe estar activo');
  assert.strictEqual(updatedOpts.noClouds, true, 'No Clouds debe estar activo');
  assert.strictEqual(updatedOpts.noVsync, true, 'No VSync debe estar activo');

  // Test desactivar Fullbright (restaurar a gamma normal 1.0)
  hudManager.setOption(mockInstanceDir, 'fullbright', false);
  updatedOpts = hudManager.readOptions(mockInstanceDir);
  assert.strictEqual(updatedOpts.fullbright, false, 'Fullbright debe estar desactivado');

  const restoredText = fs.readFileSync(path.join(mockInstanceDir, 'options.txt'), 'utf8');
  assert.ok(restoredText.includes('gamma:1.0'), 'options.txt debe restaurarse a gamma:1.0');

  // Test detección de mods HUD instalados
  const mockModsDir = path.join(mockInstanceDir, 'mods');
  fs.mkdirSync(mockModsDir, { recursive: true });

  let modsState = hudManager.getHudModsState(mockInstanceDir);
  assert.strictEqual(modsState.coords, false);
  assert.strictEqual(modsState.zoom, false);
  assert.strictEqual(modsState.armor, false);
  assert.strictEqual(modsState.fps, false);

  // Agregar BetterF3 y Zoomify simulados
  fs.writeFileSync(path.join(mockModsDir, 'BetterF3-1.21.1-Fabric-11.0.1.jar'), 'dummy');
  fs.writeFileSync(path.join(mockModsDir, 'zoomify-2.14.0+1.21.1.jar'), 'dummy');
  fs.writeFileSync(path.join(mockModsDir, 'sodium-fabric-0.5.8.jar'), 'dummy');

  modsState = hudManager.getHudModsState(mockInstanceDir);
  assert.strictEqual(modsState.coords, true, 'BetterF3 debe detectarse como activo');
  assert.strictEqual(modsState.zoom, true, 'Zoomify debe detectarse como activo');
  assert.strictEqual(modsState.fps, true, 'Sodium debe detectarse como activo');
  assert.strictEqual(modsState.armor, false, 'Armor aún no debe estar presente');

  console.log('   ✔ Lectura y escritura de options.txt (Fullbright, Sprint, Nubes, VSync) validadas.');
  console.log('   ✔ Detección precisa de módulos HUD en /mods confirmada.');

  // Limpiar directorio temporal de pruebas
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (_) {}

  console.log('\n====================================================');
  console.log('🎉 TODAS LAS PRUEBAS DE CIERRE v1.1.0 PASARON CON ÉXITO');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Error en las pruebas de cierre v1.1.0:', err);
  process.exit(1);
});
