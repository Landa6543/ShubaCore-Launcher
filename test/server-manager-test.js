/**
 * ShubaCore - Unit Tests for Dedicated Server Management & Mod Filter (Bloque 4 v1.1.0)
 * Developed by SHUBATECH
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { ServerModFilter, CLIENT_ONLY_MOD_KEYWORDS } = require('../src/main/servers/ServerModFilter');
const { ServerInstaller } = require('../src/main/servers/ServerInstaller');
const { getServerManager } = require('../src/main/servers/ServerManager');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 PRUEBAS: SERVIDORES DEDICADOS & FILTRO DE MODS (v1.1.0)');
  console.log('====================================================\n');

  const testDir = path.join(__dirname, '.test-server-manager');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  // ---------------------------------------------------------
  // 1. Verificación del Filtro de Mods de Cliente (ServerModFilter)
  // ---------------------------------------------------------
  console.log('▶ [1/4] Verificando ServerModFilter (Detección de mods client-only)...');
  
  // Test filenames
  const clientModFiles = [
    'sodium-fabric-0.5.8+mc1.21.jar',
    'iris-mc1.21-1.7.0.jar',
    'embeddium-0.3.18+mc1.21.jar',
    'entityculling-fabric-1.6.4.jar',
    '3dskinlayers-fabric-1.5.4.jar',
    'soundphysics-remastered-1.21-1.4.2.jar',
    'xaerominimap-24.2.0.jar',
    'mousetweaks-1.21-2.25.jar',
    'fancymenu_fabric_3.1.0_MC_1.21.jar'
  ];

  for (const file of clientModFiles) {
    const res = ServerModFilter.isClientOnlyMod('/dummy/path/' + file, file);
    assert.strictEqual(res.isClientOnly, true, `Debe detectar "${file}" como client-only`);
  }

  const serverCompatibleModFiles = [
    'geckolib-fabric-1.21-4.4.4.jar',
    'create-1.21.1-0.5.1.f.jar',
    'farmersdelight-1.21-1.4.jar',
    'jei-1.21.1-forge-18.0.0.jar',
    'curios-forge-5.9.1+1.20.1.jar'
  ];

  for (const file of serverCompatibleModFiles) {
    const res = ServerModFilter.isClientOnlyMod('/dummy/path/' + file, file);
    assert.strictEqual(res.isClientOnly, false, `No debe detectar "${file}" como client-only`);
  }

  // Test inspección profunda en JAR (fabric.mod.json con environment: "client")
  const deepJarPath = path.join(testDir, 'custom-hud-mod-1.0.jar');
  const deepZip = new AdmZip();
  deepZip.addFile(
    'fabric.mod.json',
    Buffer.from(
      JSON.stringify({
        id: 'customhud',
        name: 'Custom HUD Mod',
        version: '1.0.0',
        environment: 'client'
      }),
      'utf8'
    )
  );
  deepZip.writeZip(deepJarPath);

  const deepRes = ServerModFilter.isClientOnlyMod(deepJarPath);
  assert.strictEqual(deepRes.isClientOnly, true, 'Debe detectar mod con environment: "client" en fabric.mod.json');
  console.log('   ✔ Detección por nombre y análisis profundo de JAR validados con éxito.');

  // ---------------------------------------------------------
  // 2. Sincronización Inteligente de Mods Cliente -> Servidor
  // ---------------------------------------------------------
  console.log('\n▶ [2/4] Verificando sincronización Cliente -> Servidor...');
  const mockClientDir = path.join(testDir, 'mock-client');
  const mockClientModsDir = path.join(mockClientDir, 'mods');
  const mockClientConfigDir = path.join(mockClientDir, 'config');
  fs.mkdirSync(mockClientModsDir, { recursive: true });
  fs.mkdirSync(mockClientConfigDir, { recursive: true });

  // Crear mods en cliente (2 compatibles, 2 client-only)
  fs.writeFileSync(path.join(mockClientModsDir, 'farmersdelight-1.21.jar'), 'dummy-jar');
  fs.writeFileSync(path.join(mockClientModsDir, 'geckolib-1.21.jar'), 'dummy-jar');
  fs.writeFileSync(path.join(mockClientModsDir, 'sodium-1.21.jar'), 'dummy-jar');
  fs.writeFileSync(path.join(mockClientModsDir, 'iris-1.21.jar'), 'dummy-jar');

  // Crear archivo config
  fs.writeFileSync(path.join(mockClientConfigDir, 'farmersdelight.json'), '{"general":true}');

  const mockServerDir = path.join(testDir, 'mock-server');
  fs.mkdirSync(mockServerDir, { recursive: true });

  const syncResult = await ServerModFilter.syncModsToDedicatedServer({
    clientInstancePath: mockClientDir,
    serverPath: mockServerDir,
    copyConfigs: true
  });

  assert.strictEqual(syncResult.success, true);
  assert.strictEqual(syncResult.syncedCount, 2, 'Deben haberse copiado exactamente 2 mods');
  assert.strictEqual(syncResult.skippedCount, 2, 'Deben haberse omitido exactamente 2 mods');
  assert.strictEqual(fs.existsSync(path.join(mockServerDir, 'mods', 'farmersdelight-1.21.jar')), true);
  assert.strictEqual(fs.existsSync(path.join(mockServerDir, 'mods', 'geckolib-1.21.jar')), true);
  assert.strictEqual(fs.existsSync(path.join(mockServerDir, 'mods', 'sodium-1.21.jar')), false);
  assert.strictEqual(fs.existsSync(path.join(mockServerDir, 'mods', 'iris-1.21.jar')), false);
  assert.strictEqual(fs.existsSync(path.join(mockServerDir, 'config', 'farmersdelight.json')), true);
  console.log(`   ✔ Sincronizados ${syncResult.syncedCount} mods y omitidos ${syncResult.skippedCount} mods de cliente.`);

  // ---------------------------------------------------------
  // 3. ServerInstaller (eula.txt & server.properties)
  // ---------------------------------------------------------
  console.log('\n▶ [3/4] Verificando ServerInstaller (eula.txt & server.properties)...');
  ServerInstaller.ensureEula(mockServerDir);
  const eulaContent = fs.readFileSync(path.join(mockServerDir, 'eula.txt'), 'utf8');
  assert.strictEqual(eulaContent.includes('eula=true'), true, 'eula.txt debe contener eula=true');

  ServerInstaller.ensureServerProperties(mockServerDir, { port: 25570, name: 'Servidor Test' });
  const propsContent = fs.readFileSync(path.join(mockServerDir, 'server.properties'), 'utf8');
  assert.strictEqual(propsContent.includes('server-port=25570'), true, 'Puerto configurado correctamente');
  assert.strictEqual(propsContent.includes('online-mode=false'), true, 'online-mode debe ser false');
  console.log('   ✔ eula.txt y server.properties generados correctamente.');

  // ---------------------------------------------------------
  // 4. ServerManager (Gestión, Propiedades y Exportación de Pack)
  // ---------------------------------------------------------
  console.log('\n▶ [4/4] Verificando ServerManager (Propiedades y Exportación ZIP)...');
  const serverManager = getServerManager();

  // Test lectura y guardado de server.properties
  // Sobrescribimos getServersRootDir temporalmente para el test
  const originalGetServersRootDir = serverManager.getServersRootDir;
  serverManager.getServersRootDir = () => testDir;

  const testServerId = 'test-srv-01';
  const testServerFolder = path.join(testDir, testServerId);
  fs.mkdirSync(testServerFolder, { recursive: true });

  const testMeta = {
    id: testServerId,
    name: 'Servidor Pruebas ShubaCore',
    mcVersion: '1.21.1',
    loader: 'fabric',
    loaderVersion: '0.16.5',
    ram: '6G',
    port: 25565,
    createdAt: new Date().toISOString()
  };
  fs.writeFileSync(path.join(testServerFolder, 'server.json'), JSON.stringify(testMeta, null, 2), 'utf8');
  ServerInstaller.ensureEula(testServerFolder);
  ServerInstaller.ensureServerProperties(testServerFolder, { port: 25565, name: testMeta.name });

  // List servers
  const servers = await serverManager.listServers();
  const found = servers.find((s) => s.id === testServerId);
  assert.ok(found, 'El servidor debe ser listado por ServerManager');
  assert.strictEqual(found.name, 'Servidor Pruebas ShubaCore');

  // getProperties
  const props = await serverManager.getProperties(testServerId);
  assert.strictEqual(props['server-port'], 25565);
  assert.strictEqual(props['online-mode'], false);

  // saveProperties
  await serverManager.saveProperties(testServerId, {
    'server-port': 25580,
    motd: 'Servidor Actualizado',
    difficulty: 'hard',
    pvp: false
  });

  const updatedProps = await serverManager.getProperties(testServerId);
  assert.strictEqual(updatedProps['server-port'], 25580);
  assert.strictEqual(updatedProps['motd'], 'Servidor Actualizado');
  assert.strictEqual(updatedProps['difficulty'], 'hard');
  assert.strictEqual(updatedProps['pvp'], false);
  console.log('   ✔ Lectura y guardado de server.properties comprobados exitosamente.');

  // Test Export Server Pack (.zip)
  const exportZipPath = path.join(testDir, 'ServerPack_Test.zip');
  const exportRes = await serverManager.exportServerPack(testServerId, exportZipPath);
  assert.strictEqual(exportRes.success, true);
  assert.strictEqual(fs.existsSync(exportZipPath), true, 'El archivo .zip exportado debe existir');

  const packZip = new AdmZip(exportZipPath);
  const zipEntryNames = packZip.getEntries().map((e) => e.entryName);
  assert.ok(zipEntryNames.includes('eula.txt'), 'Debe incluir eula.txt');
  assert.ok(zipEntryNames.includes('server.properties'), 'Debe incluir server.properties');
  assert.ok(zipEntryNames.includes('start_server.bat'), 'Debe incluir start_server.bat');
  assert.ok(zipEntryNames.includes('start_server.sh'), 'Debe incluir start_server.sh');
  console.log('   ✔ Exportación de paquete para VPS/Hosting validada con éxito.');

  // Delete server
  await serverManager.deleteServer(testServerId, true);
  assert.strictEqual(fs.existsSync(testServerFolder), false, 'La carpeta del servidor debe haberse eliminado');
  console.log('   ✔ Eliminación de servidor validada.');

  // Restaurar getServersRootDir
  serverManager.getServersRootDir = originalGetServersRootDir;

  // Cleanup test dir
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (_) {}

  console.log('\n====================================================');
  console.log('🎉 TODAS LAS PRUEBAS DE SERVIDORES DEDICADOS PASARON CON ÉXITO');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Error en las pruebas de servidores:', err);
  process.exit(1);
});
