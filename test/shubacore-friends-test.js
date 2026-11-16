/**
 * ShubaCore - Test de Integración: Sistema de Amigos y Red Social (Supabase)
 * SHUBATECH
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const testDataDir = path.join(__dirname, '.test-data');
if (!fs.existsSync(testDataDir)) fs.mkdirSync(testDataDir, { recursive: true });
process.env.SHUBACORE_SESSION_FILE = path.join(testDataDir, 'auth-session-friends.json');

const { SupabaseManager } = require('../src/main/supabase/SupabaseManager');

console.log('====================================================');
console.log('🧪 TEST: RED SOCIAL Y AMIGOS (SUPABASE REALTIME)');
console.log('====================================================');

(async () => {
  try {
    const sb = new SupabaseManager();
    const suffix = Math.floor(1000 + Math.random() * 9000);

    const userA_Name = `shuba_a_${suffix}`;
    const userB_Name = `shuba_b_${suffix}`;
    const password = 'TestPassword123!';

    console.log(`\n▶ [1/6] Registrando usuarios de prueba (${userA_Name} y ${userB_Name})...`);
    const regA = await sb.register(userA_Name, password);
    assert.strictEqual(regA.success, true, 'Registro de User A falló');
    const userA_Id = regA.user.id;

    const regB = await sb.register(userB_Name, password);
    assert.strictEqual(regB.success, true, 'Registro de User B falló');
    const userB_Id = regB.user.id;
    console.log(`   ✔ Usuarios creados: A (${userA_Name} - ${userA_Id}) | B (${userB_Name} - ${userB_Id})`);

    console.log('\n▶ [2/6] Probando búsqueda de usuarios...');
    const searchRes = await sb.searchUsers(userB_Name, userA_Id);
    assert.ok(searchRes.length > 0, 'La búsqueda debió encontrar al usuario B');
    assert.strictEqual(searchRes[0].username, userB_Name);
    console.log(`   ✔ Usuario B encontrado en búsqueda: @${searchRes[0].username}`);

    console.log('\n▶ [3/6] Probando envío de solicitud de amistad...');
    // Restaurar sesión de User A para RLS
    await sb.client.auth.setSession(regA.user.tokens);
    const sendRes = await sb.sendFriendRequest(userA_Id, userB_Name);
    assert.strictEqual(sendRes.success, true, `Fallo al enviar solicitud: ${sendRes.error}`);
    console.log(`   ✔ Solicitud de amistad enviada con éxito (ID: ${sendRes.friendshipId})`);

    console.log('\n▶ [4/6] Verificando solicitudes pendientes en ambos usuarios (Aislamiento de cuenta)...');
    // Restaurar sesión de User B
    await sb.client.auth.setSession(regB.user.tokens);
    const pendingB = await sb.getPendingRequests(userB_Id);
    assert.strictEqual(pendingB.incoming.length, 1, 'User B debe tener 1 solicitud entrante');
    assert.strictEqual(pendingB.outgoing.length, 0, 'User B NO debe tener solicitudes salientes enviadas');
    assert.strictEqual(pendingB.incoming[0].sender.username, userA_Name);
    console.log(`   ✔ User B ve Solicitud Recibida de @${pendingB.incoming[0].sender.username} (Salientes: ${pendingB.outgoing.length})`);

    // Restaurar sesión de User A y verificar que ve Solicitud Enviada
    await sb.client.auth.setSession(regA.user.tokens);
    const pendingA = await sb.getPendingRequests(userA_Id);
    assert.strictEqual(pendingA.outgoing.length, 1, 'User A debe tener 1 solicitud saliente');
    assert.strictEqual(pendingA.incoming.length, 0, 'User A NO debe tener solicitudes entrantes');
    assert.strictEqual(pendingA.outgoing[0].target.username, userB_Name);
    console.log(`   ✔ User A ve Solicitud Enviada a @${pendingA.outgoing[0].target.username} (Entrantes: ${pendingA.incoming.length})`);

    // Volver a User B para aceptar la solicitud
    await sb.client.auth.setSession(regB.user.tokens);

    console.log('\n▶ [5/6] Aceptando solicitud de amistad y verificando lista...');
    const acceptRes = await sb.acceptFriendRequest(pendingB.incoming[0].id, userB_Id);
    assert.strictEqual(acceptRes.success, true, `Fallo al aceptar solicitud: ${acceptRes.error}`);

    const friendsB = await sb.getFriends(userB_Id);
    assert.strictEqual(friendsB.length, 1, 'User B debe tener 1 amigo');
    assert.strictEqual(friendsB[0].username, userA_Name);
    console.log(`   ✔ Amistad confirmada en lista de B: @${friendsB[0].username}`);

    // Presencia
    await sb.client.auth.setSession(regA.user.tokens);
    await sb.updatePresence(userA_Id, 'playing', {
      worldName: 'Mundo ShubaHost',
      server: 'tunnel.e4mc.link:25565',
      mc: '1.21.1',
      loader: 'neoforge'
    });

    const friendsA = await sb.getFriends(userA_Id);
    assert.strictEqual(friendsA.length, 1, 'User A debe tener 1 amigo');
    assert.strictEqual(friendsA[0].username, userB_Name);
    console.log(`   ✔ Amistad confirmada en lista de A: @${friendsA[0].username}`);

    console.log('\n▶ [6/6] Probando eliminación de amistad...');
    const removeRes = await sb.removeFriend(userA_Id, userB_Id);
    assert.strictEqual(removeRes.success, true, 'Fallo al eliminar amigo');

    const friendsAfter = await sb.getFriends(userA_Id);
    assert.strictEqual(friendsAfter.length, 0, 'Lista de amigos de A debe estar vacía tras eliminación');
    console.log('   ✔ Amistad eliminada correctamente');

    console.log('\n====================================================');
    console.log('🎉 TODAS LAS PRUEBAS DE AMIGOS Y SOCIAL PASARON');
    console.log('====================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en test de amigos:', err);
    process.exit(1);
  }
})();
