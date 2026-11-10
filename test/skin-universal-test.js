/**
 * ShubaCore - Universal Skin & Options Test
 * Developed by SHUBATECH
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { SkinManager } = require('../src/main/skins/SkinManager');

async function testUniversalSkin() {
  console.log('--- TEST: Verificación de pack.mcmeta universal y options.txt ---');
  const tempInstance = fs.mkdtempSync(path.join(os.tmpdir(), 'shuba-skin-test-'));
  const tempShared = fs.mkdtempSync(path.join(os.tmpdir(), 'shuba-shared-test-'));

  const skinMgr = new SkinManager({ customSharedRoot: tempShared });

  // Crear una skin de prueba válida (PNG mínimo)
  const dummyPng = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0x40,
    0x08, 0x06, 0x00, 0x00, 0x00, 0xaa, 0x69, 0x71,
    0xde, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
    0x44, 0xae, 0x42, 0x60, 0x82
  ]);
  fs.writeFileSync(skinMgr.currentSkinPath, dummyPng);

  // Inyectar en una instancia de Minecraft 26.3
  const res = await skinMgr.injectSkinResourcePack({
    instancePath: tempInstance,
    username: 'Steve',
    mcVersion: '26.3'
  });

  assert(res.applied, 'El resource pack debió ser aplicado');

  // 1. Verificar pack.mcmeta
  const mcmetaPath = path.join(tempInstance, 'resourcepacks', 'ShubaSkinOverride', 'pack.mcmeta');
  assert(fs.existsSync(mcmetaPath), 'pack.mcmeta debe existir');
  const mcmetaContent = JSON.parse(fs.readFileSync(mcmetaPath, 'utf8'));

  console.log('Contenido de pack.mcmeta:', JSON.stringify(mcmetaContent, null, 2));

  assert.strictEqual(mcmetaContent.pack.pack_format, 34);
  assert.strictEqual(mcmetaContent.pack.supported_formats.min_inclusive, 1);
  assert.strictEqual(mcmetaContent.pack.supported_formats.max_inclusive, 999);
  assert.strictEqual(mcmetaContent.pack.min_format, 1);
  assert.strictEqual(mcmetaContent.pack.max_format, 999);
  assert.strictEqual(mcmetaContent.pack.description, 'ShubaCore Native Skin System');
  console.log('✅ pack.mcmeta validado al 100%');

  // 2. Verificar options.txt
  const optionsPath = path.join(tempInstance, 'options.txt');
  assert(fs.existsSync(optionsPath), 'options.txt debe existir');
  const optionsContent = fs.readFileSync(optionsPath, 'utf8');

  console.log('Contenido de options.txt:\n' + optionsContent);
  assert(optionsContent.includes('resourcePacks:["vanilla","file/ShubaSkinOverride"]'));
  assert(optionsContent.includes('incompatibleResourcePacks:["file/ShubaSkinOverride"]'));
  console.log('✅ options.txt validado al 100%');

  // Limpiar
  fs.rmSync(tempInstance, { recursive: true, force: true });
  fs.rmSync(tempShared, { recursive: true, force: true });
  console.log('🎉 TEST UNIVERSAL DE SKINS COMPLETADO CON ÉXITO');
}

testUniversalSkin().catch((err) => {
  console.error('❌ Error en test:', err);
  process.exit(1);
});
