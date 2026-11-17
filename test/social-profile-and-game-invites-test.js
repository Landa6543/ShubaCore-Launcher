/**
 * ShubaCore - Perfil Social Enriquecido, Tiempo Jugado e Invitaciones de Partida ShubaHost
 * Developed by SHUBATECH
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Usar sesión de test aislada para no tocar la sesión real del usuario
const TEST_DIR = path.join(__dirname, '.test-social-invites');
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}
const testSessionFile = path.join(TEST_DIR, 'auth-session-test.json');
process.env.SHUBACORE_SESSION_FILE = testSessionFile;

const { getAuthManager } = require('../src/main/auth/AuthManager');
const { getLaunchManager } = require('../src/main/launcher/LaunchManager');
const { getProfileManager } = require('../src/main/profiles/ProfileManager');

async function run() {
  console.log('====================================================');
  console.log('🧪 TEST: PERFIL SOCIAL, TIEMPO JUGADO E INVITACIONES SHUBAHOST');
  console.log('====================================================\n');

  const authMgr = getAuthManager();
  const sm = authMgr.supabaseManager;
  const launchMgr = getLaunchManager();
  const profMgr = getProfileManager();

  // 1. Registro de usuarios para las pruebas
  console.log('▶ [1/5] Registrando usuarios de prueba en Supabase...');
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  const userA = 'host_' + suffix;
  const userB = 'guest_' + suffix;

  const regA = await sm.register(userA, 'pass_shuba_123');
  assert.ok(regA.success, 'Registro Host debe ser exitoso');
  const regB = await sm.register(userB, 'pass_shuba_123');
  assert.ok(regB.success, 'Registro Guest debe ser exitoso');

  console.log(`   ✔ Host creado: @${userA} (${regA.user.id})`);
  console.log(`   ✔ Guest creado: @${userB} (${regB.user.id})\n`);

  // 2. Comprobando obtención y actualización de perfil social (bio, modloader, playStyle)
  console.log('▶ [2/5] Verificando perfil social (Bio, Modloader Fav y Tiempo Jugado)...');
  // Autenticar como Host en sesión de test
  authMgr._writeSessionFile({
    activeMode: 'shubacore',
    shubacoreAccount: regA.user
  });

  const updateRes = await sm.updateUserProfile(regA.user.id, {
    bio: '¡Fanático del cliente ShubaClient y los shaders con Vulkan!',
    favoriteModloader: 'Fabric',
    playStyle: 'Survival Técnico'
  });
  assert.ok(updateRes.success, 'updateUserProfile debe ser exitoso');
  assert.strictEqual(updateRes.profile.favoriteModloader, 'Fabric');
  assert.strictEqual(updateRes.profile.playStyle, 'Survival Técnico');
  assert.ok(updateRes.profile.bio.includes('Vulkan'));

  // Consultar perfil por nombre de usuario
  const fetchedProf = await sm.getUserProfile(userA);
  assert.ok(fetchedProf, 'getUserProfile debe devolver el perfil');
  assert.strictEqual(fetchedProf.id, regA.user.id);
  assert.strictEqual(fetchedProf.favoriteModloader, 'Fabric');
  assert.strictEqual(fetchedProf.playStyle, 'Survival Técnico');
  console.log(`   ✔ Perfil actualizado y recuperado: "${fetchedProf.bio}" | Fav: ${fetchedProf.favoriteModloader}`);

  // Acumular tiempo jugado (+7200 segundos = 2 horas)
  const addTimeRes = await sm.addPlayTime(regA.user.id, 7200);
  assert.ok(addTimeRes.success, 'addPlayTime debe retornar success');
  assert.strictEqual(addTimeRes.totalSeconds, 7200);

  const profAfterTime = await sm.getUserProfile(regA.user.id);
  assert.strictEqual(profAfterTime.playTimeSeconds, 7200);
  console.log(`   ✔ Tiempo de juego acumulado validado: ${profAfterTime.playTimeSeconds} segundos (2 horas).\n`);

  // 3. Crear y recibir invitaciones de partida LAN ShubaHost
  console.log('▶ [3/5] Verificando creación y recepción de Game Invites...');
  const fakeServer = 'shuba-test-' + suffix + '.e4mc.link:25565';
  const inviteRes = await sm.createGameInvite(regA.user.id, {
    guestId: regB.user.id,
    worldName: 'Mundo Aventuras',
    mcVersion: '26.3',
    loader: 'fabric',
    serverAddress: fakeServer
  });
  assert.ok(inviteRes.success, 'createGameInvite debe tener éxito');
  assert.strictEqual(inviteRes.invite.status, 'pending');
  assert.strictEqual(inviteRes.invite.server_address, fakeServer);
  console.log(`   ✔ Invitación creada por @${userA} para @${userB} a servidor: ${fakeServer}`);

  // Cambiar sesión de test al Guest para consultar invitaciones pendientes
  authMgr._writeSessionFile({
    activeMode: 'shubacore',
    shubacoreAccount: regB.user
  });

  const guestInvites = await sm.getPendingGameInvites(regB.user.id);
  assert.ok(Array.isArray(guestInvites) && guestInvites.length > 0, 'Guest debe ver su invitación pendiente');
  const targetInvite = guestInvites.find(i => i.id === inviteRes.invite.id);
  assert.ok(targetInvite, 'La invitación específica debe estar en la lista');
  assert.strictEqual(targetInvite.serverAddress, fakeServer);
  assert.strictEqual(targetInvite.worldName, 'Mundo Aventuras');
  console.log(`   ✔ Guest recibió la invitación de ${targetInvite.host.username} con server ${targetInvite.serverAddress}\n`);

  // 4. Responder y Aceptar invitación
  console.log('▶ [4/5] Verificando respuesta y aceptación de invitación...');
  const acceptRes = await sm.respondGameInvite(targetInvite.id, regB.user.id, true);
  assert.ok(acceptRes.success, 'respondGameInvite debe retornar éxito');
  assert.strictEqual(acceptRes.invite.status, 'accepted');

  const pendingAfterAccept = await sm.getPendingGameInvites(regB.user.id);
  assert.ok(!pendingAfterAccept.some(i => i.id === targetInvite.id), 'La invitación aceptada ya no debe salir como pending');
  console.log('   ✔ Invitación aceptada correctamente y removida de pendientes.\n');

  // 5. Verificando detección de invitaciones in-game por logs
  console.log('▶ [5/5] Verificando detección in-game de [ShubaHost] [Invite]...');
  let detectedInvite = null;
  launchMgr.activeHostServer = 'shuba-hosted-realm.e4mc.link:25565';
  const unsub = launchMgr.onEvent((ev, data) => {
    if (ev === 'shubahost:in-game-invite') {
      detectedInvite = data;
    }
  });

  launchMgr._checkInGameInvite('[05:12:00] [Render thread/INFO]: [ShubaHost] [Invite] LanderAlo2', 'test-sess', 'Survival');
  assert.ok(detectedInvite, 'Debe haber emitido evento shubahost:in-game-invite');
  assert.strictEqual(detectedInvite.targetFriend, 'LanderAlo2');
  assert.strictEqual(detectedInvite.server, 'shuba-hosted-realm.e4mc.link:25565');
  console.log(`   ✔ Invitación in-game detectada por logs para: @${detectedInvite.targetFriend}`);
  unsub();

  // Limpieza de carpeta de test
  try {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  } catch (_) {}

  console.log('\n====================================================');
  console.log('🎉 TODAS LAS PRUEBAS DE PERFIL SOCIAL E INVITACIONES PASARON AL 100%');
  console.log('====================================================');
}

run().catch(err => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
