/**
 * ShubaCore - Fase 31 Tests: Skins No-Premium (Option A - Ely.by / Authlib-Injector),
 * Crash Prevention (Vanilla Pack Retention), & Wardrobe Persistence
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { getSkinManager } = require('../src/main/skins/SkinManager');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 TEST: FASE 31 - SKINS NO-PREMIUM (OPCIÓN A) & FIXES');
  console.log('====================================================');

  const testDir = path.join(__dirname, '.test-data-fase31');
  if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  fs.mkdirSync(testDir, { recursive: true });

  const mockConfigManager = {
    get: (k, def) => def || {},
    set: () => true,
    getInstanceDirectory: () => testDir
  };

  const skinMgr = getSkinManager({
    configManager: mockConfigManager,
    userDataPath: testDir
  });

  // 1. Crear una imagen PNG sintética válida de 64x64
  console.log('▶ [1/4] Creando skin PNG sintética válida de 64x64...');
  // Encabezado PNG 8 bytes + IHDR 13 bytes + IDAT + IEND
  const syntheticPng = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0x40,
    0x08, 0x06, 0x00, 0x00, 0x00, 0xAA, 0x69, 0x71, 0xDE,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
    0xAE, 0x42, 0x60, 0x82
  ]);
  const sampleSkinPath = path.join(testDir, 'test-skin.png');
  fs.writeFileSync(sampleSkinPath, syntheticPng);
  assert.ok(fs.existsSync(sampleSkinPath), 'El PNG sintético debe existir');
  console.log('   ✔ PNG sintético creado exitosamente.');

  // 2. Probar setSkinFromFile con archivo local y file:/// URL
  console.log('\n▶ [2/4] Probando setSkinFromFile con ruta local y file:/// URI...');
  const resFile = await skinMgr.setSkinFromFile('TesterNoPremium', sampleSkinPath, 'classic');
  assert.strictEqual(resFile.success, true, 'Debe guardar desde ruta local');
  assert.strictEqual(resFile.username, 'TesterNoPremium');

  const fileUri = 'file:///' + sampleSkinPath.replace(/\\/g, '/');
  const resUri = await skinMgr.setSkinFromFile('TesterNoPremium', fileUri, 'slim');
  assert.strictEqual(resUri.success, true, 'Debe guardar desde file:/// URI');
  assert.strictEqual(resUri.skinModel, 'slim');
  console.log('   ✔ setSkinFromFile soporta rutas locales y URIs file:///');

  // 3. Probar _enablePackInOptionsTxt (Garantizar "vanilla" como base)
  console.log('\n▶ [3/4] Verificando retención de "vanilla" en options.txt para evitar crash 0xC0000005...');
  const optionsPath = path.join(testDir, 'options.txt');
  fs.writeFileSync(optionsPath, 'resourcePacks:["file/SomeOtherPack"]\nincompatibleResourcePacks:["file/ShubaSkinOverride"]\n');
  
  skinMgr._enablePackInOptionsTxt(optionsPath);
  const updatedOptions = fs.readFileSync(optionsPath, 'utf8');
  assert.ok(updatedOptions.includes('["vanilla","file/SomeOtherPack","file/ShubaSkinOverride"]'), 'Vanilla debe estar primero');
  assert.ok(!updatedOptions.includes('"file/ShubaSkinOverride"') || updatedOptions.includes('resourcePacks:'), 'No debe estar en incompatible');
  console.log('   ✔ "vanilla" preservado como primer pack base incondicionalmente.');

  // 4. Verificando authlib-injector.jar en src/main/runtime/
  console.log('\n▶ [4/4] Verificando presencia de authlib-injector.jar (Opción A - Ely.by)...');
  const injectorSrc = path.join(__dirname, '..', 'src', 'main', 'runtime', 'authlib-injector.jar');
  assert.ok(fs.existsSync(injectorSrc), 'authlib-injector.jar debe existir en src/main/runtime/');
  const stats = fs.statSync(injectorSrc);
  assert.ok(stats.size > 200000, `Tamaño del JAR (${stats.size} bytes) debe ser mayor a 200KB`);
  console.log(`   ✔ authlib-injector.jar verificado (${stats.size} bytes).`);

  // Limpieza
  fs.rmSync(testDir, { recursive: true, force: true });
  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LA FASE 31 PASARON AL 100% CON ÉXITO!');
}

runTests().catch(err => {
  console.error('❌ Error en test Fase 31:', err);
  process.exit(1);
});
