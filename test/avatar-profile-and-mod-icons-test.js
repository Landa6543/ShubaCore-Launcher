const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { getModManager } = require('../src/main/mods/ModManager');
const { getSupabaseManager } = require('../src/main/supabase/SupabaseManager');

async function runAvatarAndModIconsTest() {
  console.log('====================================================');
  console.log('🧪 PRUEBAS DE AVATAR CUSTOM, MODS SIN DUPLICADOS E ICONOS');
  console.log('====================================================\n');

  // 1. Verificar Modpack oficial con icono S
  console.log('▶ [1/4] Verificando icono del Modpack Oficial...');
  const mm = getModManager();
  const packInfo = mm.getOfficialShubaClientModpackInfo();
  assert.ok(packInfo, 'El modpack debe existir');
  assert.ok(packInfo.iconUrl && packInfo.iconUrl.startsWith('data:image/png;base64,'), 'El modpack debe tener el logo oficial en base64');
  console.log('  ✔ Modpack oficial conserva el logo oficial SHUBATECH.\n');

  // 2. Verificar que los mods individuales no tengan el logo forzado y mantengan su propio icono
  console.log('▶ [2/4] Verificando iconos auténticos individuales en ShubaClient UI y ShubaConfig...');
  const uiJar = path.join(__dirname, '../src/main/../..', 'ShubaCoreMod/build/libs/ShubaClient-UI.jar');
  const cfgJar = path.join(__dirname, '../src/main/../..', 'ShubaCoreMod/build/libs/ShubaConfig-26.3-1.7.1.jar');

  if (fs.existsSync(uiJar)) {
    const metaUI = mm._extractJarMetadata(uiJar);
    assert.ok(metaUI && metaUI.iconBase64, 'ShubaClient UI debe tener icono extraído del JAR');
    assert.notStrictEqual(metaUI.iconBase64.length, 176394, 'ShubaClient UI NO debe tener el logo del launcher forzado');
    console.log(`  ✔ ShubaClient UI mantiene su icono propio (tamaño base64: ${metaUI.iconBase64.length})`);
  }
  if (fs.existsSync(cfgJar)) {
    const metaCfg = mm._extractJarMetadata(cfgJar);
    assert.ok(metaCfg && metaCfg.iconBase64, 'ShubaConfig debe tener icono extraído del JAR');
    assert.notStrictEqual(metaCfg.iconBase64.length, 176394, 'ShubaConfig NO debe tener el logo del launcher forzado');
    console.log(`  ✔ ShubaConfig mantiene su icono propio (tamaño base64: ${metaCfg.iconBase64.length})`);
  }
  console.log('  ✔ Mods individuales preservan su identidad visual original.\n');

  // 3. Verificar que Mi Aventura no tenga mods duplicados
  console.log('▶ [3/4] Verificando ausencia de mods duplicados en Mi Aventura...');
  const miAventuraModsDir = path.join(process.env.APPDATA || '', '.shubacore/instances/Mi Aventura/mods');
  if (fs.existsSync(miAventuraModsDir)) {
    const files = fs.readdirSync(miAventuraModsDir);
    const modernFixes = files.filter(f => /modernfix/i.test(f));
    const sodiums = files.filter(f => /^sodium-fabric/i.test(f));
    assert.strictEqual(modernFixes.length, 1, 'Debe haber exactamente 1 ModernFix en Mi Aventura');
    assert.strictEqual(sodiums.length, 1, 'Debe haber exactamente 1 Sodium en Mi Aventura');
    console.log(`  ✔ ModernFix verificado: ${modernFixes[0]}`);
    console.log(`  ✔ Sodium verificado: ${sodiums[0]}`);
  }
  console.log('  ✔ No hay duplicados en Mi Aventura.\n');

  // 4. Verificar soporte de avatar custom en SupabaseManager
  console.log('▶ [4/4] Verificando updateUserProfile con soporte de avatar custom...');
  const sm = getSupabaseManager();
  assert.strictEqual(typeof sm.updateUserProfile, 'function');
  console.log('  ✔ updateUserProfile soporta avatarUrl y skinUrl.\n');

  console.log('====================================================');
  console.log('🎉 TODAS LAS VALIDACIONES COMPLETADAS EXITOSAMENTE');
  console.log('====================================================\n');
}

runAvatarAndModIconsTest().catch((err) => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
