/**
 * ShubaCore - Default Modpack & Official Logo Tests
 * Developed by SHUBATECH
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const testRoot = path.join(__dirname, '.test-default-modpack');
if (fs.existsSync(testRoot)) {
  fs.rmSync(testRoot, { recursive: true, force: true });
}
fs.mkdirSync(testRoot, { recursive: true });

console.log('====================================================');
console.log('🧪 PRUEBAS: MODPACK POR DEFECTO Y LOGO OFICIAL (SHUBATECH)');
console.log('====================================================\n');

const { ProfileManager } = require('../src/main/profiles/ProfileManager');
const { ModManager } = require('../src/main/mods/ModManager');

async function runTests() {
  const profileManager = new ProfileManager({ customSharedRoot: testRoot });
  const modManager = new ModManager();

  // ----------------------------------------------------
  // 1. VERIFICACIÓN DEL LOGO OFICIAL EMBEBIDO Y EN DISCO
  // ----------------------------------------------------
  console.log('▶ [1/4] Verificando resolución del logo oficial de ShubaCore...');
  const logoBuf = profileManager._getOfficialLogoBuffer();
  assert.ok(logoBuf && logoBuf.length > 5000, 'El buffer del logo oficial debe existir y tener un tamaño válido (>5KB)');
  
  const logoB64 = profileManager._getOfficialLogoBase64();
  assert.ok(logoB64.startsWith('data:image/png;base64,'), 'El logo debe codificarse como data URL base64');
  console.log(`   ✔ Logo oficial localizado exitosamente (${logoBuf.length} bytes).\n`);

  // ----------------------------------------------------
  // 2. VERIFICACIÓN DE PERFIL POR DEFECTO SHUBACLIENT CON LOGO
  // ----------------------------------------------------
  console.log('▶ [2/4] Verificando creación automática de ShubaClient con logo y mods...');
  const emptyTestRoot = path.join(testRoot, 'empty-root');
  fs.mkdirSync(emptyTestRoot, { recursive: true });

  const freshManager = new ProfileManager({ customSharedRoot: emptyTestRoot });
  const active = freshManager.getActive();
  assert.ok(active, 'Debe haber un perfil activo creado por defecto');
  assert.strictEqual(active.name, 'ShubaClient');
  assert.strictEqual(active.mcVersion, '26.3');
  assert.strictEqual(active.loader, 'Fabric');
  assert.strictEqual(active.ramMax, '6G');
  assert.ok(active.icon.startsWith('data:image/png;base64,'), 'El perfil por defecto debe tener el logo oficial');

  const instanceDir = freshManager.getInstancePath(active.id);
  const iconPath = path.join(instanceDir, 'icon.png');
  assert.ok(fs.existsSync(iconPath), 'icon.png debe existir físicamente en la carpeta de la instancia');
  assert.ok(fs.statSync(iconPath).size > 5000, 'icon.png debe tener el tamaño del logo');
  console.log(`   ✔ Instancia por defecto "${active.name}" creada con logo oficial en ${iconPath}.\n`);

  // ----------------------------------------------------
  // 3. FICHA DEL MODPACK OFICIAL EN EL CATÁLOGO (CUSTOM) Y DETALLES RICOS
  // ----------------------------------------------------
  console.log('▶ [3/4] Verificando presencia del Modpack Oficial en el Catálogo de Modpacks (como Custom)...');
  const officialInfo = modManager.getOfficialShubaClientModpackInfo();
  assert.strictEqual(officialInfo.id, 'shubaclient');
  assert.strictEqual(officialInfo.source, 'custom');
  assert.strictEqual(officialInfo.contentType, 'modpacks');
  assert.strictEqual(officialInfo.isOfficial, true);
  assert.ok(officialInfo.iconUrl.startsWith('data:image/png;base64,'), 'La ficha del catálogo debe incluir el logo oficial');

  const searchRes = await modManager.searchContent({
    contentType: 'modpacks',
    mcVersion: '26.3',
    loader: 'fabric',
    page: 1,
    pageSize: 5
  });

  assert.ok(searchRes.results && searchRes.results.length > 0, 'Debe haber resultados en la búsqueda de modpacks');
  const firstItem = searchRes.results[0];
  assert.strictEqual(firstItem.id, 'shubaclient', 'El primer modpack debe ser el Modpack Oficial ShubaClient');
  assert.strictEqual(firstItem.source, 'custom', 'El modpack oficial debe tener source "custom"');
  assert.strictEqual(firstItem.author, 'SHUBATECH');
  console.log(`   ✔ Ficha oficial encontrada en el catálogo: "${firstItem.title}" por ${firstItem.author} [${firstItem.source}].`);

  // Verificar que getProjectDetails resuelve los detalles ricos sin llamar a Modrinth ni dar 404
  const details = await modManager.getProjectDetails({
    projectId: 'shubaclient',
    source: 'custom',
    mcVersion: '26.3',
    loader: 'fabric'
  });
  assert.ok(details, 'Debe retornar los detalles del modpack oficial');
  assert.strictEqual(details.source, 'custom');
  assert.ok(details.dependencies && details.dependencies.length >= 15, 'Debe incluir las dependencias de los 17 mods oficiales');
  assert.ok(details.descriptionHtml.includes('Vulkan'), 'La descripción debe destacar el motor Vulkan');
  assert.ok(details.iconUrl.startsWith('data:image/png;base64,'), 'Los detalles deben incluir el logo oficial');
  console.log(`   ✔ Modal de detalles custom validado sin error 404 (${details.dependencies.length} dependencias listadas).\n`);

  // ----------------------------------------------------
  // 4. INSTALACIÓN / DESCARGA COMPLETA DEL MODPACK OFICIAL
  // ----------------------------------------------------
  console.log('▶ [4/4] Verificando instalación del modpack oficial ShubaClient...');
  const installRes = await modManager.downloadContent({
    projectId: 'shubaclient',
    source: 'custom',
    contentType: 'modpacks',
    title: 'Mi ShubaClient Modpack'
  });

  assert.ok(installRes.success, 'La instalación debe ser exitosa');
  assert.strictEqual(installRes.contentType, 'modpacks');
  assert.ok(installRes.profile, 'Debe devolver el perfil creado');
  assert.strictEqual(installRes.profile.mcVersion, '26.3');
  assert.strictEqual(installRes.profile.loader, 'Fabric');
  assert.strictEqual(installRes.profile.ramMax, '6G');
  assert.ok(installRes.profile.icon.startsWith('data:image/png;base64,'), 'Debe tener el icono oficial');

  const instPath = installRes.profile.instancePath;
  const instIconPath = path.join(instPath, 'icon.png');
  assert.ok(fs.existsSync(instIconPath), 'icon.png debe existir en el modpack instalado');
  assert.ok(fs.existsSync(path.join(instPath, 'mods')), 'Carpeta mods debe existir');
  assert.ok(fs.existsSync(path.join(instPath, 'options.txt')), 'options.txt debe existir');

  // Si hay mods en el sistema (como en la máquina del usuario), deben haberse copiado
  const modsOnDisk = fs.readdirSync(path.join(instPath, 'mods')).filter(f => f.endsWith('.jar'));
  console.log(`   ✔ Modpack instalado en "${instPath}" con ${modsOnDisk.length} mods y logo oficial.`);

  // Cleanup profile
  try {
    const { getProfileManager } = require('../src/main/profiles/ProfileManager');
    if (installRes?.profile?.id) {
      getProfileManager().deleteProfile(installRes.profile.id);
    }
  } catch (_) {}

  // Cleanup
  fs.rmSync(testRoot, { recursive: true, force: true });

  console.log('\n====================================================');
  console.log('🎉 TODAS LAS PRUEBAS DEL MODPACK POR DEFECTO Y LOGO PASARON');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
