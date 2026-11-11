/**
 * ShubaCore - ProfileManager & LoaderVersionResolver Tests
 * Developed by SHUBATECH
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const testRoot = path.join(__dirname, '.test-profile-data');
if (fs.existsSync(testRoot)) {
  fs.rmSync(testRoot, { recursive: true, force: true });
}
fs.mkdirSync(testRoot, { recursive: true });

console.log('====================================================');
console.log('🧪 PRUEBAS UNITARIAS: SISTEMA DE PERFILES Y SANEAMIENTO (SHUBATECH)');
console.log('====================================================\n');

const { ProfileManager } = require('../src/main/profiles/ProfileManager');
const { LoaderVersionResolver } = require('../src/main/launcher/LoaderVersionResolver');
const { JVMOptimizer } = require('../src/main/jvm/JVMOptimizer');

async function runProfileTests() {
  // 1. ProfileManager: creación de instancias aisladas con estructura estandarizada
  console.log('▶ [1/5] Verificando ProfileManager, estructura estandarizada y limpieza de selector...');
  const profileManager = new ProfileManager({ customSharedRoot: testRoot });
  
  const created = profileManager.createProfile({
    name: 'Awakening RPG Test',
    mcVersion: '1.21.1',
    loader: 'NeoForge',
    loaderVersion: '21.1.265 (Recomendada / Más Reciente)', // Simular texto de selector con label
    ramMin: '2G',
    ramMax: '8G'
  });

  // Validar estructura exacta
  assert.ok(created.id, 'El perfil debe tener un id único');
  assert.strictEqual(created.name, 'Awakening RPG Test');
  assert.strictEqual(created.mcVersion, '1.21.1');
  assert.strictEqual(created.loader, 'NeoForge');
  assert.strictEqual(created.loaderVersion, '21.1.265', 'Debe limpiar texto extra de versión y dejar solo 21.1.265');
  assert.strictEqual(created.ramMin, '2G');
  assert.strictEqual(created.ramMax, '8G');
  
  // Validar aislamiento físico
  assert.ok(fs.existsSync(created.instancePath), 'La carpeta de instancia debe existir');
  assert.ok(fs.existsSync(path.join(created.instancePath, 'mods')), 'Debe existir carpeta /mods aislada');
  assert.ok(fs.existsSync(path.join(created.instancePath, 'config')), 'Debe existir carpeta /config aislada');
  assert.ok(fs.existsSync(path.join(created.instancePath, 'mods-lock.json')), 'Debe existir mods-lock.json independiente');
  
  const active = profileManager.getActive();
  assert.strictEqual(active.id, created.id, 'El perfil recién creado debe ser el activo');
  console.log(`  Perfil creado: "${created.name}" [Loader: ${created.loader} ${created.loaderVersion}, RAM: ${created.ramMin}-${created.ramMax}]`);
  console.log('  ✔ Creación, limpieza de selector y aislamiento físico verificados.\n');

  // 2. ProfileManager: saneamiento de perfiles corruptos e incompletos
  console.log('▶ [2/5] Verificando auto-saneamiento de perfiles corruptos y escaneo de carpetas físicas...');
  
  // Inyectar perfil corrupto directamente en profiles.json
  const corruptProfile = {
    id: 'corrupto-antiguo',
    name: 'Perfil Corrupto Test'
    // mcVersion faltante
    // loader faltante (undefined)
    // loaderVersion faltante (undefined)
    // ramMin / ramMax faltantes
  };
  
  // Crear también una carpeta huérfana en /instances/
  const orphanDir = path.join(testRoot, 'instances', 'instancia-huerfana-123');
  fs.mkdirSync(orphanDir, { recursive: true });
  
  // Guardar profiles.json con el corrupto
  const profilesPath = path.join(testRoot, 'profiles.json');
  const currentData = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
  currentData.profiles.push(corruptProfile);
  fs.writeFileSync(profilesPath, JSON.stringify(currentData, null, 2), 'utf8');

  // Forzar reload llamando getAll()
  const { profiles, activeProfileId } = profileManager.getAll();
  
  const healedCorrupt = profiles.find((p) => p.id === 'corrupto-antiguo');
  assert.ok(healedCorrupt, 'El perfil corrupto debe ser conservado');
  assert.strictEqual(healedCorrupt.mcVersion, '1.21.1', 'Debe rellenar mcVersion por defecto');
  assert.strictEqual(healedCorrupt.loader, 'NeoForge', 'Debe rellenar loader por defecto');
  assert.strictEqual(healedCorrupt.loaderVersion, '21.1.265', 'Debe rellenar loaderVersion por defecto');
  assert.strictEqual(healedCorrupt.ramMin, '2G', 'Debe rellenar ramMin por defecto');
  assert.strictEqual(healedCorrupt.ramMax, '8G', 'Debe rellenar ramMax por defecto');
  
  // Comprobar que no crashea al hacer toUpperCase()
  assert.doesNotThrow(() => {
    const upper = (healedCorrupt.loader || 'neoforge').toUpperCase();
    assert.strictEqual(upper, 'NEOFORGE');
  }, 'No debe arrojar error toUpperCase');

  // Comprobar que la instancia huérfana en disco fue recuperada
  const healedOrphan = profiles.find((p) => p.id === 'instancia-huerfana-123');
  assert.ok(healedOrphan, 'La carpeta huérfana debe haberse recuperado como perfil activo');
  console.log(`  Perfil corrupto saneado exitosamente: Loader ${healedCorrupt.loader} ${healedCorrupt.loaderVersion}`);
  console.log(`  Instancia huérfana recuperada del disco: "${healedOrphan.name}"`);
  console.log('  ✔ Saneamiento y recuperación automática validadas con 100% de éxito.\n');

  // 3. ProfileManager: actualización y persistencia
  console.log('▶ [3/5] Verificando actualización y persistencia...');
  const updated = profileManager.updateProfile(created.id, {
    name: 'Awakening RPG v2',
    loaderVersion: '21.1.250 (Custom)',
    ramMax: '12G'
  });
  assert.strictEqual(updated.name, 'Awakening RPG v2');
  assert.strictEqual(updated.loaderVersion, '21.1.250');
  assert.strictEqual(updated.ramMax, '12G');
  console.log('  ✔ Actualización y persistencia de perfiles verificada.\n');

  // 4. LoaderVersionResolver: consulta en tiempo real de NeoForge (1.21.1)
  console.log('▶ [4/5] Verificando consulta en tiempo real de versiones de NeoForge (1.21.1)...');
  const neoVersions = await LoaderVersionResolver.getAvailableLoaderVersions('neoforge', '1.21.1');
  assert.ok(Array.isArray(neoVersions), 'Debe retornar un arreglo');
  assert.ok(neoVersions.length > 0, 'Debe devolver versiones para 1.21.1');
  console.log(`  Versiones de NeoForge encontradas para MC 1.21.1: ${neoVersions.length}`);
  console.log(`  Top 3 versiones más recientes: ${neoVersions.slice(0, 3).join(', ')}`);
  
  const hasHighVersion = neoVersions.some((v) => {
    const parts = v.split('.');
    return parts.length >= 3 && parseInt(parts[2], 10) >= 249;
  });
  assert.ok(hasHighVersion, 'Debe incluir versiones >= 21.1.249 como exige awakening_system');
  console.log('  ✔ LoaderVersionResolver para NeoForge 1.21.1 validado con éxito.\n');

  // 5. Detección de Java 21 y JVM flags
  console.log('▶ [5/5] Verificando JVMOptimizer (Detección de Java 21 y flags nativas)...');
  const detectedJava21 = JVMOptimizer.findJava21();
  console.log(`  Ruta Java 21 detectada: ${detectedJava21 || 'No encontrada en rutas estándar (usará PATH si es 21)'}`);
  
  const jvm21Flags = JVMOptimizer.buildJvmArguments({
    ramMin: '2G',
    ramMax: '8G',
    majorVersion: 21
  });
  assert.ok(jvm21Flags.includes('--enable-native-access=ALL-UNNAMED'), 'Debe incluir --enable-native-access');
  assert.ok(jvm21Flags.includes('-XX:+UseG1GC'), 'Debe incluir G1GC oficial de CurseForge');
  assert.ok(jvm21Flags.includes('-XX:MaxGCPauseMillis=50'), 'Debe incluir MaxGCPauseMillis=50');
  assert.ok(!jvm21Flags.includes('-XX:+UseZGC'), 'No debe incluir ZGC');
  assert.ok(jvm21Flags.includes('-Xms2G'), 'Debe incluir -Xms2G');
  assert.ok(jvm21Flags.includes('-Xmx8G'), 'Debe incluir -Xmx8G');
  console.log('  ✔ JVMOptimizer flags de Java 21 validadas.\n');

  // Cleanup
  fs.rmSync(testRoot, { recursive: true, force: true });
  console.log('====================================================');
  console.log('✅ TODAS LAS PRUEBAS DE PERFILES Y SANEAMIENTO PASARON CON ÉXITO');
  console.log('====================================================');
}

runProfileTests().catch((err) => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
