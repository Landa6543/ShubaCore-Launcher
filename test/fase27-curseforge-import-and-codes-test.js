const assert = require('assert');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { ProfileManager } = require('../src/main/profiles/ProfileManager');
const { ModManager } = require('../src/main/mods/ModManager');
const { ProfileCodeSharer } = require('../src/main/sync/ProfileCodeSharer');

async function runFase27Test() {
  console.log('🧪 Iniciando Test Fase 27: Importador CurseForge (.zip) y Compatibilidad de Códigos...\n');

  const testRoot = path.join(__dirname, 'temp_fase27_test');
  if (fs.existsSync(testRoot)) fs.rmSync(testRoot, { recursive: true, force: true });
  fs.mkdirSync(testRoot, { recursive: true });

  const profileManager = new ProfileManager({ customSharedRoot: testRoot });
  const modManager = new ModManager();
  const codeSharer = new ProfileCodeSharer(profileManager);

  // 1. Crear un ZIP de prueba de CurseForge con manifest.json y overrides/
  console.log('▶ [1/3] Creando modpack CurseForge .zip sintético de prueba...');
  const zip = new AdmZip();
  const cfManifest = {
    minecraft: {
      version: '1.20.1',
      modLoaders: [{ id: 'forge-47.2.0', primary: true }]
    },
    manifestType: 'minecraftModpack',
    manifestVersion: 1,
    name: 'Sample CurseForge Adventure',
    version: '1.0.0',
    author: 'CurseForgeCreator',
    files: [],
    overrides: 'overrides'
  };

  zip.addFile('manifest.json', Buffer.from(JSON.stringify(cfManifest, null, 2), 'utf8'));
  zip.addFile('overrides/config/custom-config.cfg', Buffer.from('# ShubaCore Test Config\nenabled=true\n', 'utf8'));
  zip.addFile('overrides/defaultconfigs/game.json', Buffer.from('{"difficulty":"hard"}', 'utf8'));

  const zipPath = path.join(testRoot, 'SampleCurseForgePack.zip');
  zip.writeZip(zipPath);
  assert(fs.existsSync(zipPath), 'El archivo ZIP de CurseForge debe existir');
  console.log('  ✔ Archivo ZIP sintético creado exitosamente.');

  // 2. Probar _isExternalModpackSource
  console.log('▶ [2/3] Verificando detección inteligente de fuentes en ProfileCodeSharer...');
  assert.strictEqual(codeSharer._isExternalModpackSource('SHUBA-12AB'), false, 'SHUBA-12AB debe ser reconocido como código nativo ShubaCore');
  assert.strictEqual(codeSharer._isExternalModpackSource('12AB'), false, '12AB debe ser reconocido como código corto nativo');
  assert.strictEqual(codeSharer._isExternalModpackSource('https://www.curseforge.com/minecraft/modpacks/all-the-mods-10'), true, 'Enlace de CurseForge debe detectarse');
  assert.strictEqual(codeSharer._isExternalModpackSource('https://modrinth.com/modpack/fabulously-optimized'), true, 'Enlace de Modrinth debe detectarse');
  assert.strictEqual(codeSharer._isExternalModpackSource('cf:283887'), true, 'Prefijo cf: debe detectarse');
  assert.strictEqual(codeSharer._isExternalModpackSource('618286'), true, 'ID numérico de CurseForge debe detectarse');
  assert.strictEqual(codeSharer._isExternalModpackSource(zipPath), true, 'Ruta de archivo local .zip debe detectarse');
  console.log('  ✔ Detección de fuentes externas y códigos nativos validada.');

  // 3. Probar importación completa vía codeSharer.importProfileFromCode
  console.log('▶ [3/3] Importando modpack de CurseForge (.zip) creando nueva instancia...');
  const importRes = await codeSharer.importProfileFromCode({
    code: zipPath,
    customName: 'Mi CurseForge Importado'
  });

  assert(importRes && importRes.success, 'La importación debe ser exitosa');
  assert(importRes.profile, 'Debe devolver el perfil de la nueva instancia');
  assert.strictEqual(importRes.profile.name, 'Mi CurseForge Importado', 'El nombre personalizado debe aplicarse');
  assert.strictEqual(importRes.profile.mcVersion, '1.20.1', 'La versión de MC debe coincidir con el manifest');
  assert.strictEqual(importRes.profile.loader, 'Forge', 'El loader debe ser Forge');

  const instPath = profileManager.getInstancePath(importRes.profile.id);
  const cfgPath = path.join(instPath, 'config', 'custom-config.cfg');
  const defaultCfgPath = path.join(instPath, 'defaultconfigs', 'game.json');
  assert(fs.existsSync(cfgPath), 'El archivo de config de overrides debe haberse extraído');
  assert(fs.existsSync(defaultCfgPath), 'El archivo de defaultconfigs de overrides debe haberse extraído');
  console.log('  ✔ Instancia creada, archivos de overrides extraídos y perfil configurado.');

  // Limpieza
  try {
    fs.rmSync(testRoot, { recursive: true, force: true });
  } catch (_) {}

  console.log('\n🎉 ¡Todos los tests de Fase 27 pasaron al 100% con éxito!\n');
}

runFase27Test().catch((err) => {
  console.error('❌ Error en Test Fase 27:', err);
  process.exit(1);
});
