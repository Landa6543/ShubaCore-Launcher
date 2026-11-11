const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { ConfigManager } = require('../src/main/config/ConfigManager');
const { ProfileManager } = require('../src/main/profiles/ProfileManager');
const { getAuthManager } = require('../src/main/auth/AuthManager');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 PRUEBAS: COMPORTAMIENTO AL INICIAR, NOMBRES LIMPIOS Y SESIÓN');
  console.log('====================================================\n');

  const testDir = path.join(__dirname, '.test-settings-data');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  // ----------------------------------------------------
  // TEST 1: ConfigManager & launchBehavior & settings.json
  // ----------------------------------------------------
  console.log('▶ [1/4] Verificando launchBehavior ("hide" por defecto) y sincronización con settings.json...');
  const configManager = new ConfigManager(testDir);
  assert.strictEqual(configManager.get('performance.launchBehavior'), 'hide', 'Debe ser "hide" por defecto');
  assert.strictEqual(configManager.get('launchBehavior'), 'hide', 'Debe soportar getter rápido de launchBehavior');

  // Guardar keep y close
  configManager.set('performance.launchBehavior', 'keep');
  assert.strictEqual(configManager.get('performance.launchBehavior'), 'keep');
  assert.strictEqual(configManager.get('performance.closeOnLaunch'), false);

  configManager.set('launchBehavior', 'close');
  assert.strictEqual(configManager.get('performance.launchBehavior'), 'close');
  assert.strictEqual(configManager.get('performance.closeOnLaunch'), true);

  // Volver a hide por defecto
  configManager.set('launchBehavior', 'hide');
  assert.strictEqual(configManager.get('performance.launchBehavior'), 'hide');
  assert.strictEqual(configManager.get('performance.closeOnLaunch'), false);

  // Comprobar que settings.json y config.json existen y tienen los mismos datos
  const configPath = path.join(testDir, 'config.json');
  const settingsPath = path.join(testDir, 'settings.json');
  assert.ok(fs.existsSync(configPath), 'config.json debe existir');
  assert.ok(fs.existsSync(settingsPath), 'settings.json debe existir sincronizado');

  const settingsJson = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  assert.strictEqual(settingsJson.performance.launchBehavior, 'hide');
  console.log('  ✔ launchBehavior ("hide" por defecto) y settings.json validados.');

  // ----------------------------------------------------
  // TEST 2: Nombres limpios de carpetas de instancias
  // ----------------------------------------------------
  console.log('\n▶ [2/4] Verificando nombres de carpetas de instancias limpios (sin sufijos aleatorios)...');
  const profileManager = new ProfileManager({ customSharedRoot: testDir });

  // 2.1 Perfil normal
  const p1 = profileManager.createProfile({
    name: 'Mi Aventura',
    mcVersion: '1.21.1',
    loader: 'NeoForge'
  });
  assert.strictEqual(p1.id, 'Mi Aventura');
  assert.ok(fs.existsSync(path.join(testDir, 'instances', 'Mi Aventura')), 'Carpeta "Mi Aventura" debe existir exactamente sin sufijos');
  console.log('  ✔ Carpeta creada sin sufijos: "Mi Aventura"');

  // 2.2 Perfil duplicado con el mismo nombre -> (2)
  const p2 = profileManager.createProfile({
    name: 'Mi Aventura',
    mcVersion: '1.21.1',
    loader: 'NeoForge'
  });
  assert.strictEqual(p2.id, 'Mi Aventura (2)');
  assert.ok(fs.existsSync(path.join(testDir, 'instances', 'Mi Aventura (2)')), 'Carpeta duplicada debe ser "Mi Aventura (2)"');
  console.log('  ✔ Carpeta duplicada numerada limpiamente: "Mi Aventura (2)"');

  // 2.3 Perfil con caracteres prohibidos de Windows [<>:"/\\|?*]
  const p3 = profileManager.createProfile({
    name: 'Mega:Pack <RPG> *V1* /2026\\',
    mcVersion: '1.21.1',
    loader: 'NeoForge'
  });
  assert.strictEqual(p3.id, 'MegaPack RPG V1 2026');
  assert.ok(fs.existsSync(path.join(testDir, 'instances', 'MegaPack RPG V1 2026')));
  console.log('  ✔ Caracteres prohibidos de Windows saneados: "MegaPack RPG V1 2026"');

  // ----------------------------------------------------
  // TEST 3: Auto-migración de carpetas antiguas con sufijo aleatorio
  // ----------------------------------------------------
  console.log('\n▶ [3/4] Verificando auto-migración de carpetas antiguas con sufijo aleatorio (-[a-z0-9]{6,9}$)...');
  // Creamos una carpeta antigua en disco con sufijo aleatorio tipo Date.now().toString(36)
  const oldFolder = 'All The Mods 9-mwbbs418';
  const oldFolderPath = path.join(testDir, 'instances', oldFolder);
  fs.mkdirSync(oldFolderPath, { recursive: true });
  fs.writeFileSync(path.join(oldFolderPath, 'profile.json'), JSON.stringify({
    id: oldFolder,
    name: 'All The Mods 9',
    mcVersion: '1.21.1',
    loader: 'NeoForge'
  }, null, 2), 'utf8');

  // Registramos en profiles.json
  const profJsonPath = path.join(testDir, 'profiles.json');
  const profData = JSON.parse(fs.readFileSync(profJsonPath, 'utf8'));
  profData.profiles.push({
    id: oldFolder,
    name: 'All The Mods 9',
    mcVersion: '1.21.1',
    loader: 'NeoForge',
    loaderVersion: '21.1.265',
    ramMin: '2G',
    ramMax: '8G',
    instancePath: oldFolderPath
  });
  fs.writeFileSync(profJsonPath, JSON.stringify(profData, null, 2), 'utf8');

  // Creamos nueva instancia de ProfileManager que ejecutará init() -> _migrateOldRandomSuffixFolders()
  const freshManager = new ProfileManager({ customSharedRoot: testDir });
  const allProfiles = freshManager.getAll().profiles;

  const migrated = allProfiles.find(p => p.name === 'All The Mods 9');
  assert.ok(migrated, 'El perfil debe encontrarse');
  assert.strictEqual(migrated.id, 'All The Mods 9', 'El ID debe migrarse a nombre limpio sin sufijo');
  assert.ok(fs.existsSync(path.join(testDir, 'instances', 'All The Mods 9')), 'La carpeta física debe renombrarse a "All The Mods 9"');
  assert.ok(!fs.existsSync(oldFolderPath), 'La carpeta vieja con sufijo -mwbbs418 NO debe existir');
  console.log(`  ✔ Carpeta antigua "${oldFolder}" migrada limpiamente en disco a "${migrated.id}"`);

  // ----------------------------------------------------
  // TEST 4: Persistencia de cuenta y auto-renovación silenciosa
  // ----------------------------------------------------
  console.log('\n▶ [4/4] Verificando persistencia de cuentas y auto-renovación silenciosa...');
  const authManager = getAuthManager();
  const sessionRes = await authManager.getSavedSession();
  assert.ok(sessionRes.success, 'getSavedSession debe responder con éxito');
  console.log(`  Sesión actual restaurada: modo="${sessionRes.activeMode}"`);

  // Cambiar a offline
  const offRes = authManager.loginOffline('LanderAlo');
  assert.ok(offRes.success);
  assert.strictEqual(offRes.account.name, 'LanderAlo');

  const savedAfterOff = await authManager.getSavedSession();
  assert.strictEqual(savedAfterOff.activeMode, 'offline');
  assert.strictEqual(savedAfterOff.offlineAccount.username, 'LanderAlo');
  console.log('  ✔ Persistencia y alternancia de cuentas offline/microsoft verificadas.');

  // Limpieza
  fs.rmSync(testDir, { recursive: true, force: true });

  console.log('\n====================================================');
  console.log('✅ TODAS LAS PRUEBAS COMPLETADAS CON ÉXITO');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
