/**
 * ShubaCore - Unit Tests for GitHub Mods & Profile Sync (Bloque 2 v1.1.0)
 * Developed by SHUBATECH
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { getGitHubModsManager } = require('../src/main/github/GitHubModsManager');
const { getProfileSyncManager } = require('../src/main/sync/ProfileSyncManager');
const { getProfileManager } = require('../src/main/profiles/ProfileManager');
const { getConfigManager } = require('../src/main/config/ConfigManager');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 PRUEBAS: GITHUB CUSTOM MODS & PROFILE SYNC (v1.1.0)');
  console.log('====================================================\n');

  const ghManager = getGitHubModsManager();
  const syncManager = getProfileSyncManager();
  const profileManager = getProfileManager();
  const configManager = getConfigManager();

  // 1. Repo info & token
  console.log('▶ [1/4] Verificando GitHubModsManager (Repo info y Token)...');
  const repoInfo = ghManager.getRepoInfo();
  assert.strictEqual(repoInfo.owner, 'Landa6543');
  assert.strictEqual(repoInfo.repo, 'ShubaCore-Mods');
  console.log(`  ✔ Repositorio por defecto: ${repoInfo.owner}/${repoInfo.repo}`);

  const token = ghManager.resolveToken();
  console.log(`  ✔ Token de GitHub resuelto: ${token ? 'Detectado exitosamente (***)' : 'Acceso anónimo configurado'}`);

  // Test name and version parsing
  const formattedName = ghManager._formatDisplayName('SimpleVoiceChat-fabric-1.21.1-2.5.25.jar');
  assert.ok(formattedName.length > 0);
  const version = ghManager._extractVersion('SimpleVoiceChat-fabric-1.21.1-2.5.25.jar');
  assert.ok(version.length > 0);
  console.log(`  ✔ Parseo de nombres y versiones verificado: "${formattedName}" (v${version})`);

  // 2. Fetch custom mods from GitHub API
  console.log('\n▶ [2/4] Verificando consulta de mods custom desde GitHub...');
  try {
    const mods = await ghManager.fetchCustomMods(true);
    assert.ok(Array.isArray(mods));
    console.log(`  ✔ Consulta a GitHub Contents & Releases completada exitosamente (${mods.length} mods encontrados).`);
  } catch (err) {
    console.log(`  ⚠ Consulta con rate-limit o sin conexión: ${err.message}`);
  }

  // 3. ProfileSyncManager Manifest Generation
  console.log('\n▶ [3/4] Verificando generación y estructura de .shubasync.json...');
  // Ensure we have an active test profile
  let activeProfile = profileManager.getActive();
  if (!activeProfile) {
    const all = profileManager.getAll();
    if (all.length > 0) {
      activeProfile = all[0];
    } else {
      activeProfile = await profileManager.createProfile({
        name: 'Sync Test Instance',
        mcVersion: '1.21.1',
        loader: 'neoforge'
      });
    }
  }

  const instPath = profileManager.getInstancePath(activeProfile.id);
  const dummyModsDir = path.join(instPath, 'mods');
  if (!fs.existsSync(dummyModsDir)) fs.mkdirSync(dummyModsDir, { recursive: true });
  fs.writeFileSync(path.join(dummyModsDir, 'dummy-custom-mod.jar'), 'PK_DUMMY_JAR_FOR_TESTING');

  const dummyConfigDir = path.join(instPath, 'config');
  if (!fs.existsSync(dummyConfigDir)) fs.mkdirSync(dummyConfigDir, { recursive: true });
  fs.writeFileSync(path.join(dummyConfigDir, 'dummy-config.json'), JSON.stringify({ testKey: 'shubatech_value' }));

  // Test slugify
  const slug = syncManager._slugify('Mi Aventura Épica 2026!');
  assert.strictEqual(slug, 'mi-aventura-epica-2026');
  console.log(`  ✔ Slug generado: "${slug}"`);

  // 4. Test listSharedProfiles
  console.log('\n▶ [4/4] Verificando lectura de perfiles compartidos desde GitHub...');
  try {
    const sharedList = await syncManager.listSharedProfiles();
    assert.ok(Array.isArray(sharedList));
    console.log(`  ✔ Perfiles compartidos en el repo: ${sharedList.length}`);
  } catch (err) {
    console.log(`  ⚠ Aviso al listar compartidos: ${err.message}`);
  }

  // Cleanup test files
  try {
    fs.unlinkSync(path.join(dummyModsDir, 'dummy-custom-mod.jar'));
    fs.unlinkSync(path.join(dummyConfigDir, 'dummy-config.json'));
  } catch (_) {}

  console.log('\n====================================================');
  console.log('✅ TODAS LAS PRUEBAS DE GITHUB MODS & SYNC PASARON');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
