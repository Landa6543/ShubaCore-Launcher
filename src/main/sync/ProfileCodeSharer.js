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
  constructor() {
    this.profileManager = getProfileManager();
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
    const manifest = {
      formatVersion: 1,
      code: shortCode,
      name: profile.name,
      gameVersion: profile.gameVersion || profile.mcVersion || '1.21.1',
      loader: profile.loader || 'neoforge',
      loaderVersion: profile.loaderVersion || null,
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
   * Importa una instancia completa por código corto y descarga todos sus mods
   */
  async importProfileFromCode({ code, customName = null, onProgress = null }) {
    const manifest = await this.fetchManifestByCode(code);
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
