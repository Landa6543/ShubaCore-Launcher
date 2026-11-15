const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { getAuthManager } = require('../src/main/auth/AuthManager');
const { getLaunchManager } = require('../src/main/launcher/LaunchManager');

async function runTest() {
  console.log('====================================================');
  console.log('🧪 TEST: SHUBAHOST INTEGRACIÓN, PRESENCIA Y QUICKPLAY');
  console.log('====================================================\n');

  const authMgr = getAuthManager();
  const launchMgr = getLaunchManager();

  // 1. Simulación y detección de evento ShubaHost en logs de Minecraft
  console.log('▶ [1/4] Verificando detección de túnel ShubaHost en tiempo real...');
  let detectedEvent = null;
  const unsubscribe = launchMgr.onEvent((ev, data) => {
    if (ev === 'shubahost:hosted') {
      detectedEvent = data;
    }
  });

  launchMgr._checkShubaHostServer('[04:30:15] [Render thread/INFO]: [ShubaHost] Servidor activo en: shuba-alpha-99.e4mc.link:25565', 'test-session', 'Mi Super Mundo');
  assert.ok(detectedEvent, 'Debe haber emitido evento shubahost:hosted');
  assert.strictEqual(detectedEvent.server, 'shuba-alpha-99.e4mc.link:25565', 'La IP detectada debe coincidir');
  assert.strictEqual(detectedEvent.profile, 'Mi Super Mundo', 'El perfil/mundo debe coincidir');
  console.log('   ✔ Evento ShubaHost detectado: ' + detectedEvent.server);

  // 2. Detección de formato alternativo
  detectedEvent = null;
  launchMgr._checkShubaHostServer('[04:30:15] [Render thread/INFO]: Domain assigned: shuba-bravo-12.e4mc.link', 'test-session', 'Mundo 2');
  assert.ok(detectedEvent, 'Debe detectar también "Domain assigned: ..."');
  assert.strictEqual(detectedEvent.server, 'shuba-bravo-12.e4mc.link');
  console.log('   ✔ Formato e4mc legacy detectado: ' + detectedEvent.server);
  unsubscribe();

  // 3. Verificando vinculación offline y alternancia de identidades en AuthManager
  console.log('\n▶ [2/4] Probando vinculación de identidad No-Premium en cuenta ShubaCore...');
  const testUname = 'shubahost_t_' + Math.floor(Math.random() * 9000 + 1000);
  const reg = await authMgr.supabaseManager.register(testUname, 'shuba_pass_999');
  assert.ok(reg.success, 'Registro de usuario de prueba debe tener éxito');

  const session = authMgr._readSessionFile();
  session.activeMode = 'shubacore';
  session.shubacoreAccount = reg.user;
  session.shubacoreAccount.activeLaunchMode = 'offline';
  authMgr._writeSessionFile(session);

  // Guardar nuevo nickname offline
  const linkRes = await authMgr.linkShubaCoreOffline('SoybeCraft');
  assert.ok(linkRes.success, 'linkShubaCoreOffline debe ser exitoso');
  assert.strictEqual(linkRes.user.offlineUsername, 'SoybeCraft');
  console.log('   ✔ Nickname offline vinculado con éxito: ' + linkRes.user.offlineUsername);

  // 4. Comprobar identidad activa según activeLaunchMode
  console.log('\n▶ [3/4] Comprobando selector de modo de entrada (Offline vs Microsoft)...');
  const sessionWithOff = authMgr._readSessionFile();
  sessionWithOff.microsoftAccount = {
    username: 'SoybeOfficial',
    uuid: '00000000-0000-0000-0000-000000000001',
    mcAccessToken: 'fake_valid_mc_token',
    expiresAt: Date.now() + 3600000
  };
  sessionWithOff.shubacoreAccount.msGamertag = 'SoybeOfficial';
  sessionWithOff.shubacoreAccount.accountType = 'premium';
  authMgr._writeSessionFile(sessionWithOff);

  // Modo No-Premium activo
  authMgr.setShubaCoreLaunchMode('offline');
  let currentAcc = authMgr.getCurrentAccount();
  assert.strictEqual(currentAcc.name, 'SoybeCraft', 'En modo offline debe usar el nickname no-premium');
  assert.strictEqual(currentAcc.activeLaunchMode, 'offline');
  console.log('   ✔ Modo No-Premium devuelve: ' + currentAcc.name + ' (' + currentAcc.activeLaunchMode + ')');

  // Modo Microsoft activo
  authMgr.setShubaCoreLaunchMode('premium');
  currentAcc = authMgr.getCurrentAccount();
  assert.strictEqual(currentAcc.name, 'SoybeOfficial', 'En modo premium debe usar el gamertag de Microsoft');
  assert.strictEqual(currentAcc.activeLaunchMode, 'premium');
  console.log('   ✔ Modo Microsoft devuelve: ' + currentAcc.name + ' (' + currentAcc.activeLaunchMode + ')');

  // 5. Verificando compilación de artefactos de ShubaHost
  console.log('\n▶ [4/4] Verificando presencia de compilados de ShubaHost en disco...');
  const buildsDir = 'C:\\Users\\soybe\\Desktop\\Mods NeoForge\\ShubaHost-builds';
  const fabricJar = path.join(buildsDir, 'shubahost-fabric-1.0.0.jar');
  const neoforgeJar = path.join(buildsDir, 'shubahost-neoforge-1.0.0.jar');
  const forgeJar = path.join(buildsDir, 'shubahost-forge-1.0.0.jar');

  assert.ok(fs.existsSync(fabricJar), 'shubahost-fabric debe existir');
  assert.ok(fs.existsSync(neoforgeJar), 'shubahost-neoforge debe existir');
  assert.ok(fs.existsSync(forgeJar), 'shubahost-forge debe existir');
  console.log('   ✔ Fabric Jar:   ' + Math.round(fs.statSync(fabricJar).size / 1024) + ' KB');
  console.log('   ✔ NeoForge Jar: ' + Math.round(fs.statSync(neoforgeJar).size / 1024) + ' KB');
  console.log('   ✔ Forge Jar:    ' + Math.round(fs.statSync(forgeJar).size / 1024) + ' KB');

  console.log('\n====================================================');
  console.log('🎉 TODAS LAS PRUEBAS DE SHUBAHOST PASARON AL 100%');
  console.log('====================================================\n');
}

runTest().catch((err) => {
  console.error('❌ Error en test de ShubaHost:', err);
  process.exit(1);
});
