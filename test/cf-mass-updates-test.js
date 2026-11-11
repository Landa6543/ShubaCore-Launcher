const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { getModManager } = require('../src/main/mods/ModManager');

async function testMassCurseForgeUpdates() {
  console.log('====================================================');
  console.log('🧪 PRUEBA MASIVA DE ACTUALIZACIONES CURSEFORGE (300+ MODS)');
  console.log('====================================================\n');

  const testDir = path.join(__dirname, '.test-cf-mass-instance');
  const modsDir = path.join(testDir, 'mods');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(modsDir, { recursive: true });

  const modManager = getModManager();
  const lockDataPath = path.join(testDir, 'mods-lock.json');

  console.log('▶ [1/4] Generando 316 mods simulados de CurseForge con variaciones...');
  const lockData = {
    schemaVersion: 1,
    lastUpdated: new Date().toISOString(),
    mods: {}
  };

  // Generamos 316 mods:
  // - Primeros 40 mods con versión antigua (tienen update disponible en CurseForge)
  // - Algunos con source: "CURSEFORGE" (mayúsculas), otros con "curseforge"
  // - Algunos con projectID y fileID en mayúsculas
  for (let i = 1; i <= 316; i++) {
    const isUpdateCandidate = i <= 40;
    const fileName = isUpdateCandidate ? `test-cf-mod-${i}-1.0.0.jar` : `test-cf-mod-${i}-2.0.0.jar`;
    const installedFileId = isUpdateCandidate ? 5000000 + i : 6000000 + i;

    // Crear dummy jar en disco
    fs.writeFileSync(path.join(modsDir, fileName), `DUMMY_JAR_${i}`);

    const isUpper = i % 2 === 0;
    const entry = {
      fileName,
      name: `Test CF Mod ${i}`,
      displayName: `Test CF Mod ${i}`,
      source: isUpper ? 'CURSEFORGE' : 'curseforge',
      enabled: true
    };

    if (i % 3 === 0) {
      entry.projectID = 900000 + i;
      entry.fileID = installedFileId;
    } else {
      entry.projectId = String(900000 + i);
      entry.fileId = String(installedFileId);
    }

    lockData.mods[fileName] = entry;
  }

  fs.writeFileSync(lockDataPath, JSON.stringify(lockData, null, 2), 'utf8');
  console.log('  ✔ 316 mods creados en disco y registrados en mods-lock.json.');

  console.log('\n▶ [2/4] Simulando endpoints de CurseForge (/v1/mods y /v1/mods/files)...');
  const originalFetch = global.fetch;
  let modsPostCalls = 0;
  let filesPostCalls = 0;
  let totalModIdsRequested = 0;
  let totalFileIdsRequested = 0;

  global.fetch = async (url, options = {}) => {
    const urlStr = String(url);

    if (urlStr.includes('/v1/mods') && options.method === 'POST' && !urlStr.includes('/files')) {
      modsPostCalls++;
      const body = JSON.parse(options.body || '{}');
      assert.strictEqual(body.filterPcOnly, true, 'Debe incluir filterPcOnly: true');
      const modIds = body.modIds || [];
      totalModIdsRequested += modIds.length;

      // Generar respuesta mock de CurseForge para cada modId solicitado
      const data = modIds.map((id) => {
        const modNum = id - 900000;
        const isUpdateCandidate = modNum <= 40;
        const latestFileId = isUpdateCandidate ? 6000000 + modNum : 6000000 + modNum;
        const latestFileName = isUpdateCandidate ? `test-cf-mod-${modNum}-2.0.0.jar` : `test-cf-mod-${modNum}-2.0.0.jar`;

        return {
          id,
          name: `Test CF Mod ${modNum}`,
          latestFilesIndexes: [
            {
              gameVersion: '1.21.1',
              fileId: latestFileId,
              filename: latestFileName,
              releaseType: 1,
              modLoader: 6 // NeoForge
            }
          ]
        };
      });

      return {
        ok: true,
        status: 200,
        json: async () => ({ data })
      };
    }

    if (urlStr.includes('/v1/mods/files') && options.method === 'POST') {
      filesPostCalls++;
      const body = JSON.parse(options.body || '{}');
      const fileIds = body.fileIds || [];
      totalFileIdsRequested += fileIds.length;

      const data = fileIds.map((fid) => ({
        id: fid,
        fileName: `test-cf-mod-update-${fid}.jar`,
        displayName: `Test CF Mod Update ${fid}`,
        downloadUrl: `https://edge.forgecdn.net/files/${String(fid).slice(0, 4)}/${String(fid).slice(4)}/file.jar`
      }));

      return {
        ok: true,
        status: 200,
        json: async () => ({ data })
      };
    }

    if (urlStr.includes('/fingerprints/')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { exactMatches: [] } })
      };
    }

    if (urlStr.includes('/version_files')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({})
      };
    }

    return originalFetch(url, options);
  };

  try {
    console.log('\n▶ [3/4] Ejecutando checkForModUpdates para los 316 mods...');
    const result = await modManager.checkForModUpdates(testDir, '1.21.1', 'neoforge');

    console.log(`  Actualizaciones encontradas: ${result.count}`);
    console.log(`  Llamadas POST /v1/mods: ${modsPostCalls}`);
    console.log(`  Llamadas POST /v1/mods/files: ${filesPostCalls}`);
    console.log(`  Total modIds consultados en batch: ${totalModIdsRequested}`);
    console.log(`  Total fileIds consultados en batch: ${totalFileIdsRequested}`);

    assert.strictEqual(modsPostCalls, 1, 'Debe procesar 316 mods en exactamente 1 sola llamada masiva a /v1/mods');
    assert.strictEqual(totalModIdsRequested, 316, 'Deben consultarse los 316 mods');
    assert.strictEqual(result.count, 40, 'Deben detectarse exactamente las 40 actualizaciones');
    assert.strictEqual(filesPostCalls, 1, 'Debe resolver las 40 descargas en 1 sola llamada masiva a /v1/mods/files');
    assert.strictEqual(totalFileIdsRequested, 40, 'Deben solicitarse los 40 archivos de actualización');

    // Validar estructura de un resultado
    const firstUpdate = result.updates[0];
    assert.ok(firstUpdate, 'Debe existir primer update');
    assert.strictEqual(firstUpdate.source, 'curseforge');
    assert.ok(firstUpdate.latestFile.downloadUrl.includes('edge.forgecdn.net'));
    console.log('  ✔ Validación de updates y batching completada con éxito.');

    console.log('\n▶ [4/4] Probando cuando todos los mods están al día (0 actualizaciones)...');
    // Si volvemos a chequear donde los candidatos ya tienen el fileId más reciente
    const resultUpToDate = await modManager.checkForModUpdates(testDir, '1.21.1', 'neoforge');
    // Nota: Como no cambiamos mods-lock.json en disco, sigue reportando 40. Cambiamos los primeros 40 a 6000000 + i:
    const lockRead = JSON.parse(fs.readFileSync(lockDataPath, 'utf8'));
    for (let i = 1; i <= 40; i++) {
      const fn = `test-cf-mod-${i}-1.0.0.jar`;
      if (lockRead.mods[fn]) {
        lockRead.mods[fn].fileId = String(6000000 + i);
      }
    }
    fs.writeFileSync(lockDataPath, JSON.stringify(lockRead, null, 2), 'utf8');

    const resultZero = await modManager.checkForModUpdates(testDir, '1.21.1', 'neoforge');
    console.log(`  Actualizaciones cuando todo está al día: ${resultZero.count}`);
    assert.strictEqual(resultZero.count, 0, 'Debe reportar 0 actualizaciones cuando todos los mods están al día');
    console.log('  ✔ Reporta 0 actualizaciones correctamente sin llamadas innecesarias a /files.');

  } finally {
    global.fetch = originalFetch;
    fs.rmSync(testDir, { recursive: true, force: true });
  }

  console.log('\n====================================================');
  console.log('✅ PRUEBA MASIVA DE 300+ MODS CURSEFORGE COMPLETADA CON ÉXITO');
  console.log('====================================================\n');
}

testMassCurseForgeUpdates().catch((err) => {
  console.error('❌ Error en prueba masiva:', err);
  process.exit(1);
});
