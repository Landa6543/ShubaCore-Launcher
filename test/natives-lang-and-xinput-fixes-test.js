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

// 3. Verificar UI sin emoji duplicado en la barra lateral
console.log('\n▶ [3/4] Verificando texto limpio de "Configurar Mando" en la barra lateral...');
const indexHtml = fs.readFileSync(path.join(__dirname, '../src/renderer/index.html'), 'utf8');
assert.ok(indexHtml.includes('<span>Configurar Mando</span>'), 'La barra lateral debe decir <span>Configurar Mando</span>');
assert.ok(!indexHtml.includes('<span>🎮 Configurar Mando</span>'), 'La barra lateral NO debe tener emoji duplicado');
console.log('   ✔ Barra lateral verificada (sin emoji duplicado 🎮).');

// 4. Limpieza de directorio temporal
console.log('\n▶ [4/4] Limpiando archivos temporales...');
try {
  fs.rmSync(tempDir, { recursive: true, force: true });
} catch (_) {}
console.log('   ✔ Archivos temporales limpiados.');

console.log('\n====================================================');
console.log('🎉 TODAS LAS PRUEBAS DE NATIVOS, IDIOMA Y UI PASARON');
console.log('====================================================\n');
