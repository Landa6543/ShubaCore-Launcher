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
const { SplashScreen } = require('../src/main/splash/SplashScreen');

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
  // 3. SPLASH SCREEN SHUBATECH
  // ----------------------------------------------------
  console.log('▶ [3/3] Verificando SplashScreen (Resource Pack nativo & Inyección en options.txt)...');
  const splash = new SplashScreen();

  // Test pack_format calculation
  assert.strictEqual(SplashScreen.getPackFormat('1.21.1'), 34, 'MC 1.21.1 debe usar pack_format 34');
  assert.strictEqual(SplashScreen.getPackFormat('1.21.4'), 46, 'MC 1.21.4 debe usar pack_format 46');
  assert.strictEqual(SplashScreen.getPackFormat('1.20.1'), 15, 'MC 1.20.1 debe usar pack_format 15');
  assert.strictEqual(SplashScreen.getPackFormat('1.16.5'), 6, 'MC 1.16.5 debe usar pack_format 6');

  // Test generación de Resource Pack dinámico
  const testInstanceDir = path.join(TEST_DIR, 'instancia-prueba');
  fs.mkdirSync(testInstanceDir, { recursive: true });

  const packDir = splash.generateSplashPack(testInstanceDir, { mcVersion: '1.21.1' });
  assert.ok(fs.existsSync(packDir), 'El directorio del Resource Pack debe existir');

  const mcmetaPath = path.join(packDir, 'pack.mcmeta');
  assert.ok(fs.existsSync(mcmetaPath), 'pack.mcmeta debe existir');
  const mcmeta = JSON.parse(fs.readFileSync(mcmetaPath, 'utf8'));
  assert.strictEqual(mcmeta.pack.pack_format, 34, 'pack_format en mcmeta debe ser 34');

  const mojangStudiosPng = path.join(packDir, 'assets', 'minecraft', 'textures', 'gui', 'title', 'mojangstudios.png');
  const mojangPng = path.join(packDir, 'assets', 'minecraft', 'textures', 'gui', 'title', 'mojang.png');
  assert.ok(fs.existsSync(mojangStudiosPng), 'mojangstudios.png (1.16+) debe existir');
  assert.ok(fs.existsSync(mojangPng), 'mojang.png (legacy) debe existir');

  // Test inyección en options.txt existente con otros resource packs
  const testOptionsPath = path.join(testInstanceDir, 'options.txt');
  fs.writeFileSync(
    testOptionsPath,
    'gamma:100.0\nresourcePacks:["file/Faithful32x.zip","vanilla"]\nrenderDistance:12\n',
    'utf8'
  );

  splash.injectIntoOptionsTxt(testInstanceDir);

  const updatedOptions = fs.readFileSync(testOptionsPath, 'utf8');
  assert.ok(updatedOptions.includes('resourcePacks:'), 'Debe conservar la línea resourcePacks');

  const optionsLines = updatedOptions.split('\n');
  const packLine = optionsLines.find((l) => l.startsWith('resourcePacks:'));
  const parsedPacks = JSON.parse(packLine.slice('resourcePacks:'.length));

  assert.strictEqual(parsedPacks[0], 'file/ShubaCoreSplash', '"file/ShubaCoreSplash" debe ser el primer pack en la lista');
  assert.ok(parsedPacks.includes('file/Faithful32x.zip'), 'Debe conservar los resource packs previos del usuario');
  assert.ok(parsedPacks.includes('vanilla'), 'Debe conservar vanilla');

  // Test remoción limpia si el usuario lo desactiva
  splash.removeFromOptionsTxt(testInstanceDir);
  const cleanedOptions = fs.readFileSync(testOptionsPath, 'utf8');
  const cleanedPackLine = cleanedOptions.split('\n').find((l) => l.startsWith('resourcePacks:'));
  const cleanedPacks = JSON.parse(cleanedPackLine.slice('resourcePacks:'.length));
  assert.strictEqual(cleanedPacks.includes('file/ShubaCoreSplash'), false, 'ShubaCoreSplash debe ser removido limpiamente');
  assert.ok(cleanedPacks.includes('file/Faithful32x.zip'), 'Debe conservar los demás paquetes activos');

  console.log('   ✔ SplashScreen validado: Generación de pack dinámico, inyección prioritaria en options.txt y remoción no destructiva.\n');

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
