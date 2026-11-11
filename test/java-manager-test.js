/**
 * ShubaCore - Unit Tests for JavaManager, JVM Optimizer & Profile Editing
 * Developed by SHUBATECH
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { JavaManager } = require('../src/main/jvm/JavaManager');
const { JVMOptimizer } = require('../src/main/jvm/JVMOptimizer');
const { ProfileManager } = require('../src/main/profiles/ProfileManager');

async function runTests() {
  console.log('--- TEST 1: Detección de Java requerido por versión de Minecraft ---');
  const sharedRoot = path.join(process.env.APPDATA || '', '.shubacore');

  // Versión 26.3 (última snapshot / clase 69.0)
  const req26_3 = JavaManager.getRequiredJavaForMinecraft('26.3', sharedRoot);
  console.log(`Requisito para MC 26.3: Java ${req26_3}`);
  assert.strictEqual(req26_3, 25, 'MC 26.3 debe requerir Java 25 (class file version 69.0)');

  // Versión 1.21.1
  const req1211 = JavaManager.getRequiredJavaForMinecraft('1.21.1', sharedRoot);
  console.log(`Requisito para MC 1.21.1: Java ${req1211}`);
  assert.strictEqual(req1211, 21, 'MC 1.21.1 debe requerir Java 21');

  // Versión 1.20.1
  const req1201 = JavaManager.getRequiredJavaForMinecraft('1.20.1', sharedRoot);
  console.log(`Requisito para MC 1.20.1: Java ${req1201}`);
  assert.strictEqual(req1201, 17, 'MC 1.20.1 debe requerir Java 17');

  // Versión 1.16.5
  const req1165 = JavaManager.getRequiredJavaForMinecraft('1.16.5', sharedRoot);
  console.log(`Requisito para MC 1.16.5: Java ${req1165}`);
  assert.strictEqual(req1165, 8, 'MC 1.16.5 debe requerir Java 8');

  console.log('✅ TEST 1 PASADO');

  console.log('\n--- TEST 2: Escaneo de versiones de Java instaladas ---');
  const installed = await JavaManager.scanInstalledJavas(sharedRoot);
  console.log(`Versiones encontradas en el sistema / ShubaCore: ${installed.length}`);
  installed.forEach((j) => {
    console.log(` - Java ${j.majorVersion} (${j.vendor}, 64-Bit: ${j.is64Bit}, Portable: ${j.isPortable}) -> ${j.path}`);
  });
  assert(installed.length > 0, 'Debe encontrar al menos una versión de Java instalada');
  console.log('✅ TEST 2 PASADO');

  console.log('\n--- TEST 3: JVM Flags Oficiales CurseForge/Mojang G1GC ---');
  // Java 25 flags
  const argsJava25 = JVMOptimizer.buildJvmArguments({
    majorVersion: 25,
    memoryMin: '2G',
    memoryMax: '8G'
  });
  const strJava25 = argsJava25.join(' ');
  console.log('Flags Java 25:', strJava25);
  assert(strJava25.includes('-XX:+UseG1GC'), 'Java 25 debe usar G1GC');
  assert(!strJava25.includes('-XX:+UseZGC'), 'Java 25 NO debe incluir ZGC');

  // Java 21 flags
  const argsJava21 = JVMOptimizer.buildJvmArguments({
    majorVersion: 21,
    memoryMin: '2G',
    memoryMax: '8G'
  });
  const strJava21 = argsJava21.join(' ');
  console.log('Flags Java 21:', strJava21);
  assert(strJava21.includes('-XX:+UseG1GC'), 'Java 21 debe usar G1GC oficial');
  assert(strJava21.includes('-XX:MaxGCPauseMillis=50'), 'Java 21 debe incluir MaxGCPauseMillis=50');
  assert(!strJava21.includes('-XX:+UseZGC'), 'Java 21 NO debe incluir ZGC');

  console.log('✅ TEST 3 PASADO');

  console.log('\n--- TEST 4: Edición 100% libre de perfiles sin borrar archivos de instancia ---');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shubacore-profile-test-'));
  const pm = new ProfileManager(tempDir);

  const initialProfile = pm.createProfile({
    name: 'Perfil Original',
    mcVersion: '1.21.1',
    loader: 'NeoForge',
    loaderVersion: '21.1.265'
  });

  const instanceDir = pm.getInstancePath(initialProfile.id);
  const dummyModFile = path.join(instanceDir, 'mods', 'test-mod.jar');
  fs.writeFileSync(dummyModFile, 'DUMMY MOD DATA', 'utf8');
  assert(fs.existsSync(dummyModFile), 'El mod de prueba debe existir');

  // Actualizar perfil libremente
  const updated = pm.updateProfile(initialProfile.id, {
    name: 'Perfil Modificado',
    mcVersion: '1.20.1',
    loader: 'Fabric',
    loaderVersion: '0.15.11',
    javaSelection: 'force-17',
    ramMin: '4G',
    ramMax: '12G'
  });

  assert.strictEqual(updated.name, 'Perfil Modificado');
  assert.strictEqual(updated.mcVersion, '1.20.1');
  assert.strictEqual(updated.loader, 'Fabric');
  assert.strictEqual(updated.loaderVersion, '0.15.11');
  assert.strictEqual(updated.javaSelection, 'force-17');
  assert.strictEqual(updated.ramMin, '4G');
  assert.strictEqual(updated.ramMax, '12G');

  // Verificar que el mod sigue intacto en disco
  assert(fs.existsSync(dummyModFile), 'Los archivos dentro de la instancia (/mods) NO deben borrarse al editar');
  const modContent = fs.readFileSync(dummyModFile, 'utf8');
  assert.strictEqual(modContent, 'DUMMY MOD DATA');

  // Limpiar carpeta temporal
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('✅ TEST 4 PASADO');

  console.log('\n🎉 ¡TODOS LOS TESTS DE JAVA MANAGER Y EDICIÓN DE PERFILES PASARON CON ÉXITO!');
}

runTests().catch((err) => {
  console.error('❌ Error en tests:', err);
  process.exit(1);
});
