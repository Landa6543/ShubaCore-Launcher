/**
 * ShubaCore - PackPorter (.shubapack System)
 * Developed by SHUBATECH
 *
 * Implements:
 * 1. Full Export of any profile to a `.shubapack` archive:
 *    - Metadata manifest (`shubapack.json`)
 *    - Online mod references (`mods-lock.json`)
 *    - Custom / local `.jar` files in `bundled_mods/`
 *    - Full configurations in `config/`
 *    - Visual packs in `resourcepacks/` and `shaderpacks/`
 * 2. 1-Click Import of `.shubapack`:
 *    - Creates a new isolated instance automatically
 *    - Restores configs, resource packs and shaders
 *    - Unpacks bundled custom mods
 *    - Downloads online mods in parallel
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { getProfileManager } = require('../profiles/ProfileManager');
const { getModManager } = require('../mods/ModManager');
const { defaultLogger: logger } = require('../utils/logger');

class PackPorter {
  constructor(options = {}) {
    this.profileManager = options.profileManager || getProfileManager();
    this.modManager = options.modManager || getModManager();
  }

  /**
   * Helper: Añade recursivamente los archivos de un directorio a una carpeta dentro del AdmZip
   */
  _addDirectoryToZip(zip, sourceDir, zipPrefix = '') {
    if (!fs.existsSync(sourceDir)) return 0;
    let addedCount = 0;

    const walk = (currentDir, currentZipPrefix) => {
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath, path.posix.join(currentZipPrefix, item));
        } else if (stat.isFile()) {
          const zipEntryPath = path.posix.join(currentZipPrefix, item);
          zip.addLocalFile(fullPath, path.posix.dirname(zipEntryPath));
          addedCount++;
        }
      }
    };

    walk(sourceDir, zipPrefix);
    return addedCount;
  }

  /**
   * REQUISITO 4: Exporta un perfil completo a un archivo .shubapack
   */
  async exportPack({ profileId, outputPath = null, onProgress = null }) {
    const profile = (this.profileManager.getById ? this.profileManager.getById(profileId) : null) ||
      (this.profileManager.getAll ? this.profileManager.getAll().profiles?.find((p) => p.id === profileId) : null) ||
      (this.profileManager.getActive ? this.profileManager.getActive() : null);
    if (!profile) {
      throw new Error(`El perfil con ID "${profileId}" no fue encontrado.`);
    }

    const instancePath = this.profileManager.getInstancePath(profileId);
    if (!fs.existsSync(instancePath)) {
      throw new Error(`La carpeta física del perfil no existe: ${instancePath}`);
    }

    logger.info(`[PackPorter] Exportando perfil "${profile.name}" a .shubapack...`);
    if (onProgress) onProgress({ step: 1, total: 5, message: 'Preparando metadatos del perfil...' });

    const zip = new AdmZip();

    // 1. Leer mods-lock.json si existe
    let lockData = { mods: {} };
    const lockPath = path.join(instancePath, 'mods-lock.json');
    if (fs.existsSync(lockPath)) {
      try {
        lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      } catch (_) {}
    }

    // 2. Generar manifest shubapack.json
    const manifest = {
      formatVersion: 1,
      generator: 'ShubaCore-PackPorter/1.0 (SHUBATECH)',
      name: profile.name,
      mcVersion: profile.mcVersion,
      loader: profile.loader,
      loaderVersion: profile.loaderVersion,
      ramMin: profile.ramMin || '2G',
      ramMax: profile.ramMax || '8G',
      customJvmArgs: profile.customJvmArgs || '',
      createdAt: new Date().toISOString(),
      mods: lockData.mods || {}
    };

    zip.addFile('shubapack.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));

    // 3. Añadir configuraciones (/config)
    if (onProgress) onProgress({ step: 2, total: 5, message: 'Empaquetando configuraciones de mods (/config)...' });
    const configDir = path.join(instancePath, 'config');
    const configFiles = this._addDirectoryToZip(zip, configDir, 'config');

    // 4. Añadir resourcepacks y shaderpacks
    if (onProgress) onProgress({ step: 3, total: 5, message: 'Empaquetando Resource Packs y Shaders...' });
    const rpDir = path.join(instancePath, 'resourcepacks');
    const spDir = path.join(instancePath, 'shaderpacks');
    this._addDirectoryToZip(zip, rpDir, 'resourcepacks');
    this._addDirectoryToZip(zip, spDir, 'shaderpacks');

    // 5. Procesar /mods: incluir .jar locales / custom en bundled_mods/
    if (onProgress) onProgress({ step: 4, total: 5, message: 'Empaquetando mods locales e independientes...' });
    const modsDir = path.join(instancePath, 'mods');
    let bundledCount = 0;

    if (fs.existsSync(modsDir)) {
      const jarFiles = fs.readdirSync(modsDir).filter((f) => f.toLowerCase().endsWith('.jar'));
      for (const jar of jarFiles) {
        const fullJarPath = path.join(modsDir, jar);
        const record = lockData.mods ? lockData.mods[jar] : null;

        // Si es mod manual/custom o no tiene URL de descarga remota, meter el .jar físico en el paquete
        const isCustom = !record || record.source === 'custom' || !record.downloadUrl;
        if (isCustom) {
          zip.addLocalFile(fullJarPath, 'bundled_mods');
          bundledCount++;
        }
      }
    }

    // 6. Determinar ruta de salida
    let targetOutput = outputPath;
    if (!targetOutput) {
      const userHome = process.env.USERPROFILE || process.env.HOME || '.';
      const desktopDir = path.join(userHome, 'Desktop');
      const safeDir = fs.existsSync(desktopDir) ? desktopDir : path.join(this.profileManager.sharedRoot, 'exports');
      if (!fs.existsSync(safeDir)) fs.mkdirSync(safeDir, { recursive: true });

      const slug = profile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      targetOutput = path.join(safeDir, `${slug}.shubapack`);
    }

    if (onProgress) onProgress({ step: 5, total: 5, message: 'Comprimiendo archivo final .shubapack...' });
    zip.writeZip(targetOutput);

    logger.info(`[PackPorter] ¡Perfil exportado exitosamente! Archivo creado en: ${targetOutput}`);
    return {
      success: true,
      outputPath: targetOutput,
      name: profile.name,
      configFiles,
      bundledMods: bundledCount,
      totalOnlineMods: Object.keys(lockData.mods || {}).length
    };
  }

  /**
   * REQUISITO 4: Importa un archivo .shubapack creando un perfil nuevo y restaurando todo su contenido
   */
  async importPack({ packPath, packFilePath, customName = null, onProgress = null }) {
    const actualPath = packPath || packFilePath;
    if (!actualPath || !fs.existsSync(actualPath)) {
      throw new Error(`El archivo de modpack no existe: ${actualPath}`);
    }

    logger.info(`[PackPorter] Importando .shubapack desde: "${actualPath}"...`);
    if (onProgress) onProgress({ step: 1, total: 5, message: 'Leyendo estructura del .shubapack...' });

    const zip = new AdmZip(actualPath);
    const manifestEntry = zip.getEntry('shubapack.json');

    if (!manifestEntry) {
      throw new Error('El archivo no es un .shubapack válido: falta shubapack.json');
    }

    const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
    const finalProfileName = (customName || manifest.name || 'Pack Importado').trim();

    // 1. Crear nuevo perfil en el ProfileManager
    if (onProgress) onProgress({ step: 2, total: 5, message: `Creando nuevo perfil "${finalProfileName}"...` });
    const newProfile = this.profileManager.createProfile({
      name: finalProfileName,
      mcVersion: manifest.mcVersion || '1.21.1',
      loader: manifest.loader || 'NeoForge',
      loaderVersion: manifest.loaderVersion || '',
      ramMin: manifest.ramMin || '2G',
      ramMax: manifest.ramMax || '8G',
      customJvmArgs: manifest.customJvmArgs || ''
    });

    const targetInstancePath = newProfile.instancePath;
    logger.info(`[PackPorter] Nueva instancia creada en: ${targetInstancePath}`);

    // 2. Extraer carpetas /config, /resourcepacks, /shaderpacks
    if (onProgress) onProgress({ step: 3, total: 5, message: 'Restaurando configuraciones, texturas y shaders...' });
    const entries = zip.getEntries();

    for (const entry of entries) {
      if (entry.isDirectory || entry.entryName === 'shubapack.json') continue;

      // Descomprimir bundled_mods directamente en <instanceDir>/mods/
      if (entry.entryName.startsWith('bundled_mods/')) {
        const fileName = path.basename(entry.entryName);
        const destModsDir = path.join(targetInstancePath, 'mods');
        if (!fs.existsSync(destModsDir)) fs.mkdirSync(destModsDir, { recursive: true });
        fs.writeFileSync(path.join(destModsDir, fileName), entry.getData());
        continue;
      }

      // Resto de carpetas estándar (config/, resourcepacks/, shaderpacks/)
      const allowedPrefixes = ['config/', 'resourcepacks/', 'shaderpacks/'];
      if (allowedPrefixes.some((p) => entry.entryName.startsWith(p))) {
        const destFile = path.join(targetInstancePath, entry.entryName);
        const destDir = path.dirname(destFile);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.writeFileSync(destFile, entry.getData());
      }
    }

    // 3. Escribir mods-lock.json
    const lockPath = path.join(targetInstancePath, 'mods-lock.json');
    fs.writeFileSync(lockPath, JSON.stringify({ mods: manifest.mods || {} }, null, 2), 'utf8');

    // 4. Descargar mods remotos listados en manifest.mods
    const modsToDownload = Object.values(manifest.mods || {}).filter((m) => m.downloadUrl || m.projectId);
    if (onProgress) onProgress({ step: 4, total: 5, message: `Descargando ${modsToDownload.length} mods del catálogo...` });

    let downloadedCount = 0;
    for (const modRecord of modsToDownload) {
      downloadedCount++;
      if (onProgress) {
        onProgress({
          step: 4,
          total: 5,
          current: downloadedCount,
          totalMods: modsToDownload.length,
          name: modRecord.displayName || modRecord.fileName,
          message: `Descargando mod [${downloadedCount}/${modsToDownload.length}]: ${modRecord.displayName || modRecord.fileName}...`
        });
      }

      try {
        await this.modManager.downloadMod({
          projectId: modRecord.projectId || modRecord.slug || modRecord.fileName,
          source: modRecord.source || 'modrinth',
          mcVersion: manifest.mcVersion,
          loader: (manifest.loader || 'neoforge').toLowerCase(),
          instancePath: targetInstancePath
        });
      } catch (err) {
        logger.warn(`No se pudo descargar automáticamente mod ${modRecord.fileName}: ${err.message}`);
      }
    }

    // 5. Sincronizar catálogo final
    if (onProgress) onProgress({ step: 5, total: 5, message: 'Finalizando importación y sincronizando catálogo...' });
    const allMods = this.modManager.scanAndSyncMods(targetInstancePath);

    logger.info(`⚡ [PackPorter] ¡Modpack importado con éxito en "${finalProfileName}"! Total de mods: ${allMods.length}`);
    return {
      success: true,
      profile: newProfile,
      modsCount: allMods.length
    };
  }
}

let packPorterInstance = null;
function getPackPorter() {
  if (!packPorterInstance) {
    packPorterInstance = new PackPorter();
  }
  return packPorterInstance;
}

module.exports = {
  PackPorter,
  getPackPorter
};
