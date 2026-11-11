/**
 * ShubaCore - Cloud Profile / Modpack Synchronizer (1-Click Sync)
 * Developed by SHUBATECH
 * Allows creators to publish lightweight .shubasync.json manifests to GitHub
 * and friends to synchronize instances in seconds without massive .zip transfers.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const { getConfigManager } = require('../config/ConfigManager');
const { getProfileManager } = require('../profiles/ProfileManager');
const { getAuthManager } = require('../auth/AuthManager');
const { getGitHubModsManager } = require('../github/GitHubModsManager');
const { defaultLogger: logger } = require('../utils/logger');

class ProfileSyncManager {
  constructor() {
    this.configManager = getConfigManager();
    this.profileManager = getProfileManager();
    this.authManager = getAuthManager();
    this.githubModsManager = getGitHubModsManager();
  }

  _slugify(name) {
    return (name || 'perfil')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'perfil';
  }

  _calcSha1(filePath) {
    try {
      const buf = fs.readFileSync(filePath);
      return crypto.createHash('sha1').update(buf).digest('hex');
    } catch (_) {
      return null;
    }
  }

  /**
   * Publica o actualiza el perfil en GitHub (shared-profiles/<slug>.shubasync.json)
   */
  async publishProfile(profileId, options = {}) {
    const profile = profileId
      ? this.profileManager.getById(profileId)
      : this.profileManager.getActive();

    if (!profile) throw new Error('No se encontró el perfil especificado para publicar.');

    const instancePath = this.profileManager.getInstancePath(profile.id);
    const modsDir = path.join(instancePath, 'mods');
    const lockPath = path.join(instancePath, 'mods-lock.json');

    let lockData = { mods: [] };
    if (fs.existsSync(lockPath)) {
      try { lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8')); } catch (_) {}
    }
    const lockMap = new Map((lockData.mods || []).map((m) => [m.fileName?.toLowerCase(), m]));

    // 1. Escanear todos los mods instalados
    const installedFiles = fs.existsSync(modsDir)
      ? fs.readdirSync(modsDir).filter((f) => f.toLowerCase().endsWith('.jar'))
      : [];

    const modsList = [];
    for (const fName of installedFiles) {
      const fPath = path.join(modsDir, fName);
      const sha1 = this._calcSha1(fPath);
      const stat = fs.statSync(fPath);
      const lockEntry = lockMap.get(fName.toLowerCase()) || {};

      modsList.push({
        fileName: fName,
        sha1: sha1 || lockEntry.sha1 || '',
        size: stat.size,
        source: lockEntry.source || 'custom',
        projectId: lockEntry.projectId || null,
        fileId: lockEntry.fileId || null,
        versionId: lockEntry.versionId || null,
        downloadUrl: lockEntry.downloadUrl || null,
        modName: lockEntry.name || lockEntry.modName || fName.replace(/\.jar$/i, '')
      });
    }

    // 2. Empaquetar configs opcionales si se solicitó
    let configsZipBase64 = null;
    const includeConfigs = options.includeConfigs !== false;
    if (includeConfigs) {
      const configDir = path.join(instancePath, 'config');
      if (fs.existsSync(configDir)) {
        try {
          const zip = new AdmZip();
          this._addConfigFolderToZip(zip, configDir, '');
          const zipBuf = zip.toBuffer();
          configsZipBase64 = zipBuf.toString('base64');
          logger.info(`[ProfileSync] Carpeta config empaquetada: ${(zipBuf.length / 1024).toFixed(1)} KB`);
        } catch (zipErr) {
          logger.warn('[ProfileSync] Aviso al empaquetar config:', zipErr.message);
        }
      }
    }

    const { owner, repo } = this.githubModsManager.getRepoInfo();
    const slug = this._slugify(profile.name);
    const author = this.authManager.getCurrentAccount()?.name || 'LanderAlo';

    const manifest = {
      formatVersion: 1,
      name: profile.name,
      slug,
      author,
      mcVersion: profile.mcVersion || '1.21.1',
      loader: profile.loader || 'neoforge',
      loaderVersion: profile.loaderVersion || '',
      publishedAt: new Date().toISOString(),
      modCount: modsList.length,
      mods: modsList,
      hasConfigs: !!configsZipBase64,
      configsZipBase64
    };

    const manifestJson = JSON.stringify(manifest, null, 2);
    const remotePath = `shared-profiles/${slug}.shubasync.json`;
    const headers = this.githubModsManager._getAuthHeaders();

    logger.info(`[ProfileSync] Subiendo manifiesto "${remotePath}" (${modsList.length} mods) a https://github.com/${owner}/${repo}...`);

    // Comprobar si el archivo ya existe para obtener su SHA
    let existingSha = null;
    try {
      const checkRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${remotePath}`, { headers });
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        existingSha = checkData.sha;
      }
    } catch (_) {}

    const putBody = {
      message: `Actualizar perfil compartido: ${profile.name} (${modsList.length} mods)`,
      content: Buffer.from(manifestJson).toString('base64')
    };
    if (existingSha) putBody.sha = existingSha;

    const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${remotePath}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody)
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      throw new Error(`Error de GitHub al publicar perfil (HTTP ${putRes.status}): ${errText}`);
    }

    const shareCode = `${slug}`;
    logger.info(`⚡ [ProfileSync] ¡Perfil "${profile.name}" publicado exitosamente en GitHub! Código: ${shareCode}`);

    return {
      success: true,
      slug,
      profileName: profile.name,
      modCount: modsList.length,
      hasConfigs: !!configsZipBase64,
      shareCode,
      remotePath,
      repoUrl: `https://github.com/${owner}/${repo}/blob/main/${remotePath}`
    };
  }

  _addConfigFolderToZip(zip, currentDir, zipRelDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(currentDir, ent.name);
      const zipPath = zipRelDir ? `${zipRelDir}/${ent.name}` : ent.name;

      if (ent.isDirectory()) {
        // Excluir carpetas temporales o de cache innecesarias
        if (ent.name === 'cache' || ent.name === 'logs' || ent.name === 'backups') continue;
        this._addConfigFolderToZip(zip, fullPath, zipPath);
      } else if (ent.isFile()) {
        // Excluir archivos gigantes o sensibles
        const stat = fs.statSync(fullPath);
        if (stat.size > 2 * 1024 * 1024) continue; // Saltear archivos mayores a 2MB
        if (ent.name.endsWith('.tmp') || ent.name.endsWith('.bak')) continue;
        zip.addLocalFile(fullPath, zipRelDir);
      }
    }
  }

  /**
   * Obtiene la lista de perfiles publicados disponibles en GitHub
   */
  async listSharedProfiles() {
    const { owner, repo } = this.githubModsManager.getRepoInfo();
    const headers = this.githubModsManager._getAuthHeaders();
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/shared-profiles`;

    logger.info(`[ProfileSync] Listando perfiles compartidos desde https://github.com/${owner}/${repo}...`);
    const res = await fetch(url, { headers });
    if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error(`Error al consultar perfiles compartidos en GitHub (HTTP ${res.status})`);
    }

    const items = await res.json();
    if (!Array.isArray(items)) return [];

    const syncFiles = items.filter((i) => i.name.endsWith('.shubasync.json'));
    const results = [];

    for (const item of syncFiles) {
      try {
        const rawRes = await fetch(item.download_url, { headers });
        if (rawRes.ok) {
          const manifest = await rawRes.json();
          results.push({
            slug: manifest.slug || item.name.replace('.shubasync.json', ''),
            name: manifest.name || item.name.replace('.shubasync.json', ''),
            author: manifest.author || owner,
            mcVersion: manifest.mcVersion || '1.21.1',
            loader: manifest.loader || 'neoforge',
            loaderVersion: manifest.loaderVersion || '',
            modCount: manifest.modCount || (manifest.mods ? manifest.mods.length : 0),
            publishedAt: manifest.publishedAt || new Date().toISOString(),
            hasConfigs: !!manifest.hasConfigs,
            downloadUrl: item.download_url
          });
        }
      } catch (e) {
        logger.warn(`[ProfileSync] Aviso al leer manifiesto ${item.name}:`, e.message);
      }
    }

    // Ordenar perfiles por fecha más reciente
    results.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    return results;
  }

  /**
   * Descarga el manifiesto completo de un perfil compartido
   */
  async getSharedProfile(slug) {
    const { owner, repo } = this.githubModsManager.getRepoInfo();
    const cleanSlug = this._slugify(slug);
    const headers = this.githubModsManager._getAuthHeaders();
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/shared-profiles/${cleanSlug}.shubasync.json`;

    logger.info(`[ProfileSync] Obteniendo manifiesto para "${cleanSlug}" desde: ${rawUrl}`);
    const res = await fetch(rawUrl, { headers });
    if (res.ok) {
      return await res.json();
    }

    // Fallback a GitHub Contents API
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/shared-profiles/${cleanSlug}.shubasync.json`;
    const apiRes = await fetch(apiUrl, { headers });
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.content) {
        const text = Buffer.from(data.content, 'base64').toString('utf8');
        return JSON.parse(text);
      }
    }

    throw new Error(`No se encontró el perfil compartido "${cleanSlug}" en ${owner}/${repo}`);
  }

  /**
   * Sincroniza una instancia local con el manifiesto remoto en 1 clic
   */
  async syncProfileToInstance(profileId, slugOrManifest, onProgress) {
    let manifest = slugOrManifest;
    if (typeof slugOrManifest === 'string') {
      manifest = await this.getSharedProfile(slugOrManifest);
    }
    if (!manifest || !Array.isArray(manifest.mods)) {
      throw new Error('Manifiesto de sincronización inválido o sin lista de mods.');
    }

    const profile = profileId
      ? this.profileManager.getById(profileId)
      : this.profileManager.getActive();
    if (!profile) throw new Error('No se encontró la instancia destino para sincronizar.');

    const instancePath = this.profileManager.getInstancePath(profile.id);
    const modsDir = path.join(instancePath, 'mods');
    if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });

    logger.info(`===========================================================`);
    logger.info(`[ProfileSync] Sincronizando "${profile.name}" con perfil remoto "${manifest.name}"`);
    logger.info(`Mods remotos: ${manifest.mods.length} | MC ${manifest.mcVersion} (${manifest.loader})`);
    logger.info(`===========================================================`);

    if (onProgress) onProgress({ type: 'start', message: 'Analizando diferencias con el perfil remoto...', percent: 5 });

    // 1. Escanear mods locales
    const localJars = fs.readdirSync(modsDir).filter((f) => f.toLowerCase().endsWith('.jar'));
    const localModMap = new Map();
    for (const f of localJars) {
      const fPath = path.join(modsDir, f);
      const sha1 = this._calcSha1(fPath);
      localModMap.set(f.toLowerCase(), { fileName: f, path: fPath, sha1 });
    }

    // 2. Identificar mods remotos
    const remoteModMap = new Map(manifest.mods.map((m) => [m.fileName.toLowerCase(), m]));

    // Mods a descargar: los que están en el remoto y no existen localmente (o sha1 distinto)
    const toDownload = [];
    for (const rMod of manifest.mods) {
      const local = localModMap.get(rMod.fileName.toLowerCase());
      if (!local || (rMod.sha1 && local.sha1 && rMod.sha1 !== local.sha1)) {
        toDownload.push(rMod);
      }
    }

    // Mods a quitar: los que están localmente pero el creador los quitó del pack
    const toRemove = [];
    for (const [key, local] of localModMap.entries()) {
      if (!remoteModMap.has(key)) {
        toRemove.push(local);
      }
    }

    logger.info(`[ProfileSync] Mods a descargar: ${toDownload.length} | Mods a retirar: ${toRemove.length}`);

    // 3. Desactivar o retirar mods sobrantes
    for (const oldMod of toRemove) {
      try {
        const disabledPath = `${oldMod.path}.disabled`;
        if (fs.existsSync(disabledPath)) fs.unlinkSync(disabledPath);
        fs.renameSync(oldMod.path, disabledPath);
        logger.info(`[ProfileSync] Mod retirado del pack: "${oldMod.fileName}" -> .disabled`);
      } catch (delErr) {
        logger.warn(`[ProfileSync] Aviso al retirar mod ${oldMod.fileName}:`, delErr.message);
      }
    }

    // 4. Descargar mods faltantes
    const { getModManager } = require('../mods/ModManager');
    const modManager = getModManager();
    let downloadedCount = 0;

    for (let i = 0; i < toDownload.length; i++) {
      const mod = toDownload[i];
      const pct = Math.round(15 + ((i + 1) / toDownload.length) * 75);
      if (onProgress) {
        onProgress({
          type: 'download',
          current: i + 1,
          total: toDownload.length,
          name: mod.fileName,
          percent: pct,
          message: `Descargando (${i + 1}/${toDownload.length}): ${mod.modName || mod.fileName}`
        });
      }

      try {
        let downloadSuccess = false;

        // Opción A: Tiene downloadUrl directa (GitHub o CDN directo)
        if (mod.downloadUrl && (mod.downloadUrl.startsWith('http://') || mod.downloadUrl.startsWith('https://'))) {
          logger.info(`[ProfileSync] Descargando directamente: ${mod.fileName} desde URL`);
          const res = await fetch(mod.downloadUrl, { headers: { 'User-Agent': 'ShubaCore-Launcher' } });
          if (res.ok) {
            const buf = await res.arrayBuffer();
            fs.writeFileSync(path.join(modsDir, mod.fileName), Buffer.from(buf));
            downloadSuccess = true;
          }
        }

        // Opción B: Modrinth (por projectId / versionId o slug)
        if (!downloadSuccess && mod.source === 'modrinth') {
          try {
            const mId = mod.versionId || mod.projectId;
            if (mId) {
              await modManager.downloadContent({
                projectId: mod.projectId,
                versionId: mod.versionId,
                source: 'modrinth',
                type: 'mods',
                instancePath,
                fileName: mod.fileName
              });
              downloadSuccess = true;
            }
          } catch (_) {}
        }

        // Opción C: CurseForge (por projectId / fileId)
        if (!downloadSuccess && mod.source === 'curseforge') {
          try {
            if (mod.projectId && mod.fileId) {
              await modManager.downloadContent({
                projectId: mod.projectId,
                fileId: mod.fileId,
                source: 'curseforge',
                type: 'mods',
                instancePath,
                fileName: mod.fileName
              });
              downloadSuccess = true;
            }
          } catch (_) {}
        }

        // Opción D: Mod custom en GitHub repositorio oficial
        if (!downloadSuccess && mod.source === 'github') {
          try {
            await this.githubModsManager.downloadCustomMod({
              downloadUrl: mod.downloadUrl,
              fileName: mod.fileName,
              instancePath
            });
            downloadSuccess = true;
          } catch (_) {}
        }

        if (downloadSuccess) {
          downloadedCount++;
          logger.info(`[ProfileSync] ✔ Mod sincronizado con éxito: ${mod.fileName}`);
        } else {
          logger.warn(`[ProfileSync] No se pudo resolver descarga automática para: ${mod.fileName}`);
        }
      } catch (dlErr) {
        logger.error(`[ProfileSync] Error al sincronizar mod ${mod.fileName}:`, dlErr);
      }
    }

    // 5. Aplicar configuraciones si están presentes
    if (manifest.hasConfigs && manifest.configsZipBase64) {
      if (onProgress) onProgress({ type: 'configs', percent: 95, message: 'Aplicando configuraciones de mods sincronizadas...' });
      try {
        const zipBuf = Buffer.from(manifest.configsZipBase64, 'base64');
        const zip = new AdmZip(zipBuf);
        const configDir = path.join(instancePath, 'config');
        if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
        zip.extractAllTo(configDir, true);
        logger.info(`[ProfileSync] ✔ Configuraciones (config/) restauradas y aplicadas.`);
      } catch (cfgErr) {
        logger.warn('[ProfileSync] Aviso al restaurar configuraciones:', cfgErr.message);
      }
    }

    // 6. Actualizar mods-lock.json con el manifiesto completo
    try {
      const lockData = {
        name: manifest.name,
        slug: manifest.slug,
        syncedFrom: manifest.slug,
        syncedAt: new Date().toISOString(),
        mcVersion: manifest.mcVersion,
        loader: manifest.loader,
        loaderVersion: manifest.loaderVersion,
        mods: manifest.mods
      };
      fs.writeFileSync(path.join(instancePath, 'mods-lock.json'), JSON.stringify(lockData, null, 2), 'utf8');
    } catch (_) {}

    // 7. Actualizar versión del perfil si es compatible
    try {
      this.profileManager.updateProfile(profile.id, {
        mcVersion: manifest.mcVersion || profile.mcVersion,
        loader: manifest.loader || profile.loader,
        loaderVersion: manifest.loaderVersion || profile.loaderVersion
      });
    } catch (_) {}

    if (onProgress) onProgress({ type: 'complete', percent: 100, message: '¡Instancia sincronizada al 100% con éxito!' });
    logger.info(`⚡ [ProfileSync] Sincronización completada: +${downloadedCount} descargados, -${toRemove.length} retirados.`);

    return {
      success: true,
      profileName: profile.name,
      manifestName: manifest.name,
      downloadedCount,
      removedCount: toRemove.length,
      totalMods: manifest.mods.length
    };
  }
}

let profileSyncManagerInstance = null;
function getProfileSyncManager() {
  if (!profileSyncManagerInstance) {
    profileSyncManagerInstance = new ProfileSyncManager();
  }
  return profileSyncManagerInstance;
}

module.exports = {
  ProfileSyncManager,
  getProfileSyncManager
};
