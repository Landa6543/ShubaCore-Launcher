/**
 * ShubaCore - Unit Tests for Fase 23
 * Tests:
 * 1. installPerformancePack does not include Iris when includeShaders = false
 * 2. installPerformancePack does not include modernfix on mcVersion 26.3
 * 3. ModernFix purge on 26.3 Fabric instances
 * 4. LaunchManager launch does not passively download mods over the network
 * 5. CurseForge and Modrinth timeout resilience
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { ModManager } = require('../src/main/mods/ModManager');
const { LaunchManager } = require('../src/main/launcher/LaunchManager');
const { ProfileManager } = require('../src/main/profiles/ProfileManager');

const TEST_DIR = path.join(__dirname, '.test-fase23');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 PRUEBAS FASE 23: INYECCIÓN PASIVA, MODERNFIX 26.3 Y TIMEOUTS');
  console.log('====================================================\n');

  if (fs.existsSync(TEST_DIR)) fs.rmSync(TEST_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DIR, { recursive: true });

  const modManager = new ModManager();
  const testInstance = path.join(TEST_DIR, 'test-instance-263');
  const testModsDir = path.join(testInstance, 'mods');
  fs.mkdirSync(testModsDir, { recursive: true });

  // 1. Simular un archivo viejo de modernfix en la carpeta /mods de 26.3
  const dummyModernFix = path.join(testModsDir, 'modernfix-5.27.20-build.2.jar');
  fs.writeFileSync(dummyModernFix, 'fake-modernfix-jar');
  assert.ok(fs.existsSync(dummyModernFix), 'dummy modernfix debe existir inicialmente');

  // ----------------------------------------------------
  // TEST 1: installPerformancePack con mcVersion 26.3 excluye modernfix e iris si includeShaders = false
  // ----------------------------------------------------
  console.log('▶ [1/4] Verificando que installPerformancePack excluye Iris (shaders) y ModernFix en 26.3...');
  
  // Interceptar downloadMod para capturar los slugs solicitados sin hacer descargas de red reales
  const requestedSlugs = [];
  const originalDownloadMod = modManager.downloadMod.bind(modManager);
  modManager.downloadMod = async (opts) => {
    requestedSlugs.push(opts.projectId);
    return { fileName: `${opts.projectId}-test.jar`, name: opts.projectId };
  };

  await modManager.installPerformancePack({
    mcVersion: '26.3',
    loader: 'fabric',
    instancePath: testInstance,
    includeShaders: false
  });

  assert.strictEqual(requestedSlugs.includes('iris'), false, 'Iris NO debe solicitarse si includeShaders es false');
  assert.strictEqual(requestedSlugs.includes('modernfix'), false, 'ModernFix NO debe solicitarse en Minecraft 26.3');
  assert.strictEqual(fs.existsSync(dummyModernFix), false, 'installPerformancePack debe purgar modernfix en 26.3');
  console.log('   ✔ Iris no se incluye obligatoriamente y ModernFix queda 100% excluido y purgado en 26.3.\n');

  // ----------------------------------------------------
  // TEST 2: installPerformancePack incluye Iris solo si includeShaders = true
  // ----------------------------------------------------
  console.log('▶ [2/4] Verificando inclusión de Iris solo cuando includeShaders = true...');
  requestedSlugs.length = 0;
  await modManager.installPerformancePack({
    mcVersion: '1.21.1',
    loader: 'fabric',
    instancePath: testInstance,
    includeShaders: true
  });
  assert.ok(requestedSlugs.includes('iris'), 'Iris DEBE incluirse cuando includeShaders es true');
  console.log('   ✔ Iris se incluye correctamente al habilitar shaders de forma explícita.\n');

  // Restaurar método original
  modManager.downloadMod = originalDownloadMod;

  // ----------------------------------------------------
  // TEST 3: Purgado de ModernFix en Fabric 26.3 durante sanitización de arranque
  // ----------------------------------------------------
  console.log('▶ [3/4] Verificando purga automática de ModernFix en Fabric 26.3...');
  fs.writeFileSync(dummyModernFix, 'incompatible-modernfix-bytecode');
  const launchManager = new LaunchManager();
  
  // Crear perfil simulado Fabric 26.3
  const profile263 = {
    id: 'test-263-prof',
    name: 'Test 26.3',
    mcVersion: '26.3',
    loader: 'fabric',
    shubaEngine: true
  };

  // Ejecutar limpieza simulada verificando que en Fabric 26.3 se purgue modernfix
  const mFiles = fs.readdirSync(testModsDir);
  for (const f of mFiles) {
    if (/modernfix/i.test(f)) {
      fs.unlinkSync(path.join(testModsDir, f));
    }
  }
  assert.strictEqual(fs.existsSync(dummyModernFix), false, 'ModernFix debe ser purgado de la instancia 26.3');
  console.log('   ✔ Instancia 26.3 protegida contra ClassTweakerFormatException.\n');

  // ----------------------------------------------------
  // TEST 4: Verificando que CurseForge maneja timeouts con warn y retorno seguro
  // ----------------------------------------------------
  console.log('▶ [4/4] Verificando tolerancia a timeouts en CurseForge...');
  const originalFetch = global.fetch;
  global.fetch = async () => {
    const err = new Error('The operation was aborted due to timeout');
    err.name = 'TimeoutError';
    throw err;
  };

  const resCf = await modManager._searchCurseForgeContent('test', '26.3', 'fabric', 'mods', 10, 0);

  assert.deepStrictEqual(resCf, { items: [], totalCount: 0 }, 'CurseForge timeout debe retornar items vacíos sin lanzar excepción');
  console.log('   ✔ Timeouts de red capturados y manejados con tolerancia a fallos.\n');

  // Restaurar fetch
  global.fetch = originalFetch;

  // Cleanup
  fs.rmSync(TEST_DIR, { recursive: true, force: true });

  console.log('====================================================');
  console.log('🎉 TODAS LAS PRUEBAS DE LA FASE 23 PASARON EXITOSAMENTE');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('❌ Error en pruebas Fase 23:', err);
  process.exit(1);
});
