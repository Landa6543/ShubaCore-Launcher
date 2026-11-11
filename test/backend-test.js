/**
 * ShubaCore - Backend Verification & Unit Tests
 * Developed by SHUBATECH
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Configuración temporal para pruebas
const testDataDir = path.join(__dirname, '.test-data');
if (fs.existsSync(testDataDir)) {
  fs.rmSync(testDataDir, { recursive: true, force: true });
}
fs.mkdirSync(testDataDir, { recursive: true });

console.log('====================================================');
console.log('🧪 INICIANDO PRUEBAS DEL BACKEND DE SHUBACORE (SHUBATECH)');
console.log('====================================================\n');

// 1. Test ConfigManager
console.log('▶ [1/5] Verificando ConfigManager y persistencia...');
const { ConfigManager } = require('../src/main/config/ConfigManager');
const config = new ConfigManager(testDataDir);

assert.strictEqual(config.get('app.brand'), 'SHUBATECH', 'Marca debe ser SHUBATECH');
assert.strictEqual(config.get('performance.launchBehavior'), 'hide', 'launchBehavior debe ser "hide" por defecto');

config.set('memory.max', '8G');
assert.strictEqual(config.get('memory.max'), '8G', 'Modificación de RAM fallida');

const savedFile = path.join(testDataDir, 'config.json');
assert.ok(fs.existsSync(savedFile), 'El archivo config.json debe existir en disco');
const fileContents = JSON.parse(fs.readFileSync(savedFile, 'utf8'));
assert.strictEqual(fileContents.memory.max, '8G', 'Persistencia en config.json fallida');
console.log('  ✔ ConfigManager verificado exitosamente.\n');

// 2. Test OfflineAuth (Algoritmo MD5 oficial de Minecraft)
console.log('▶ [2/5] Verificando OfflineAuth (Hash MD5 & UUID v3)...');
const { generateOfflineUUID, createOfflineProfile } = require('../src/main/auth/OfflineAuth');

const steveUUID = generateOfflineUUID('Steve');
const alexUUID = generateOfflineUUID('Alex');

console.log(`  UUID generado para "Steve": ${steveUUID}`);
console.log(`  UUID generado para "Alex":  ${alexUUID}`);

// Valores oficiales canónicos de Minecraft Java para Steve y Alex offline:
assert.strictEqual(steveUUID, '5627dd98-e6be-3c21-b8a8-e92344183641', 'El UUID de Steve no coincide con el estándar de Minecraft');
assert.strictEqual(alexUUID, '36532b5e-c442-3dbb-a24c-c7e55d0f979a', 'El UUID de Alex no coincide con el estándar de Minecraft');

const profile = createOfflineProfile('ShubaPlayer');
assert.strictEqual(profile.name, 'ShubaPlayer');
assert.strictEqual(profile.type, 'offline');
assert.ok(profile.mclcAuth, 'Debe incluir objeto de autorización para MCLC');
assert.strictEqual(profile.mclcAuth.name, 'ShubaPlayer');
assert.ok(profile.mclcAuth.access_token.startsWith('offline_token_'), 'Token MCLC debe tener prefijo');
console.log('  ✔ Generación de cuentas offline verificada con precisión del 100%.\n');

// 3. Test JVMOptimizer
console.log('▶ [3/5] Verificando JVMOptimizer (Detección y Banderas ZGC/G1GC)...');
const { JVMOptimizer } = require('../src/main/jvm/JVMOptimizer');

// Test Flags para Java 21 (Generational ZGC)
const jvm21Flags = JVMOptimizer.buildJvmArguments({
  majorVersion: 21,
  memoryMin: '2G',
  memoryMax: '6G'
});
console.log('  Flags generadas para Java 21:', jvm21Flags.join(' '));
assert.ok(jvm21Flags.includes('-XX:+UseZGC'), 'Java 21 debe incluir -XX:+UseZGC');
assert.ok(jvm21Flags.includes('-XX:+ZGenerational'), 'Java 21 debe incluir -XX:+ZGenerational');
assert.ok(jvm21Flags.includes('-Xms2G'), 'Debe incluir memoria mínima');
assert.ok(jvm21Flags.includes('-Xmx6G'), 'Debe incluir memoria máxima');

// Test Flags para Java 17 (G1GC Optimizado Aikar)
const jvm17Flags = JVMOptimizer.buildJvmArguments({
  majorVersion: 17,
  memoryMin: '4G',
  memoryMax: '8G'
});
console.log('  Flags generadas para Java 17:', jvm17Flags.join(' '));
assert.ok(jvm17Flags.includes('-XX:+UseG1GC'), 'Java 17 debe incluir -XX:+UseG1GC');
assert.ok(jvm17Flags.includes('-XX:+ParallelRefProcEnabled'), 'Java 17 debe incluir Aikar flags');
assert.ok(!jvm17Flags.includes('-XX:+ZGenerational'), 'Java 17 no debe incluir ZGenerational');

// Detección real del sistema
const detectedJava = JVMOptimizer.detectJavaSync();
console.log(`  Java detectado en el host: Versión ${detectedJava.majorVersion} (${detectedJava.vendor}, ${detectedJava.arch})`);
assert.ok(detectedJava.majorVersion > 0, 'Debe detectar versión mayor');

// Detección garantizada de Java 21
const java21Found = JVMOptimizer.findJava21();
console.log(`  Java 21 localizado: ${java21Found}`);
assert.ok(java21Found, 'Debe localizar Java 21 en el host');
const j21Info = JVMOptimizer.detectJavaSync(java21Found);
assert.strictEqual(j21Info.majorVersion, 21, 'Debe ser Java 21');
console.log('  ✔ Detección inteligente de Java 21 validada.');
console.log('  ✔ Optimización JVM validada correctamente.\n');

// 4. Test ModloaderResolver
console.log('▶ [4/5] Verificando ModloaderResolver (Forge & NeoForge)...');
const { ModloaderResolver } = require('../src/main/launcher/ModloaderResolver');

const forge1201 = ModloaderResolver.getRecommendedLoaderVersion('1.20.1', 'forge');
const neoforge1211 = ModloaderResolver.getRecommendedLoaderVersion('1.21.1', 'neoforge');

console.log(`  Versión recomendada Forge 1.20.1:    ${forge1201}`);
console.log(`  Versión recomendada NeoForge 1.21.1: ${neoforge1211}`);

assert.strictEqual(forge1201, '47.3.0', 'Forge 1.20.1 debe ser 47.3.0');
assert.strictEqual(neoforge1211, '21.1.65', 'NeoForge 1.21.1 debe ser 21.1.65');

// Verificar creación de launcher_profiles.json dummy obligatorio
const tempMcRoot = path.join(__dirname, '.test-data', 'mc-dummy-root');
ModloaderResolver.ensureLauncherProfilesJson(tempMcRoot);
const lpPath = path.join(tempMcRoot, 'launcher_profiles.json');
assert.ok(fs.existsSync(lpPath), 'launcher_profiles.json debe crearse automáticamente');
const lpContent = JSON.parse(fs.readFileSync(lpPath, 'utf8'));
assert.strictEqual(lpContent.version, 3);
console.log('  ✔ launcher_profiles.json dummy obligatorio validado.');

// Verificar unificación y saneamiento de argumentos JVM de NeoForge
const testNeoVersion = 'neoforge-21.1.265';
const testVersionDir = path.join(tempMcRoot, 'versions', testNeoVersion);
fs.mkdirSync(testVersionDir, { recursive: true });
const testJsonPath = path.join(testVersionDir, `${testNeoVersion}.json`);
fs.writeFileSync(
  testJsonPath,
  JSON.stringify({
    id: testNeoVersion,
    mainClass: 'cpw.mods.bootstraplauncher.BootstrapLauncher',
    arguments: {
      jvm: [
        '-DlibraryDirectory=${library_directory}',
        '-p',
        '${library_directory}/libA.jar${classpath_separator}${library_directory}/libB.jar',
        '--add-modules',
        'ALL-MODULE-PATH',
        '--add-opens',
        'java.base/java.util.jar=cpw.mods.securejarhandler',
        '--add-opens',
        'java.base/java.lang.invoke=cpw.mods.securejarhandler',
        '--add-exports',
        'java.base/sun.security.util=cpw.mods.securejarhandler'
      ]
    }
  }, null, 2),
  'utf8'
);

const unifiedResult = ModloaderResolver.sanitizeAndUnifyJvmArgs({
  mcRoot: tempMcRoot,
  customVersionName: testNeoVersion
});

assert.strictEqual(unifiedResult.length, 6, 'Debe haber exactamente 6 argumentos unificados');
assert.ok(unifiedResult.every(arg => arg.startsWith('-')), 'Todos los argumentos deben comenzar con -');
assert.ok(unifiedResult.includes('--add-modules=ALL-MODULE-PATH'), 'Debe contener --add-modules=ALL-MODULE-PATH');
assert.ok(unifiedResult.includes('--add-opens=java.base/java.util.jar=cpw.mods.securejarhandler'), 'Debe contener primer --add-opens unificado');
assert.ok(unifiedResult.includes('--add-opens=java.base/java.lang.invoke=cpw.mods.securejarhandler'), 'Debe contener segundo --add-opens unificado');

// Verificar que el JSON en disco fue saneado (arguments.jvm vacío para MCLC)
const diskJson = JSON.parse(fs.readFileSync(testJsonPath, 'utf8'));
assert.strictEqual(diskJson.arguments.jvm.length, 0, 'arguments.jvm en disco debe quedar vacío para MCLC');
assert.strictEqual(diskJson._shubaRawJvm.length, 11, '_shubaRawJvm debe contener el array original');

// Verificar re-ejecución idempotente
const secondRunResult = ModloaderResolver.sanitizeAndUnifyJvmArgs({
  mcRoot: tempMcRoot,
  customVersionName: testNeoVersion
});
assert.strictEqual(secondRunResult.length, 6, 'Re-ejecución idempotente debe devolver los mismos 6 argumentos');

console.log('  ✔ Unificación de flags JVM y saneamiento de JSON en disco validado al 100%.');
console.log('  ✔ Resolutor de versiones de Modloaders validado.\n');

// 5. Test AuthManager & MCLC Integration Interface
console.log('▶ [5/5] Verificando AuthManager híbrido y preparación de Client MCLC...');
const { AuthManager } = require('../src/main/auth/AuthManager');
const authMgr = new AuthManager();

const offlineRes = authMgr.loginOffline('ShubaTester');
assert.ok(offlineRes.success, 'Login offline debe ser exitoso');
assert.strictEqual(authMgr.getAuthMode(), 'offline', 'Modo debe ser offline');
const mclcAuth = authMgr.getMCLCAuth();
assert.strictEqual(mclcAuth.name, 'ShubaTester', 'MCLC Auth name correcto');

const { Client } = require('minecraft-launcher-core');
const clientInstance = new Client();
assert.ok(typeof clientInstance.launch === 'function', 'MCLC Client debe tener método launch');
console.log('  ✔ Interfaz MCLC y AuthManager verificados.\n');

// Limpieza de datos temporales de prueba
fs.rmSync(testDataDir, { recursive: true, force: true });

console.log('====================================================');
console.log('✅ TODAS LAS PRUEBAS DEL BACKEND PASARON EXITOSAMENTE');
console.log('====================================================');
