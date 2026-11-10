const assert = require('assert');
const { DiscordManager, getDiscordManager, DISCORD_CLIENT_ID } = require('../src/main/discord/DiscordManager');

async function testDiscordManager() {
  console.log('====================================================');
  console.log('🧪 PRUEBAS UNITARIAS: DISCORD RPC (SHUBATECH)');
  console.log('====================================================\n');

  console.log('▶ [1/4] Verificando Application ID oficial...');
  assert.strictEqual(DISCORD_CLIENT_ID, '1569813011277938819', 'Application ID de Discord debe coincidir exactamente');
  console.log('  ✔ Application ID verificado: ' + DISCORD_CLIENT_ID);

  console.log('\n▶ [2/4] Verificando instancia Singleton y estado inicial...');
  const dm = getDiscordManager();
  assert(dm instanceof DiscordManager, 'Debe ser instancia de DiscordManager');
  assert.strictEqual(typeof dm.init, 'function');
  assert.strictEqual(typeof dm.connect, 'function');
  assert.strictEqual(typeof dm.setEnabled, 'function');
  assert.strictEqual(typeof dm.setMenuActivity, 'function');
  const status = dm.getStatus();
  assert(status && typeof status.enabled === 'boolean');
  console.log('  ✔ Métodos e interfaz de DiscordManager validados.');

  console.log('\n▶ [3/4] Verificando estados dinámicos (Menú & Jugando)...');
  dm.setMenuActivity('catalog');
  assert.strictEqual(dm.currentView, 'catalog');
  dm.setMenuActivity('settings');
  assert.strictEqual(dm.currentView, 'settings');

  // Simular inicio de juego
  dm._handleGameStarted({ profile: 'Test Instance' });
  assert.strictEqual(dm.isPlaying, true);
  assert(dm.gameStartTime > 0, 'Debe registrar timestamp de inicio de juego');
  assert(dm.activeGameInfo && dm.activeGameInfo.profileName);
  console.log(`  ✔ Estado de juego configurado: "${dm.activeGameInfo.profileName}" (MC ${dm.activeGameInfo.mcVersion})`);

  // Simular fin de juego
  dm._handleGameClosed();
  assert.strictEqual(dm.isPlaying, false);
  assert.strictEqual(dm.gameStartTime, null);
  console.log('  ✔ Cierre de juego detectado y restaurado a menú principal.');

  console.log('\n▶ [4/4] Verificando tolerancia a fallos y switch de configuración...');
  dm.setEnabled(false);
  assert.strictEqual(dm.isEnabled(), false);
  assert.strictEqual(dm.isConnected, false);

  dm.setEnabled(true);
  assert.strictEqual(dm.isEnabled(), true);
  console.log('  ✔ Switch de activación y tolerancia a fallos validados al 100%.');

  // Limpiar
  dm.disconnect();

  console.log('\n====================================================');
  console.log('✅ TODAS LAS PRUEBAS DE DISCORD RPC PASARON CON ÉXITO');
  console.log('====================================================');
}

testDiscordManager().catch((err) => {
  console.error('❌ Error en pruebas de Discord RPC:', err);
  process.exit(1);
});
