/**
 * ShubaCore - Auth Concurrency, Anti-RateLimit & Subtabs Layout Tests (v1.1.0)
 * Developed by SHUBATECH
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('====================================================');
console.log('🧪 PRUEBAS: CONCURRENCIA AUTH, MUTEX, 429 & SUBTABS');
console.log('====================================================\n');

// 1. Verificación de reglas CSS para las Sub-pestañas (.instance-subtabs-nav)
console.log('▶ [1/4] Verificando estilos CSS de sub-pestañas en styles.css...');
const stylesPath = path.join(__dirname, '..', 'src', 'renderer', 'styles.css');
const stylesContent = fs.readFileSync(stylesPath, 'utf8');

assert.ok(stylesContent.includes('.instance-subtabs-nav'), 'styles.css debe definir .instance-subtabs-nav');
assert.ok(stylesContent.includes('flex-shrink: 0'), 'Subtabs deben tener flex-shrink: 0 para no aplastarse');
assert.ok(stylesContent.includes('white-space: nowrap'), 'Botones de sub-pestañas deben tener white-space: nowrap');
assert.ok(stylesContent.includes('#subpanel-instance-mods'), '#subpanel-instance-mods debe estar definido en CSS');
assert.ok(stylesContent.includes('#subpanel-instance-resourcepacks'), '#subpanel-instance-resourcepacks debe estar definido en CSS');
console.log('  ✔ Reglas CSS anti-colapso y layout de sub-pestañas verificadas al 100%.\n');

// 2. Verificación de mutex e in-flight promise en AuthManager
console.log('▶ [2/4] Verificando Mutex e In-Flight Promise en AuthManager...');
const { AuthManager } = require('../src/main/auth/AuthManager');
const authMgr = new AuthManager();

// Simular una llamada lenta a _getSavedSessionInternal
let internalCallCount = 0;
authMgr._getSavedSessionInternal = async () => {
  internalCallCount++;
  await new Promise((resolve) => setTimeout(resolve, 50));
  return { success: true, activeMode: 'offline', testCall: internalCallCount };
};

// Lanzar 5 llamadas simultáneas a getSavedSession()
(async () => {
  const promises = [
    authMgr.getSavedSession(),
    authMgr.getSavedSession(),
    authMgr.getSavedSession(),
    authMgr.getSavedSession(),
    authMgr.getSavedSession()
  ];

  const results = await Promise.all(promises);
  assert.strictEqual(internalCallCount, 1, 'Las llamadas simultáneas a getSavedSession deben compartir la misma promesa (mutex)');
  results.forEach((res) => {
    assert.strictEqual(res.testCall, 1, 'Todos los llamadores deben recibir el resultado de la única ejecución');
  });
  console.log('  ✔ Mutex in-flight verificado: 5 llamadas concurrentes resueltas en 1 sola ejecución.\n');

  // 3. Verificación de Cooldown anti-spam (30s) en refreshMicrosoftSession
  console.log('▶ [3/4] Verificando Cooldown (30s) y Mutex en refreshMicrosoftSession...');
  let refreshCallCount = 0;
  authMgr.deviceAuth.refreshSession = async () => {
    refreshCallCount++;
    await new Promise((resolve) => setTimeout(resolve, 30));
    return { name: 'PlayerTest', uuid: '12345678-1234-1234-1234-123456789abc', mcAccessToken: 'token_abc', mcExpiresIn: 86400 };
  };

  // Simular sesión de Microsoft expirada
  authMgr._readSessionFile = () => ({
    activeMode: 'microsoft',
    offlineAccount: { username: 'Jugador', uuid: 'dummy-offline' },
    microsoftAccount: {
      username: 'PlayerTest',
      uuid: '12345678-1234-1234-1234-123456789abc',
      msRefreshToken: 'refresh_test',
      mcAccessToken: 'old_token',
      expiresAt: Date.now() - 1000 // expirado
    }
  });
  authMgr._writeSessionFile = () => {};

  // Llamada 1
  const r1 = await authMgr.refreshMicrosoftSession();
  assert.strictEqual(refreshCallCount, 1, 'Primera llamada debe ejecutar refresh');
  assert.strictEqual(r1.success, true);

  // Llamada 2 inmediata (debe caer en cooldown y no llamar a deviceAuth)
  const r2 = await authMgr.refreshMicrosoftSession(false);
  assert.strictEqual(refreshCallCount, 1, 'Segunda llamada dentro de 30s debe ser bloqueada por el cooldown');
  assert.strictEqual(r2.renewed, false, 'Llamada en cooldown debe devolver sesión sin re-ejecutar API');
  console.log('  ✔ Cooldown anti rate-limit (30s) comprobado exitosamente.\n');

  // 4. Verificación de manejo limpio de HTTP 429 TOO_MANY_REQUESTS en MicrosoftDeviceAuth
  console.log('▶ [4/4] Verificando manejo de 429 TOO_MANY_REQUESTS en MicrosoftDeviceAuth...');
  const { MicrosoftDeviceAuth } = require('../src/main/auth/MicrosoftDeviceAuth');
  const deviceAuth = new MicrosoftDeviceAuth();

  // Mock global.fetch para simular respuesta 429 de login_with_xbox
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    if (url.includes('login_with_xbox')) {
      return {
        ok: false,
        status: 429,
        text: async () => JSON.stringify({ path: '/authentication/login_with_xbox', error: 'TOO_MANY_REQUESTS' })
      };
    }
    if (url.includes('authenticate') || url.includes('authorize')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ Token: 'mock_token', DisplayClaims: { xui: [{ uhs: 'mock_uhs' }] } })
      };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };

  try {
    const cachedSession = {
      username: 'LanderAlo',
      uuid: 'c808799c-b26a-4934-bc2c-29d3cfbe9b16',
      mcAccessToken: 'existing_valid_mc_token',
      skinUrl: 'https://textures.minecraft.net/texture/abc'
    };

    const res = await deviceAuth.exchangeForMinecraft('dummy_ms_token', cachedSession);
    assert.strictEqual(res.rateLimited, true, 'Debe marcar rateLimited como true');
    assert.strictEqual(res.name, 'LanderAlo', 'Debe conservar el nombre del usuario');
    assert.strictEqual(res.mcAccessToken, 'existing_valid_mc_token', 'Debe reutilizar el token de Minecraft existente sin fallar');
    console.log('  ✔ 429 TOO_MANY_REQUESTS capturado limpiamente: reutiliza token existente sin emitir errores fatales.\n');
  } finally {
    global.fetch = originalFetch;
  }

  console.log('====================================================');
  console.log('✅ TODAS LAS PRUEBAS DE CONCURRENCIA, 429 Y SUBTABS PASARON');
  console.log('====================================================');
})();
