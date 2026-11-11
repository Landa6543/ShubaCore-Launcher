/**
 * Pruebas unitarias para persistencia de sesión de autenticación (auth-session.json)
 * ShubaCore Launcher - SHUBATECH
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { getAuthManager } = require('../src/main/auth/AuthManager');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 PRUEBAS DE PERSISTENCIA DE SESIÓN (auth-session.json)');
  console.log('====================================================\n');

  const authManager = getAuthManager();
  const sessionPath = authManager._getSessionFilePath();
  console.log(`Ruta de auth-session.json bajo prueba: ${sessionPath}`);

  // Limpieza inicial previa
  if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath);

  // 1. VERIFICAR ESCRITURA Y LECTURA BÁSICA DE auth-session.json
  console.log('▶ [1/5] Verificando lectura y escritura de auth-session.json...');
  const testSession = {
    activeMode: 'offline',
    offlineAccount: {
      username: 'TestPlayer',
      uuid: '11111111-2222-3333-4444-555555555555'
    },
    microsoftAccount: null
  };
  authManager._writeSessionFile(testSession);
  assert.ok(fs.existsSync(sessionPath), 'El archivo auth-session.json debe existir en disco');

  const readData = authManager._readSessionFile();
  assert.strictEqual(readData.activeMode, 'offline');
  assert.strictEqual(readData.offlineAccount.username, 'TestPlayer');
  assert.strictEqual(readData.microsoftAccount, null);
  console.log('  ✔ Lectura y escritura en disco verificadas.');

  // 2. VERIFICAR LOGIN OFFLINE Y PERSISTENCIA INMEDIATA
  console.log('\n▶ [2/5] Verificando loginOffline y guardado persistente...');
  const offlineResult = authManager.loginOffline('ShubaMaster');
  assert.strictEqual(offlineResult.success, true);
  assert.strictEqual(offlineResult.account.name, 'ShubaMaster');

  const sessionAfterOffline = authManager._readSessionFile();
  assert.strictEqual(sessionAfterOffline.activeMode, 'offline');
  assert.strictEqual(sessionAfterOffline.offlineAccount.username, 'ShubaMaster');
  assert.ok(sessionAfterOffline.offlineAccount.uuid, 'Debe tener un UUID offline generado');
  console.log(`  ✔ Sesión offline guardada con UUID: ${sessionAfterOffline.offlineAccount.uuid}`);

  // 3. VERIFICAR CAMBIO DE MODO Y GUARDADO DE CUENTA MICROSOFT
  console.log('\n▶ [3/5] Verificando guardado y activación de cuenta Microsoft...');
  const sampleMsAccount = {
    username: 'LandaAlo',
    uuid: 'e71bb587-f8fc-4c8d-8a5b-9d48b1111111',
    mcAccessToken: 'dummy_mc_access_token_123',
    msRefreshToken: 'dummy_refresh_token_xyz',
    skinUrl: 'https://mc-heads.net/skin/LandaAlo',
    expiresAt: Date.now() + 3600000 // Válido por 1 hora
  };

  const sessionWithMs = authManager._readSessionFile();
  sessionWithMs.activeMode = 'microsoft';
  sessionWithMs.microsoftAccount = sampleMsAccount;
  authManager._writeSessionFile(sessionWithMs);

  const savedSession = await authManager.getSavedSession();
  assert.strictEqual(savedSession.success, true);
  assert.strictEqual(savedSession.activeMode, 'microsoft');
  assert.strictEqual(savedSession.microsoftAccount.username, 'LandaAlo');
  assert.strictEqual(savedSession.account.name, 'LandaAlo');
  assert.strictEqual(savedSession.account.type, 'premium');

  const currentAcc = authManager.getCurrentAccount();
  assert.strictEqual(currentAcc.name, 'LandaAlo');
  assert.strictEqual(currentAcc.type, 'premium');

  const mclcAuth = authManager.getMCLCAuth();
  assert.strictEqual(mclcAuth.name, 'LandaAlo');
  assert.strictEqual(mclcAuth.access_token, 'dummy_mc_access_token_123');
  console.log('  ✔ Cuenta Microsoft y MCLC Auth restaurados exitosamente.');

  // 4. VERIFICAR ALTERNANCIA ENTRE MODOS (Offline <-> Microsoft)
  console.log('\n▶ [4/5] Verificando alternancia de modo (setActiveMode)...');
  authManager.setActiveMode('offline');
  const sessionToggledOffline = authManager._readSessionFile();
  assert.strictEqual(sessionToggledOffline.activeMode, 'offline');
  assert.strictEqual(authManager.getCurrentAccount().name, 'ShubaMaster');

  authManager.setActiveMode('microsoft');
  const sessionToggledMs = authManager._readSessionFile();
  assert.strictEqual(sessionToggledMs.activeMode, 'microsoft');
  assert.strictEqual(authManager.getCurrentAccount().name, 'LandaAlo');
  console.log('  ✔ Alternancia de modos preserva ambas cuentas sin perder credenciales.');

  // 5. VERIFICAR CIERRE DE SESIÓN MICROSOFT Y FALLBACK A OFFLINE
  console.log('\n▶ [5/5] Verificando logoutMicrosoft y desvinculación...');
  authManager.logoutMicrosoft();
  const sessionAfterLogout = authManager._readSessionFile();
  assert.strictEqual(sessionAfterLogout.activeMode, 'offline');
  assert.strictEqual(sessionAfterLogout.microsoftAccount, null);
  assert.strictEqual(sessionAfterLogout.offlineAccount.username, 'ShubaMaster');

  const currentAfterLogout = authManager.getCurrentAccount();
  assert.strictEqual(currentAfterLogout.name, 'ShubaMaster');
  assert.strictEqual(currentAfterLogout.type, 'offline');
  console.log('  ✔ Cierre de Microsoft desvincula credenciales y restaura sesión offline.');

  // Limpieza final
  if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath);

  console.log('\n====================================================');
  console.log('✅ TODAS LAS PRUEBAS DE PERSISTENCIA PASARON EXITOSAMENTE');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
