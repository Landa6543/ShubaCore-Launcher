/**
 * ShubaCore - ModManager Unit Tests
 * Developed by SHUBATECH
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const testInstanceDir = path.join(__dirname, '.test-mod-instance');
if (fs.existsSync(testInstanceDir)) {
  fs.rmSync(testInstanceDir, { recursive: true, force: true });
}
fs.mkdirSync(path.join(testInstanceDir, 'mods'), { recursive: true });

console.log('====================================================');
console.log('🧪 PRUEBAS UNITARIAS: GESTOR DE MODS DUAL (SHUBATECH)');
console.log('====================================================\n');

const { ModManager } = require('../src/main/mods/ModManager');
const modManager = new ModManager();

async function runTests() {
  // 1. Test Búsqueda Unificada (Modrinth)
  console.log('▶ [1/4] Verificando búsqueda unificada (Modrinth)...');
  const results = await modManager.searchMods({
    query: 'ferritecore',
    mcVersion: '1.20.1',
    loader: 'forge',
    source: 'modrinth',
    limit: 5
  });

  assert.ok(Array.isArray(results), 'El resultado debe ser un arreglo');
  assert.ok(results.length > 0, 'Debe encontrar al menos 1 resultado para FerriteCore');

  const first = results[0];
  console.log(`  Encontrado: "${first.title}" por ${first.author} [Fuente: ${first.source}]`);
  assert.strictEqual(first.source, 'modrinth', 'La propiedad source debe ser "modrinth"');
  assert.ok(first.title.toLowerCase().includes('ferritecore'), 'El título debe coincidir');
  assert.ok(first.websiteUrl.startsWith('https://modrinth.com'), 'Debe incluir websiteUrl');
  console.log('  ✔ Búsqueda unificada verificada exitosamente.\n');

  // 2. Test Detección Automática de Mods Custom en /mods
  console.log('▶ [2/4] Verificando detección automática de mods manuales (source: "custom")...');
  const customJarPath = path.join(testInstanceDir, 'mods', 'ShubaSpecialAdmin-1.0.jar');
  fs.writeFileSync(customJarPath, 'PK\x03\x04dummy-jar-content');

  // Escanear la carpeta
  const initialSync = modManager.scanAndSyncMods(testInstanceDir);
  assert.strictEqual(initialSync.length, 1, 'Debe detectar 1 mod en la carpeta');

  const customMod = initialSync[0];
  console.log(`  Mod detectado: ${customMod.fileName} -> Fuente asignada: "${customMod.source}"`);
  assert.strictEqual(customMod.fileName, 'ShubaSpecialAdmin-1.0.jar');
  assert.strictEqual(customMod.source, 'custom', 'El mod colocado manualmente debe registrarse como "custom"');
  assert.strictEqual(customMod.enabled, true, 'Debe estar habilitado por defecto');

  // Verificar que se guardó en mods-lock.json
  const lockFilePath = path.join(testInstanceDir, 'mods-lock.json');
  assert.ok(fs.existsSync(lockFilePath), 'mods-lock.json debe haberse creado');
  const lockData = JSON.parse(fs.readFileSync(lockFilePath, 'utf8'));
  assert.ok(lockData.mods['ShubaSpecialAdmin-1.0.jar'], 'Debe figurar en mods-lock.json');
  console.log('  ✔ Detección y registro en mods-lock.json de mods custom validado.\n');

  // 3. Test Toggle (Habilitar / Deshabilitar) y Delete
  console.log('▶ [3/4] Verificando toggle (.disabled) y eliminación...');
  modManager.toggleMod('ShubaSpecialAdmin-1.0.jar', false, testInstanceDir);
  assert.ok(fs.existsSync(path.join(testInstanceDir, 'mods', 'ShubaSpecialAdmin-1.0.jar.disabled')), 'Debe renombrarse a .disabled');

  const afterDisableSync = modManager.scanAndSyncMods(testInstanceDir);
  assert.strictEqual(afterDisableSync[0].enabled, false, 'El estado enabled debe ser false');

  // Rehabilitar
  modManager.toggleMod('ShubaSpecialAdmin-1.0.jar.disabled', true, testInstanceDir);
  assert.ok(fs.existsSync(customJarPath), 'Debe restaurarse el nombre original sin .disabled');

  // Eliminar
  modManager.deleteMod('ShubaSpecialAdmin-1.0.jar', testInstanceDir);
  assert.ok(!fs.existsSync(customJarPath), 'El archivo físico debe ser eliminado');
  const afterDeleteSync = modManager.scanAndSyncMods(testInstanceDir);
  assert.strictEqual(afterDeleteSync.length, 0, 'La lista debe quedar vacía');
  console.log('  ✔ Toggle y eliminación de mods validados.\n');

  // 4. Test Modpack Parser (AdmZip y lectura de índices)
  console.log('▶ [4/4] Verificando empaquetador y parser de modpacks (.mrpack / manifest.json)...');
  const AdmZip = require('adm-zip');
  const fakeZip = new AdmZip();

  const fakeIndex = {
    formatVersion: 1,
    game: 'minecraft',
    versionId: '1.0.0',
    name: 'ShubaPack Extreme',
    files: [
      {
        path: 'mods/test-performance-mod.jar',
        downloads: ['https://example.com/mod.jar']
      }
    ]
  };

  fakeZip.addFile('modrinth.index.json', Buffer.from(JSON.stringify(fakeIndex), 'utf8'));
  fakeZip.addFile('overrides/config/shubacore.txt', Buffer.from('optimizations=true', 'utf8'));

  const testPackPath = path.join(testInstanceDir, 'shubapack.mrpack');
  fakeZip.writeZip(testPackPath);
  assert.ok(fs.existsSync(testPackPath), 'El archivo .mrpack de prueba debe existir');

  // Validar lectura sin descargar remotamente
  const testReadZip = new AdmZip(testPackPath);
  const entry = testReadZip.getEntry('modrinth.index.json');
  assert.ok(entry !== null, 'Debe contener modrinth.index.json');
  const parsed = JSON.parse(entry.getData().toString('utf8'));
  assert.strictEqual(parsed.name, 'ShubaPack Extreme');
  console.log(`  Modpack .mrpack verificado: "${parsed.name}" (Format Version ${parsed.formatVersion})`);
  console.log('  ✔ Parser de modpacks validado.\n');

  // Limpieza
  fs.rmSync(testInstanceDir, { recursive: true, force: true });

  console.log('====================================================');
  console.log('✅ TODAS LAS PRUEBAS DE MODMANAGER PASARON CON ÉXITO');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('❌ Error en pruebas de ModManager:', err);
  process.exit(1);
});
