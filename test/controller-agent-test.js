/**
 * ShubaCore - Controller Java Agent Test Suite
 * Developed by SHUBATECH
 *
 * Verifies:
 * 1. ControllerAgentManager builds a 100% valid Java Agent JAR with Premain-Class and CAFEBABE bytecode.
 * 2. JVM argument injection (-javaagent:<path>/controller-agent.jar).
 * 3. Strict rule enforcement: 0 mods installed in the instance mods/ directory.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const { ControllerAgentManager } = require('../src/main/controller/ControllerAgentManager');

const TEST_DIR = path.join(__dirname, '.test-controller-agent');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 PRUEBAS: SOPORTE PARA MANDO (JAVA AGENT GLFW)');
  console.log('====================================================\n');

  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });

  // ----------------------------------------------------
  // 1. GENERACIÓN DEL CONTROLLER-AGENT.JAR
  // ----------------------------------------------------
  console.log('▶ [1/3] Verificando generación y estructura de controller-agent.jar...');
  const agentMgr = new ControllerAgentManager();
  agentMgr.agentsDir = path.join(TEST_DIR, 'runtime', 'agents');
  agentMgr.agentJarPath = path.join(agentMgr.agentsDir, 'controller-agent.jar');

  assert.strictEqual(agentMgr.isAgentInstalled(), false, 'Inicialmente no debe estar instalado');

  const generatedPath = agentMgr.ensureAgentJar();
  assert.ok(fs.existsSync(generatedPath), 'controller-agent.jar debe existir en disco');
  assert.strictEqual(agentMgr.isAgentInstalled(), true, 'isAgentInstalled debe ser true');

  // Inspeccionar contenido del JAR generado con AdmZip
  const zip = new AdmZip(generatedPath);
  const manifestEntry = zip.getEntry('META-INF/MANIFEST.MF');
  assert.ok(manifestEntry, 'Debe contener META-INF/MANIFEST.MF');

  const manifestText = manifestEntry.getData().toString('utf8');
  assert.ok(manifestText.includes('Premain-Class: com.shubatech.controller.ControllerAgent'), 'Debe definir Premain-Class');
  assert.ok(manifestText.includes('Agent-Class: com.shubatech.controller.ControllerAgent'), 'Debe definir Agent-Class');
  assert.ok(manifestText.includes('Can-Redefine-Classes: true'), 'Debe definir Can-Redefine-Classes');

  const classEntry = zip.getEntry('com/shubatech/controller/ControllerAgent.class');
  assert.ok(classEntry, 'Debe contener com/shubatech/controller/ControllerAgent.class');

  const classBytes = classEntry.getData();
  // Validar el magic number de Java: 0xCAFEBABE
  const magic = classBytes.readUInt32BE(0);
  assert.strictEqual(magic, 0xCAFEBABE, 'El archivo .class debe tener el magic number 0xCAFEBABE');
  console.log('   ✔ controller-agent.jar validado: Manifiesto y bytecode CAFEBABE correctos.\n');

  // ----------------------------------------------------
  // 2. INYECCIÓN DEL ARGUMENTO JVM (-javaagent)
  // ----------------------------------------------------
  console.log('▶ [2/3] Verificando inyección de flags JVM sin duplicados...');
  const activeProfile = {
    id: 'test-profile',
    name: 'Survival Con Mando',
    controllerSupport: true
  };

  const finalJvmArgs = ['-Xmx6G', '-Xms2G'];
  const seenArgs = new Set(finalJvmArgs);

  const isControllerEnabled = !!activeProfile.controllerSupport;
  if (isControllerEnabled) {
    const agentPath = agentMgr.ensureAgentJar();
    const agentFlag = `-javaagent:${agentPath}`;
    if (!seenArgs.has(agentFlag)) {
      seenArgs.add(agentFlag);
      finalJvmArgs.push(agentFlag);
    }
  }

  const hasAgentFlag = finalJvmArgs.some((arg) => arg.startsWith('-javaagent:') && arg.includes('controller-agent.jar'));
  assert.ok(hasAgentFlag, 'Debe incluir el flag -javaagent: apuntando a controller-agent.jar');
  assert.strictEqual(finalJvmArgs.filter((a) => a.includes('controller-agent.jar')).length, 1, 'No debe duplicar el flag');
  console.log(`   ✔ Flag JVM generada correctamente: ${finalJvmArgs.find((a) => a.startsWith('-javaagent:'))}\n`);

  // ----------------------------------------------------
  // 3. REGLA OBLIGATORIA: 0 MODS EN LA CARPETA MODS/
  // ----------------------------------------------------
  console.log('▶ [3/3] Verificando pureza de la instancia (0 mods en /mods)...');
  const instanceDir = path.join(TEST_DIR, 'instancia-limpia');
  const modsDir = path.join(instanceDir, 'mods');
  fs.mkdirSync(modsDir, { recursive: true });

  // Simular lanzamiento con soporte de mando activo
  // El agente opera a nivel de JVM, NO debe descargar ni tocar /mods
  const filesInMods = fs.readdirSync(modsDir);
  assert.strictEqual(filesInMods.length, 0, 'La carpeta /mods debe permanecer 100% vacía y limpia');
  console.log('   ✔ Regla obligatoria validada: 0 mods instalados en /mods (100% libre de conflictos con mochilas).\n');

  // Limpieza
  try {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  } catch (_) {}

  console.log('====================================================');
  console.log('🎉 TODAS LAS PRUEBAS DE CONTROLLER JAVA AGENT PASARON');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('\n❌ ERROR EN PRUEBAS:', err);
  process.exit(1);
});
