/**
 * ShubaCore - Test de Integración: Sistema de Cuentas Simples (Supabase)
 * SHUBATECH
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const { SupabaseManager } = require('../src/main/supabase/SupabaseManager');
const { AuthManager } = require('../src/main/auth/AuthManager');

console.log('====================================================');
console.log('🧪 TEST: CUENTAS SHUBACORE (SUPABASE & AUTHMGR)');
console.log('====================================================');

(async () => {
  try {
    const sb = new SupabaseManager();

    console.log('\n▶ [1/4] Probando registro en Supabase sin correo real...');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const testUsername = `shubadev_${randomSuffix}`;
    const testPassword = 'ShubaPassword123!';

    const regRes = await sb.register(testUsername, testPassword);
    assert.strictEqual(regRes.success, true, `El registro debió ser exitoso: ${regRes.error}`);
    assert.strictEqual(regRes.user.username, testUsername);
    console.log(`   ✔ Usuario registrado exitosamente: @${regRes.user.username} (ID: ${regRes.user.id})`);

    console.log('\n▶ [2/4] Probando rechazo de usuario duplicado y login...');
    const dupRes = await sb.register(testUsername, testPassword);
    assert.strictEqual(dupRes.success, false, 'No debe permitir duplicados');
    console.log(`   ✔ Duplicado rechazado correctamente: "${dupRes.error}"`);

    const badLogin = await sb.login(testUsername, 'ClaveIncorrecta999');
    assert.strictEqual(badLogin.success, false, 'Login con clave incorrecta debe fallar');
    console.log('   ✔ Login con clave incorrecta rechazado');

    const okLogin = await sb.login(testUsername, testPassword);
    assert.strictEqual(okLogin.success, true, `Login válido debió ser exitoso: ${okLogin.error}`);
    assert.strictEqual(okLogin.user.username, testUsername);
    console.log(`   ✔ Login exitoso para @${okLogin.user.username}`);

    console.log('\n▶ [3/4] Probando vinculación de Microsoft y presencia...');
    const dummyMs = {
      name: `MsGamer_${randomSuffix}`,
      uuid: 'c061262d-0b73-455b-810a-b3628e930800'
    };
    const linkRes = await sb.linkMicrosoft(okLogin.user.id, dummyMs);
    assert.strictEqual(linkRes.success, true, 'Vinculación de Microsoft debe ser exitosa');
    console.log(`   ✔ Cuenta Microsoft vinculada: ${dummyMs.name} -> ID: ${okLogin.user.id}`);

    await sb.updatePresence(okLogin.user.id, 'playing', { server: 'e4mc.link:25565', mc: '1.21.1' });
    console.log('   ✔ Estado de presencia actualizado a playing en tiempo real');

    console.log('\n▶ [4/4] Probando AuthManager integrado...');
    const authMgr = new AuthManager();
    const shubaUser2 = `player_${randomSuffix}`;
    const authReg = await authMgr.registerShubaCore(shubaUser2, 'TestPass123!');
    assert.strictEqual(authReg.success, true, 'AuthManager debe registrar cuenta ShubaCore');

    const curShuba = authMgr.getShubaCoreAccount();
    assert.ok(curShuba, 'Debe haber cuenta ShubaCore guardada en sesión');
    assert.strictEqual(curShuba.username, shubaUser2);

    const mclcAuth = authMgr.getMCLCAuth();
    assert.ok(mclcAuth, 'Debe generar auth para MCLC');
    assert.strictEqual(mclcAuth.name, shubaUser2);
    console.log(`   ✔ AuthManager MCLC Auth verificado para: ${mclcAuth.name}`);

    // Probar desvinculación y vinculación en SupabaseManager
    const unlinkRes = await sb.unlinkMicrosoft(okLogin.user.id);
    assert.strictEqual(unlinkRes.success, true, 'Desvinculación debe ser exitosa');
    console.log('   ✔ Desvinculación de Microsoft verificada en Supabase');

    authMgr.logoutShubaCore();
    assert.strictEqual(authMgr.getShubaCoreAccount(), null, 'Logout debe limpiar la cuenta ShubaCore');
    console.log('   ✔ Logout de ShubaCore completado exitosamente');

    console.log('\n====================================================');
    console.log('🎉 TODAS LAS PRUEBAS DE CUENTAS SHUBACORE PASARON');
    console.log('====================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en pruebas:', err);
    process.exit(1);
  }
})();
