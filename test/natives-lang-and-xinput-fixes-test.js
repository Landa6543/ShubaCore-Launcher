/**
 * Test: Natives Filter (Arm64/x86 Elimination), options.txt Forced Spanish, and Clean Sidebar UI
 * SHUBATECH - ShubaCore Tests
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('\n====================================================');
console.log('🧪 PRUEBAS: FILTRO NATIVOS (ARM64/X86), IDIOMA ES_ES Y UI');
console.log('====================================================\n');

// 1. Verificar filtrado de librerías incompatibles en MCLC
console.log('▶ [1/4] Verificando eliminación de arm64 y x86 en MCLC Handler...');
require('../src/main/launcher/LaunchManager');
const Handler = require('minecraft-launcher-core/components/handler');

const dummyHandler = new Handler({
  options: {
    root: os.tmpdir(),
    version: { number: '1.21.1' },
    overrides: {}
  },
  client: { emit: () => {} }
});

const testLibraries = [
  { name: 'org.lwjgl:lwjgl:3.4.1', downloads: { artifact: { path: 'org/lwjgl/lwjgl/3.4.1/lwjgl-3.4.1.jar' } } },
  { name: 'org.lwjgl:lwjgl:3.4.1:natives-windows', downloads: { artifact: { path: 'org/lwjgl/lwjgl/3.4.1/lwjgl-3.4.1-natives-windows.jar' } } },
  { name: 'org.lwjgl:lwjgl:3.4.1:natives-windows-arm64', downloads: { artifact: { path: 'org/lwjgl/lwjgl/3.4.1/lwjgl-3.4.1-natives-windows-arm64.jar' } } },
  { name: 'org.lwjgl:lwjgl:3.4.1:natives-windows-x86', downloads: { artifact: { path: 'org/lwjgl/lwjgl/3.4.1/lwjgl-3.4.1-natives-windows-x86.jar' } } },
  { name: 'org.lwjgl:lwjgl:3.4.1:natives-linux', downloads: { artifact: { path: 'org/lwjgl/lwjgl/3.4.1/lwjgl-3.4.1-natives-linux.jar' } } },
  { name: 'org.lwjgl:lwjgl:3.4.1:natives-macos', downloads: { artifact: { path: 'org/lwjgl/lwjgl/3.4.1/lwjgl-3.4.1-natives-macos.jar' } } }
];

// parseRule retorna true si la librería debe ser rechazada/omitida
assert.strictEqual(dummyHandler.parseRule(testLibraries[2]), true, 'arm64 debe ser omitido por parseRule');
assert.strictEqual(dummyHandler.parseRule(testLibraries[3]), true, 'x86 debe ser omitido por parseRule');
assert.strictEqual(dummyHandler.parseRule(testLibraries[4]), true, 'linux debe ser omitido por parseRule');
assert.strictEqual(dummyHandler.parseRule(testLibraries[5]), true, 'macos debe ser omitido por parseRule');
console.log('   ✔ Filtrado de arm64, x86, linux y macos validado en parseRule.');

// 2. Verificar reemplazo forzado de lang:en_us por lang:es_es en options.txt
console.log('\n▶ [2/4] Verificando forzado de lang:es_es sobre lang:en_us en options.txt...');
const { getHudOptionsManager } = require('../src/main/hud/HudOptionsManager');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shuba-test-lang-'));
const testOptsFile = path.join(tempDir, 'options.txt');

// Simular options.txt previo que tenía lang:en_us y configuraciones personalizadas
fs.writeFileSync(testOptsFile, 'lang:en_us\ngamma:100.0\nkey_key.jump:key.keyboard.space\nautoJump:true\n', 'utf8');

const hudMgr = getHudOptionsManager();
hudMgr.prepareInstanceOptions(tempDir);

const updatedContent = fs.readFileSync(testOptsFile, 'utf8');
assert.ok(updatedContent.includes('lang:es_es'), 'options.txt debe contener lang:es_es');
assert.ok(!updatedContent.includes('lang:en_us'), 'options.txt NO debe contener lang:en_us');
assert.ok(updatedContent.includes('gamma:100.0'), 'Debe preservar gamma:100.0');
assert.ok(updatedContent.includes('key_key.jump:key.keyboard.space'), 'Debe preservar teclas personalizadas');
console.log('   ✔ Reemplazo de lang:en_us por lang:es_es preservando ajustes validado.');

// 3. Verificar UI sin emoji duplicado en la barra lateral y botón de prueba de inyección
console.log('\n▶ [3/5] Verificando UI (sin emoji duplicado y botón de prueba de inyección)...');
const indexHtml = fs.readFileSync(path.join(__dirname, '../src/renderer/index.html'), 'utf8');
assert.ok(indexHtml.includes('<span>Configurar Mando</span>'), 'La barra lateral debe decir <span>Configurar Mando</span>');
assert.ok(!indexHtml.includes('<span>🎮 Configurar Mando</span>'), 'La barra lateral NO debe tener emoji duplicado');
assert.ok(indexHtml.includes('id="btn-test-controller-injection"'), 'Debe existir el botón de prueba de inyección de 5 seg');
console.log('   ✔ Barra lateral y botón [⚡ Probar Inyección (5 seg)] verificados.');

// 4. Verificar switches de fondo en main.js y background polling en renderer.js
console.log('\n▶ [4/6] Verificando Chromium background switches y polling continuo en renderer.js...');
const mainJs = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
assert.ok(mainJs.includes('disable-renderer-backgrounding'), 'main.js debe incluir disable-renderer-backgrounding');
assert.ok(mainJs.includes('disable-background-timer-throttling'), 'main.js debe incluir disable-background-timer-throttling');
assert.ok(mainJs.includes('disable-backgrounding-occluded-windows'), 'main.js debe incluir disable-backgrounding-occluded-windows');
assert.ok(mainJs.includes('backgroundThrottling: false'), 'main.js debe tener backgroundThrottling: false');

const rendererJs = fs.readFileSync(path.join(__dirname, '../src/renderer/renderer.js'), 'utf8');
assert.ok(rendererJs.includes('gamepadPollIntervalId = setInterval(poll, 16)'), 'renderer.js debe usar setInterval continuo');
assert.ok(rendererJs.includes('btn-test-controller-injection'), 'renderer.js debe enlazar el botón de prueba de inyección');

const workerPs1 = fs.readFileSync(path.join(__dirname, '../src/main/controller/controller-worker.ps1'), 'utf8');
assert.ok(workerPs1.includes('KEYEVENTF_SCANCODE = 0x0008'), 'controller-worker.ps1 debe definir KEYEVENTF_SCANCODE');
assert.ok(workerPs1.includes('HARDWARE_SCAN_CODES'), 'controller-worker.ps1 debe mapear Hardware Scan Codes para GLFW');
console.log('   ✔ Backgrounding switches, Hardware Scan Codes y polling continuo validados al 100%.');

// 5. Verificar auto-arranque/parada de ControllerBridge y eliminación de -Xmx2G duplicado
console.log('\n▶ [5/6] Verificando auto-arranque de ControllerBridge y filtrado de -Xmx/-Xms duplicados...');
const launchManagerJs = fs.readFileSync(path.join(__dirname, '../src/main/launcher/LaunchManager.js'), 'utf8');
assert.ok(launchManagerJs.includes('[Mando] Puente XInput/Gamepad activo para Minecraft'), 'LaunchManager debe loguear auto-arranque con PID');
assert.ok(launchManagerJs.includes('[Mando] Puente de mando detenido'), 'LaunchManager debe loguear detención limpia del mando');
assert.ok(launchManagerJs.includes('stripMemoryFlags'), 'LaunchManager debe definir stripMemoryFlags para filtrar -Xmx/-Xms de version.json');

const modloaderResolver = require('../src/main/launcher/ModloaderResolver').ModloaderResolver;
const testCustomDir = path.join(tempDir, 'versions', 'test-loader');
fs.mkdirSync(testCustomDir, { recursive: true });
const testCustomJson = path.join(testCustomDir, 'test-loader.json');
fs.writeFileSync(testCustomJson, JSON.stringify({
  arguments: {
    jvm: [
      '-Xmx2G',
      '-Xms1G',
      '--add-opens',
      'java.base/java.lang=ALL-UNNAMED',
      {
        value: ['-Xmx4G', '-XX:+UseG1GC']
      }
    ],
    'default-user-jvm': [
      {
        value: ['-Xms2G', '-Xmx2G', '-XX:+UseCompactObjectHeaders']
      }
    ]
  }
}, null, 2), 'utf8');

const unified = modloaderResolver.sanitizeAndUnifyJvmArgs({
  mcRoot: tempDir,
  customVersionName: 'test-loader'
});

assert.strictEqual(unified.some(a => a.startsWith('-Xmx') || a.startsWith('-Xms')), false, 'unifiedArgs no debe contener ningún -Xmx ni -Xms');
assert.ok(unified.includes('--add-opens=java.base/java.lang=ALL-UNNAMED'), 'Debe conservar flags no relacionadas con memoria');
assert.ok(unified.includes('-XX:+UseG1GC'), 'Debe conservar flags de GC');

const diskJson = JSON.parse(fs.readFileSync(testCustomJson, 'utf8'));
assert.strictEqual(diskJson.arguments.jvm.length, 0, 'arguments.jvm en disco debe quedar vacío');
const defaultUserJvm = diskJson.arguments['default-user-jvm'];
if (defaultUserJvm) {
  assert.strictEqual(defaultUserJvm[0].value.some(v => v.startsWith('-Xmx') || v.startsWith('-Xms')), false, 'default-user-jvm no debe conservar -Xmx ni -Xms');
}
console.log('   ✔ Auto-arranque de ControllerBridge y eliminación de -Xmx/-Xms verificados con éxito.');

// 6. Limpieza de directorio temporal
console.log('\n▶ [6/6] Limpiando archivos temporales...');
try {
  fs.rmSync(tempDir, { recursive: true, force: true });
} catch (_) {}
console.log('   ✔ Archivos temporales limpiados.');

console.log('\n====================================================');
console.log('🎉 TODAS LAS PRUEBAS DE NATIVOS, IDIOMA Y MANDO PASARON');
console.log('====================================================\n');
