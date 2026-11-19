/**
 * ShubaCore - Short Code Profile Sharer & Importer (Bloque ShubaCore Pro)
 * Developed by SHUBATECH
 *
 * Implements:
 * 1. Exporting instances to 1-click shareable short codes (e.g. "SHUBA-9F2A").
 * 2. Uploading profile manifests to Landa6543/ShubaCore-Mods/shared-profiles/<CODE>.json
 * 3. Importing and auto-installing instances with all their mods from Modrinth, CurseForge, and GitHub.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { defaultLogger: logger } = require('../utils/logger');
const { getProfileManager } = require('../profiles/ProfileManager');
const { getGitHubModsManager } = require('../github/GitHubModsManager');
const { getModManager } = require('../mods/ModManager');
const { getConfigManager } = require('../config/ConfigManager');

class ProfileCodeSharer {
  constructor(customProfileManager = null) {
    this.profileManager = customProfileManager || getProfileManager();
    this.githubModsManager = getGitHubModsManager();
    this.modManager = getModManager();
    this.configManager = getConfigManager();

    const rootPath = (typeof this.configManager?.getRootPath === 'function' ? this.configManager.getRootPath() : this.configManager?.configDir) || path.join(process.cwd(), '.shubacore-data');
    this.sharedProfilesDir = path.join(rootPath, 'shared-profiles');
    if (!fs.existsSync(this.sharedProfilesDir)) {
      try { fs.mkdirSync(this.sharedProfilesDir, { recursive: true }); } catch (_) {}
    }
  }

  /**
   * Genera un código corto único (ej. "SHUBA-9F2A")
   */
  generateShortCode(seed = '') {
    const raw = seed + Date.now().toString() + Math.random().toString();
    const hash = crypto.createHash('md5').update(raw).digest('hex').toUpperCase();
    return `SHUBA-${hash.slice(0, 4)}`;
  }

  /**
   * Normaliza un código corto
   */
  normalizeCode(code) {
    if (!code) return '';
    let clean = String(code).trim().toUpperCase();
    if (!clean.startsWith('SHUBA-')) {
      clean = `SHUBA-${clean}`;
    }
    return clean;
  }

  /**
   * Exporta una instancia a un código corto y lo sube al repositorio de GitHub
   */
  async exportProfileToCode(profileId) {
    const profile = (profileId ? this.profileManager.getById(profileId) : null) || this.profileManager.getActive();
    if (!profile) {
      throw new Error('Perfil no encontrado para exportar.');
    }

    const instancePath = profile.instancePath || this.profileManager.getInstancePath(profile.id);
    const mods = this.modManager.scanAndSyncMods(instancePath);

    // Construir manifiesto ligero
    const manifestMods = (Array.isArray(mods) ? mods : []).map((m) => ({
      name: m.name || m.fileName,
      fileName: m.fileName,
      source: m.source || 'custom',
      projectId: m.projectId || null,
      fileId: m.fileId || null,
      versionId: m.versionId || null,
      downloadUrl: m.downloadUrl || null
    }));

    const shortCode = this.generateShortCode(profile.name + profile.id);

    // Resolver icono de la instancia para incluirlo en el paquete compartido
    let iconBase64 = null;
    const iconPath = path.join(instancePath, 'icon.png');
    if (fs.existsSync(iconPath)) {
      try {
        iconBase64 = fs.readFileSync(iconPath).toString('base64');
      } catch (_) {}
    } else if (profile.icon && profile.icon.startsWith('data:image/')) {
      const parts = profile.icon.split(',');
      if (parts[1]) iconBase64 = parts[1];
    }

    const manifest = {
      formatVersion: 1,
      code: shortCode,
      name: profile.name,
      gameVersion: profile.gameVersion || profile.mcVersion || '1.21.1',
      loader: profile.loader || 'neoforge',
      loaderVersion: profile.loaderVersion || null,
      iconBase64: iconBase64 || null,
      createdAt: new Date().toISOString(),
      generator: 'ShubaCore Pro v1.1.0',
      modsCount: manifestMods.length,
      mods: manifestMods
    };

    const manifestJson = JSON.stringify(manifest, null, 2);

    // Guardar copia local de respaldo
    const localFilePath = path.join(this.sharedProfilesDir, `${shortCode}.json`);
    try {
      fs.writeFileSync(localFilePath, manifestJson, 'utf8');
    } catch (_) {}

    // Subir a GitHub: Landa6543/ShubaCore-Mods/shared-profiles/<shortCode>.json
    let uploadedToGitHub = false;
    let githubUrl = null;
    try {
      const token = this.githubModsManager.resolveToken();
      const { owner, repo } = this.githubModsManager.getRepoInfo();
      const targetPath = `shared-profiles/${shortCode}.json`;
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${targetPath}`;

      const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `token ${token}` : '',
          'User-Agent': 'SHUBATECH-ShubaCore-Launcher/1.1.0',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `feat(share): publicar perfil compartido ${shortCode} (${profile.name})`,
          content: Buffer.from(manifestJson, 'utf8').toString('base64'),
          branch: 'main'
        })
      });

      if (res.ok) {
        uploadedToGitHub = true;
        githubUrl = `https://github.com/${owner}/${repo}/blob/main/${targetPath}`;
        logger.info(`[ProfileCodeSharer] Perfil publicado exitosamente en GitHub: ${shortCode}`);
      } else {
        const errText = await res.text();
        logger.warn(`[ProfileCodeSharer] Aviso al subir a GitHub (${res.status}): ${errText}`);
      }
    } catch (ghErr) {
      logger.warn(`[ProfileCodeSharer] No se pudo subir a GitHub: ${ghErr.message}`);
    }

    return {
      success: true,
      code: shortCode,
      profileName: profile.name,
      mcVersion: profile.mcVersion || '1.21.1',
      loader: profile.loader || 'vanilla',
      modsCount: manifestMods.length,
      uploadedToGitHub,
      githubUrl,
      localBackup: localFilePath
    };
  }

  /**
   * Lee el manifiesto correspondiente a un código corto desde GitHub o respaldo local
   */
  async fetchManifestByCode(rawCode) {
    const code = this.normalizeCode(rawCode);
    const { owner, repo } = this.githubModsManager.getRepoInfo();

    // 1. Intentar descargar directamente desde raw.githubusercontent.com
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/shared-profiles/${code}.json`;
    try {
      const res = await fetch(rawUrl, {
        headers: { 'User-Agent': 'SHUBATECH-ShubaCore-Launcher/1.1.0' }
      });
      if (res.ok) {
        const json = await res.json();
        return json;
      }
    } catch (_) {}

    // 2. Intentar consultar mediante GitHub REST API
    try {
      const token = this.githubModsManager.resolveToken();
      const headers = { 'User-Agent': 'SHUBATECH-ShubaCore-Launcher/1.1.0' };
      if (token) headers['Authorization'] = `token ${token}`;

      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/shared-profiles/${code}.json`;
      const res = await fetch(apiUrl, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.content) {
          const rawBuf = Buffer.from(data.content, 'base64').toString('utf8');
          return JSON.parse(rawBuf);
        }
      }
    } catch (_) {}

    // 3. Fallback: buscar en directorio local de respaldo
    const localPath = path.join(this.sharedProfilesDir, `${code}.json`);
    if (fs.existsSync(localPath)) {
      try {
        return JSON.parse(fs.readFileSync(localPath, 'utf8'));
      } catch (_) {}
    }

    throw new Error(`No se encontró ningún perfil compartido con el código "${code}". Verifica que el código sea correcto.`);
  }

  /**
   * Importa una instancia completa por código corto o fuente externa (CurseForge / Modrinth / URL / archivo)
   */
  async importProfileFromCode(args, legacyCustomName = null) {
    let code, customName, onProgress;
    if (typeof args === 'string') {
      code = args;
      customName = legacyCustomName;
    } else {
      ({ code, customName = null, onProgress = null } = (args || {}));
    }

    if (!code || typeof code !== 'string') {
      throw new Error('El código, enlace o identificador de modpack es inválido.');
    }

    const trimmed = code.trim();

    // 1. Detectar si es un enlace, ID o slug de CurseForge, Modrinth o archivo local
    if (this._isExternalModpackSource(trimmed)) {
      return await this._importExternalModpack(trimmed, customName, onProgress);
    }

    // 2. Si es un código ShubaCore estándar (ej. SHUBA-XXXX)
    const manifest = await this.fetchManifestByCode(trimmed);
    if (!manifest || !manifest.gameVersion) {
      throw new Error('El manifiesto del modpack está corrupto o es inválido.');
    }

    const instanceName = customName || `${manifest.name || 'Modpack'} (${manifest.code})`;
    logger.info(`[ProfileCodeSharer] Importando instancia "${instanceName}" (MC ${manifest.gameVersion}, ${manifest.loader})...`);

    if (onProgress) {
      onProgress({ percent: 10, message: `Creando instancia "${instanceName}"...` });
    }

    // 1. Crear el nuevo perfil en ShubaCore
    const newProfile = this.profileManager.createProfile({
      name: instanceName,
      gameVersion: manifest.gameVersion,
      loader: manifest.loader || 'neoforge',
      loaderVersion: manifest.loaderVersion || null,
      memory: { min: '2G', max: '6G' }
    });

    const instancePath = newProfile.instancePath || this.profileManager.getInstancePath(newProfile.id);
    const modsDir = path.join(instancePath, 'mods');
    if (!fs.existsSync(modsDir)) {
      fs.mkdirSync(modsDir, { recursive: true });
    }

    // Restaurar icono si el manifiesto incluye iconBase64
    if (manifest.iconBase64) {
      try {
        const iconBuf = Buffer.from(manifest.iconBase64, 'base64');
        const iconFile = path.join(instancePath, 'icon.png');
        fs.writeFileSync(iconFile, iconBuf);
        const iconUrl = `data:image/png;base64,${manifest.iconBase64}`;
        this.profileManager.updateProfile(newProfile.id, { icon: iconUrl });
        newProfile.icon = iconUrl;
        try { this.profileManager.saveCustomIcon(iconUrl); } catch (_) {}
      } catch (_) {}
    }

    // 2. Descargar e instalar mods desde sus respectivas fuentes
    const modsList = Array.isArray(manifest.mods) ? manifest.mods : [];
    let installedCount = 0;
    const lockEntries = [];

    for (let i = 0; i < modsList.length; i++) {
      const mod = modsList[i];
      const fileName = mod.fileName || `${mod.name}.jar`;
      const targetFile = path.join(modsDir, fileName);

      if (onProgress) {
        const pct = Math.round(15 + ((i + 1) / modsList.length) * 80);
        onProgress({
          percent: pct,
          message: `Descargando mod [${i + 1}/${modsList.length}]: ${mod.name || fileName}`
        });
      }

      try {
        let downloaded = false;

        // Caso A: Tiene downloadUrl directa (ej. GitHub Release o asset directo)
        if (mod.downloadUrl) {
          const res = await fetch(mod.downloadUrl, {
            headers: { 'User-Agent': 'SHUBATECH-ShubaCore-Launcher/1.1.0' }
          });
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            fs.writeFileSync(targetFile, buf);
            downloaded = true;
          }
        }

        // Caso B: Modrinth
        if (!downloaded && (mod.source === 'modrinth' || mod.projectId)) {
          try {
            await this.modManager.downloadMod({
              instancePath,
              projectId: mod.projectId,
              versionId: mod.versionId,
              source: 'modrinth',
              mcVersion: manifest.gameVersion,
              loader: manifest.loader
            });
            downloaded = true;
          } catch (_) {}
        }

        // Caso C: CurseForge
        if (!downloaded && mod.source === 'curseforge') {
          try {
            await this.modManager.downloadMod({
              instancePath,
              projectId: mod.projectId,
              fileId: mod.fileId,
              source: 'curseforge',
              mcVersion: manifest.gameVersion,
              loader: manifest.loader
            });
            downloaded = true;
          } catch (_) {}
        }

        if (downloaded || fs.existsSync(targetFile)) {
          installedCount++;
          lockEntries.push({
            name: mod.name || fileName,
            fileName,
            source: mod.source || 'custom',
            projectId: mod.projectId || null,
            versionId: mod.versionId || null,
            fileId: mod.fileId || null
          });
        }
      } catch (modErr) {
        logger.warn(`[ProfileCodeSharer] No se pudo instalar "${fileName}": ${modErr.message}`);
      }
    }

    // 3. Generar archivo mods-lock.json para seguimiento idéntico
    const lockPath = path.join(instancePath, 'mods-lock.json');
    try {
      fs.writeFileSync(
        lockPath,
        JSON.stringify(
          {
            generator: 'ShubaCore Pro Code Importer',
            importedFromCode: manifest.code,
            lastUpdated: new Date().toISOString(),
            mods: lockEntries
          },
          null,
          2
        ),
        'utf8'
      );
    } catch (_) {}

    if (onProgress) {
      onProgress({ percent: 100, message: `¡Instancia creada con éxito (${installedCount} mods instalados)!` });
    }

    logger.info(`[ProfileCodeSharer] ✅ Importación completada: "${instanceName}" con ${installedCount} mods.`);
    return {
      success: true,
      profile: newProfile,
      totalMods: modsList.length,
      installedCount
    };
  }

  isValidProfileReference(input) {
    if (!input || typeof input !== 'string') return false;
    const clean = input.trim();
    if (this._isExternalModpackSource(clean)) return true;
    if (/^(SHUBA-)?[A-F0-9]{4}$/i.test(clean)) return true;
    if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(clean)) return true;
    return false;
  }

  _isExternalModpackSource(input) {
    if (!input || typeof input !== 'string') return false;
    const clean = input.trim();
    if (fs.existsSync(clean) && /\.(zip|mrpack|shubapack)$/i.test(clean)) return true;
    if (/^https?:\/\//i.test(clean)) return true;
    if (/^(cf|curseforge|modrinth|mr):/i.test(clean)) return true;
    if (/^\d{5,9}$/.test(clean)) return true;
    if (!/^(SHUBA-)?[A-F0-9]{4}$/i.test(clean) && (clean.includes('-') || clean.includes('_') || clean.includes('.'))) {
      return true;
    }
    return false;
  }

  async _importExternalModpack(input, customName = null, onProgress = null) {
    const clean = input.trim();
    logger.info(`[ProfileCodeSharer] Detectada fuente externa de modpack: "${clean}"`);

    // 1. Archivo local existente
    if (fs.existsSync(clean) && /\.(zip|mrpack|shubapack)$/i.test(clean)) {
      if (onProgress) onProgress({ percent: 15, message: `Desempaquetando archivo local: ${path.basename(clean)}...` });
      const installRes = await this.modManager.installModpackFile({
        packPath: clean,
        createProfile: true,
        instancePath: null,
        profileManager: this.profileManager,
        onProgress: (prog) => {
          if (onProgress) onProgress({ percent: 20 + Math.round((prog?.percent || 0) * 0.75), message: prog?.message || 'Instalando mods...' });
        }
      });
      if (customName && installRes.profile) {
        this.profileManager.updateProfile(installRes.profile.id, { name: customName });
        installRes.profile.name = customName;
      }
      return {
        success: true,
        profile: installRes.profile,
        installedCount: installRes.filesCount || installRes.allMods?.length || 0
      };
    }

    // 2. Enlace directo a un archivo .zip o .mrpack en la web
    if (/^https?:\/\/.*?\.(zip|mrpack|shubapack)(\?.*)?$/i.test(clean)) {
      if (onProgress) onProgress({ percent: 10, message: 'Descargando paquete de modpack remoto...' });
      const tempDir = path.join(this.profileManager.sharedRoot || path.join(process.cwd(), '.shubacore-data'), 'temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const tempExt = clean.toLowerCase().includes('.mrpack') ? '.mrpack' : '.zip';
      const tempFile = path.join(tempDir, `remote-pack-${Date.now()}${tempExt}`);

      const res = await fetch(clean, { headers: { 'User-Agent': 'SHUBATECH-ShubaCore-Launcher/1.1.0' } });
      if (!res.ok) throw new Error(`Error al descargar el modpack remoto (HTTP ${res.status}): ${clean}`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(tempFile, buf);

      try {
        const installRes = await this.modManager.installModpackFile({
          packPath: tempFile,
          createProfile: true,
          instancePath: null,
          profileManager: this.profileManager,
          onProgress
        });
        if (customName && installRes.profile) {
          this.profileManager.updateProfile(installRes.profile.id, { name: customName });
          installRes.profile.name = customName;
        }
        return {
          success: true,
          profile: installRes.profile,
          installedCount: installRes.filesCount || installRes.allMods?.length || 0
        };
      } finally {
        try { fs.rmSync(tempFile, { force: true }); } catch (_) {}
      }
    }

    // 3. Modrinth: modrinth.com/modpack/<slug> o mr:<slug>
    const mrMatch = clean.match(/modrinth\.com\/modpack\/([^/?#]+)/i) || clean.match(/^mr:(.+)$/i);
    if (mrMatch) {
      const slug = mrMatch[1].trim();
      if (onProgress) onProgress({ percent: 10, message: `Consultando Modrinth para "${slug}"...` });
      const mrApiUrl = `https://api.modrinth.com/v2/project/${slug}/version`;
      const res = await fetch(mrApiUrl, { headers: { 'User-Agent': 'SHUBATECH-ShubaCore-Launcher/1.1.0' } });
      if (!res.ok) throw new Error(`No se encontró el modpack "${slug}" en Modrinth (HTTP ${res.status}).`);
      const versions = await res.json();
      if (!Array.isArray(versions) || versions.length === 0) {
        throw new Error(`El modpack "${slug}" no tiene versiones disponibles en Modrinth.`);
      }
      const primaryVer = versions.find((v) => v.version_type === 'release') || versions[0];
      const mrFile = primaryVer.files?.find((f) => f.primary) || primaryVer.files?.[0];
      if (!mrFile || !mrFile.url) {
        throw new Error(`No se encontró archivo descargable para la versión ${primaryVer.name} en Modrinth.`);
      }

      if (onProgress) onProgress({ percent: 20, message: `Descargando paquete .mrpack (${mrFile.filename})...` });
      const tempDir = path.join(this.profileManager.sharedRoot || path.join(process.cwd(), '.shubacore-data'), 'temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const tempFile = path.join(tempDir, `mr-${Date.now()}-${mrFile.filename}`);

      const dlRes = await fetch(mrFile.url, { headers: { 'User-Agent': 'SHUBATECH-ShubaCore-Launcher/1.1.0' } });
      if (!dlRes.ok) throw new Error(`Error al descargar archivo desde Modrinth: HTTP ${dlRes.status}`);
      fs.writeFileSync(tempFile, Buffer.from(await dlRes.arrayBuffer()));

      try {
        const installRes = await this.modManager.installModpackFile({
          packPath: tempFile,
          createProfile: true,
          instancePath: null,
          profileManager: this.profileManager,
          onProgress
        });
        if (customName && installRes.profile) {
          this.profileManager.updateProfile(installRes.profile.id, { name: customName });
          installRes.profile.name = customName;
        }
        return {
          success: true,
          profile: installRes.profile,
          installedCount: installRes.filesCount || installRes.allMods?.length || 0
        };
      } finally {
        try { fs.rmSync(tempFile, { force: true }); } catch (_) {}
      }
    }

    // 4. CurseForge Shared Profile (enlaces de 7 días, códigos o UUIDs directos)
    const isDirectUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(clean) || /^[0-9a-fA-F]{32}$/.test(clean);
    const cfShareMatch = clean.match(/curseforge\.com\/(?:minecraft\/)?share\/([^/?#]+)/i) || clean.match(/^cf-share:(.+)$/i);
    if (cfShareMatch || isDirectUuid) {
      const shareCode = decodeURIComponent((cfShareMatch ? cfShareMatch[1] : clean).trim());
      if (onProgress) onProgress({ percent: 10, message: `Consultando perfil compartido de CurseForge (${shareCode})...` });

      const apiKey = (typeof this.modManager?._getCurseForgeKey === 'function')
        ? this.modManager._getCurseForgeKey()
        : '$2a$10$bL4bIL5pUWqfcO7KQtnMReakwtfHbNKh6v1uTpKlzhwoueEJQnPnm';

      const shareApiUrl = `https://api.curseforge.com/v1/shared-profile/${encodeURIComponent(shareCode)}`;
      const res = await fetch(shareApiUrl, {
        headers: {
          'x-api-key': apiKey,
          'User-Agent': 'SHUBATECH-ShubaCore-Launcher/1.1.0'
        }
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(`El código o enlace compartido de CurseForge "${shareCode}" no existe o ha expirado (validez máxima de 7 días).`);
        }
        throw new Error(`Error HTTP ${res.status} al consultar el perfil compartido en CurseForge.`);
      }

      const contentType = res.headers.get('content-type') || '';
      let zipBuffer = null;

      if (contentType.includes('application/json')) {
        const json = await res.json();
        const dlUrl = json.data?.downloadUrl || json.downloadUrl || json.url;
        if (dlUrl) {
          if (onProgress) onProgress({ percent: 25, message: 'Descargando paquete de modpack CurseForge...' });
          const dlRes = await fetch(dlUrl, {
            headers: { 'User-Agent': 'SHUBATECH-ShubaCore-Launcher/1.1.0' }
          });
          if (!dlRes.ok) throw new Error(`Fallo al descargar archivo de modpack: HTTP ${dlRes.status}`);
          zipBuffer = Buffer.from(await dlRes.arrayBuffer());
        } else {
          throw new Error('La respuesta de CurseForge no contiene una URL de descarga válida para este perfil compartido.');
        }
      } else {
        zipBuffer = Buffer.from(await res.arrayBuffer());
      }

      const tempDir = path.join(this.profileManager.sharedRoot || path.join(process.cwd(), '.shubacore-data'), 'temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const tempFile = path.join(tempDir, `cf-shared-${Date.now()}-${shareCode}.zip`);
      fs.writeFileSync(tempFile, zipBuffer);

      try {
        const installRes = await this.modManager.installModpackFile({
          packPath: tempFile,
          createProfile: true,
          instancePath: null,
          profileManager: this.profileManager,
          onProgress
        });
        if (customName && installRes.profile) {
          this.profileManager.updateProfile(installRes.profile.id, { name: customName });
          installRes.profile.name = customName;
        }
        return {
          success: true,
          profile: installRes.profile,
          installedCount: installRes.filesCount || installRes.allMods?.length || 0
        };
      } finally {
        try { fs.rmSync(tempFile, { force: true }); } catch (_) {}
      }
    }

    // 5. CurseForge: curseforge.com/minecraft/... (modpacks, mc-mods, projects) o cf:<id> o numeric ID o slug
    let cfSlugOrId = clean;
    let explicitFileId = null;

    const cfUrlMatch = clean.match(/curseforge\.com\/(?:minecraft\/)?(?:modpacks|mc-mods|projects)\/([^/?#]+)(?:\/files\/(\d+))?/i);
    if (cfUrlMatch) {
      cfSlugOrId = decodeURIComponent(cfUrlMatch[1].trim());
      if (cfUrlMatch[2]) explicitFileId = parseInt(cfUrlMatch[2], 10);
    } else if (/^(cf|curseforge):(.+)$/i.test(clean)) {
      cfSlugOrId = clean.replace(/^(cf|curseforge):/i, '').trim();
    } else if (/^https?:\/\//i.test(clean)) {
      const parts = clean.split('?')[0].split('#')[0].replace(/\/+$/, '').split('/');
      cfSlugOrId = decodeURIComponent(parts[parts.length - 1] || clean);
    }

    if (onProgress) onProgress({ percent: 10, message: `Consultando CurseForge para "${cfSlugOrId}"...` });
    const apiKey = (typeof this.modManager?._getCurseForgeKey === 'function') ? this.modManager._getCurseForgeKey() : '$2a$10$bL4bIL5pUWqfcO7KQtnMReakwtfHbNKh6v1uTpKlzhwoueEJQnPnm';

    let project = null;
    const isNumericId = /^\d+$/.test(cfSlugOrId);

    if (isNumericId) {
      try {
        const pRes = await fetch(`https://api.curseforge.com/v1/mods/${cfSlugOrId}`, {
          headers: { 'x-api-key': apiKey, 'User-Agent': 'SHUBATECH-ShubaCore-Launcher/1.1.0' }
        });
        if (pRes.ok) {
          const pJson = await pRes.json();
          project = pJson.data;
        }
      } catch (_) {}
    }

    if (!project) {
      // 1. Intentar búsqueda filtrando por Modpacks (classId=4471)
      try {
        const sRes = await fetch(`https://api.curseforge.com/v1/mods/search?gameId=432&classId=4471&searchFilter=${encodeURIComponent(cfSlugOrId)}&pageSize=10`, {
          headers: { 'x-api-key': apiKey, 'User-Agent': 'SHUBATECH-ShubaCore-Launcher/1.1.0' }
        });
        if (sRes.ok) {
          const sJson = await sRes.json();
          const found = sJson.data || [];
          project = found.find((p) => p.slug?.toLowerCase() === cfSlugOrId.toLowerCase()) ||
                    found.find((p) => p.name?.toLowerCase() === cfSlugOrId.toLowerCase()) ||
                    found[0];
        }
      } catch (_) {}
    }

    if (!project) {
      // 2. Fallback: búsqueda global en Minecraft sin classId
      try {
        const sRes2 = await fetch(`https://api.curseforge.com/v1/mods/search?gameId=432&searchFilter=${encodeURIComponent(cfSlugOrId)}&pageSize=10`, {
          headers: { 'x-api-key': apiKey, 'User-Agent': 'SHUBATECH-ShubaCore-Launcher/1.1.0' }
        });
        if (sRes2.ok) {
          const sJson2 = await sRes2.json();
          const found2 = sJson2.data || [];
          project = found2.find((p) => p.slug?.toLowerCase() === cfSlugOrId.toLowerCase()) ||
                    found2.find((p) => p.name?.toLowerCase() === cfSlugOrId.toLowerCase()) ||
                    found2[0];
        }
      } catch (_) {}
    }

    if (!project) {
      throw new Error(`No se encontró ningún modpack en CurseForge con la referencia "${cfSlugOrId}".`);
    }

    // Obtener archivo
    let targetFile = null;
    if (explicitFileId) {
      const fRes = await fetch(`https://api.curseforge.com/v1/mods/${project.id}/files/${explicitFileId}`, {
        headers: { 'x-api-key': apiKey, 'User-Agent': 'SHUBATECH-ShubaCore-Launcher/1.1.0' }
      });
      if (fRes.ok) {
        const fJson = await fRes.json();
        targetFile = fJson.data;
      }
    }

    if (!targetFile && project.latestFiles && project.latestFiles.length > 0) {
      targetFile = project.latestFiles.find((f) => f.releaseType === 1) || project.latestFiles[0];
    }

    if (!targetFile) {
      throw new Error(`El modpack "${project.name}" no tiene archivos de descarga disponibles en CurseForge.`);
    }

    let downloadUrl = targetFile.downloadUrl;
    if (!downloadUrl) {
      try {
        const urlRes = await fetch(`https://api.curseforge.com/v1/mods/${project.id}/files/${targetFile.id}/download-url`, {
          headers: { 'x-api-key': apiKey, 'User-Agent': 'SHUBATECH-ShubaCore-Launcher/1.1.0' }
        });
        if (urlRes.ok) {
          const urlJson = await urlRes.json();
          downloadUrl = urlJson.data;
        }
      } catch (_) {}
    }

    if (!downloadUrl && targetFile.id && targetFile.fileName) {
      const part1 = Math.floor(targetFile.id / 1000);
      const part2 = targetFile.id % 1000;
      downloadUrl = `https://edge.forgecdn.net/files/${part1}/${part2}/${encodeURIComponent(targetFile.fileName)}`;
    }

    if (!downloadUrl) {
      throw new Error(`No se pudo resolver el enlace de descarga para "${targetFile.fileName}" en CurseForge.`);
    }

    if (onProgress) onProgress({ percent: 20, message: `Descargando modpack "${project.name}" (${targetFile.fileName})...` });
    const tempDir = path.join(this.profileManager.sharedRoot || path.join(process.cwd(), '.shubacore-data'), 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const tempFile = path.join(tempDir, `cf-${project.id}-${targetFile.id}.zip`);

    const dlRes = await fetch(downloadUrl, { headers: { 'User-Agent': 'SHUBATECH-ShubaCore-Launcher/1.1.0' } });
    if (!dlRes.ok) throw new Error(`Error al descargar el paquete de CurseForge (HTTP ${dlRes.status}): ${downloadUrl}`);
    fs.writeFileSync(tempFile, Buffer.from(await dlRes.arrayBuffer()));

    try {
      const installRes = await this.modManager.installModpackFile({
        packPath: tempFile,
        createProfile: true,
        instancePath: null,
        profileManager: this.profileManager,
        onProgress,
        iconUrl: project.logo?.url || null
      });

      if (customName && installRes.profile) {
        this.profileManager.updateProfile(installRes.profile.id, { name: customName });
        installRes.profile.name = customName;
      }

      return {
        success: true,
        profile: installRes.profile,
        installedCount: installRes.filesCount || installRes.allMods?.length || 0
      };
    } finally {
      try { fs.rmSync(tempFile, { force: true }); } catch (_) {}
    }
  }
}

let codeSharerInstance = null;
function getProfileCodeSharer() {
  if (!codeSharerInstance) {
    codeSharerInstance = new ProfileCodeSharer();
  }
  return codeSharerInstance;
}

module.exports = {
  ProfileCodeSharer,
  getProfileCodeSharer
};
