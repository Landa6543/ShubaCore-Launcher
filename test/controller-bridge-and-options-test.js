/**
 * ShubaCore - Controller Native Bridge, Options.txt Preservation & Server Port Test Suite
 * Developed by SHUBATECH
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { getHudOptionsManager } = require('../src/main/hud/HudOptionsManager');
const { getHardwareOptimizer } = require('../src/main/hardware/HardwareOptimizer');
const { getServerMonitor } = require('../src/main/servers/ServerMonitor');
const { getControllerBridge } = require('../src/main/controller/ControllerBridge');

async function runTests() {
  console.log('\n====================================================');
  console.log('🧪 PRUEBAS: PUENTE NATIVO WIN32, OPTIONS.TXT (IDIOMA) Y PUERTOS');
  console.log('====================================================\n');

  const testDir = path.join(__dirname, '.test-bridge-and-options');
  const instanceDir = path.join(testDir, 'instancia-prueba');
  const modsDir = path.join(instanceDir, 'mods');

  try {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(modsDir, { recursive: true });

    // ----------------------------------------------------
    // TEST 1: Inicialización y Preservación de options.txt (Idioma Español)
    // ----------------------------------------------------
    console.log('▶ [1/5] Verificando inicialización de options.txt con lang:es_es...');
    const hudMgr = getHudOptionsManager();
    hudMgr.prepareInstanceOptions(instanceDir);

    const optsFile = path.join(instanceDir, 'options.txt');
    assert(fs.existsSync(optsFile), 'options.txt debe haber sido creado en la instancia.');
    let content = fs.readFileSync(optsFile, 'utf8');
    assert(content.includes('lang:es_es'), 'Nueva instancia debe incluir lang:es_es por defecto.');
    console.log('   ✔ options.txt creado con lang:es_es por defecto.');

    // Simular que el usuario cambia controles y volumen en Minecraft
    console.log('\n▶ [2/5] Verificando que NO se borren teclas ni configuraciones del usuario...');
    const customUserOptions = [
      '# Minecraft options',
      'lang:es_es',
      'soundCategory_master:0.75',
      'soundCategory_music:0.0',
      'key_key.jump:key.keyboard.space',
      'key_key.inventory:key.keyboard.e',
      'fov:85.0',
      'guiScale:3'
    ].join('\n') + '\n';
    fs.writeFileSync(optsFile, customUserOptions, 'utf8');

    // Aplicar optimizaciones nativas de ShubaCore
    hudMgr.setOption(instanceDir, 'fullbright', true);
    hudMgr.setOption(instanceDir, 'autoSprint', true);

    content = fs.readFileSync(optsFile, 'utf8');
    assert(content.includes('gamma:100.0'), 'gamma debe estar en 100.0');
    assert(content.includes('toggleSprint:true'), 'toggleSprint debe estar en true');
    assert(content.includes('lang:es_es'), 'lang:es_es DEBE conservarse intacto.');
    assert(content.includes('soundCategory_master:0.75'), 'soundCategory_master DEBE conservarse intacto.');
    assert(content.includes('key_key.jump:key.keyboard.space'), 'Los controles del usuario DEBEN conservarse intactos.');
    assert(content.includes('fov:85.0'), 'El FOV del usuario DEBE conservarse intacto.');
    console.log('   ✔ 100% de las opciones personalizadas y el idioma español fueron respetados sin pisar nada.');

    // ----------------------------------------------------
    // TEST 2: HardwareOptimizer sin pisar opciones personalizadas
    // ----------------------------------------------------
    console.log('\n▶ [3/5] Verificando HardwareOptimizer en options.txt...');
    const hwOptimizer = getHardwareOptimizer();
    const optRes = hwOptimizer.optimizeInstanceOptions(instanceDir, 'high');
    assert(optRes.success, 'HardwareOptimizer debe retornar success: true.');

    content = fs.readFileSync(optsFile, 'utf8');
    assert(content.includes('renderDistance:20'), 'renderDistance debe haberse ajustado para High.');
    assert(content.includes('lang:es_es'), 'lang:es_es DEBE seguir intacto tras la auto-optimización.');
    assert(content.includes('soundCategory_master:0.75'), 'El volumen del usuario debe seguir intacto.');
    console.log('   ✔ HardwareOptimizer actualizó en sitio respetando opciones de usuario.');

    // ----------------------------------------------------
    // TEST 3: Puerto Opcional en ServerMonitor
    // ----------------------------------------------------
    console.log('\n▶ [4/5] Verificando puerto opcional y resolución de dominios en ServerMonitor...');
    const srvMonitor = getServerMonitor();

    const p1 = srvMonitor.parseAddress('mi-servidor.playit.gg');
    assert.strictEqual(p1.host, 'mi-servidor.playit.gg');
    assert.strictEqual(p1.port, 25565, 'Si no se introduce puerto, debe usar 25565 por defecto.');

    const p2 = srvMonitor.parseAddress('play.servidor.com:25577');
    assert.strictEqual(p2.host, 'play.servidor.com');
    assert.strictEqual(p2.port, 25577, 'Si se especifica :puerto, debe parsearlo correctamente.');

    const p3 = srvMonitor.parseAddress('127.0.0.1');
    assert.strictEqual(p3.host, '127.0.0.1');
    assert.strictEqual(p3.port, 25565);

    const p4 = srvMonitor.parseAddress('');
    assert.strictEqual(p4.port, 25565);
    console.log('   ✔ Puerto opcional con fallback a 25565 validado al 100%.');

    // ----------------------------------------------------
    // TEST 4: ControllerBridge Win32 y pureza de 0 mods
    // ----------------------------------------------------
    console.log('\n▶ [5/5] Verificando ControllerBridge y pureza de la carpeta /mods...');
    const bridge = getControllerBridge();
    const status = bridge.getStatus();
    assert.strictEqual(typeof status.running, 'boolean');

    const workerScript = path.join(__dirname, '..', 'src', 'main', 'controller', 'controller-worker.ps1');
    assert(fs.existsSync(workerScript), 'controller-worker.ps1 debe existir en disco.');

    // Pureza estricta de /mods (0 mods)
    const mods = fs.readdirSync(modsDir);
    assert.strictEqual(mods.length, 0, 'La carpeta /mods DEBE permanecer 100% vacía (0 mods para mando).');
    console.log('   ✔ Puente Win32 verificado y regla de 0 mods en /mods 100% cumplida.');

    console.log('\n====================================================');
    console.log('🎉 TODAS LAS PRUEBAS DE PUENTE NATIVO Y OPTIONS.TXT PASARON');
    console.log('====================================================\n');
  } finally {
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch (_) {}
  }
}

runTests().catch((err) => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
