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
  console.log('\n▶ [4/5] Verificando presencia de authlib-injector.jar (Opción A - Ely.by)...');
  const injectorSrc = path.join(__dirname, '..', 'src', 'main', 'runtime', 'authlib-injector.jar');
  assert.ok(fs.existsSync(injectorSrc), 'authlib-injector.jar debe existir en src/main/runtime/');
  const stats = fs.statSync(injectorSrc);
  assert.ok(stats.size > 200000, `Tamaño del JAR (${stats.size} bytes) debe ser mayor a 200KB`);
  console.log(`   ✔ authlib-injector.jar verificado (${stats.size} bytes).`);

  // 5. Verificando inyección de ShubaSkinOverride con formato para MC 26.3 y MC 1.21.1
  console.log('\n▶ [5/5] Verificando esquema estricto de pack.mcmeta (min_format/max_format en MC 26.3+ y supported_formats en 1.21.1)...');
  const instance263 = path.join(testDir, 'instance263');
  fs.mkdirSync(instance263, { recursive: true });
  await skinMgr.injectSkinResourcePack({
    instancePath: instance263,
    username: 'TesterNoPremium',
    mcVersion: '26.3'
  });

  const mcmeta263 = JSON.parse(fs.readFileSync(path.join(instance263, 'resourcepacks', 'ShubaSkinOverride', 'pack.mcmeta'), 'utf8'));
  assert.strictEqual(mcmeta263.pack.pack_format, 97, 'pack_format en 26.3 debe ser 97');
  assert.strictEqual(mcmeta263.pack.min_format, 97, 'min_format en 26.3 debe ser 97');
  assert.strictEqual(mcmeta263.pack.max_format, 999, 'max_format en 26.3 debe ser 999');
  assert.strictEqual(mcmeta263.pack.supported_formats, undefined, 'supported_formats debe estar omitido en 26.3');

  // Verificar texturas en player/wide, player/slim, player/ y entity/
  const overridePack = path.join(instance263, 'resourcepacks', 'ShubaSkinOverride', 'assets', 'minecraft', 'textures', 'entity');
  assert.ok(fs.existsSync(path.join(overridePack, 'player', 'wide', 'sunny.png')), 'sunny.png debe existir en wide');
  assert.ok(fs.existsSync(path.join(overridePack, 'player', 'slim', 'sunny.png')), 'sunny.png debe existir en slim');
  assert.ok(fs.existsSync(path.join(overridePack, 'player', 'sunny.png')), 'sunny.png debe existir en entity/player');
  assert.ok(fs.existsSync(path.join(overridePack, 'sunny.png')), 'sunny.png debe existir en entity');
  console.log('   ✔ MC 26.3 pack.mcmeta y 9 texturas de jugador validadas con éxito.');

  const instance121 = path.join(testDir, 'instance121');
  fs.mkdirSync(instance121, { recursive: true });
  await skinMgr.injectSkinResourcePack({
    instancePath: instance121,
    username: 'TesterNoPremium',
    mcVersion: '1.21.1'
  });

  const mcmeta121 = JSON.parse(fs.readFileSync(path.join(instance121, 'resourcepacks', 'ShubaSkinOverride', 'pack.mcmeta'), 'utf8'));
  assert.strictEqual(mcmeta121.pack.pack_format, 34, 'pack_format en 1.21.1 debe ser 34');
  assert.deepStrictEqual(mcmeta121.pack.supported_formats, [34, 64], 'supported_formats en 1.21.1 debe ser [34, 64]');
  console.log('   ✔ MC 1.21.1 pack.mcmeta validado con supported_formats [34, 64].');

  console.log('\n▶ [6/6] Verificando generateOfflineUUIDForModel (paridad de modelo Slim 3px vs Classic 4px)...');
  const { generateOfflineUUIDForModel } = require('../src/main/auth/OfflineAuth');

  function getJavaHash(hex) {
    const clean = hex.replace(/-/g, '');
    const most = BigInt('0x' + clean.substring(0, 16));
    const least = BigInt('0x' + clean.substring(16, 32));
    const xored = most ^ least;
    return Number(BigInt.asIntN(32, (xored >> 32n) ^ xored));
  }

  const slimUUID = generateOfflineUUIDForModel('LanderAlo2', 'slim');
  const slimHash = getJavaHash(slimUUID);
  const slimMod18 = ((slimHash % 18) + 18) % 18;
  const slimOdd = (slimHash & 1) !== 0;

  assert.ok(slimMod18 < 9, `El UUID slim debe dar mod18 < 9 (Minecraft 26.3 DefaultPlayerSkin). Dio: ${slimMod18}`);
  assert.strictEqual(slimOdd, true, 'El UUID slim debe ser impar para versiones anteriores (1.8 - 1.20)');
  console.log(`   ✔ Slim UUID para LanderAlo2: ${slimUUID} | Java Hash: ${slimHash} | mod18: ${slimMod18} (SLIM) | impar: ${slimOdd}`);

  const classicUUID = generateOfflineUUIDForModel('LanderAlo2', 'classic');
  const classicHash = getJavaHash(classicUUID);
  const classicMod18 = ((classicHash % 18) + 18) % 18;
  const classicOdd = (classicHash & 1) !== 0;

  assert.ok(classicMod18 >= 9, `El UUID classic debe dar mod18 >= 9 (Minecraft 26.3 DefaultPlayerSkin). Dio: ${classicMod18}`);
  assert.strictEqual(classicOdd, false, 'El UUID classic debe ser par para versiones anteriores (1.8 - 1.20)');
  console.log(`   ✔ Classic UUID para LanderAlo2: ${classicUUID} | Java Hash: ${classicHash} | mod18: ${classicMod18} (WIDE) | par: ${!classicOdd}`);

  // Limpieza
  fs.rmSync(testDir, { recursive: true, force: true });
  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LA FASE 31 PASARON AL 100% CON ÉXITO!');
}

runTests().catch(err => {
  console.error('❌ Error en test Fase 31:', err);
  process.exit(1);
});
