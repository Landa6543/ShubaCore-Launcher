/**
 * ShubaCore - Test de Integración: Chat Directo, Mensajería y Notificaciones (Supabase Realtime)
 * SHUBATECH
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

process.env.SHUBACORE_SESSION_FILE = path.join(__dirname, '.test-data', 'auth-session-chat.json');

const { SupabaseManager } = require('../src/main/supabase/SupabaseManager');

console.log('====================================================');
console.log('🧪 TEST: CHAT DIRECTO Y NOTIFICACIONES (SUPABASE)');
console.log('====================================================');

(async () => {
  try {
    const sb = new SupabaseManager();
    const suffix = Date.now().toString(36);

    const userA_Name = `chat_a_${suffix}`;
    const userB_Name = `chat_b_${suffix}`;
    const userC_Name = `chat_c_${suffix}`;
    const password = 'TestChatPassword123!';

    console.log(`\n▶ [1/5] Registrando usuarios para pruebas de chat (${userA_Name}, ${userB_Name}, ${userC_Name})...`);
    const regA = await sb.register(userA_Name, password);
    assert.strictEqual(regA.success, true, 'Registro A falló');
    const userA_Id = regA.user.id;

    const regB = await sb.register(userB_Name, password);
    assert.strictEqual(regB.success, true, 'Registro B falló');
    const userB_Id = regB.user.id;

    const regC = await sb.register(userC_Name, password);
    assert.strictEqual(regC.success, true, 'Registro C falló');
    const userC_Id = regC.user.id;

    console.log(`   ✔ Creados: A (@${userA_Name}) y B (@${userB_Name}) y C (@${userC_Name})`);

    console.log('\n▶ [2/5] Probando envío de mensaje directo de User A a User B...');
    // Restaurar sesión activa de A
    await sb.client.auth.setSession(regA.user.tokens);
    const msgText = '¡Hola! ¿Nos conectamos al servidor de ShubaHost?';
    const sendRes = await sb.sendDirectMessage(userA_Id, userB_Id, msgText);
    assert.strictEqual(sendRes.success, true, `Fallo al enviar mensaje: ${sendRes.error}`);
    assert.strictEqual(sendRes.message.content, msgText);
    assert.strictEqual(sendRes.message.sender_id, userA_Id);
    assert.strictEqual(sendRes.message.receiver_id, userB_Id);
    console.log(`   ✔ Mensaje enviado exitosamente (ID: ${sendRes.message.id})`);

    console.log('\n▶ [3/5] Verificando historial de conversación y conteo de no leídos en User B...');
    // Restaurar sesión activa de B
    await sb.client.auth.setSession(regB.user.tokens);
    const unreadB = await sb.getUnreadMessageCount(userB_Id);
    assert.strictEqual(unreadB[userA_Id], 1, 'User B debe tener 1 mensaje no leído de User A');
    console.log(`   ✔ Conteo de mensajes no leídos en User B: ${unreadB[userA_Id]} de @${userA_Name}`);

    const conversationB = await sb.getConversation(userB_Id, userA_Id);
    assert.strictEqual(conversationB.length, 1, 'Conversación debe tener 1 mensaje');
    assert.strictEqual(conversationB[0].content, msgText);
    console.log(`   ✔ Conversación leída por User B con éxito: "${conversationB[0].content}"`);

    console.log('\n▶ [4/5] Marcando mensajes como leídos y respondiendo desde User B...');
    const markRes = await sb.markMessagesAsRead(userB_Id, userA_Id);
    assert.strictEqual(markRes.success, true, 'Fallo al marcar como leído');

    const unreadAfter = await sb.getUnreadMessageCount(userB_Id);
    assert.strictEqual(unreadAfter[userA_Id] || 0, 0, 'No leídos deben ser 0 tras marcar leído');
    console.log('   ✔ Mensajes marcados como leídos correctamente (Conteo: 0)');

    // Respuesta de B a A
    const replyText = '¡Dale! Ya abro el mundo en LAN.';
    const replyRes = await sb.sendDirectMessage(userB_Id, userA_Id, replyText);
    assert.strictEqual(replyRes.success, true, 'Respuesta de B falló');
    console.log(`   ✔ Respuesta enviada por User B: "${replyText}"`);

    console.log('\n▶ [5/5] Verificando aislamiento RLS estricto (User C NO puede ver la conversación ajena)...');
    // Restaurar sesión activa de C
    await sb.client.auth.setSession(regC.user.tokens);
    const eavesdrop = await sb.getConversation(userC_Id, userA_Id);
    assert.strictEqual(eavesdrop.length, 0, 'User C NO debe ver ningún mensaje entre A y B');

    // Intentar consultar directamente con supabase client como C
    const { data: spyData } = await sb.client
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${userA_Id},receiver_id.eq.${userB_Id}),and(sender_id.eq.${userB_Id},receiver_id.eq.${userA_Id})`);
    assert.strictEqual(spyData.length, 0, 'La política RLS de Postgres debe devolver 0 filas a un usuario ajeno');
    console.log('   ✔ Aislamiento de seguridad RLS 100% verificado: Las conversaciones son privadas y seguras.');

    console.log('\n====================================================');
    console.log('🎉 TODAS LAS PRUEBAS DE CHAT Y NOTIFICACIONES PASARON');
    console.log('====================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ERROR EN PRUEBAS DE CHAT:', err);
    process.exit(1);
  }
})();
