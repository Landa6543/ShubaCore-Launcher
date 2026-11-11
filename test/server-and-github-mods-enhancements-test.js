/**
 * ShubaCore - Unit Tests for Server Enhancements & GitHub Mods Upload
 * Developed by SHUBATECH
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { ServerInstaller } = require('../src/main/servers/ServerInstaller');
const { ServerManager, getServerManager } = require('../src/main/servers/ServerManager');
const { GitHubModsManager, getGitHubModsManager } = require('../src/main/github/GitHubModsManager');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 PRUEBAS: MIS SERVIDORES (TODAS LAS VERSIONES, IMPORTACIÓN) & UPLOAD GITHUB');
  console.log('====================================================\n');

  const testDir = path.join(__dirname, '.test-server-enhancements');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  const serverManager = new ServerManager();
  // Override getServersRootDir to testDir
  serverManager.getServersRootDir = () => testDir;

  // ---------------------------------------------------------
  // 1. Verificación del manifiesto de versiones de Minecraft
  // ---------------------------------------------------------
  console.log('▶ [1/5] Verificando catálogo completo de versiones de Minecraft...');
  const versions = await ServerInstaller.getAvailableMinecraftVersions();
  assert(Array.isArray(versions), 'Debe retornar un arreglo de versiones');
  assert(versions.length >= 10, 'Debe incluir al menos 10 versiones release');
  assert(versions.includes('1.21.1'), 'Debe incluir Minecraft 1.21.1');
  assert(versions.includes('1.20.1'), 'Debe incluir Minecraft 1.20.1');
  assert(versions.includes('1.7.10'), 'Debe incluir Minecraft 1.7.10');
  console.log(`   ✔ Versiones obtenidas exitosamente (${versions.length} versiones, ej: ${versions[0]} a ${versions[versions.length - 1]}).`);

  // ---------------------------------------------------------
  // 2. Verificación de Formateo de RAM (Decimal GB -> MB)
  // ---------------------------------------------------------
  console.log('▶ [2/5] Verificando formateo de argumentos de RAM para JVM...');
  assert.strictEqual(serverManager.formatRamArgument('6G'), '6G');
  assert.strictEqual(serverManager.formatRamArgument('7.5G'), '7680M');
  assert.strictEqual(serverManager.formatRamArgument('4.5G'), '4608M');
  assert.strictEqual(serverManager.formatRamArgument('8192M'), '8192M');
  assert.strictEqual(serverManager.formatRamArgument('8'), '8G');
  assert.strictEqual(serverManager.formatRamArgument('2.5'), '2560M');
  assert.strictEqual(serverManager.formatRamArgument(''), '6G');
  console.log('   ✔ Formato de RAM decimal y entero verificado con precisión matemática.');

  // ---------------------------------------------------------
  // 3. Verificación de Importación de Servidor Existente (Paper / Purpur)
  // ---------------------------------------------------------
  console.log('▶ [3/5] Verificando importación automática de servidor externo (Paper)...');
  const externalServerDir = path.join(testDir, 'MiServidorPaper');
  fs.mkdirSync(externalServerDir, { recursive: true });
  fs.writeFileSync(path.join(externalServerDir, 'paper-1.21.1-123.jar'), 'dummy jar content', 'utf8');
  fs.writeFileSync(
    path.join(externalServerDir, 'server.properties'),
    'server-port=25580\nmotd=Servidor Paper de Supervivencia\nlevel-name=survival_world\n',
    'utf8'
  );
  const modsDir = path.join(externalServerDir, 'mods');
  fs.mkdirSync(modsDir, { recursive: true });
  fs.writeFileSync(path.join(modsDir, 'voicechat-1.21.jar'), 'voice jar', 'utf8');

  const importRes = await serverManager.importServer(externalServerDir);
  assert(importRes.success, 'Debe importar exitosamente');
  assert.strictEqual(importRes.server.loader, 'paper', 'Debe detectar loader como paper');
  assert.strictEqual(importRes.server.port, 25580, 'Debe leer el puerto 25580 de server.properties');
  assert.strictEqual(importRes.server.isImported, true, 'Debe marcar el servidor como importado');
  assert.strictEqual(importRes.server.modsCount, 1, 'Debe contabilizar 1 mod en mods/');

  // Verificar que eula.txt se generó si no existía
  assert(fs.existsSync(path.join(externalServerDir, 'eula.txt')), 'Debe asegurar eula.txt');
  console.log('   ✔ Servidor externo importado y detectado como Paper MC 1.21.1.');

  // ---------------------------------------------------------
  // 4. Verificación de Protección al Borrar Servidor Importado
  // ---------------------------------------------------------
  console.log('▶ [4/5] Verificando protección de archivos al desvincular servidor importado...');
  await serverManager.deleteServer(importRes.server.id, true);
  // Los archivos externos del usuario NO deben haber sido borrados
  assert(fs.existsSync(externalServerDir), 'Los archivos externos del usuario NUNCA deben borrarse');
  assert(fs.existsSync(path.join(externalServerDir, 'server.properties')), 'server.properties debe persistir');
  // Pero debe haber sido desvinculado de la lista
  const currentList = await serverManager.listServers();
  assert(!currentList.some((s) => s.id === importRes.server.id), 'Debe removerse de la lista de ShubaCore');
  console.log('   ✔ Servidor desvinculado de ShubaCore manteniendo intactos los archivos del usuario.');

  // ---------------------------------------------------------
  // 5. Verificación de Subida de Mods Custom (Validaciones)
  // ---------------------------------------------------------
  console.log('▶ [5/5] Verificando GitHubModsManager (uploadCustomMods)...');
  const ghMods = new GitHubModsManager();
  
  // Archivo inexistente debe fallar limpiamente
  let thrown = false;
  try {
    await ghMods.uploadCustomMods({ filePaths: ['/ruta/que/no/existe/mod.jar'] });
  } catch (err) {
    thrown = true;
    assert(err.message.includes('no existe'), 'Debe reportar que el archivo no existe');
  }
  assert(thrown, 'Debe arrojar error cuando el archivo no existe');

  // Arreglo vacío debe fallar limpiamente
  let emptyThrown = false;
  try {
    await ghMods.uploadCustomMods({ filePaths: [] });
  } catch (err) {
    emptyThrown = true;
  }
  assert(emptyThrown, 'Debe arrojar error cuando la lista de archivos está vacía');

  console.log('   ✔ Validaciones de subida a GitHub probadas exitosamente.');

  // Limpieza
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (_) {}

  console.log('\n====================================================');
  console.log('🎉 TODAS LAS PRUEBAS DE MEJORAS DE SERVIDORES Y GITHUB PASARON');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
