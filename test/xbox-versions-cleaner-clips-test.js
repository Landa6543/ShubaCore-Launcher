/**
 * ShubaCore - Unit Tests for Xbox Controller, Versions 26.x / Snapshots,
 * Spanish Language Options Protection, Video Clips & Disk Cleaner (v1.1.0)
 * Developed by SHUBATECH
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { ServerInstaller } = require('../src/main/servers/ServerInstaller');
const { getHudOptionsManager } = require('../src/main/hud/HudOptionsManager');
const { getDiskCleanerManager } = require('../src/main/system/DiskCleanerManager');
const { getScreenshotsManager } = require('../src/main/screenshots/ScreenshotsManager');
const { getControllerMapManager } = require('../src/main/controller/ControllerMapManager');

async function runTests() {
  console.log('\n====================================================');
  console.log('🧪 PRUEBAS: MANDO XBOX, VERSIONES 26.X/SNAPSHOTS, CLIPS Y LIMPIADOR');
  console.log('====================================================\n');

  const testDir = path.join(__dirname, '.test-xbox-versions-cleaner');
  if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  fs.mkdirSync(testDir, { recursive: true });

  // --------------------------------------------------------------------------
  // TEST 1: Catálogo de versiones con 26.x y selector de Snapshots
  // --------------------------------------------------------------------------
  console.log('▶ [1/5] Verificando versiones 26.x y selector de Snapshots...');
  const releases = await ServerInstaller.getAvailableMinecraftVersions({ includeSnapshots: false });
  assert(Array.isArray(releases) && releases.length > 0, 'Debe devolver un arreglo de versiones');
  assert(releases.includes('26.3'), 'Debe incluir versión 26.3');
  assert(releases.includes('26.2'), 'Debe incluir versión 26.2');
  assert(releases.includes('26.1'), 'Debe incluir versión 26.1');
  assert(releases.includes('1.21.11'), 'Debe incluir versión 1.21.11');
  assert(releases.includes('1.21.1'), 'Debe incluir versión 1.21.1');
  assert(releases.includes('1.0') || releases.includes('1.7.10'), 'Debe bajar hasta las versiones 1.x');

  // Primer elemento debe ser la más reciente (26.x)
  assert(releases[0].startsWith('26.'), `La versión más reciente debe ser 26.x (obtenido: ${releases[0]})`);

  // Con includeSnapshots: true
  const withSnapshots = await ServerInstaller.getAvailableMinecraftVersions({ includeSnapshots: true });
  assert(withSnapshots.length >= releases.length, 'La lista con snapshots debe tener igual o mayor cantidad de versiones');
  assert(withSnapshots.some((v) => v.includes('snapshot') || v.includes('26.4')), 'Debe contener snapshots');
  console.log(`   ✔ Versiones 26.x y snapshots validados exitosamente (${releases.length} releases, ${withSnapshots.length} total con snapshots).`);

  // --------------------------------------------------------------------------
  // TEST 2: Idioma Español de España (lang:es_es) y autoJump:false en options.txt
  // --------------------------------------------------------------------------
  console.log('▶ [2/5] Verificando fijación de lang:es_es y autoJump:false en instancias nuevas...');
  const hudManager = getHudOptionsManager();
  const newInstDir = path.join(testDir, 'instancia-nueva');
  fs.mkdirSync(newInstDir, { recursive: true });

  hudManager.prepareInstanceOptions(newInstDir);
  const optsFile = path.join(newInstDir, 'options.txt');
  assert(fs.existsSync(optsFile), 'options.txt debe haber sido creado');
  const optsContent = fs.readFileSync(optsFile, 'utf8');
  assert(optsContent.includes('lang:es_es'), 'Debe contener lang:es_es por defecto');
  assert(optsContent.includes('autoJump:false'), 'Debe contener autoJump:false por defecto');

  // Si el usuario modifica opciones, nunca se sobreescribe
  hudManager.setOption(newInstDir, 'fullbright', true);
  const updatedContent = fs.readFileSync(optsFile, 'utf8');
  assert(updatedContent.includes('gamma:100.0'), 'Debe actualizar gamma a 100.0');
  assert(updatedContent.includes('lang:es_es'), 'lang:es_es debe seguir presente');
  assert(updatedContent.includes('autoJump:false'), 'autoJump:false debe seguir presente');
  console.log('   ✔ Idioma español (es_es) y autoJump:false protegidos al 100%.');

  // --------------------------------------------------------------------------
  // TEST 3: Limpiador inteligente de basura (DiskCleanerManager)
  // --------------------------------------------------------------------------
  console.log('▶ [3/5] Verificando limpiador inteligente de basura y protección de saves/mods...');
  const cleaner = getDiskCleanerManager();
  const mockInstDir = path.join(testDir, 'instancia-basura');
  fs.mkdirSync(mockInstDir, { recursive: true });

  // Crear archivos basura seguros
  const logsDir = path.join(mockInstDir, 'logs');
  const crashDir = path.join(mockInstDir, 'crash-reports');
  const cacheDir = path.join(mockInstDir, '.cache');
  fs.mkdirSync(logsDir, { recursive: true });
  fs.mkdirSync(crashDir, { recursive: true });
  fs.mkdirSync(cacheDir, { recursive: true });

  fs.writeFileSync(path.join(logsDir, '2026-11-10-1.log.gz'), 'dummy-compressed-log-bytes-1');
  fs.writeFileSync(path.join(logsDir, '2026-11-10-2.log.gz'), 'dummy-compressed-log-bytes-2');
  fs.writeFileSync(path.join(logsDir, 'latest.log'), 'active-log-do-not-delete'); // NO debe borrarse
  fs.writeFileSync(path.join(crashDir, 'crash-2026-11-10.txt'), 'dummy-crash-report');
  fs.writeFileSync(path.join(cacheDir, 'temp-loader.dat'), 'dummy-cache-data');

  // Crear archivos sagrados que NUNCA deben tocarse
  const savesDir = path.join(mockInstDir, 'saves', 'MiMundo');
  const modsDir = path.join(mockInstDir, 'mods');
  const scDir = path.join(mockInstDir, 'screenshots');
  const clipsDir = path.join(mockInstDir, 'clips');
  fs.mkdirSync(savesDir, { recursive: true });
  fs.mkdirSync(modsDir, { recursive: true });
  fs.mkdirSync(scDir, { recursive: true });
  fs.mkdirSync(clipsDir, { recursive: true });

  fs.writeFileSync(path.join(savesDir, 'level.dat'), 'MUNDO_SAGRADO');
  fs.writeFileSync(path.join(modsDir, 'mod-prueba.jar'), 'MOD_SAGRADO');
  fs.writeFileSync(path.join(scDir, 'captura.png'), 'CAPTURA_SAGRADA');
  fs.writeFileSync(path.join(clipsDir, 'Clip-2026-11-10.webm'), 'CLIP_SAGRADO');

  // Escanear
  const scan = cleaner.scan(mockInstDir);
  assert(scan.totalFiles >= 4, `Debe detectar al menos 4 archivos basura (detectados: ${scan.totalFiles})`);
  assert(scan.totalBytes > 0, 'Debe calcular bytes basura');

  // Limpiar
  const cleanResult = cleaner.clean(mockInstDir);
  assert(cleanResult.cleanedFiles >= 4, 'Debe haber limpiado los archivos basura');
  assert(cleanResult.freedBytes > 0, 'Debe registrar bytes liberados');

  // Verificar que la basura fue eliminada
  assert(!fs.existsSync(path.join(logsDir, '2026-11-10-1.log.gz')), 'log.gz 1 debe estar borrado');
  assert(!fs.existsSync(path.join(logsDir, '2026-11-10-2.log.gz')), 'log.gz 2 debe estar borrado');
  assert(!fs.existsSync(path.join(crashDir, 'crash-2026-11-10.txt')), 'crash report debe estar borrado');

  // VERIFICACIÓN CRÍTICA: Archivos sagrados 100% INTACTOS
  assert(fs.existsSync(path.join(logsDir, 'latest.log')), 'latest.log NO debe ser borrado');
  assert(fs.existsSync(path.join(savesDir, 'level.dat')), 'CRÍTICO: saves/level.dat NO debe ser tocado jamás');
  assert(fs.existsSync(path.join(modsDir, 'mod-prueba.jar')), 'CRÍTICO: mods/ NO debe ser tocado jamás');
  assert(fs.existsSync(path.join(scDir, 'captura.png')), 'CRÍTICO: screenshots/ NO debe ser tocado jamás');
  assert(fs.existsSync(path.join(clipsDir, 'Clip-2026-11-10.webm')), 'CRÍTICO: clips/ NO debe ser tocado jamás');
  console.log(`   ✔ Limpiador validado (${cleanResult.cleanedFiles} archivos eliminados, saves, mods y clips 100% intactos).`);

  // --------------------------------------------------------------------------
  // TEST 4: Gestor de Capturas y Video Clips (Replay F9)
  // --------------------------------------------------------------------------
  console.log('▶ [4/5] Verificando gestor de clips y capturas...');
  const scManager = getScreenshotsManager();

  // Guardar un clip en mockInstDir
  const dummyVideo = Buffer.from('RIFF....WEBM....DUMMY_VIDEO_DATA');
  const savedClip = scManager.saveClip(mockInstDir, dummyVideo, 'webm');
  assert(savedClip.success, 'saveClip debe devolver success: true');
  assert(fs.existsSync(savedClip.filePath), `El archivo de video debe existir en: ${savedClip.filePath}`);
  assert(savedClip.fileName.startsWith('Clip-'), 'El nombre de clip debe empezar con Clip-');

  // Listar con filtro 'clips'
  const listClips = scManager.listScreenshots({ instancePath: mockInstDir, mediaType: 'clips' });
  assert(listClips.some((c) => c.type === 'clip'), 'Debe listar elementos con type: clip');

  // Listar con filtro 'photos'
  const listPhotos = scManager.listScreenshots({ instancePath: mockInstDir, mediaType: 'photos' });
  assert(listPhotos.every((p) => p.type === 'screenshot'), 'El filtro photos solo debe listar screenshots');

  // Listar con filtro 'all'
  const listAll = scManager.listScreenshots({ instancePath: mockInstDir, mediaType: 'all' });
  assert(listAll.length >= listClips.length, 'Filtro all debe contener la totalidad');
  console.log(`   ✔ Gestor de capturas y clips validado (fotos y videos separados correctamente).`);

  // --------------------------------------------------------------------------
  // TEST 5: Mapeo nativo de Xbox Series X|S (Cero configuración obligatoria)
  // --------------------------------------------------------------------------
  console.log('▶ [5/5] Verificando mapeo oficial de Xbox Series X|S...');
  const mapManager = getControllerMapManager();
  const defaultMapping = mapManager.getDefaultMapping();

  assert.strictEqual(defaultMapping.buttons['0'].action, 'jump', 'Botón A: Saltar (Espacio)');
  assert.strictEqual(defaultMapping.buttons['0'].key, 'Space');
  assert.strictEqual(defaultMapping.buttons['1'].action, 'drop', 'Botón B: Soltar ítem (Q)');
  assert.strictEqual(defaultMapping.buttons['1'].key, 'Q');
  assert.strictEqual(defaultMapping.buttons['2'].action, 'swap_hand', 'Botón X: Cambiar de mano (F)');
  assert.strictEqual(defaultMapping.buttons['2'].key, 'F');
  assert.strictEqual(defaultMapping.buttons['3'].action, 'inventory', 'Botón Y: Abrir Inventario (E)');
  assert.strictEqual(defaultMapping.buttons['3'].key, 'E');
  assert.strictEqual(defaultMapping.buttons['6'].action, 'use', 'LT: Usar / Colocar Bloque (Mouse2)');
  assert.strictEqual(defaultMapping.buttons['7'].action, 'attack', 'RT: Atacar / Picar (Mouse1)');
  assert.strictEqual(defaultMapping.buttons['10'].action, 'sprint', 'Stick Izq LS/L3: Correr (Ctrl)');
  assert.strictEqual(defaultMapping.buttons['11'].action, 'sneak', 'Stick Der RS/R3: Agacharse (Shift)');

  console.log('   ✔ Mapeo oficial de Xbox Series X|S validado con exactitud.');

  console.log('\n====================================================');
  console.log('🎉 TODAS LAS PRUEBAS DE MANDO, VERSIONES 26.X Y NUEVAS FUNCIONES PASARON');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ ERROR EN PRUEBAS:', err);
  process.exit(1);
});
