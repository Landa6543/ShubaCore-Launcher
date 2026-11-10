/**
 * ShubaCore - Unit Tests for SkinManager, PackPorter & Multi-Category Search
 * Developed by SHUBATECH
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

const testRoot = path.join(__dirname, '.test-skin-pack-data');
if (fs.existsSync(testRoot)) {
  fs.rmSync(testRoot, { recursive: true, force: true });
}
fs.mkdirSync(testRoot, { recursive: true });

console.log('====================================================');
console.log('🧪 PRUEBAS UNITARIAS: SKINS, PACKPORTER Y EXPLORADOR (SHUBATECH)');
console.log('====================================================\n');

const { SkinManager } = require('../src/main/skins/SkinManager');
const { PackPorter } = require('../src/main/packs/PackPorter');
const { ProfileManager } = require('../src/main/profiles/ProfileManager');
const { ModManager } = require('../src/main/mods/ModManager');

// Helper para crear un PNG mínimo válido en memoria (8 bytes magic + IHDR de 64x64 + IEND)
function createDummyPngBuffer() {
  const buf = Buffer.alloc(45);
  // PNG signature
  buf[0] = 0x89; buf[1] = 0x50; buf[2] = 0x4e; buf[3] = 0x47;
  buf[4] = 0x0d; buf[5] = 0x0a; buf[6] = 0x1a; buf[7] = 0x0a;
  // IHDR length 13
  buf.writeUInt32BE(13, 8);
  buf.write('IHDR', 12, 'ascii');
  buf.writeUInt32BE(64, 16); // width 64
  buf.writeUInt32BE(64, 20); // height 64
  buf.writeUInt8(8, 24);     // bit depth
  buf.writeUInt8(6, 25);     // color type RGBA
  // IEND chunk
  buf.writeUInt32BE(0, 33);
  buf.write('IEND', 37, 'ascii');
  return buf;
}

async function runTests() {
  // ========================================================
  // 1. VERIFICACIÓN DE SKINMANAGER (100% VANILLA PURO SIN MODS)
  // ========================================================
  console.log('▶ [1/3] Verificando SkinManager (API Oficial Mojang, Passthrough de UUID y ShubaSkinOverride Nativo)...');
  const skinManager = new SkinManager({ customSharedRoot: testRoot });

  // 1.1: Clonador oficial de Mojang en 2 pasos
  const mojangInfo = await skinManager.fetchMojangSkin('Technoblade');
  assert.ok(mojangInfo.success, 'fetchMojangSkin debe retornar success: true');
  assert.strictEqual(mojangInfo.officialUuidRaw, 'b876ec32e396476ba1158438d83c67d4');
  assert.strictEqual(mojangInfo.formattedUuid, 'b876ec32-e396-476b-a115-8438d83c67d4');
  assert.strictEqual(mojangInfo.officialName, 'Technoblade');
  assert.ok(mojangInfo.dataUrl.startsWith('data:image/png;base64,'), 'dataUrl debe ser Base64 válido');
  console.log(`  Mojang API Oficial: ${mojangInfo.officialName} -> UUID: ${mojangInfo.formattedUuid} (Modelo: ${mojangInfo.skinModel})`);

  // 1.2: Clonar y guardar skin
  const clonedSkin = await skinManager.setSkinFromMojang('ShubaGamer', 'Technoblade');
  assert.strictEqual(clonedSkin.skinSource, 'premium_clone');
  assert.strictEqual(clonedSkin.clonedUuid, 'b876ec32-e396-476b-a115-8438d83c67d4');
  assert.ok(fs.existsSync(skinManager.currentSkinPath), 'current_skin.png debe existir en el disco');

  // 1.3: MECANISMO 1: Passthrough de UUID Oficial
  const currentSkinInfo = skinManager.getCurrentSkinInfo('ShubaGamer');
  assert.strictEqual(currentSkinInfo.exists, true);
  assert.strictEqual(currentSkinInfo.clonedUuid, 'b876ec32-e396-476b-a115-8438d83c67d4', 'Mecanismo 1 debe proveer el UUID oficial real de Mojang');
  console.log(`  Mecanismo 1 (Passthrough UUID): "${currentSkinInfo.clonedUuid}" confirmado para sesión offline.`);

  // 1.4: MECANISMO 2: Inyección de Resource Pack Nativo "ShubaSkinOverride" en Vanilla puro
  const mockInstancePath = path.join(testRoot, 'mock-instance');
  fs.mkdirSync(mockInstancePath, { recursive: true });

  const packResult = await skinManager.injectSkinResourcePack({
    instancePath: mockInstancePath,
    username: 'ShubaGamer',
    mcVersion: '1.21.1'
  });

  assert.strictEqual(packResult.applied, true, 'injectSkinResourcePack debe aplicarse con éxito');
  assert.ok(fs.existsSync(packResult.packDir), 'El directorio ShubaSkinOverride debe existir');

  // Validar pack.mcmeta
  const mcmetaPath = path.join(packResult.packDir, 'pack.mcmeta');
  assert.ok(fs.existsSync(mcmetaPath), 'pack.mcmeta debe existir');
  const mcmeta = JSON.parse(fs.readFileSync(mcmetaPath, 'utf8'));
  assert.strictEqual(mcmeta.pack.pack_format, 34, 'pack_format debe ser 34 para 1.21.1');
  assert.deepStrictEqual(mcmeta.pack.supported_formats, { min_inclusive: 1, max_inclusive: 999 }, 'supported_formats debe cubrir [1, 999]');
  assert.strictEqual(mcmeta.pack.min_format, 1);
  assert.strictEqual(mcmeta.pack.max_format, 999);

  // Validar reemplazo de todas las 9 skins base en wide y slim
  const wideDir = path.join(packResult.packDir, 'assets', 'minecraft', 'textures', 'entity', 'player', 'wide');
  const slimDir = path.join(packResult.packDir, 'assets', 'minecraft', 'textures', 'entity', 'player', 'slim');
  const legacyDir = path.join(packResult.packDir, 'assets', 'minecraft', 'textures', 'entity');

  const { DEFAULT_PLAYER_SKIN_NAMES } = require('../src/main/skins/SkinManager');
  for (const skinName of DEFAULT_PLAYER_SKIN_NAMES) {
    assert.ok(fs.existsSync(path.join(wideDir, skinName)), `Debe existir wide/${skinName}`);
    assert.ok(fs.existsSync(path.join(slimDir, skinName)), `Debe existir slim/${skinName}`);
  }
  assert.ok(fs.existsSync(path.join(legacyDir, 'steve.png')), 'Debe existir legacy entity/steve.png');
  assert.ok(fs.existsSync(path.join(legacyDir, 'alex.png')), 'Debe existir legacy entity/alex.png');

  // Validar que options.txt incluya "file/ShubaSkinOverride" en resourcePacks
  const optionsPath = path.join(mockInstancePath, 'options.txt');
  assert.ok(fs.existsSync(optionsPath), 'options.txt debe existir');
  const optionsContent = fs.readFileSync(optionsPath, 'utf8');
  assert.ok(optionsContent.includes('file/ShubaSkinOverride'), 'options.txt debe incluir "file/ShubaSkinOverride"');
  console.log('  Mecanismo 2 (ShubaSkinOverride): 9 skins base (wide/slim/legacy) inyectadas y activadas en options.txt.');

  // REGLA OBLIGATORIA: CERO DEPENDENCIAS DE MODS (Sin CustomSkinLoader)
  const modsPath = path.join(mockInstancePath, 'mods');
  if (fs.existsSync(modsPath)) {
    const jarFiles = fs.readdirSync(modsPath);
    assert.strictEqual(jarFiles.some(f => f.toLowerCase().includes('customskinloader')), false, 'PROHIBIDO descargar o usar CustomSkinLoader');
  }
  assert.strictEqual(fs.existsSync(path.join(mockInstancePath, 'CustomSkinLoader')), false, 'No debe existir carpeta CustomSkinLoader');
  console.log('  Regla Obligatoria: 0 mods de skins detectados. 100% Vanilla Puro.');

  // Validar asignación de skin local desde archivo
  const dummyPng = createDummyPngBuffer();
  const testPngPath = path.join(testRoot, 'dummy_skin.png');
  fs.writeFileSync(testPngPath, dummyPng);

  const savedSkin = await skinManager.setSkinFromFile('LocalPlayer', testPngPath);
  assert.ok(savedSkin.success);
  assert.strictEqual(savedSkin.skinSource, 'local_file');

  // Validar eliminación
  skinManager.removeSkin('LocalPlayer');
  skinManager.removeSkin('ShubaGamer');
  const afterRemove = skinManager.getSkin('LocalPlayer');
  assert.strictEqual(afterRemove.exists, false);

  console.log('  ✔ SkinManager nativo 100% validado con éxito.\n');

  // ========================================================
  // 2. VERIFICACIÓN DE PACKPORTER (.shubapack EXPORT/IMPORT)
  // ========================================================
  console.log('▶ [2/3] Verificando PackPorter (Exportación e Importación completa .shubapack)...');
  const profileManager = new ProfileManager({ customSharedRoot: testRoot });
  const modManager = new ModManager();
  const packPorter = new PackPorter({ profileManager, modManager });

  // Crear perfil base para exportar
  const baseProfile = profileManager.createProfile({
    name: 'Pack Test Profile',
    mcVersion: '1.21.1',
    loader: 'NeoForge',
    loaderVersion: '21.1.265',
    ramMin: '3G',
    ramMax: '7G'
  });

  // Crear archivos de prueba en la instancia
  const instanceConfigDir = path.join(baseProfile.instancePath, 'config');
  fs.mkdirSync(instanceConfigDir, { recursive: true });
  fs.writeFileSync(path.join(instanceConfigDir, 'test-gameplay.cfg'), 'difficulty=hard\nshuba=extreme\n');

  const instanceRpDir = path.join(baseProfile.instancePath, 'resourcepacks');
  fs.mkdirSync(instanceRpDir, { recursive: true });
  fs.writeFileSync(path.join(instanceRpDir, 'Faithful-Pack.zip'), 'dummy-texture-zip');

  const instanceSpDir = path.join(baseProfile.instancePath, 'shaderpacks');
  fs.mkdirSync(instanceSpDir, { recursive: true });
  fs.writeFileSync(path.join(instanceSpDir, 'ComplementaryShaders.zip'), 'dummy-shader-zip');

  const instanceModsDir = path.join(baseProfile.instancePath, 'mods');
  fs.mkdirSync(instanceModsDir, { recursive: true });
  fs.writeFileSync(path.join(instanceModsDir, 'CustomInternalMod-1.0.jar'), 'dummy-internal-jar');

  // Guardar mods-lock.json con el mod local como custom
  const lockData = {
    mods: {
      'CustomInternalMod-1.0.jar': {
        fileName: 'CustomInternalMod-1.0.jar',
        displayName: 'Custom Internal Mod',
        source: 'custom'
      }
    }
  };
  fs.writeFileSync(path.join(baseProfile.instancePath, 'mods-lock.json'), JSON.stringify(lockData, null, 2));

  // Exportar perfil a .shubapack
  const exportDest = path.join(testRoot, 'export_test.shubapack');
  const exportResult = await packPorter.exportPack({
    profileId: baseProfile.id,
    outputPath: exportDest
  });

  assert.strictEqual(exportResult.success, true, 'exportPack debe retornar success: true');
  assert.ok(fs.existsSync(exportDest), 'El archivo .shubapack debe existir en el disco');

  // Inspeccionar el archivo ZIP creado
  const exportZip = new AdmZip(exportDest);
  const manifestEntry = exportZip.getEntry('shubapack.json');
  assert.ok(manifestEntry, 'El .shubapack debe contener shubapack.json');

  const manifestData = JSON.parse(manifestEntry.getData().toString('utf8'));
  assert.strictEqual(manifestData.name, 'Pack Test Profile');
  assert.strictEqual(manifestData.mcVersion, '1.21.1');
  assert.strictEqual(manifestData.loader, 'NeoForge');
  assert.strictEqual(manifestData.ramMin, '3G');
  assert.strictEqual(manifestData.ramMax, '7G');

  // Verificar que los archivos config, resourcepacks y bundled_mods estén en el ZIP
  assert.ok(exportZip.getEntry('config/test-gameplay.cfg'), 'Debe incluir config/test-gameplay.cfg');
  assert.ok(exportZip.getEntry('resourcepacks/Faithful-Pack.zip'), 'Debe incluir resourcepacks/Faithful-Pack.zip');
  assert.ok(exportZip.getEntry('shaderpacks/ComplementaryShaders.zip'), 'Debe incluir shaderpacks/ComplementaryShaders.zip');
  assert.ok(exportZip.getEntry('bundled_mods/CustomInternalMod-1.0.jar'), 'Debe incluir bundled_mods/CustomInternalMod-1.0.jar');

  // Importar el .shubapack creando un nuevo perfil
  const importResult = await packPorter.importPack({
    packPath: exportDest,
    customName: 'Imported Restored Profile'
  });

  assert.strictEqual(importResult.success, true, 'importPack debe retornar success: true');
  assert.ok(importResult.profile, 'importPack debe devolver el nuevo perfil');
  assert.strictEqual(importResult.profile.name, 'Imported Restored Profile');

  // Verificar que los archivos se extrajeron en la nueva instancia aislada
  const importedInstancePath = importResult.profile.instancePath;
  assert.ok(fs.existsSync(path.join(importedInstancePath, 'config', 'test-gameplay.cfg')), 'Config restaurada');
  assert.ok(fs.existsSync(path.join(importedInstancePath, 'resourcepacks', 'Faithful-Pack.zip')), 'Resourcepack restaurado');
  assert.ok(fs.existsSync(path.join(importedInstancePath, 'shaderpacks', 'ComplementaryShaders.zip')), 'Shaderpack restaurado');
  assert.ok(fs.existsSync(path.join(importedInstancePath, 'mods', 'CustomInternalMod-1.0.jar')), 'Bundled mod desempaquetado en /mods');

  console.log('  ✔ PackPorter: Exportación e importación de .shubapack validadas con 100% de éxito.\n');

  // ========================================================
  // 3. VERIFICACIÓN DE BÚSQUEDA MULTI-CATEGORÍA Y PAGINACIÓN
  // ========================================================
  console.log('▶ [3/3] Verificando búsqueda multi-categoría y paginación en ModManager...');

  // Test 3.1: Búsqueda de Shaders (Modrinth)
  const shaderResults = await modManager.searchContent({
    query: 'complementary',
    mcVersion: '1.21.1',
    source: 'modrinth',
    contentType: 'shaders',
    page: 1,
    pageSize: 5
  });

  assert.ok(shaderResults, 'Debe devolver un resultado de shaders');
  assert.ok(Array.isArray(shaderResults.results), 'shaderResults.results debe ser un array');
  assert.strictEqual(shaderResults.currentPage, 1);
  assert.strictEqual(shaderResults.pageSize, 5);
  assert.ok(shaderResults.totalCount >= 1, 'Debe encontrar shaders Complementary');
  console.log(`  Shaders encontrados: ${shaderResults.results.length} (Total reportado: ${shaderResults.totalCount})`);

  // Test 3.2: Búsqueda de Resource Packs (Texturas)
  const textureResults = await modManager.searchContent({
    query: 'faithful',
    mcVersion: '1.21.1',
    source: 'modrinth',
    contentType: 'resourcepacks',
    page: 1,
    pageSize: 5
  });

  assert.ok(Array.isArray(textureResults.results), 'textureResults.results debe ser un array');
  assert.ok(textureResults.totalCount >= 1, 'Debe encontrar paquetes de texturas Faithful');
  console.log(`  Texturas encontradas: ${textureResults.results.length} (Total reportado: ${textureResults.totalCount})`);

  // Test 3.3: Búsqueda de Mods con paginación
  const modPage1 = await modManager.searchContent({
    query: 'jei',
    mcVersion: '1.21.1',
    loader: 'neoforge',
    source: 'modrinth',
    contentType: 'mods',
    page: 1,
    pageSize: 3
  });

  assert.strictEqual(modPage1.currentPage, 1);
  assert.strictEqual(modPage1.pageSize, 3);
  assert.ok(modPage1.results.length > 0, 'Página 1 debe tener resultados');
  console.log(`  Mods JEI en Pág 1: ${modPage1.results.length} de ${modPage1.totalCount}`);

  console.log('  ✔ Búsqueda multi-categoría y paginación validadas al 100%.\n');

  console.log('====================================================');
  console.log('✅ TODAS LAS PRUEBAS DE SKINS, PACKPORTER Y EXPLORADOR PASARON CON ÉXITO');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('\n❌ ERROR EN LAS PRUEBAS:\n', err);
  process.exit(1);
});
