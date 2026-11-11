/**
 * ShubaCore - Multi-Instance & System Tray Test Suite
 * Developed by SHUBATECH
 */

const assert = require('assert');
const { LaunchManager } = require('../src/main/launcher/LaunchManager');

async function runMultiInstanceTests() {
  console.log('====================================================');
  console.log('🧪 PRUEBAS DE MODO MULTI-INSTANCIA (SHUBATECH v1.1.0)');
  console.log('====================================================\n');

  const lm = new LaunchManager();

  console.log('▶ [1/4] Verificando inicialización de runningProcesses...');
  assert.strictEqual(lm.getRunningCount(), 0, 'Inicialmente no debe haber procesos corriendo');
  assert.deepStrictEqual(lm.getRunningProcesses(), [], 'La lista de procesos debe ser un array vacío');
  console.log('  ✔ Map de procesos y contadores inicializados en 0.');

  console.log('▶ [2/4] Verificando registro de múltiples sesiones simultáneas...');
  const fakeSession1 = {
    sessionId: 'session_premium_123',
    pid: 1001,
    child: { kill: () => {} },
    instanceId: 'inst_main',
    instanceName: 'Mi Aventura',
    username: 'LanderAlo',
    accountMode: 'microsoft',
    startTime: Date.now()
  };

  const fakeSession2 = {
    sessionId: 'session_offline_456',
    pid: 1002,
    child: { kill: () => {} },
    instanceId: 'inst_farm',
    instanceName: 'Granja AFK',
    username: 'GranjeroAFK',
    accountMode: 'offline',
    startTime: Date.now()
  };

  lm.runningProcesses.set(fakeSession1.sessionId, fakeSession1);
  assert.strictEqual(lm.getRunningCount(), 1);

  lm.runningProcesses.set(fakeSession2.sessionId, fakeSession2);
  assert.strictEqual(lm.getRunningCount(), 2, 'Debe haber 2 sesiones registradas');

  const list = lm.getRunningProcesses();
  assert.strictEqual(list.length, 2);
  assert.strictEqual(list[0].username, 'LanderAlo');
  assert.strictEqual(list[0].accountMode, 'microsoft');
  assert.strictEqual(list[1].username, 'GranjeroAFK');
  assert.strictEqual(list[1].accountMode, 'offline');
  console.log('  ✔ Múltiples sesiones (Premium + Offline) registradas y consultadas en paralelo.');

  console.log('▶ [3/4] Verificando cierre individual de sesión (killSession)...');
  let eventFired = false;
  const unbind3 = lm.onEvent((evt, data) => {
    if (evt === 'game:sessions-changed') {
      eventFired = true;
      assert.strictEqual(data.runningCount, 1);
    }
  });

  const killed = lm.killSession(fakeSession1.sessionId);
  assert.strictEqual(killed, true, 'killSession debe retornar true');
  assert.strictEqual(lm.getRunningCount(), 1, 'Debe quedar 1 sesión tras matar la primera');
  assert.strictEqual(eventFired, true, 'Debe disparar evento game:sessions-changed');
  assert.strictEqual(lm.getRunningProcesses()[0].username, 'GranjeroAFK');
  unbind3();
  console.log('  ✔ killSession cerró únicamente la sesión indicada y emitió eventos.');

  console.log('▶ [4/4] Verificando cierre global (killAll)...');
  let closeAllFired = false;
  lm.onEvent((evt, data) => {
    if (evt === 'game:sessions-changed' && data.runningCount === 0) {
      closeAllFired = true;
    }
  });

  lm.killAll();
  assert.strictEqual(lm.getRunningCount(), 0, 'killAll debe vaciar runningProcesses');
  assert.strictEqual(closeAllFired, true, 'Debe emitir evento con runningCount: 0');
  console.log('  ✔ killAll limpió todas las sesiones activas.');

  console.log('\n====================================================');
  console.log('✅ PRUEBAS DE MODO MULTI-INSTANCIA COMPLETADAS CON ÉXITO');
  console.log('====================================================');
}

runMultiInstanceTests().catch((err) => {
  console.error('❌ Error en pruebas multi-instancia:', err);
  process.exit(1);
});
