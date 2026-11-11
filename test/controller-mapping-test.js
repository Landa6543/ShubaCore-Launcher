/**
 * ShubaCore - Controller Visual Mapping & JSON Persistence Test Suite
 * Developed by SHUBATECH
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { getControllerMapManager, ControllerMapManager, AVAILABLE_ACTIONS } = require('../src/main/controller/ControllerMapManager');

async function runControllerMappingTests() {
  console.log('\n====================================================');
  console.log('🧪 PRUEBAS: INTERFAZ VISUAL DE MAPEO & CONTROLLER-MAP.JSON');
  console.log('====================================================\n');

  const testDir = path.join(__dirname, '.test-controller-mapping');
  const instanceDir = path.join(testDir, 'instancia-gamepad');
  const modsDir = path.join(instanceDir, 'mods');

  try {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(modsDir, { recursive: true });

    const mapManager = getControllerMapManager();

    // ----------------------------------------------------
    // TEST 1: Catálogo de Acciones y Mapeo por Defecto
    // ----------------------------------------------------
    console.log('▶ [1/4] Verificando catálogo de acciones y mapeo por defecto...');
    const actions = mapManager.getAvailableActions();
    assert(Array.isArray(actions) && actions.length >= 10, 'El catálogo de acciones debe contener al menos 10 acciones.');
    assert(actions.some(a => a.id === 'jump' && a.key === 'Space'), 'La acción "jump" debe mapear a Space.');
    assert(actions.some(a => a.id === 'attack' && a.key === 'Mouse1'), 'La acción "attack" debe mapear a Mouse1.');
    assert(actions.some(a => a.id === 'inventory' && a.key === 'E'), 'La acción "inventory" debe mapear a E.');
    
    const defaultMap = mapManager.getDefaultMapping();
    assert.strictEqual(defaultMap.version, '1.1.0', 'La versión del mapa debe ser 1.1.0.');
    assert(defaultMap.buttons && Object.keys(defaultMap.buttons).length === 16, 'Debe contener 16 botones mapeados (0..15).');
    assert.strictEqual(defaultMap.buttons['0'].action, 'jump', 'Botón 0 (A) debe ser jump.');
    assert.strictEqual(defaultMap.buttons['7'].action, 'attack', 'Botón 7 (RT) debe ser attack.');
    assert.strictEqual(defaultMap.buttons['6'].action, 'use', 'Botón 6 (LT) debe ser use.');
    console.log('   ✔ Catálogo y mapeo estándar de Xbox/Bedrock validados correctamente.');

    // ----------------------------------------------------
    // TEST 2: Creación automática y lectura de controller-map.json
    // ----------------------------------------------------
    console.log('\n▶ [2/4] Verificando generación inicial de controller-map.json en la instancia...');
    const initialMap = mapManager.getMapping(instanceDir, true);
    const mapFilePath = path.join(instanceDir, 'controller-map.json');
    assert(fs.existsSync(mapFilePath), 'El archivo controller-map.json debe existir en el directorio de la instancia.');
    const rawFileContent = JSON.parse(fs.readFileSync(mapFilePath, 'utf8'));
    assert.strictEqual(rawFileContent.version, '1.1.0', 'El JSON en disco debe tener versión 1.1.0.');
    assert.strictEqual(rawFileContent.buttons['0'].action, 'jump');
    console.log(`   ✔ Archivo controller-map.json verificado en: ${mapFilePath}`);

    // ----------------------------------------------------
    // TEST 3: Reasignación personalizada y persistencia
    // ----------------------------------------------------
    console.log('\n▶ [3/4] Probando reasignación dinámica de controles y persistencia...');
    const customMapping = JSON.parse(JSON.stringify(initialMap));
    customMapping.preset = 'Personalizado Competitivo';
    // Cambiar botón A a agacharse (sneak) y botón 11 (RS) a saltar (jump)
    customMapping.buttons['0'].action = 'sneak';
    customMapping.buttons['0'].key = 'Shift';
    customMapping.buttons['11'].action = 'jump';
    customMapping.buttons['11'].key = 'Space';

    const savedMap = mapManager.saveMapping(instanceDir, customMapping);
    assert.strictEqual(savedMap.preset, 'Personalizado Competitivo');
    assert.strictEqual(savedMap.buttons['0'].action, 'sneak');
    assert.strictEqual(savedMap.buttons['11'].action, 'jump');

    // Volver a leer desde disco para verificar persistencia real
    const reloadedMap = mapManager.getMapping(instanceDir, false);
    assert.strictEqual(reloadedMap.buttons['0'].action, 'sneak');
    assert.strictEqual(reloadedMap.buttons['11'].action, 'jump');
    console.log('   ✔ Reasignación personalizada persistida y leída correctamente desde disco.');

    // Probar reset to default
    const resetMap = mapManager.resetToDefault(instanceDir);
    assert.strictEqual(resetMap.buttons['0'].action, 'jump');
    assert.strictEqual(resetMap.buttons['11'].action, 'sneak');
    console.log('   ✔ Restablecimiento a valores por defecto validado con éxito.');

    // ----------------------------------------------------
    // TEST 4: Pureza estricta de la carpeta mods/ (0 mods)
    // ----------------------------------------------------
    console.log('\n▶ [4/4] Verificando pureza estricta de la instancia (0 mods en /mods)...');
    const modsInDir = fs.readdirSync(modsDir);
    assert.strictEqual(modsInDir.length, 0, 'La carpeta /mods DEBE permanecer completamente vacía (0 mods instalados).');
    console.log('   ✔ Regla obligatoria validada: 0 mods en /mods (100% libre de conflictos con mochilas).');

    console.log('\n====================================================');
    console.log('🎉 TODAS LAS PRUEBAS DE MAPEO VISUAL DE MANDO PASARON');
    console.log('====================================================\n');
  } finally {
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch (_) {}
  }
}

runControllerMappingTests().catch((err) => {
  console.error('❌ Error en las pruebas de controller mapping:', err);
  process.exit(1);
});
