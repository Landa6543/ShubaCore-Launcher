/**
 * Pruebas unitarias para Importación e Instalación de Modpacks de CurseForge y Modrinth
 * ShubaCore Launcher - SHUBATECH
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { getModManager } = require('../src/main/mods/ModManager');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 PRUEBAS DE IMPORTACIÓN DE MODPACKS (CURSEFORGE & MODRINTH)');
  console.log('====================================================\n');

  const modManager = getModManager();
  const testDir = path.join(__dirname, '.test-modpack-instance');
  if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  fs.mkdirSync(testDir, { recursive: true });

  // 1. PRUEBA DE RESOLUCIÓN DE URLs CURSEFORGE EDGE CDN
  console.log('▶ [1/5] Verificando generación de URLs CurseForge Edge CDN con recorte de ceros...');
  const edgeUrl1 = modManager._buildCurseForgeEdgeUrl(5020034, 'sodium-neoforge.jar');
  assert.strictEqual(
    edgeUrl1,
    'https://edge.forgecdn.net/files/5020/34/sodium-neoforge.jar',
    'La URL de Edge CDN debe eliminar ceros a la izquierda en la segunda parte del fileId'
  );

  const edgeUrl2 = modManager._buildCurseForgeEdgeUrl(5647890, 'ferritecore.jar');
  assert.strictEqual(
    edgeUrl2,
    'https://edge.forgecdn.net/files/5647/890/ferritecore.jar',
    'La URL de Edge CDN debe formatear correctamente IDs estándar'
  );

  const edgeUrl3 = modManager._buildCurseForgeEdgeUrl('6100000', 'mod with spaces.jar');
  assert.strictEqual(
    edgeUrl3,
    'https://edge.forgecdn.net/files/6100/0/mod%20with%20spaces.jar',
    'La URL de Edge CDN debe soportar sufijo de ceros completos y nombres con espacios codificados'
  );
  console.log('  ✔ URLs de Edge CDN validadas con precisión del 100%.');

  // 2. PRUEBA DE PARSEO DE MODLOADERS DE CURSEFORGE
  console.log('\n▶ [2/5] Verificando parseo de modLoaders de manifest.json...');
  const loader1 = modManager._parseCurseForgeModLoader([{ id: 'neoforge-21.1.265', primary: true }]);
  assert.strictEqual(loader1.loader, 'NeoForge');
  assert.strictEqual(loader1.loaderVersion, '21.1.265');

  const loader2 = modManager._parseCurseForgeModLoader([{ id: 'forge-47.2.0', primary: true }]);
  assert.strictEqual(loader2.loader, 'Forge');
  assert.strictEqual(loader2.loaderVersion, '47.2.0');

  const loader3 = modManager._parseCurseForgeModLoader([{ id: 'fabric-0.16.0' }]);
  assert.strictEqual(loader3.loader, 'Fabric');
  assert.strictEqual(loader3.loaderVersion, '0.16.0');

  const loader4 = modManager._parseCurseForgeModLoader([]);
  assert.strictEqual(loader4.loader, 'NeoForge');
  console.log('  ✔ Parseo de modLoaders validado correctamente.');

  // 3. PRUEBA DEL POOL DE CONCURRENCIA
  console.log('\n▶ [3/5] Verificando pool de concurrencia paralela...');
  const itemsToTest = Array.from({ length: 20 }, (_, i) => i);
  let activeWorkers = 0;
  let maxConcurrent = 0;

  const results = await modManager._runWithConcurrency(itemsToTest, 5, async (item) => {
    activeWorkers++;
    maxConcurrent = Math.max(maxConcurrent, activeWorkers);
    await new Promise((resolve) => setTimeout(resolve, 20));
    activeWorkers--;
    return item * 2;
  });

  assert.strictEqual(results.length, 20);
  assert.strictEqual(results[10], 20);
  assert.ok(maxConcurrent <= 5, `La concurrencia máxima no debe exceder 5 (fue ${maxConcurrent})`);
  console.log(`  ✔ Concurrencia controlada validada (Máx concurrente alcanzado: ${maxConcurrent}/5).`);

  // 4. PRUEBA DE EXTRACCIÓN DE OVERRIDES Y MANIFEST EN CURSEFORGE (.zip)
  console.log('\n▶ [4/5] Creando y procesando Modpack CurseForge (.zip) con overrides...');
  const cfZip = new AdmZip();
  const manifestData = {
    minecraft: {
      version: '1.21.1',
      modLoaders: [{ id: 'neoforge-21.1.265', primary: true }]
    },
    manifestType: 'minecraftModpack',
    manifestVersion: 1,
    name: 'Pack de Prueba ShubaCore',
    version: '1.0.0',
    author: 'ShubaTester',
    files: [], // Sin archivos remotos para probar overrides y estructura
    overrides: 'overrides'
  };

  cfZip.addFile('manifest.json', Buffer.from(JSON.stringify(manifestData, null, 2), 'utf8'));
  cfZip.addFile('overrides/config/shubacore.cfg', Buffer.from('fps_limit=144\nrender_distance=16', 'utf8'));
  cfZip.addFile('client-overrides/options.txt', Buffer.from('gamma:1.0\nguiScale:2', 'utf8'));

  const cfZipPath = path.join(testDir, 'test-cf-modpack.zip');
  cfZip.writeZip(cfZipPath);

  const cfTargetInstance = path.join(testDir, 'cf-instance');
  fs.mkdirSync(cfTargetInstance, { recursive: true });

  const cfInstallResult = await modManager.installModpackFile({
    packPath: cfZipPath,
    instancePath: cfTargetInstance,
    createProfile: false
  });

  assert.strictEqual(cfInstallResult.success, true);
  assert.strictEqual(cfInstallResult.name, 'Pack de Prueba ShubaCore');
  assert.strictEqual(cfInstallResult.mcVersion, '1.21.1');
  assert.strictEqual(cfInstallResult.loader, 'NeoForge');

  // Verificar que overrides y client-overrides se hayan extraído en sus rutas relativas en la instancia
  const cfgDest = path.join(cfTargetInstance, 'config', 'shubacore.cfg');
  const optDest = path.join(cfTargetInstance, 'options.txt');
  assert.ok(fs.existsSync(cfgDest), 'overrides/config/shubacore.cfg debe estar extraído en config/shubacore.cfg');
  assert.ok(fs.existsSync(optDest), 'client-overrides/options.txt debe estar extraído en options.txt');
  assert.strictEqual(fs.readFileSync(cfgDest, 'utf8'), 'fps_limit=144\nrender_distance=16');
  assert.strictEqual(fs.readFileSync(optDest, 'utf8'), 'gamma:1.0\nguiScale:2');
  console.log('  ✔ Extracción dual de overrides y client-overrides validada.');

  // 5. PRUEBA DE MODPACK MODRINTH (.mrpack)
  console.log('\n▶ [5/5] Creando y procesando Modpack Modrinth (.mrpack)...');
  const mrZip = new AdmZip();
  const mrIndexData = {
    formatVersion: 1,
    game: 'minecraft',
    versionId: '1.2.0',
    name: 'Modrinth Test Pack',
    dependencies: {
      minecraft: '1.21.1',
      neoforge: '21.1.265'
    },
    files: []
  };

  mrZip.addFile('modrinth.index.json', Buffer.from(JSON.stringify(mrIndexData, null, 2), 'utf8'));
  mrZip.addFile('overrides/defaultconfigs/game.toml', Buffer.from('[game]\ndifficulty="normal"', 'utf8'));

  const mrPackPath = path.join(testDir, 'test-modrinth.mrpack');
  mrZip.writeZip(mrPackPath);

  const mrTargetInstance = path.join(testDir, 'mr-instance');
  fs.mkdirSync(mrTargetInstance, { recursive: true });

  const mrInstallResult = await modManager.installModpackFile({
    packPath: mrPackPath,
    instancePath: mrTargetInstance,
    createProfile: false
  });

  assert.strictEqual(mrInstallResult.success, true);
  assert.strictEqual(mrInstallResult.name, 'Modrinth Test Pack');
  const gameToml = path.join(mrTargetInstance, 'defaultconfigs', 'game.toml');
  assert.ok(fs.existsSync(gameToml), 'overrides/defaultconfigs/game.toml debe estar extraído');
  console.log('  ✔ Compatibilidad con Modrinth .mrpack validada.');

  // 6. PRUEBA DE CREACIÓN AUTOMÁTICA DE INSTANCIA DESDE MODPACK
  console.log('\n▶ [6/6] Verificando creación automática de nueva instancia desde modpack...');
  const autoInstallResult = await modManager.installModpackFile({
    packPath: cfZipPath,
    instancePath: null,
    createProfile: true
  });

  assert.strictEqual(autoInstallResult.success, true);
  assert.ok(autoInstallResult.profile, 'Debe retornar un perfil creado');
  assert.strictEqual(autoInstallResult.profile.name, 'Pack de Prueba ShubaCore');
  assert.strictEqual(autoInstallResult.profile.mcVersion, '1.21.1');
  assert.ok(fs.existsSync(autoInstallResult.instancePath), 'La carpeta de instancia debe existir físicamente');

  // Limpiar el perfil creado de prueba
  const { getProfileManager } = require('../src/main/profiles/ProfileManager');
  getProfileManager().deleteProfile(autoInstallResult.profile.id);
  console.log('  ✔ Creación automática de perfiles desde modpack validada exitosamente.');

  // Limpieza
  fs.rmSync(testDir, { recursive: true, force: true });

  console.log('\n====================================================');
  console.log('✅ TODAS LAS PRUEBAS DE MODPACKS PASARON EXITOSAMENTE');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
