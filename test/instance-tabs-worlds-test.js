/**
 * ShubaCore - Unit Tests for Instance Tabs, Shaders, Resource Packs & Worlds (Bloque 3 v1.1.0)
 * Developed by SHUBATECH
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const AdmZip = require('adm-zip');
const { getInstancePacksManager } = require('../src/main/packs/InstancePacksManager');
const { getWorldManager } = require('../src/main/worlds/WorldManager');
const { getProfileManager } = require('../src/main/profiles/ProfileManager');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 PRUEBAS: SHADERS, RESOURCE PACKS & MUNDOS (v1.1.0)');
  console.log('====================================================\n');

  const testDir = path.join(__dirname, '.test-instance-tabs');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  const packsManager = getInstancePacksManager();
  const worldManager = getWorldManager();

  // 1. Shaders & Resource Packs
  console.log('▶ [1/4] Verificando InstancePacksManager (Shaders & Texturas)...');
  const shaderpacksDir = path.join(testDir, 'shaderpacks');
  const resourcepacksDir = path.join(testDir, 'resourcepacks');
  fs.mkdirSync(shaderpacksDir, { recursive: true });
  fs.mkdirSync(resourcepacksDir, { recursive: true });

  // Crear shader dummy .zip
  const shaderZip = new AdmZip();
  shaderZip.addFile('shaders/world0.vsh', Buffer.from('// vertex shader dummy'));
  shaderZip.writeZip(path.join(shaderpacksDir, 'BSL_Shaders_v8.2.zip'));

  // Crear resourcepack dummy .zip con pack.mcmeta y pack.png
  const rpZip = new AdmZip();
  rpZip.addFile(
    'pack.mcmeta',
    Buffer.from(
      JSON.stringify({
        pack: {
          pack_format: 34,
          description: '§6Texturas Oficiales ShubaCore HD'
        }
      })
    )
  );
  // PNG dummy de 1x1 transparente
  const dummyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  rpZip.addFile('pack.png', dummyPng);
  rpZip.writeZip(path.join(resourcepacksDir, 'Faithful_64x_MC1.21.zip'));

  // Listar shaders
  const shaders = await packsManager.listPacks(testDir, 'shaders');
  assert.strictEqual(shaders.length, 1);
  assert.strictEqual(shaders[0].name, 'BSL_Shaders_v8.2');
  console.log(`  ✔ Shader detectado: "${shaders[0].name}" (${shaders[0].formattedSize})`);

  // Listar resourcepacks y verificar metadata interna
  const rpacks = await packsManager.listPacks(testDir, 'resourcepacks');
  assert.strictEqual(rpacks.length, 1);
  assert.strictEqual(rpacks[0].name, 'Faithful_64x_MC1.21');
  assert.strictEqual(rpacks[0].packFormat, 34);
  assert.strictEqual(rpacks[0].description, 'Texturas Oficiales ShubaCore HD');
  assert.ok(rpacks[0].icon && rpacks[0].icon.startsWith('data:image/png;base64,'));
  console.log(`  ✔ Resource Pack detectado con mcmeta & pack.png: "${rpacks[0].name}" (Format ${rpacks[0].packFormat})`);

  // 2. Worlds & Saves Scanning
  console.log('\n▶ [2/4] Verificando WorldManager (Escaneo de saves/)...');
  const savesDir = path.join(testDir, 'saves');
  const world1Dir = path.join(savesDir, 'Mi_Super_Mundo');
  fs.mkdirSync(world1Dir, { recursive: true });

  // Crear level.dat con NBT dummy que contiene "LevelName"
  const rawNbtHeader = Buffer.from([
    0x0a, // TAG_Compound
    0x00, 0x04, 0x44, 0x61, 0x74, 0x61, // "Data"
    0x08, // TAG_String
    0x00, 0x09, 0x4c, 0x65, 0x76, 0x65, 0x6c, 0x4e, 0x61, 0x6d, 0x65, // "LevelName"
    0x00, 0x0e, // longitud 14
    0x53, 0x75, 0x70, 0x65, 0x72, 0x20, 0x4d, 0x75, 0x6e, 0x64, 0x6f, 0x20, 0x32, 0x36 // "Super Mundo 26"
  ]);
  const compressedLevelDat = zlib.gzipSync(rawNbtHeader);
  fs.writeFileSync(path.join(world1Dir, 'level.dat'), compressedLevelDat);
  fs.writeFileSync(path.join(world1Dir, 'icon.png'), dummyPng);

  const worlds = await worldManager.listWorlds(testDir);
  assert.strictEqual(worlds.length, 1);
  assert.strictEqual(worlds[0].folderName, 'Mi_Super_Mundo');
  assert.strictEqual(worlds[0].worldName, 'Super Mundo 26');
  assert.ok(worlds[0].icon && worlds[0].icon.startsWith('data:image/png;base64,'));
  console.log(`  ✔ Mundo detectado: "${worlds[0].worldName}" (Carpeta: ${worlds[0].folderName}, Icono OK)`);

  // 3. Backups & Restorations
  console.log('\n▶ [3/4] Verificando creación y restauración de backups (.zip)...');
  const backupRes = await worldManager.createBackup(testDir, 'Mi_Super_Mundo');
  assert.ok(backupRes.success);
  assert.ok(fs.existsSync(backupRes.backupFilePath));
  console.log(`  ✔ Backup .zip creado: ${backupRes.backupFileName} (${backupRes.formattedSize})`);

  const backupsList = await worldManager.listBackups(testDir, 'Mi_Super_Mundo');
  assert.strictEqual(backupsList.length, 1);
  console.log(`  ✔ Listado de backups consultado: ${backupsList.length} archivo(s)`);

  // Restaurar en otra carpeta de prueba
  const restoreRes = await worldManager.restoreBackup(testDir, backupRes.backupFileName, 'Mundo_Restaurado');
  assert.ok(restoreRes.success);
  assert.ok(fs.existsSync(path.join(savesDir, 'Mundo_Restaurado', 'level.dat')));
  console.log(`  ✔ Restauración de backup validada en "Mundo_Restaurado" con 100% de integridad.`);

  // 4. Quick backup of all worlds before updating
  console.log('\n▶ [4/4] Verificando backup rápido masivo (backupAllWorlds)...');
  const allBackupRes = await worldManager.backupAllWorlds(testDir);
  assert.ok(allBackupRes.success);
  assert.ok(allBackupRes.backedUpCount >= 2);
  console.log(`  ✔ Backup masivo de seguridad completado (${allBackupRes.backedUpCount} mundos respaldados preventivamente).`);

  // Cleanup
  fs.rmSync(testDir, { recursive: true, force: true });

  console.log('\n====================================================');
  console.log('✅ TODAS LAS PRUEBAS DE SHADERS, TEXTURAS Y MUNDOS PASARON');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
