/**
 * ShubaCore - Smart Features Test Suite
 * Tests CrashInspector, SnapshotManager, NotebookManager, GraphicPresetsManager, BadgesManager
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CrashInspector = require('../src/main/launcher/CrashInspector');
const { SnapshotManager } = require('../src/main/snapshots/SnapshotManager');
const { NotebookManager } = require('../src/main/notebook/NotebookManager');
const { GraphicPresetsManager } = require('../src/main/presets/GraphicPresetsManager');
const { BadgesManager } = require('../src/main/badges/BadgesManager');

console.log('====================================================');
console.log('🧪 TEST: NUEVAS CARACTERÍSTICAS INTELIGENTES SHUBACORE');
console.log('====================================================');

const testDir = path.join(__dirname, '.test-smart-features');
if (fs.existsSync(testDir)) {
  fs.rmSync(testDir, { recursive: true, force: true });
}
fs.mkdirSync(testDir, { recursive: true });

async function runTests() {
  // 1. CrashInspector Tests
  console.log('\n▶ [1/5] Probando CrashInspector...');
  const inspector = new CrashInspector();
  const mockInstance = path.join(testDir, 'crash-instance');
  fs.mkdirSync(path.join(mockInstance, 'mods'), { recursive: true });
  fs.mkdirSync(path.join(mockInstance, 'crash-reports'), { recursive: true });

  // Crear un mod simulado
  fs.writeFileSync(path.join(mockInstance, 'mods', 'jei-1.20.1-15.2.0.27.jar'), 'dummy jar content');
  fs.writeFileSync(path.join(mockInstance, 'mods', 'alexsmobs-1.22.8.jar'), 'dummy jar content');

  // Test 1.1: OOM detection
  fs.writeFileSync(path.join(mockInstance, 'crash-reports', 'crash-2026-11-23_01.txt'), `
Time: 2026-11-23 02:00:00
Description: Initializing game
java.lang.OutOfMemoryError: Java heap space
  at java.util.Arrays.copyOf(Arrays.java:3215)
  `);
  let diag = inspector.analyzeCrash(mockInstance);
  assert.strictEqual(diag.hasCrash, true, 'Debe detectar el crash');
  assert.strictEqual(diag.errorType, 'OUT_OF_MEMORY', 'Debe clasificar como OUT_OF_MEMORY');
  assert(diag.suggestedActions.some(a => a.id === 'increase-ram'), 'Debe sugerir aumentar RAM');
  console.log('   ✔ OutOfMemoryError detectado y diagnosticado correctamente.');

  // Test 1.2: Mod Conflict Culprit identification
  fs.writeFileSync(path.join(mockInstance, 'crash-reports', 'crash-2026-11-23_02.txt'), `
Time: 2026-11-23 02:05:00
Description: Mod loading error
Suspected Mods:
  Alex's Mobs (alexsmobs), at: alexsmobs-1.22.8.jar
java.lang.NullPointerException: Registry Object not present
  at com.github.alexthe666.alexsmobs.CommonProxy.init(CommonProxy.java:80)
  `);
  diag = inspector.analyzeCrash(mockInstance);
  assert.strictEqual(diag.hasCrash, true);
  assert.strictEqual(diag.errorType, 'MOD_CONFLICT');
  assert.strictEqual(diag.culpritMod?.fileName, 'alexsmobs-1.22.8.jar', 'Debe identificar el archivo jar culpable');
  console.log(`   ✔ Mod culpable detectado: ${diag.culpritMod.fileName}`);

  // Test 1.3: Disable mod
  const disRes = inspector.disableMod(mockInstance, 'alexsmobs-1.22.8.jar');
  assert.strictEqual(disRes.success, true);
  assert(fs.existsSync(path.join(mockInstance, 'mods', 'alexsmobs-1.22.8.jar.disabled')), 'Archivo debe quedar como .disabled');
  const enRes = inspector.enableMod(mockInstance, 'alexsmobs-1.22.8.jar.disabled');
  assert.strictEqual(enRes.success, true);
  assert(fs.existsSync(path.join(mockInstance, 'mods', 'alexsmobs-1.22.8.jar')), 'Archivo debe quedar restaurado como .jar');
  console.log('   ✔ Desactivación y reactivación de mod en 1 clic validada.');

  // 2. SnapshotManager Tests
  console.log('\n▶ [2/5] Probando SnapshotManager (Puntos de Restauración)...');
  const snapMgr = new SnapshotManager();
  const snapInstance = path.join(testDir, 'snapshot-instance');
  fs.mkdirSync(path.join(snapInstance, 'mods'), { recursive: true });
  fs.mkdirSync(path.join(snapInstance, 'config'), { recursive: true });
  fs.writeFileSync(path.join(snapInstance, 'mods', 'mod-a.jar'), 'MOD A');
  fs.writeFileSync(path.join(snapInstance, 'config', 'test.cfg'), 'setting=123');
  fs.writeFileSync(path.join(snapInstance, 'options.txt'), 'renderDistance:8\n');

  // Create snapshot
  const created = await snapMgr.createSnapshot(snapInstance, { label: 'Snapshot de prueba' });
  assert.strictEqual(created.success, true);
  assert.strictEqual(created.snapshot.label, 'Snapshot de prueba');
  assert.strictEqual(created.snapshot.modsCount, 1);

  // List snapshots
  const list = snapMgr.listSnapshots(snapInstance);
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].id, created.snapshot.id);
  console.log(`   ✔ Snapshot creado y listado (${list[0].sizeFormatted}, ${list[0].modsCount} mods).`);

  // Simulate modification (install broken mod and corrupt config)
  fs.writeFileSync(path.join(snapInstance, 'mods', 'broken-mod.jar'), 'BROKEN MOD');
  fs.writeFileSync(path.join(snapInstance, 'config', 'test.cfg'), 'setting=CORRUPTED');

  // Restore snapshot
  const restored = await snapMgr.restoreSnapshot(snapInstance, created.snapshot.id);
  assert.strictEqual(restored.success, true);
  assert(!fs.existsSync(path.join(snapInstance, 'mods', 'broken-mod.jar')), 'El mod roto debe desaparecer al restaurar');
  assert(fs.existsSync(path.join(snapInstance, 'mods', 'mod-a.jar')), 'El mod original debe existir');
  assert.strictEqual(fs.readFileSync(path.join(snapInstance, 'config', 'test.cfg'), 'utf8'), 'setting=123', 'Config debe restaurarse fielmente');
  console.log('   ✔ Restauración de snapshot validada con éxito.');

  // Delete snapshot
  const delRes = snapMgr.deleteSnapshot(snapInstance, created.snapshot.id);
  assert.strictEqual(delRes.success, true);
  assert.strictEqual(snapMgr.listSnapshots(snapInstance).length, 0);
  console.log('   ✔ Eliminación de snapshot validada.');

  // 3. NotebookManager Tests
  console.log('\n▶ [3/5] Probando NotebookManager (Libreta de Coordenadas)...');
  const notebook = new NotebookManager();
  const noteInstance = path.join(testDir, 'notebook-instance');
  fs.mkdirSync(noteInstance, { recursive: true });

  const addRes = notebook.addNote(noteInstance, {
    title: 'Portal al Nether',
    dimension: 'nether',
    x: 125,
    y: 72,
    z: -340,
    description: 'Arriba en la fortaleza'
  });
  assert.strictEqual(addRes.success, true);
  assert.strictEqual(addRes.note.tpCommand, '/tp @s 125 72 -340');

  const notesList = notebook.getNotes(noteInstance);
  assert.strictEqual(notesList.length, 1);
  assert.strictEqual(notesList[0].title, 'Portal al Nether');

  const updateRes = notebook.updateNote(noteInstance, addRes.note.id, { x: 130 });
  assert.strictEqual(updateRes.success, true);
  assert.strictEqual(updateRes.note.tpCommand, '/tp @s 130 72 -340');

  const delNoteRes = notebook.deleteNote(noteInstance, addRes.note.id);
  assert.strictEqual(delNoteRes.success, true);
  assert.strictEqual(notebook.getNotes(noteInstance).length, 0);
  console.log('   ✔ Libreta de coordenadas y generación de comando /tp validadas.');

  // 4. GraphicPresetsManager Tests
  console.log('\n▶ [4/5] Probando GraphicPresetsManager (Potato, Balanced, Ultra)...');
  const presetMgr = new GraphicPresetsManager();
  const presetInstance = path.join(testDir, 'preset-instance');
  fs.mkdirSync(presetInstance, { recursive: true });
  fs.writeFileSync(path.join(presetInstance, 'options.txt'), 'key_jump:key.keyboard.space\nlang:es_es\nrenderDistance:12\n');

  // Apply Potato
  const potRes = presetMgr.applyPreset(presetInstance, 'potato');
  assert.strictEqual(potRes.success, true);
  let optContent = fs.readFileSync(path.join(presetInstance, 'options.txt'), 'utf8');
  assert(optContent.includes('renderDistance:4'), 'Modo Patata debe fijar renderDistance:4');
  assert(optContent.includes('graphicsMode:0'), 'Modo Patata debe fijar graphicsMode:0');
  assert(optContent.includes('key_jump:key.keyboard.space'), 'Debe preservar opciones existentes del usuario');
  assert(optContent.includes('lang:es_es'), 'Debe preservar idioma');

  // Detect Potato
  const current = presetMgr.getCurrentPreset(presetInstance);
  assert.strictEqual(current.detectedPreset, 'potato');
  console.log('   ✔ Presets gráficos y Modo Patata validados de forma no destructiva.');

  // 5. BadgesManager Tests
  console.log('\n▶ [5/5] Probando BadgesManager (Logros e hitos de 5h, 50h, 500h)...');
  const badgesMgr = new BadgesManager();
  // Simular 55 horas de juego (198000 segundos) y 80 mods
  const badges = badgesMgr.getBadgesWithProgress(198000, 80);
  const b5h = badges.find(b => b.id === 'playtime_5h');
  const b50h = badges.find(b => b.id === 'playtime_50h');
  const b500h = badges.find(b => b.id === 'playtime_500h');
  const b75m = badges.find(b => b.id === 'mods_75');

  assert.strictEqual(b5h.unlocked, true, '5h debe estar desbloqueado');
  assert.strictEqual(b50h.unlocked, true, '50h debe estar desbloqueado');
  assert.strictEqual(b500h.unlocked, false, '500h debe estar bloqueado');
  assert(b500h.progressPct > 0, '500h debe tener progreso proporcional');
  assert.strictEqual(b75m.unlocked, true, '75 mods debe estar desbloqueado');
  console.log(`   ✔ Progresión calculada: 50h desbloqueada (${b50h.title}), 500h al ${b500h.progressPct}% (${b500h.progressText}).`);

  // Test Owner Creator Unlock
  const ownerBadges = badgesMgr.getBadgesWithProgress(0, 0, { username: 'LanderAlo' });
  const ownerBadge = ownerBadges.find(b => b.id === 'badge_owner_creator');
  assert.strictEqual(ownerBadge.unlocked, true, 'Insignia de Creador & Dueño Supremo debe estar desbloqueada para LanderAlo');
  assert(ownerBadges.every(b => b.unlocked), 'Todas las medallas deben estar desbloqueadas para el Dueño (LanderAlo)');
  console.log('   ✔ Desbloqueo total para el Dueño/Creador (LanderAlo) validado.');

  // Test Equipped Badges
  const equipRes = badgesMgr.setEquippedBadges(['badge_owner_creator', 'playtime_500h']);
  assert.strictEqual(equipRes.success, true);
  const equipped = badgesMgr.getEquippedBadges();
  assert.strictEqual(equipped.length, 2);
  assert(equipped.includes('badge_owner_creator'));
  console.log('   ✔ Sistema de equipar medallas de perfil validado.');

  // Cleanup
  fs.rmSync(testDir, { recursive: true, force: true });
  console.log('\n====================================================');
  console.log('🎉 ¡TODAS LAS NUEVAS CARACTERÍSTICAS PASARON AL 100%!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('❌ Error en test suite:', err);
  process.exit(1);
});
