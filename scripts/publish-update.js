/**
 * ShubaCore - Script de Auto-Publicación de Actualizaciones a GitHub Releases
 * Developed by SHUBATECH for Landa6543 (LandaAlo)
 *
 * Flujo automatizado:
 * 1. Resuelve GH_TOKEN desde variables de entorno, archivo .env o Git Credential Manager.
 * 2. Incrementa la versión en package.json (patch por defecto, o minor / major / x.y.z).
 * 3. Actualiza la versión visible en el frontend (index.html).
 * 4. Realiza commit, crea el tag Git (vX.X.X) y lo sube a GitHub (origin main).
 * 5. Ejecuta electron-builder --win --x64 --publish always para compilar el instalador
 *    y subir ShubaCore Setup X.X.X.exe + latest.yml directamente a GitHub Releases.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const REPO_OWNER = 'Landa6543';
const REPO_NAME = 'ShubaCore-Launcher';
const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGE_PATH = path.join(ROOT_DIR, 'package.json');
const HTML_PATH = path.join(ROOT_DIR, 'src', 'renderer', 'index.html');

console.log('===========================================================');
console.log('🚀 SHUBACORE - AUTO-PUBLICADOR DE RELEASES (GITHUB)');
console.log(`   Desarrollado por SHUBATECH para ${REPO_OWNER}`);
console.log('===========================================================\n');

// 1. Resolver Token de GitHub
function resolveGitHubToken() {
  if (process.env.GH_TOKEN && process.env.GH_TOKEN.trim()) {
    return process.env.GH_TOKEN.trim();
  }
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim()) {
    return process.env.GITHUB_TOKEN.trim();
  }

  // 1a. Leer desde .env
  const envPath = path.join(ROOT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/(?:GH_TOKEN|GITHUB_TOKEN)\s*=\s*([^\r\n#]+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // 1b. Obtener desde Windows / Git Credential Manager
  try {
    const stdout = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n',
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    const match = stdout.match(/^password=(.+)$/m);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch (_) {}

  // 1c. Obtener desde GitHub CLI (gh auth token)
  const ghPaths = ['gh', 'C:\\Program Files\\GitHub CLI\\gh.exe'];
  for (const ghCmd of ghPaths) {
    try {
      const tok = execSync(`"${ghCmd}" auth token`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      if (tok && tok.trim()) return tok.trim();
    } catch (_) {}
  }

  return null;
}

const ghToken = resolveGitHubToken();
if (!ghToken) {
  console.error('❌ Error: No se encontró ningún token de GitHub.');
  console.error('   Define GH_TOKEN en tu entorno o en el archivo .env.');
  process.exit(1);
}

process.env.GH_TOKEN = ghToken;
process.env.GITHUB_TOKEN = ghToken;
console.log('✔ Token de GitHub detectado y configurado correctamente.');

// 2. Determinar incremento de versión
const pkg = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8'));
const currentVersion = pkg.version || '1.0.0';
const bumpArg = (process.argv[2] || 'patch').toLowerCase();

function calculateNextVersion(current, bump) {
  if (/^\d+\.\d+\.\d+$/.test(bump)) {
    return bump;
  }
  const parts = current.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return '1.0.1';
  }
  if (bump === 'major') {
    return `${parts[0] + 1}.0.0`;
  } else if (bump === 'minor') {
    return `${parts[0]}.${parts[1] + 1}.0`;
  } else {
    // patch por defecto
    return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  }
}

const nextVersion = calculateNextVersion(currentVersion, bumpArg);
console.log(`📦 Versión actual: v${currentVersion} -> Nueva versión: v${nextVersion}`);

// 3. Actualizar package.json
pkg.version = nextVersion;
fs.writeFileSync(PACKAGE_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log('✔ package.json actualizado con la nueva versión.');

// 3b. Actualizar versión en index.html si existe
if (fs.existsSync(HTML_PATH)) {
  let html = fs.readFileSync(HTML_PATH, 'utf8');
  html = html.replace(/id="launcher-current-version">v[^<]+</, `id="launcher-current-version">v${nextVersion}<`);
  fs.writeFileSync(HTML_PATH, html, 'utf8');
  console.log('✔ src/renderer/index.html actualizado.');
}

// 4. Git Commit & Tag
console.log('\n▶ Creando commit y tag en Git...');
try {
  execSync('git add package.json', { cwd: ROOT_DIR, stdio: 'inherit' });
  if (fs.existsSync(HTML_PATH)) {
    execSync('git add src/renderer/index.html', { cwd: ROOT_DIR, stdio: 'inherit' });
  }
  execSync(`git commit -m "chore(release): v${nextVersion}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
  execSync(`git tag -a "v${nextVersion}" -m "Release v${nextVersion}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
  console.log(`✔ Tag v${nextVersion} creado localmente.`);

  // Push al repositorio remoto
  console.log(`▶ Subiendo cambios y tags a https://github.com/${REPO_OWNER}/${REPO_NAME}.git...`);
  execSync('git push origin main --tags', { cwd: ROOT_DIR, stdio: 'inherit' });
  console.log('✔ Cambios y tags subidos a GitHub exitosamente.');
} catch (gitErr) {
  console.warn(`⚠️ Aviso en Git: ${gitErr.message}. Continuando con la compilación...`);
}

// 5. Compilar y publicar con electron-builder
console.log('\n▶ Ejecutando electron-builder para compilar y subir Release a GitHub...');
console.log('   (Esto generará el instalador NSIS y subirá automáticamente latest.yml a GitHub Releases)');

const builderArgs = ['electron-builder', '--win', '--x64', '--publish', 'always'];
const builderResult = spawnSync('npx', builderArgs, {
  cwd: ROOT_DIR,
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    GH_TOKEN: ghToken,
    GITHUB_TOKEN: ghToken
  }
});

if (builderResult.status !== 0) {
  console.error('\n❌ Error durante la compilación o publicación con electron-builder.');
  process.exit(builderResult.status || 1);
}

console.log('\n===========================================================');
console.log(`🎉 ¡ACTUALIZACIÓN v${nextVersion} PUBLICADA EXITOSAMENTE!`);
console.log(`🔗 Ver Release en GitHub: https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/tag/v${nextVersion}`);
console.log('✨ Los clientes de ShubaCore detectarán y descargarán la actualización automáticamente.');
console.log('===========================================================');
