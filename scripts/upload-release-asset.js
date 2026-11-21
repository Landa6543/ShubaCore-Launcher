const fs = require('fs');
const https = require('https');
const path = require('path');
const { execSync } = require('child_process');

function getGitHubToken() {
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const stdout = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n',
      encoding: 'utf8'
    });
    const match = stdout.match(/^password=(.+)$/m);
    if (match && match[1]) return match[1].trim();
  } catch (e) {
    console.error('No se pudo obtener el token:', e.message);
  }
  return null;
}

async function uploadExe() {
  const token = getGitHubToken();
  if (!token) {
    console.error('❌ Token no disponible.');
    process.exit(1);
  }

  const filePath = path.join(__dirname, '..', 'dist', 'ShubaCore Setup 1.2.0.exe');
  if (!fs.existsSync(filePath)) {
    console.error('❌ Archivo instalador no encontrado en:', filePath);
    process.exit(1);
  }

  const stats = fs.statSync(filePath);
  const totalSize = stats.size;
  const assetName = 'ShubaCore-Setup-1.2.0.exe';
  const releaseId = 453477779;

  console.log(`🚀 Iniciando subida de ${assetName} (${(totalSize / (1024 * 1024)).toFixed(2)} MB)...`);

  const url = `https://uploads.github.com/repos/Landa6543/ShubaCore-Launcher/releases/${releaseId}/assets?name=${assetName}`;

  const req = https.request(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'User-Agent': 'ShubaCore-Uploader',
      'Content-Type': 'application/octet-stream',
      'Content-Length': totalSize
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log(`\nRespuesta de GitHub: HTTP ${res.statusCode}`);
      if (res.statusCode === 201) {
        console.log('✅ ¡ShubaCore-Setup-1.2.0.exe subido exitosamente a GitHub Releases!');
      } else {
        console.error('❌ Error al subir asset:', body);
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ Error de conexión:', err.message);
  });

  const readStream = fs.createReadStream(filePath);
  let uploaded = 0;
  let lastPercent = 0;

  readStream.on('data', (chunk) => {
    uploaded += chunk.length;
    const percent = Math.floor((uploaded / totalSize) * 100);
    if (percent !== lastPercent && percent % 5 === 0) {
      process.stdout.write(`Subiendo: ${percent}% (${(uploaded / (1024 * 1024)).toFixed(1)} / ${(totalSize / (1024 * 1024)).toFixed(1)} MB)\r`);
      lastPercent = percent;
    }
  });

  readStream.pipe(req);
}

uploadExe();
