/**
 * ShubaCore - GitHub Custom Mods Manager
 * Developed by SHUBATECH
 * Fetches and manages custom .jar mods from GitHub repository (Landa6543/ShubaCore-Mods)
 * Supports GitHub Contents API, Releases Assets, and automated local installation
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const AdmZip = require('adm-zip');
const { getConfigManager } = require('../config/ConfigManager');
const { getProfileManager } = require('../profiles/ProfileManager');
const { defaultLogger: logger } = require('../utils/logger');

class GitHubModsManager {
  constructor() {
    this.configManager = getConfigManager();
    this.cachedMods = null;
    this.lastFetched = 0;
    this.cacheTtlMs = 60000; // 1 minuto de caché para evitar rate-limits innecesarios

    try {
      const { app } = require('electron');
      this.userDataPath = app ? app.getPath('userData') : path.join(process.env.APPDATA || '', '.shubacore');
    } catch (_) {
      this.userDataPath = path.join(process.env.APPDATA || '', '.shubacore');
    }
    this.iconsCacheDir = path.join(this.userDataPath, 'cache', 'mod-icons');
    if (!fs.existsSync(this.iconsCacheDir)) {
      try { fs.mkdirSync(this.iconsCacheDir, { recursive: true }); } catch (_) {}
    }
  }

  getIconPath(fileName) {
    if (!fileName) return null;
    const clean = fileName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    return path.join(this.iconsCacheDir, `${clean}.png`);
  }

  getRepoInfo() {
    const owner = this.configManager.get('github.repoOwner', 'Landa6543');
    const repo = this.configManager.get('github.repoName', 'ShubaCore-Mods');
    return { owner, repo };
  }

  setRepoInfo(owner, repo, token) {
    if (owner) this.configManager.set('github.repoOwner', owner.trim());
    if (repo) this.configManager.set('github.repoName', repo.trim());
    if (token !== undefined) this.configManager.set('github.customToken', (token || '').trim());
    this.cachedMods = null;
    return this.getRepoInfo();
  }

  /**
   * Resuelve token de GitHub desde Config, Variables de Entorno, .env o Git Credential Manager
   */
  resolveToken() {
    // 1. Token personalizado guardado en config
    const custom = this.configManager.get('github.customToken', '');
    if (custom && custom.trim()) return custom.trim();

    // 2. Variables de entorno estándar
    if (process.env.GH_TOKEN && process.env.GH_TOKEN.trim()) return process.env.GH_TOKEN.trim();
    if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim()) return process.env.GITHUB_TOKEN.trim();

    // 3. Archivo .env en la raíz
    try {
      const rootEnv = path.resolve(__dirname, '..', '..', '..', '.env');
      if (fs.existsSync(rootEnv)) {
        const text = fs.readFileSync(rootEnv, 'utf8');
        const match = text.match(/(?:GH_TOKEN|GITHUB_TOKEN)\s*=\s*([^\r\n#]+)/);
        if (match && match[1]) return match[1].trim();
      }
    } catch (_) {}

    // 4. Git Credential Manager de Windows
    try {
      const stdout = execSync('git credential fill', {
        input: 'protocol=https\nhost=github.com\n',
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      });
      const match = stdout.match(/^password=(.+)$/m);
      if (match && match[1]) return match[1].trim();
    } catch (_) {}

    return null;
  }

  _getAuthHeaders() {
    const headers = {
      'User-Agent': 'SHUBATECH-ShubaCore-Launcher/1.1.0',
      'Accept': 'application/vnd.github.v3+json'
    };
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }
    return headers;
  }

  /**
   * Consulta los mods custom desde GitHub (Contents y Releases)
   */
  async fetchCustomMods(force = false) {
    const now = Date.now();
    if (!force && this.cachedMods && (now - this.lastFetched < this.cacheTtlMs)) {
      return this.cachedMods;
    }

    const { owner, repo } = this.getRepoInfo();
    const headers = this._getAuthHeaders();
    const modsMap = new Map();

    logger.info(`[GitHubMods] Consultando mods custom desde https://github.com/${owner}/${repo}...`);

    // 1. Consultar archivos .jar en /mods
    try {
      const modsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/mods`;
      const res = await fetch(modsUrl, { headers });
      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item.type === 'file' && item.name.toLowerCase().endsWith('.jar')) {
              const modObj = this._formatJarItem(item, owner, repo, 'direct_mods_folder');
              modsMap.set(item.name.toLowerCase(), modObj);
            }
          }
        }
      } else if (res.status === 404) {
        logger.debug(`[GitHubMods] La carpeta /mods no existe aún en ${owner}/${repo}`);
      } else {
        logger.warn(`[GitHubMods] Aviso al consultar /mods (status ${res.status})`);
      }
    } catch (err) {
      logger.warn(`[GitHubMods] Error al consultar /mods: ${err.message}`);
    }

    // 2. Consultar archivos .jar en la raíz
    try {
      const rootUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
      const res = await fetch(rootUrl, { headers });
      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item.type === 'file' && item.name.toLowerCase().endsWith('.jar')) {
              if (!modsMap.has(item.name.toLowerCase())) {
                const modObj = this._formatJarItem(item, owner, repo, 'root_folder');
                modsMap.set(item.name.toLowerCase(), modObj);
              }
            }
          }
        }
      }
    } catch (err) {
      logger.warn(`[GitHubMods] Error al consultar raíz: ${err.message}`);
    }

    // 3. Consultar assets en GitHub Releases
    try {
      const relUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;
      const res = await fetch(relUrl, { headers });
      if (res.ok) {
        const releases = await res.json();
        if (Array.isArray(releases)) {
          for (const release of releases) {
            if (Array.isArray(release.assets)) {
              for (const asset of release.assets) {
                if (asset.name.toLowerCase().endsWith('.jar')) {
                  const key = asset.name.toLowerCase();
                  const existing = modsMap.get(key);
                  const releaseMod = {
                    id: `gh_${asset.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
                    projectId: `gh_${asset.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
                    name: this._formatDisplayName(asset.name),
                    title: this._formatDisplayName(asset.name),
                    slug: asset.name.replace(/\.jar$/i, ''),
                    fileName: asset.name,
                    author: release.author?.login || owner,
                    description: release.body || release.name || `Mod custom distribuido en GitHub Release ${release.tag_name} (${owner}/${repo})`,
                    summary: release.body || release.name || `Mod custom distribuido en GitHub Release ${release.tag_name} (${owner}/${repo})`,
                    version: release.tag_name || this._extractVersion(asset.name),
                    downloadUrl: asset.browser_download_url,
                    size: asset.size || 0,
                    downloads: asset.download_count || (existing ? existing.downloads : 1),
                    updatedAt: asset.updated_at || release.published_at || new Date().toISOString(),
                    iconUrl: 'assets/logo.png',
                    source: 'github',
                    categories: ['custom', 'github'],
                    isCustom: true,
                    releaseTag: release.tag_name,
                    htmlUrl: release.html_url
                  };
                  modsMap.set(key, releaseMod);
                }
              }
            }
          }
        }
      }
    } catch (err) {
      logger.warn(`[GitHubMods] Error al consultar releases: ${err.message}`);
    }

    // Requisito: Mod de Interfaz ShubaClient UI en catálogo de Mods Custom (Landa6543/ShubaCore-Mods)
    const scKey = 'shubaclient-ui.jar';
    if (!modsMap.has(scKey)) {
      modsMap.set(scKey, {
        id: 'gh_shubaclient_ui',
        projectId: 'gh_shubaclient_ui',
        name: 'ShubaClient UI (100% Rebranded)',
        title: 'ShubaClient UI (100% Rebranded)',
        slug: 'shubaclient-ui',
        fileName: 'ShubaClient-UI.jar',
        author: 'SHUBATECH',
        description: 'Interfaz in-game completa: Menú principal 3D, Vestidor con cosméticos gratis, Amigos, Estadísticas y Host World. Rebrandeado oficialmente a SHUBACORE.',
        summary: 'Interfaz in-game completa: Menú principal 3D, Vestidor con cosméticos gratis, Amigos, Estadísticas y Host World. Rebrandeado oficialmente a SHUBACORE.',
        version: '1.0.0',
        downloadUrl: 'local://shubaclient-ui',
        size: 72664670,
        downloads: 999,
        updatedAt: new Date().toISOString(),
        iconUrl: 'assets/logo.png',
        source: 'github',
        categories: ['custom', 'interface', 'github', 'shubatech'],
        isCustom: true,
        htmlUrl: `https://github.com/${owner}/${repo}`
      });
    }

    const modsList = Array.from(modsMap.values());

    // Resolver iconos locales o cacheados para cada mod custom
    try {
      const profileManager = getProfileManager();
      const rawProfiles = (profileManager && profileManager.getAll) ? profileManager.getAll() : [];
      const allProfiles = Array.isArray(rawProfiles)
        ? rawProfiles
        : (rawProfiles && rawProfiles.profiles ? (Array.isArray(rawProfiles.profiles) ? rawProfiles.profiles : Object.values(rawProfiles.profiles)) : []);

      for (const mod of modsList) {
        const fileName = mod.fileName;
        if (!fileName) continue;

        // 1. Verificar si ya tenemos el icono en caché en disco
        const iconCachePath = this.getIconPath(fileName);
        if (iconCachePath && fs.existsSync(iconCachePath)) {
          try {
            const buf = fs.readFileSync(iconCachePath);
            if (buf && buf.length > 0) {
              mod.iconUrl = `data:image/png;base64,${buf.toString('base64')}`;
            }
          } catch (_) {}
        }

        // 2. Si no tiene icono o sigue con el logo por defecto, buscar el .jar localmente
        if (!mod.iconUrl || mod.iconUrl === 'assets/logo.png') {
          let foundJarPath = null;
          for (const p of allProfiles) {
            const pDir = p.instancePath || p.gameDirectory;
            if (pDir) {
              const cand = path.join(pDir, 'mods', fileName);
              if (fs.existsSync(cand)) {
                foundJarPath = cand;
                break;
              }
            }
          }

          if (foundJarPath) {
            const extracted = this._extractJarMetadata(foundJarPath);
            if (extracted) {
              if (extracted.iconBase64) mod.iconUrl = extracted.iconBase64;
              if (extracted.name) { mod.name = extracted.name; mod.title = extracted.name; }
              if (extracted.version) mod.version = extracted.version;
              if (extracted.author) mod.author = extracted.author;
              if (extracted.description) { mod.description = extracted.description; mod.summary = extracted.description; }
            }
          }
        }
      }
    } catch (iconErr) {
      logger.debug(`[GitHubMods] Advertencia resolviendo iconos locales: ${iconErr.message}`);
    }

    this.cachedMods = modsList;
    this.lastFetched = Date.now();
    logger.info(`⚡ [GitHubMods] ${modsList.length} mods custom obtenidos desde https://github.com/${owner}/${repo}`);
    return modsList;
  }

  _formatJarItem(item, owner, repo, locationTag) {
    const cleanName = this._formatDisplayName(item.name);
    const ver = this._extractVersion(item.name);
    const desc = `Mod custom provisto directamente desde el repositorio de GitHub (${owner}/${repo})`;
    return {
      id: `gh_${item.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      projectId: `gh_${item.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
      name: cleanName,
      title: cleanName,
      slug: item.name.replace(/\.jar$/i, ''),
      fileName: item.name,
      author: owner,
      description: desc,
      summary: desc,
      version: ver,
      downloadUrl: item.download_url,
      size: item.size || 0,
      downloads: 1,
      updatedAt: new Date().toISOString(),
      iconUrl: 'assets/logo.png',
      source: 'github',
      categories: ['custom', 'github'],
      isCustom: true,
      htmlUrl: item.html_url || `https://github.com/${owner}/${repo}`
    };
  }

  _formatDisplayName(fileName) {
    const base = fileName.replace(/\.jar$/i, '');
    // Quitar patrones de versiones y loaders comunes al final
    const cleaned = base
      .replace(/[-_]?(?:mc)?1\.\d+(?:\.\d+)?/gi, '')
      .replace(/[-_]?(?:neoforge|forge|fabric|quilt)/gi, '')
      .replace(/[-_]v?\d+(?:\.\d+)+(?:[-_][a-zA-Z0-9]+)?$/gi, '')
      .replace(/[-_]+/g, ' ')
      .trim();

    if (!cleaned) return base;
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  _extractVersion(fileName) {
    const match = fileName.match(/[-_]v?(\d+\.\d+(?:\.\d+)?(?:[-_][a-zA-Z0-9]+)?)\.jar$/i) ||
                  fileName.match(/(\d+\.\d+(?:\.\d+)?)/);
    return match ? match[1] : '1.0.0';
  }

  /**
   * Descarga un mod custom en la carpeta /mods de la instancia
   */
  async downloadCustomMod({ downloadUrl, fileName, instancePath, onProgress }) {
    if (!downloadUrl) throw new Error('Falta la URL de descarga del mod custom.');
    if (!fileName) throw new Error('Falta el nombre de archivo del mod custom.');

    const targetModsDir = path.join(instancePath, 'mods');
    if (!fs.existsSync(targetModsDir)) {
      fs.mkdirSync(targetModsDir, { recursive: true });
    }

    const targetFilePath = path.join(targetModsDir, fileName);

    // Si es el mod de interfaz ShubaClient-UI.jar, asegurar y generar localmente
    if (fileName.toLowerCase() === 'shubaclient-ui.jar' || (downloadUrl && downloadUrl.startsWith('local://shubaclient-ui'))) {
      try {
        if (onProgress) onProgress({ type: 'start', message: 'Preparando ShubaClient UI...', percent: 25 });
        const { getClientModPatcher } = require('../client/ClientModPatcher');
        const patcher = getClientModPatcher();
        const ready = patcher.ensureShubaClientReady();
        if (ready && ready.customJarPath && fs.existsSync(ready.customJarPath)) {
          fs.copyFileSync(ready.customJarPath, targetFilePath);
          // Inyectar dependencias y optimizaciones acompañantes si existen
          if (ready.depsDir && fs.existsSync(ready.depsDir)) {
            const deps = fs.readdirSync(ready.depsDir).filter(f => f.endsWith('.jar'));
            for (const d of deps) {
              const dDest = path.join(targetModsDir, d);
              if (!fs.existsSync(dDest)) {
                try { fs.copyFileSync(path.join(ready.depsDir, d), dDest); } catch (_) {}
              }
            }
          }
          if (ready.optDir && fs.existsSync(ready.optDir)) {
            const opts = fs.readdirSync(ready.optDir).filter(f => f.endsWith('.jar'));
            for (const o of opts) {
              const oDest = path.join(targetModsDir, o);
              if (!fs.existsSync(oDest)) {
                try { fs.copyFileSync(path.join(ready.optDir, o), oDest); } catch (_) {}
              }
            }
          }
          if (onProgress) onProgress({ type: 'finish', message: 'ShubaClient UI instalado con éxito', percent: 100 });
          return { success: true, filePath: targetFilePath, fileName };
        }
      } catch (uiErr) {
        logger.warn(`[GitHubMods] Fallo local al preparar ShubaClient UI: ${uiErr.message}`);
      }
    }

    const tempFilePath = `${targetFilePath}.download_${Date.now()}`;

    logger.info(`[GitHubMods] Descargando mod custom "${fileName}" desde: ${downloadUrl}`);
    if (onProgress) onProgress({ type: 'start', message: `Descargando ${fileName}...`, percent: 5 });

    const headers = this._getAuthHeaders();
    const response = await fetch(downloadUrl, { headers });
    if (!response.ok) {
      throw new Error(`Fallo al descargar mod custom desde GitHub (HTTP ${response.status}: ${response.statusText})`);
    }

    const totalBytes = Number(response.headers.get('content-length') || 0);
    let downloadedBytes = 0;

    const fileStream = fs.createWriteStream(tempFilePath);

    // Leer respuesta por chunks para progreso
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fileStream.write(Buffer.from(value));
      downloadedBytes += value.length;
      if (totalBytes > 0 && onProgress) {
        const pct = Math.min(95, Math.round((downloadedBytes / totalBytes) * 90) + 5);
        onProgress({ type: 'progress', percent: pct, current: downloadedBytes, total: totalBytes, message: `Descargando ${fileName} (${pct}%)` });
      }
    }

    await new Promise((resolve, reject) => {
      fileStream.end(() => resolve());
      fileStream.on('error', reject);
    });

    // Mover archivo completado
    if (fs.existsSync(targetFilePath)) {
      try { fs.unlinkSync(targetFilePath); } catch (_) {}
    }
    fs.renameSync(tempFilePath, targetFilePath);

    // Calcular hash SHA1
    const fileBuf = fs.readFileSync(targetFilePath);
    const sha1 = crypto.createHash('sha1').update(fileBuf).digest('hex');

    // Intentar extraer metadatos e icono del .jar
    let extractedMeta = null;
    try {
      extractedMeta = this._extractJarMetadata(targetFilePath);
    } catch (_) {}

    // Registrar en mods-lock.json de la instancia
    this._recordInLockFile(instancePath, {
      fileName,
      sha1,
      downloadUrl,
      source: 'github',
      installedAt: new Date().toISOString(),
      size: fileBuf.length,
      modName: extractedMeta?.name || this._formatDisplayName(fileName),
      version: extractedMeta?.version || this._extractVersion(fileName)
    });

    if (onProgress) onProgress({ type: 'complete', percent: 100, message: `¡${fileName} instalado con éxito!` });
    logger.info(`⚡ [GitHubMods] Mod "${fileName}" instalado con éxito en "${targetFilePath}".`);

    return {
      success: true,
      fileName,
      path: targetFilePath,
      sha1,
      size: fileBuf.length,
      extractedMeta,
      iconUrl: extractedMeta?.iconBase64 || null
    };
  }

  _extractJarMetadata(jarPath) {
    if (!jarPath || !fs.existsSync(jarPath)) return null;
    try {
      const zip = new AdmZip(jarPath);
      const entries = zip.getEntries();
      let name = null;
      let modId = null;
      let version = null;
      let author = null;
      let description = null;
      let iconBase64 = null;
      let logoFileName = null;

      // 1. NeoForge / Forge mods.toml / neoforge.mods.toml
      const neoToml = zip.getEntry('META-INF/neoforge.mods.toml') || zip.getEntry('META-INF/mods.toml');
      const fabricJson = zip.getEntry('fabric.mod.json') || zip.getEntry('quilt.mod.json');
      const mcmodInfo = zip.getEntry('mcmod.info');

      if (neoToml) {
        try {
          const content = neoToml.getData().toString('utf8');
          const modsSectionMatch = content.match(/\[\[mods\]\]([\s\S]*?)(?:\[\[|$)/i);
          const modBlock = modsSectionMatch ? modsSectionMatch[1] : content;

          const nameMatch = modBlock.match(/(?:displayName|name)\s*=\s*["']([^"']+)["']/i) || content.match(/(?:displayName|name)\s*=\s*["']([^"']+)["']/i);
          const modIdMatch = modBlock.match(/modId\s*=\s*["']([^"']+)["']/i) || content.match(/modId\s*=\s*["']([^"']+)["']/i);
          const verMatch = modBlock.match(/version\s*=\s*["']([^"']+)["']/i);
          const authorMatch = modBlock.match(/(?:authors|author|credits)\s*=\s*["']([^"']+)["']/i) || content.match(/(?:authors|author|credits)\s*=\s*["']([^"']+)["']/i);
          const logoMatch = modBlock.match(/logoFile\s*=\s*["']([^"']+)["']/i) || content.match(/logoFile\s*=\s*["']([^"']+)["']/i);
          const descMatch = modBlock.match(/description\s*=\s*(?:'''|""")([\s\S]*?)(?:'''|""")|description\s*=\s*["']([^"']+)["']/i) || content.match(/description\s*=\s*(?:'''|""")([\s\S]*?)(?:'''|""")|description\s*=\s*["']([^"']+)["']/i);

          if (nameMatch) name = nameMatch[1];
          if (modIdMatch) modId = modIdMatch[1];
          if (verMatch && verMatch[1] !== '${file.jarVersion}') version = verMatch[1];
          if (authorMatch) author = authorMatch[1];
          if (logoMatch) logoFileName = logoMatch[1];
          if (descMatch) description = (descMatch[1] || descMatch[2] || '').trim();
        } catch (_) {}
      } else if (fabricJson) {
        try {
          const json = JSON.parse(fabricJson.getData().toString('utf8'));
          name = json.name;
          modId = json.id;
          version = json.version;
          description = json.description;
          if (Array.isArray(json.authors)) {
            author = json.authors.map((a) => (typeof a === 'string' ? a : (a.name || ''))).filter(Boolean).join(', ');
          } else if (typeof json.authors === 'string') {
            author = json.authors;
          }
          if (typeof json.icon === 'string') {
            logoFileName = json.icon;
          } else if (json.icon && typeof json.icon === 'object') {
            logoFileName = Object.values(json.icon)[0];
          }
        } catch (_) {}
      } else if (mcmodInfo) {
        try {
          const json = JSON.parse(mcmodInfo.getData().toString('utf8'));
          const m = Array.isArray(json) ? json[0] : (json.modList ? json.modList[0] : json);
          if (m) {
            name = m.name;
            modId = m.modid;
            version = m.version;
            description = m.description;
            author = Array.isArray(m.authorList) ? m.authorList.join(', ') : m.authorList;
            logoFileName = m.logoFile;
          }
        } catch (_) {}
      }

      // 2. Localizar icono interno
      let iconEntry = null;
      if (logoFileName) {
        const cleanLogo = logoFileName.replace(/^[/\\]+/, '');
        iconEntry = zip.getEntry(cleanLogo) ||
                    zip.getEntry(logoFileName) ||
                    (modId ? zip.getEntry('assets/' + modId + '/' + cleanLogo) : null);
        if (!iconEntry) {
          iconEntry = entries.find((e) => e.entryName.toLowerCase().endsWith(cleanLogo.toLowerCase()) && !e.isDirectory);
        }
      }

      if (!iconEntry) {
        const commonNames = ['logo.png', 'icon.png', 'pack.png'];
        for (const cn of commonNames) {
          iconEntry = zip.getEntry(cn);
          if (iconEntry) break;
          if (modId) {
            iconEntry = zip.getEntry('assets/' + modId + '/' + cn) ||
                        zip.getEntry('assets/' + modId + '/textures/gui/' + cn);
            if (iconEntry) break;
          }
        }
        if (!iconEntry) {
          iconEntry = entries.find((e) => {
            const l = e.entryName.toLowerCase();
            return l.endsWith('.png') && (l.includes('icon') || l.includes('logo')) && !e.isDirectory;
          });
        }
      }

      if (iconEntry) {
        try {
          const buf = iconEntry.getData();
          if (buf && buf.length > 0) {
            iconBase64 = `data:image/png;base64,${buf.toString('base64')}`;
            // Guardar en caché persistente en disco
            const iconCachePath = this.getIconPath(path.basename(jarPath));
            if (iconCachePath) {
              try { fs.writeFileSync(iconCachePath, buf); } catch (_) {}
            }
          }
        } catch (_) {}
      }

      return { name, modId, version, author, description, iconBase64 };
    } catch (err) {
      logger.debug(`[GitHubMods] Error al inspeccionar metadatos de jar ${jarPath}: ${err.message}`);
      return null;
    }
  }

  /**
   * Sube uno o más archivos .jar a GitHub Releases (tag: custom-mods)
   * Soporta archivos de cualquier tamaño (>100MB) sin el límite de 25MB de GitHub Contents API
   * Utiliza GitHub CLI (gh) si está instalado o fallback a GitHub REST API con token
   */
  async uploadCustomMods({ filePaths, onProgress }) {
    if (!Array.isArray(filePaths) || filePaths.length === 0) {
      throw new Error('No se especificaron archivos para subir.');
    }

    const { owner, repo } = this.getRepoInfo();
    const token = this.resolveToken();
    const results = [];

    // Verificar si gh CLI está disponible
    let hasGhCli = false;
    try {
      execSync('gh --version', { stdio: 'ignore' });
      hasGhCli = true;
    } catch (_) {
      hasGhCli = false;
    }

    logger.info(`[GitHubMods] Iniciando subida de ${filePaths.length} mod(s) a ${owner}/${repo}... (gh CLI: ${hasGhCli ? 'Disponible' : 'No detectado'})`);

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      if (!fs.existsSync(filePath)) {
        throw new Error(`El archivo no existe: ${filePath}`);
      }

      const fileName = path.basename(filePath);
      const fileSize = fs.statSync(filePath).size;
      const progressPercent = Math.round((i / filePaths.length) * 100);

      if (onProgress) {
        onProgress({
          index: i + 1,
          total: filePaths.length,
          fileName,
          percent: progressPercent,
          message: `Preparando subida de "${fileName}" (${(fileSize / (1024 * 1024)).toFixed(1)} MB)...`
        });
      }

      let uploadedSuccessfully = false;

      // 1. Intentar mediante gh CLI si está presente
      if (hasGhCli) {
        try {
          logger.info(`[GitHubMods] Subiendo "${fileName}" vía gh release upload...`);
          // Asegurar que existe el release custom-mods
          try {
            execSync(`gh release view custom-mods --repo ${owner}/${repo}`, { stdio: 'ignore' });
          } catch (_) {
            execSync(`gh release create custom-mods --title "ShubaCore Custom Mods" --notes "Mods custom y ports de la comunidad ShubaCore" --repo ${owner}/${repo}`, { stdio: 'ignore' });
          }

          execSync(`gh release upload custom-mods "${filePath}" --repo ${owner}/${repo} --clobber`, {
            stdio: ['ignore', 'pipe', 'pipe']
          });

          uploadedSuccessfully = true;
          logger.info(`[GitHubMods] ✅ "${fileName}" subido exitosamente con gh CLI.`);
        } catch (ghErr) {
          logger.warn(`[GitHubMods] gh CLI falló al subir "${fileName}": ${ghErr.message}. Intentando fallback por API REST...`);
        }
      }

      // 2. Si gh no estaba disponible o falló, usar API REST de GitHub
      if (!uploadedSuccessfully) {
        if (!token) {
          throw new Error('Para subir mods a GitHub sin gh CLI se requiere un Personal Access Token configurado con permiso de repo o GITHUB_TOKEN.');
        }

        const headers = {
          'Authorization': `token ${token}`,
          'User-Agent': 'SHUBATECH-ShubaCore-Launcher/1.1.0',
          'Accept': 'application/vnd.github.v3+json'
        };

        // Obtener o crear Release con tag "custom-mods"
        let release = null;
        const relUrl = `https://api.github.com/repos/${owner}/${repo}/releases/tags/custom-mods`;
        const getRel = await fetch(relUrl, { headers });

        if (getRel.ok) {
          release = await getRel.json();
        } else if (getRel.status === 404) {
          // Crear el release
          logger.info(`[GitHubMods] Creando release 'custom-mods' en ${owner}/${repo}...`);
          const createRel = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tag_name: 'custom-mods',
              name: 'ShubaCore Custom Mods',
              body: 'Repositorio oficial de mods custom y optimizaciones para ShubaCore.',
              draft: false,
              prerelease: false
            })
          });

          if (!createRel.ok) {
            const errTxt = await createRel.text();
            throw new Error(`Error al crear el release en GitHub (${createRel.status}): ${errTxt}`);
          }
          release = await createRel.json();
        } else {
          const errTxt = await getRel.text();
          throw new Error(`Error al consultar releases de GitHub (${getRel.status}): ${errTxt}`);
        }

        // Si ya existía un asset con el mismo nombre, eliminarlo primero
        if (Array.isArray(release.assets)) {
          const existingAsset = release.assets.find((a) => a.name.toLowerCase() === fileName.toLowerCase());
          if (existingAsset) {
            logger.info(`[GitHubMods] Reemplazando asset existente id=${existingAsset.id} ("${fileName}")...`);
            await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/assets/${existingAsset.id}`, {
              method: 'DELETE',
              headers
            });
          }
        }

        if (onProgress) {
          onProgress({
            index: i + 1,
            total: filePaths.length,
            fileName,
            percent: Math.round(((i + 0.5) / filePaths.length) * 100),
            message: `Transfiriendo "${fileName}" a GitHub Releases...`
          });
        }

        // Subir binario a upload_url
        const fileBuffer = fs.readFileSync(filePath);
        const uploadUrl = `https://uploads.github.com/repos/${owner}/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(fileName)}`;

        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `token ${token}`,
            'User-Agent': 'SHUBATECH-ShubaCore-Launcher/1.1.0',
            'Content-Type': 'application/java-archive',
            'Content-Length': String(fileBuffer.length)
          },
          body: fileBuffer
        });

        if (!uploadRes.ok) {
          const errTxt = await uploadRes.text();
          throw new Error(`Error al subir "${fileName}" a GitHub (${uploadRes.status}): ${errTxt}`);
        }

        uploadedSuccessfully = true;
        logger.info(`[GitHubMods] ✅ "${fileName}" subido exitosamente vía REST API.`);
      }

      // Extraer y cachear metadatos e icono localmente
      try {
        const extracted = this._extractJarMetadata(filePath);
        if (extracted && extracted.iconBase64) {
          logger.info(`[GitHubMods] Icono extraído y cacheado para "${fileName}".`);
        }
      } catch (_) {}

      results.push({ fileName, path: filePath, size: fileSize, success: true });
    }

    // Invalidar caché de mods para recargar el catálogo de inmediato
    this.cachedMods = null;

    if (onProgress) {
      onProgress({
        index: filePaths.length,
        total: filePaths.length,
        fileName: '',
        percent: 100,
        message: '¡Todos los mods fueron subidos exitosamente!'
      });
    }

    return { success: true, uploaded: results };
  }

  _recordInLockFile(instancePath, lockEntry) {
    try {
      const lockPath = path.join(instancePath, 'mods-lock.json');
      let data = {};
      if (fs.existsSync(lockPath)) {
        try { data = JSON.parse(fs.readFileSync(lockPath, 'utf8')); } catch (_) {}
      }
      if (!Array.isArray(data.mods)) data.mods = [];

      // Quitar si ya existía entrada previa con el mismo fileName
      data.mods = data.mods.filter((m) => m.fileName !== lockEntry.fileName);
      data.mods.push(lockEntry);
      data.lastUpdated = new Date().toISOString();

      fs.writeFileSync(lockPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      logger.warn('[GitHubMods] Aviso al actualizar mods-lock.json:', err.message);
    }
  }
}

let githubModsManagerInstance = null;
function getGitHubModsManager() {
  if (!githubModsManagerInstance) {
    githubModsManagerInstance = new GitHubModsManager();
  }
  return githubModsManagerInstance;
}

module.exports = {
  GitHubModsManager,
  getGitHubModsManager
};
