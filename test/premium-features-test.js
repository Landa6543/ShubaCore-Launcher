/**
 * ShubaCore - Premium Multiplayer & Visual Features Test Suite
 * Developed by SHUBATECH
 *
 * Tests:
 * 1. PlayItManager (P2P LAN Tunnel, Output parsing, Claim URL, State management)
 * 2. ServerMonitor (Minecraft Java Server Ping, parsing, fail-safe offline handling)
 * 3. SplashScreen (Dynamic Splash Resource Pack, pack_format semver, options.txt injection)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { PlayItManager } = require('../src/main/tunnel/PlayItManager');
const { ServerMonitor } = require('../src/main/servers/ServerMonitor');

const TEST_DIR = path.join(__dirname, '.test-premium-features');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 PRUEBAS: 3 FUNCIONES PREMIUM (PLAYIT, MONITOR, SPLASH)');
  console.log('====================================================\n');

  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });

  // ----------------------------------------------------
  // 1. PLAYIT.GG LAN P2P TUNNEL
  // ----------------------------------------------------
  console.log('▶ [1/3] Verificando PlayItManager (Parsing de salida, Claim URL y Estados)...');
  const playit = new PlayItManager();
  playit.binDir = path.join(TEST_DIR, 'bin');
  playit.exePath = path.join(playit.binDir, 'playit.exe');
  fs.mkdirSync(playit.binDir, { recursive: true });

  const initialStatus = playit.getStatus();
  assert.strictEqual(initialStatus.running, false, 'El túnel debe iniciar detenido');
  assert.strictEqual(initialStatus.status, 'stopped');

  // Simular salida de PlayIt CLI para verificar regex parser
  const sampleClaimOutput = `
    2026-11-11T10:00:00Z INFO playit: Starting playit agent v0.15.0
    2026-11-11T10:00:01Z INFO playit: visit the link to claim your agent:
    https://playit.gg/claim/abc123xyz
    Waiting for claim...
  `;
  playit._parseOutput(sampleClaimOutput);
  assert.strictEqual(playit.state.claimUrl, 'https://playit.gg/claim/abc123xyz', 'Debe extraer la URL de reclamo');

  const sampleTunnelOutput = `
    2026-11-11T10:00:05Z INFO playit: tunnel registered: shuba-world.joinmc.link:25565 => 127.0.0.1:25565
    2026-11-11T10:00:05Z INFO playit: tunnel running: shuba-world.joinmc.link:25565
  `;
  playit._parseOutput(sampleTunnelOutput);
  assert.strictEqual(playit.state.tunnelAddress, 'shuba-world.joinmc.link:25565', 'Debe extraer el dominio público del túnel');
  assert.strictEqual(playit.state.status, 'running', 'El estado debe cambiar a running');

  // Probar stopTunnel limpio
  const stopRes = await playit.stopTunnel();
  assert.ok(stopRes.success, 'stopTunnel debe ser exitoso');
  assert.strictEqual(playit.state.running, false, 'El estado debe regresar a no running');
  console.log('   ✔ PlayItManager validado: Detección de claim URL, dominio público y ciclo de vida seguro.\n');

  // ----------------------------------------------------
  // 2. SERVER MONITOR (WIDGET DE ESTADO EN VIVO)
  // ----------------------------------------------------
  console.log('▶ [2/3] Verificando ServerMonitor (Ping SLP, Address Parsing y Fail-Safe)...');
  const monitor = new ServerMonitor();

  // Test address parsing
  const addr1 = monitor.parseAddress('play.shubacore.com:25570');
  assert.strictEqual(addr1.host, 'play.shubacore.com');
  assert.strictEqual(addr1.port, 25570);

  const addr2 = monitor.parseAddress('mc.hypixel.net');
  assert.strictEqual(addr2.host, 'mc.hypixel.net');
  assert.strictEqual(addr2.port, 25565);

  const addr3 = monitor.parseAddress('http://127.0.0.1:25565/');
  assert.strictEqual(addr3.host, '127.0.0.1');
  assert.strictEqual(addr3.port, 25565);

  // Test ping a un servidor local apagado (Fail-safe: debe retornar objeto offline sin lanzar excepción)
  const offlinePingRes = await monitor.pingServer('127.0.0.1', 65432, 1000);
  assert.strictEqual(offlinePingRes.online, false, 'Servidor local cerrado debe reportar online: false');
  assert.strictEqual(offlinePingRes.host, '127.0.0.1');
  assert.strictEqual(offlinePingRes.port, 65432);
  assert.ok(offlinePingRes.checkedAt, 'Debe incluir timestamp de verificación');

  // Test ciclo de auto-monitoreo
  monitor.startAutoMonitor(20000);
  assert.ok(monitor.pollIntervalTimer, 'El temporizador de auto-monitoreo debe estar activo');
  monitor.stopAutoMonitor();
  assert.strictEqual(monitor.pollIntervalTimer, null, 'El temporizador debe haberse limpiado');
  console.log('   ✔ ServerMonitor validado: Parsing de IPs, ping fail-safe a servidores cerrados y timer.\n');

  // ----------------------------------------------------
  // 3. PURGA Y ELIMINACIÓN PERMANENTE DE SHUBACORESPLASH
  // ----------------------------------------------------
  console.log('▶ [3/3] Verificando purga permanente de ShubaCoreSplash en options.txt y resourcepacks...');
  const testInstanceDir = path.join(TEST_DIR, 'instancia-prueba');
  fs.mkdirSync(testInstanceDir, { recursive: true });

  const splashDir = path.join(testInstanceDir, 'resourcepacks', 'ShubaCoreSplash');
  fs.mkdirSync(splashDir, { recursive: true });
  fs.writeFileSync(path.join(splashDir, 'pack.mcmeta'), '{"pack":{}}', 'utf8');

  const testOptionsPath = path.join(testInstanceDir, 'options.txt');
  fs.writeFileSync(
    testOptionsPath,
    'gamma:100.0\nresourcePacks:["file/ShubaCoreSplash","file/Faithful32x.zip","vanilla"]\nincompatibleResourcePacks:["file/ShubaCoreSplash"]\n',
    'utf8'
  );

  // Probar limpieza automática de options.txt y eliminación de carpeta
  const { getHudOptionsManager } = require('../src/main/hud/HudOptionsManager');
  getHudOptionsManager().prepareInstanceOptions(testInstanceDir);

  assert.strictEqual(fs.existsSync(splashDir), false, 'La carpeta ShubaCoreSplash debe ser borrada permanentemente');
  const updatedOptions = fs.readFileSync(testOptionsPath, 'utf8');
  assert.strictEqual(updatedOptions.includes('ShubaCoreSplash'), false, 'ShubaCoreSplash debe estar totalmente purgado de options.txt');
  assert.ok(updatedOptions.includes('file/Faithful32x.zip'), 'Debe conservar los resource packs previos del usuario');
  assert.ok(updatedOptions.includes('vanilla'), 'Debe conservar vanilla');

  console.log('   ✔ Purga permanente de ShubaCoreSplash y protección de options.txt validada al 100%.\n');

  // Limpieza
  try {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  } catch (_) {}

  console.log('====================================================');
  console.log('🎉 TODAS LAS PRUEBAS DE LAS 3 FUNCIONES PREMIUM PASARON');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('\n❌ ERROR EN PRUEBAS:', err);
  process.exit(1);
});
