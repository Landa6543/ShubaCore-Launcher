const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { ProfileManager } = require('../src/main/profiles/ProfileManager');
const { ProfileCodeSharer } = require('../src/main/sync/ProfileCodeSharer');
const { PackPorter } = require('../src/main/packs/PackPorter');

async function runFase26Test() {
  console.log('🧪 Iniciando Test Fase 26: Historial de Iconos, Modales y Preservación de Icon.png...\n');

  const testDir = path.join(__dirname, 'temp_fase26_test');
  if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  fs.mkdirSync(testDir, { recursive: true });

  const profileManager = new ProfileManager({ customSharedRoot: testDir });
  const sampleIconDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  // 1. Verificar getIconsHistoryDir y saveCustomIcon
  console.log('▶ [1/4] Verificando guardado y consulta de historial de iconos...');
  const historyDir = profileManager.getIconsHistoryDir();
  assert(fs.existsSync(historyDir), 'El directorio de historial de iconos debe existir');

  const savedUrl = profileManager.saveCustomIcon(sampleIconDataUrl);
  assert(savedUrl && savedUrl.startsWith('data:image/png;base64,'), 'saveCustomIcon debe retornar un dataUrl válido');

  const history = profileManager.getIconHistory();
  assert(Array.isArray(history) && history.length >= 1, 'getIconHistory debe retornar al menos 1 icono');
  assert(history.some(i => i.dataUrl === sampleIconDataUrl), 'El icono guardado debe figurar en el historial');
  console.log('  ✔ Historial de iconos y guardado personalizado verificado.');

  // 2. Verificar que createProfile y updateProfile escriban icon.png en el disco
  console.log('▶ [2/4] Verificando persistencia de icon.png en instancias creadas y editadas...');
  const created = profileManager.createProfile({
    name: 'Test Icon Instance',
    mcVersion: '1.21.1',
    loader: 'Fabric',
    icon: sampleIconDataUrl
  });

  const instDir = profileManager.getInstancePath(created.id);
  const iconPngPath = path.join(instDir, 'icon.png');
  assert(fs.existsSync(iconPngPath), 'icon.png debe crearse físicamente en la carpeta de la instancia');
  const iconPngBuf = fs.readFileSync(iconPngPath);
  assert(iconPngBuf.length > 0, 'icon.png no debe estar vacío');

  const updatedSampleUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mNk+M/wHwMDAwMDDAAEAgIB5R5hHwAAAABJRU5ErkJggg==';
  profileManager.updateProfile(created.id, {
    icon: updatedSampleUrl
  });
  const updatedBuf = fs.readFileSync(iconPngPath);
  assert(updatedBuf.length > 0 && !updatedBuf.equals(iconPngBuf), 'icon.png debe actualizarse con la nueva imagen');
  console.log('  ✔ icon.png persistido en disco al crear y editar.');

  // 3. Verificar que ProfileCodeSharer exporte e importe el icono
  console.log('▶ [3/4] Verificando preservación de icono en ProfileCodeSharer...');
  const codeSharer = new ProfileCodeSharer(profileManager);
  const exportRes = await codeSharer.exportProfileToCode(created.id);
  assert(exportRes && exportRes.success && exportRes.code, 'exportProfileToCode debe retornar éxito y un código');
  const code = exportRes.code;

  const localBackup = exportRes.localBackup;
  assert(fs.existsSync(localBackup), 'El archivo de manifiesto local debe existir');
  const manifestData = JSON.parse(fs.readFileSync(localBackup, 'utf8'));
  assert(manifestData.iconBase64, 'El manifiesto del código debe contener iconBase64');

  const importRes = await codeSharer.importProfileFromCode(code, 'Imported From Code');
  assert(importRes && importRes.success && importRes.profile, 'importProfileFromCode debe retornar el perfil importado');
  const importedProfile = importRes.profile;
  const importedInstDir = profileManager.getInstancePath(importedProfile.id);
  const importedIconPng = path.join(importedInstDir, 'icon.png');
  assert(fs.existsSync(importedIconPng), 'El icon.png debe haberse restaurado en la instancia importada');
  console.log('  ✔ Preservación y restauración de icono en ProfileCodeSharer verificada.');

  // 4. Verificar que PackPorter exporte el icon.png dentro del archivo .zip
  console.log('▶ [4/4] Verificando preservación de icono en PackPorter (.shubapack)...');
  const packPorter = new PackPorter({ profileManager });
  const zipPath = path.join(testDir, 'test-pack.shubapack');
  const packExportRes = await packPorter.exportPack(created.id, zipPath);
  assert(packExportRes && packExportRes.success, 'PackPorter.exportPack debe ser exitoso');
  assert(fs.existsSync(zipPath), 'El archivo .shubapack ZIP debe existir');

  const AdmZip = require('adm-zip');
  const zip = new AdmZip(zipPath);
  const zipIconEntry = zip.getEntry('icon.png');
  assert(zipIconEntry !== null, 'El archivo ZIP debe contener icon.png en la raíz');
  const manifestEntry = zip.getEntry('shubapack.json') || zip.getEntry('manifest.json');
  assert(manifestEntry !== null, 'El ZIP debe contener shubapack.json');
  const manifestJson = JSON.parse(zip.readAsText(manifestEntry));
  assert(manifestJson.icon && manifestJson.icon.startsWith('data:image/png;base64,'), 'manifest debe incluir el icono');
  console.log('  ✔ icon.png preservado en .shubapack y manifest verificado.');

  // Limpieza
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (_) {}

  console.log('\n🎉 ¡Todos los tests de Fase 26 pasaron al 100% con éxito!\n');
}

runFase26Test().catch(err => {
  console.error('❌ Error en Test Fase 26:', err);
  process.exit(1);
});
