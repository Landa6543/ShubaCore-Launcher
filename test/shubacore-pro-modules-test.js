/**
 * ShubaCore - ShubaCore Pro 7 Modules Test Suite
 * Developed by SHUBATECH
 *
 * Tests the 7 Pro expansion modules:
 * 1. CustomModIconExtractor (.jar icon extraction, caching, and data URLs)
 * 2. ProfileCodeSharer (short code generation, manifest export & import)
 * 3. DiscordPresence (party join & ask-to-join RPC payload)
 * 4. SmartJVM (runtime version resolution & G1GC auto-tuning flags)
 * 5. NewsManager (live announcement feed & disk caching)
 * 6. HardwareOptimizer (hardware spec detection & native options.txt tuning)
 * 7. MemoryCleaner (safe Standby memory & working set trimming)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');

const { CustomModIconExtractor } = require('../src/main/github/CustomModIconExtractor');
const { ProfileCodeSharer } = require('../src/main/sync/ProfileCodeSharer');
const { DiscordPresence } = require('../src/main/discord/DiscordPresence');
const { SmartJVM } = require('../src/main/jvm/SmartJVM');
const { NewsManager, DEFAULT_ANNOUNCEMENTS } = require('../src/main/news/NewsManager');
const { HardwareOptimizer } = require('../src/main/hardware/HardwareOptimizer');
const { MemoryCleaner } = require('../src/main/system/MemoryCleaner');

const TEST_DIR = path.join(__dirname, '.test-shubacore-pro');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 PRUEBAS SHUBACORE PRO: 7 MÓDULOS AVANZADOS');
  console.log('====================================================\n');

  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });

  // ----------------------------------------------------
  // 1. EXTRACTOR DE ÍCONOS DE MODS CUSTOM
  // ----------------------------------------------------
  console.log('▶ [1/7] Probando CustomModIconExtractor (.jar in-memory / disk)...');
  const iconExtractor = new CustomModIconExtractor();
  iconExtractor.iconsCacheDir = path.join(TEST_DIR, 'cache', 'mod-icons');
  iconExtractor._ensureDir(iconExtractor.iconsCacheDir);

  // Crear un dummy NeoForge jar con logoFile
  const dummyNeoZip = new AdmZip();
  const dummyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  dummyNeoZip.addFile('logo.png', dummyPng);
  dummyNeoZip.addFile('META-INF/neoforge.mods.toml', Buffer.from('[[mods]]\nmodId="shubamod"\nversion="1.0.0"\nlogoFile="logo.png"\n', 'utf8'));
  const dummyNeoJarPath = path.join(TEST_DIR, 'shubamod-1.0.0.jar');
  dummyNeoZip.writeZip(dummyNeoJarPath);

  const neoIconResult = iconExtractor.extractIcon(dummyNeoJarPath, 'shubamod-1.0.0.jar');
  assert.ok(neoIconResult, 'Debe devolver resultado de extracción');
  assert.strictEqual(neoIconResult.modId, 'shubamod', 'modId debe ser shubamod');
  assert.ok(neoIconResult.iconBase64 && neoIconResult.iconBase64.startsWith('data:image/png;base64,'), 'Debe devolver Base64 Data URL');
  assert.ok(fs.existsSync(neoIconResult.iconPath), 'El archivo de icono debe guardarse en caché');

  // Crear un dummy Fabric jar con icon en fabric.mod.json
  const dummyFabZip = new AdmZip();
  dummyFabZip.addFile('assets/fabmod/icon.png', dummyPng);
  dummyFabZip.addFile('fabric.mod.json', Buffer.from(JSON.stringify({ id: 'fabmod', version: '2.0.0', icon: 'assets/fabmod/icon.png' }), 'utf8'));
  const dummyFabJarPath = path.join(TEST_DIR, 'fabmod-2.0.0.jar');
  dummyFabZip.writeZip(dummyFabJarPath);

  const fabIconResult = iconExtractor.extractIcon(dummyFabJarPath, 'fabmod-2.0.0.jar');
  assert.ok(fabIconResult, 'Debe extraer icono de Fabric');
  assert.strictEqual(fabIconResult.modId, 'fabmod');
  assert.ok(fabIconResult.iconBase64, 'Debe tener Base64');
  console.log('   ✔ CustomModIconExtractor validado para NeoForge y Fabric.\n');

  // ----------------------------------------------------
  // 2. COMPARTIR E IMPORTAR POR CÓDIGO CORTO
  // ----------------------------------------------------
  console.log('▶ [2/7] Probando ProfileCodeSharer (códigos SHUBA-XXXX y manifiestos)...');
  const codeSharer = new ProfileCodeSharer();
  codeSharer.sharedProfilesDir = path.join(TEST_DIR, 'shared-profiles');
  fs.mkdirSync(codeSharer.sharedProfilesDir, { recursive: true });

  const code1 = codeSharer.generateShortCode('testSeed');
  assert.match(code1, /^SHUBA-[A-F0-9]{4}$/, 'El código debe tener el formato SHUBA-XXXX');
  const normalized = codeSharer.normalizeCode('9f2a');
  assert.strictEqual(normalized, 'SHUBA-9F2A', 'Debe normalizar códigos en minúsculas y sin prefijo');

  // Guardar un manifiesto simulado local para verificar lectura y parsing
  const mockManifest = {
    code: 'SHUBA-TEST',
    name: 'Supervivencia Shuba',
    mcVersion: '1.21.1',
    loader: 'neoforge',
    loaderVersion: '21.1.65',
    modsCount: 1,
    mods: [
      {
        fileName: 'shubamod-1.0.0.jar',
        name: 'Shuba Mod',
        source: 'curseforge',
        projectId: '123456',
        fileId: '789101'
      }
    ]
  };
  fs.writeFileSync(path.join(codeSharer.sharedProfilesDir, 'SHUBA-TEST.json'), JSON.stringify(mockManifest), 'utf8');
  const loadedManifest = await codeSharer.fetchManifestByCode('SHUBA-TEST');
  assert.strictEqual(loadedManifest.name, 'Supervivencia Shuba');
  assert.strictEqual(loadedManifest.mcVersion, '1.21.1');
  console.log(`   ✔ ProfileCodeSharer validado: Generación "${code1}" y lectura de manifiesto "${loadedManifest.code}".\n`);

  // ----------------------------------------------------
  // 3. DISCORD PRESENCE AVANZADO (JOIN & PARTY)
  // ----------------------------------------------------
  console.log('▶ [3/7] Probando DiscordPresence (Party Payload, Secret & Join Events)...');
  const discordPres = new DiscordPresence();

  // Test setPartyActivity cuando RPC está desconectado (debe ser seguro y no lanzar excepción)
  const failSafeRes = await discordPres.setPartyActivity({
    serverName: 'ShubaWorld SMP',
    serverIp: 'play.shubacore.com',
    serverPort: 25565,
    currentPlayers: 4,
    maxPlayers: 20
  });
  assert.ok(typeof failSafeRes === 'object', 'Debe retornar un objeto sin lanzar excepción');

  // Simular cliente conectado para verificar payload de Rich Presence
  let capturedActivity = null;
  discordPres.discordManager.client = {
    user: {
      setActivity: async (act) => {
        capturedActivity = act;
        return act;
      }
    }
  };
  discordPres.discordManager.isEnabled = () => true;
  discordPres.discordManager.isConnected = true;

  const partyRes = await discordPres.setPartyActivity({
    serverName: 'ShubaWorld SMP',
    serverIp: 'play.shubacore.com',
    serverPort: 25565,
    currentPlayers: 5,
    maxPlayers: 50,
    profileId: 'instance_survival_123'
  });

  assert.ok(partyRes.success, 'setPartyActivity debe reportar éxito');
  assert.ok(capturedActivity, 'La actividad debe ser enviada al cliente de Discord');
  assert.strictEqual(capturedActivity.party.size[0], 5, 'Jugadores actuales deben ser 5');
  assert.strictEqual(capturedActivity.party.size[1], 50, 'Máximo de jugadores debe ser 50');
  assert.ok(capturedActivity.secrets && capturedActivity.secrets.join, 'Debe incluir joinSecret para botón Unirse');

  const decodedSecret = JSON.parse(Buffer.from(capturedActivity.secrets.join, 'base64').toString('utf8'));
  assert.strictEqual(decodedSecret.ip, 'play.shubacore.com');
  assert.strictEqual(decodedSecret.port, 25565);
  console.log('   ✔ DiscordPresence validado con partyId, joinSecret y soporte para botón "Unirse".\n');

  // ----------------------------------------------------
  // 4. SMART JVM (RESOLUTOR Y AUTO-TUNING)
  // ----------------------------------------------------
  console.log('▶ [4/7] Probando SmartJVM (Heurística semver y Auto-Tuning G1GC)...');
  const smartJvm = new SmartJVM();
  assert.strictEqual(smartJvm.resolveRequiredJavaVersion('1.21.4'), 21, 'MC 1.21.4 debe requerir Java 21');
  assert.strictEqual(smartJvm.resolveRequiredJavaVersion('1.20.6'), 21, 'MC 1.20.6 debe requerir Java 21');
  assert.strictEqual(smartJvm.resolveRequiredJavaVersion('1.20.1'), 17, 'MC 1.20.1 debe requerir Java 17');
  assert.strictEqual(smartJvm.resolveRequiredJavaVersion('1.16.5'), 8, 'MC 1.16.5 debe requerir Java 8');

  const tunedFlags = smartJvm.getAutoTunedJVMFlags({ javaMajor: 21, ramMb: 8192 });
  assert.ok(tunedFlags.success, 'Auto-tuning debe ser exitoso');
  assert.strictEqual(tunedFlags.maxRam, '8G');
  assert.ok(tunedFlags.flags.includes('-XX:+UseG1GC'), 'Debe usar G1GC');
  assert.ok(tunedFlags.flags.includes('--enable-native-access=ALL-UNNAMED'), 'Java 21 debe incluir native access');
  console.log(`   ✔ SmartJVM validado: Banderas calculadas: ${tunedFlags.flagsString}\n`);

  // ----------------------------------------------------
  // 5. TABLÓN DE ANUNCIOS Y CHANGELOGS EN VIVO
  // ----------------------------------------------------
  console.log('▶ [5/7] Probando NewsManager (Noticias, Anuncios y Caché)...');
  const newsMgr = new NewsManager();
  newsMgr.cacheDir = path.join(TEST_DIR, 'cache');
  newsMgr.cacheFile = path.join(newsMgr.cacheDir, 'news-feed.json');

  const newsItems = await newsMgr.fetchNews();
  assert.ok(Array.isArray(newsItems) && newsItems.length > 0, 'Debe devolver lista de anuncios');
  assert.ok(newsItems[0].title, 'El anuncio debe tener título');
  assert.ok(newsItems[0].tag, 'El anuncio debe tener tag');
  console.log(`   ✔ NewsManager validado: ${newsItems.length} anuncios cargados (Primer anuncio: "${newsItems[0].title}").\n`);

  // ----------------------------------------------------
  // 6. AUTO-OPTIMIZADOR DE HARDWARE
  // ----------------------------------------------------
  console.log('▶ [6/7] Probando HardwareOptimizer (Detección de specs y options.txt)...');
  const hwOpt = new HardwareOptimizer();
  const specs = hwOpt.getSpecs();
  assert.ok(specs.totalRamGb > 0, 'La RAM detectada debe ser mayor a 0');
  assert.ok(specs.cores > 0, 'Los núcleos deben ser mayores a 0');
  assert.ok(['low', 'mid', 'high'].includes(specs.tier), 'El tier debe ser low, mid o high');

  const testInstanceDir = path.join(TEST_DIR, 'mock-instance');
  fs.mkdirSync(testInstanceDir, { recursive: true });
  const mockOptionsPath = path.join(testInstanceDir, 'options.txt');
  fs.writeFileSync(mockOptionsPath, 'gamma:0.0\nrenderDistance:12\ngraphicsMode:"fancy"\n', 'utf8');

  // Probar optimización forzada para Low-End
  const optLowRes = hwOpt.optimizeInstanceOptions(testInstanceDir, 'low');
  assert.ok(optLowRes.success);
  assert.strictEqual(optLowRes.appliedPreset.renderDistance, '6');
  assert.strictEqual(optLowRes.appliedPreset.graphicsMode, '"fast"');

  const updatedOptions = fs.readFileSync(mockOptionsPath, 'utf8');
  assert.ok(updatedOptions.includes('renderDistance:6'), 'options.txt debe reflejar 6 chunks');
  assert.ok(updatedOptions.includes('graphicsMode:"fast"'), 'options.txt debe reflejar gráficos rápidos');
  console.log(`   ✔ HardwareOptimizer validado: PC detectada (${specs.cpuModel}, ${specs.cores} Cores, ${specs.totalRamGb}GB RAM, Nivel: ${specs.tierLabel}).\n`);

  // ----------------------------------------------------
  // 7. LIMPIEZA DE MEMORIA STANDBY
  // ----------------------------------------------------
  console.log('▶ [7/7] Probando MemoryCleaner (Limpieza segura anti-stuttering)...');
  const cleaner = new MemoryCleaner();
  const cleanRes = await cleaner.cleanStandbyMemory();
  assert.ok(cleanRes && typeof cleanRes === 'object', 'cleanStandbyMemory debe retornar un objeto');
  assert.strictEqual(cleanRes.success, true, 'Debe retornar success: true sin excepciones');
  console.log(`   ✔ MemoryCleaner validado: Resultado: ${JSON.stringify(cleanRes)}.\n`);

  // Limpieza de directorio de pruebas
  try {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  } catch (_) {}

  console.log('====================================================');
  console.log('🎉 TODOS LOS 7 MÓDULOS DE SHUBACORE PRO FUNCIONAN AL 100%');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('\n❌ ERROR EN PRUEBAS SHUBACORE PRO:', err);
  process.exit(1);
});
