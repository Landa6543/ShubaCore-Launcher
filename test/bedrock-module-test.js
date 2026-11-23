/**
 * Test Suite - Fase 32: Módulo Minecraft Bedrock Edition (Windows)
 * SHUBATECH - ShubaCore Launcher
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const AdmZip = require('adm-zip');

console.log('====================================================');
console.log('🧪 TEST: FASE 32 - MÓDULO MINECRAFT BEDROCK (WINDOWS)');
console.log('====================================================\n');

const testDir = path.join(__dirname, '.test-bedrock-data');
if (fs.existsSync(testDir)) {
  fs.rmSync(testDir, { recursive: true, force: true });
}
fs.mkdirSync(testDir, { recursive: true });

// 1. Verificar BedrockManager
console.log('▶ [1/5] Verificando clase y métodos de BedrockManager...');
const { BedrockManager, getBedrockManager } = require('../src/main/bedrock/BedrockManager');
assert.strictEqual(typeof BedrockManager, 'function', 'BedrockManager debe ser una clase');
const bm = getBedrockManager();
assert.ok(bm instanceof BedrockManager, 'getBedrockManager debe retornar una instancia de BedrockManager');

const info = bm.getBedrockInfo();
assert.ok(typeof info === 'object', 'getBedrockInfo debe retornar un objeto');
assert.strictEqual(info.edition, 'bedrock', 'edition debe ser bedrock');
assert.ok('installed' in info, 'info debe incluir campo installed');
assert.ok(typeof info.storeUrl === 'string' && info.storeUrl.includes('9NBLGGH2JHXJ'), 'storeUrl debe apuntar a la ficha de Minecraft');
console.log(`   ✔ BedrockManager inicializado. Estado en este sistema: ${info.installed ? 'Instalado' : 'No instalado'}.`);

// 2. Verificar configuración de carpetas de instancia Bedrock
console.log('\n▶ [2/5] Verificando creación de carpetas para instancia Bedrock...');
const instanceDir = path.join(testDir, 'bedrock-instance-1');
bm.setupInstanceFolders(instanceDir);

const expectedFolders = ['behavior_packs', 'resource_packs', 'worlds', 'skin_packs'];
for (const f of expectedFolders) {
  assert.ok(fs.existsSync(path.join(instanceDir, f)), `Carpeta ${f} debe existir en la instancia Bedrock`);
}
console.log('   ✔ Estructura de carpetas para Bedrock validada (behavior, resource, worlds, skin).');

// 3. Crear paquetes sintéticos .mcpack y .mcworld para probar importación y clasificación
console.log('\n▶ [3/5] Probando importador nativo de Add-ons (.mcpack / .mcworld)...');

// A. Crear synthetic resource pack .mcpack
const rpZip = new AdmZip();
const rpManifest = {
  format_version: 2,
  header: {
    name: 'Shuba Texture Pack',
    description: 'Texturas oficiales de prueba ShubaCore',
    version: [1, 0, 0],
    uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  },
  modules: [
    {
      type: 'resources',
      uuid: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      version: [1, 0, 0]
    }
  ]
};
rpZip.addFile('manifest.json', Buffer.from(JSON.stringify(rpManifest, null, 2), 'utf8'));
const rpFilePath = path.join(testDir, 'ShubaTextures.mcpack');
rpZip.writeZip(rpFilePath);

// B. Crear synthetic behavior pack .mcpack
const bpZip = new AdmZip();
const bpManifest = {
  format_version: 2,
  header: {
    name: 'Shuba Mechanics',
    description: 'Add-on de mecánicas avanzadas',
    version: [1, 0, 0],
    uuid: 'c3d4e5f6-a7b8-9012-cdef-123456789012'
  },
  modules: [
    {
      type: 'data',
      uuid: 'd4e5f6a7-b8c9-0123-def1-234567890123',
      version: [1, 0, 0]
    }
  ]
};
bpZip.addFile('manifest.json', Buffer.from(JSON.stringify(bpManifest, null, 2), 'utf8'));
const bpFilePath = path.join(testDir, 'ShubaMechanics.mcpack');
bpZip.writeZip(bpFilePath);

// C. Crear synthetic world .mcworld
const worldZip = new AdmZip();
worldZip.addFile('levelname.txt', Buffer.from('Mundo ShubaCore Bedrock', 'utf8'));
const worldFilePath = path.join(testDir, 'ShubaWorld.mcworld');
worldZip.writeZip(worldFilePath);

// Ejecutar importaciones
(async () => {
  const rpRes = await bm.importAddonFile(rpFilePath, instanceDir, false);
  assert.strictEqual(rpRes.success, true);
  assert.strictEqual(rpRes.type, 'resource');
  assert.ok(fs.existsSync(path.join(instanceDir, 'resource_packs', 'ShubaTextures', 'manifest.json')));

  const bpRes = await bm.importAddonFile(bpFilePath, instanceDir, false);
  assert.strictEqual(bpRes.success, true);
  assert.strictEqual(bpRes.type, 'behavior');
  assert.ok(fs.existsSync(path.join(instanceDir, 'behavior_packs', 'ShubaMechanics', 'manifest.json')));

  const wRes = await bm.importAddonFile(worldFilePath, instanceDir, false);
  assert.strictEqual(wRes.success, true);
  assert.strictEqual(wRes.type, 'world');
  assert.ok(fs.existsSync(path.join(instanceDir, 'worlds', 'ShubaWorld', 'levelname.txt')));

  console.log('   ✔ Clasificación e importación automática validada: Resource Packs, Behavior Packs y Mundos.');

  // Escanear addons
  const scanned = bm.getInstalledAddons(instanceDir);
  assert.strictEqual(scanned.resourcePacks.length, 1);
  assert.strictEqual(scanned.resourcePacks[0].name, 'Shuba Texture Pack');
  assert.strictEqual(scanned.behaviorPacks.length, 1);
  assert.strictEqual(scanned.behaviorPacks[0].name, 'Shuba Mechanics');
  assert.strictEqual(scanned.worlds.length, 1);
  console.log('   ✔ Escaneo y lectura de metadatos de Add-ons Bedrock validado con éxito.');

  // 4. Verificar integración con ProfileManager
  console.log('\n▶ [4/5] Verificando creación y soporte de perfil Bedrock en ProfileManager...');
  const { ProfileManager } = require('../src/main/profiles/ProfileManager');
  const pm = new ProfileManager(testDir);

  const bedrockProfile = pm.createProfile({
    name: 'Mi Mundo Bedrock',
    edition: 'bedrock',
    icon: 'assets/logo.png'
  });

  assert.strictEqual(bedrockProfile.edition, 'bedrock', 'edition debe ser bedrock');
  assert.strictEqual(bedrockProfile.loader, 'Bedrock', 'loader debe ser Bedrock');
  assert.strictEqual(bedrockProfile.isBedrock, true, 'isBedrock debe ser true');
  assert.ok(fs.existsSync(path.join(testDir, 'instances', bedrockProfile.id, 'behavior_packs')));
  assert.ok(fs.existsSync(path.join(testDir, 'instances', bedrockProfile.id, 'resource_packs')));
  assert.ok(fs.existsSync(path.join(testDir, 'instances', bedrockProfile.id, 'worlds')));
  console.log(`   ✔ Perfil Bedrock "${bedrockProfile.name}" creado con carpetas aisladas.`);

  // 5. Verificar LaunchManager ante perfil Bedrock (usando dryRun para no abrir Minecraft.Windows.exe en segundo plano)
  console.log('\n▶ [5/5] Verificando despacho de lanzamiento en LaunchManager...');
  const { LaunchManager } = require('../src/main/launcher/LaunchManager');
  const lm = new LaunchManager(pm.configManager, null, pm, null);

  // Si Bedrock no está instalado en la máquina de pruebas, debe devolver notInstalled: true elegantemente
  const launchRes = await lm.launch({ edition: 'bedrock', dryRun: true });
  if (info.installed) {
    assert.strictEqual(launchRes.success, true);
    assert.strictEqual(launchRes.isBedrock, true);
    console.log('   ✔ Lanzamiento Bedrock completado con éxito (instalación nativa presente).');
  } else {
    assert.strictEqual(launchRes.success, false);
    assert.strictEqual(launchRes.notInstalled, true);
    assert.ok(launchRes.storeUrl.includes('9NBLGGH2JHXJ'));
    console.log('   ✔ Detección y respuesta elegante cuando Bedrock no está instalado (storeUrl proporcionado).');
  }

  // Limpiar
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (_) {}

  console.log('\n====================================================');
  console.log('🎉 ¡TODAS LAS PRUEBAS DEL MÓDULO BEDROCK PASARON AL 100%!');
  console.log('====================================================\n');
  process.exit(0);
})();
