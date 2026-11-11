/**
 * ShubaCore - Profile & Isolated Instances Manager
 * Developed by SHUBATECH
 *
 * Implements isolated instances (CurseForge/Prism Launcher architecture):
 * Each profile has its own folder at `appdata/shubacore/instances/<profile-id>/`
 * with independent /mods, /config, and mods-lock.json.
 *
 * Standardized profile schema:
 * {
 *   "id": "mi-aventura-1234",
 *   "name": "Mi Aventura",
 *   "mcVersion": "1.21.1",
 *   "loader": "NeoForge",
 *   "loaderVersion": "21.1.265",
 *   "ramMin": "2G",
 *   "ramMax": "8G"
 * }
 */

const fs = require('fs');
const path = require('path');
const { getConfigManager } = require('../config/ConfigManager');
const { defaultLogger: logger } = require('../utils/logger');

class ProfileManager {
  constructor(customSharedRoot = null) {
    this.configManager = getConfigManager();
    const rootPath = typeof customSharedRoot === 'string'
      ? customSharedRoot
      : (customSharedRoot?.customSharedRoot || this.configManager.getInstanceDirectory());
    this.sharedRoot = rootPath;
    this.instancesDir = path.join(this.sharedRoot, 'instances');
    this.profilesFile = path.join(this.sharedRoot, 'profiles.json');

    this.data = {
      activeProfileId: 'default-1211',
      profiles: []
    };

    this.init();
  }

  /**
   * Limpia un nombre eliminando caracteres prohibidos en rutas de Windows [<>:"/\\|?*]
   */
  cleanFolderName(rawName) {
    if (!rawName || typeof rawName !== 'string') return 'Perfil';
    let clean = rawName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
    clean = clean.replace(/\.+$/, '').trim();
    return clean || 'Perfil';
  }

  /**
   * Genera un nombre de carpeta limpio y único dentro de instances/ (ej: "Mi Aventura", "Mi Aventura (2)")
   */
  generateUniqueFolderName(baseName, excludeId = null) {
    const cleanBase = this.cleanFolderName(baseName);
    let candidate = cleanBase;
    let counter = 2;
    while (true) {
      if (candidate === excludeId) return candidate;
      const targetPath = path.join(this.instancesDir, candidate);
      const idInUse = Array.isArray(this.data?.profiles) && this.data.profiles.some((p) => p.id === candidate && p.id !== excludeId);
      if (!fs.existsSync(targetPath) && !idInUse) {
        return candidate;
      }
      candidate = `${cleanBase} (${counter})`;
      counter++;
    }
  }

  /**
   * Detecta y renombra carpetas antiguas con sufijos aleatorios (-[a-z0-9]{6,9}$)
   * migrándolas limpiamente en disco y actualizando profiles.json
   */
  _migrateOldRandomSuffixFolders() {
    if (!fs.existsSync(this.instancesDir)) return;
    const randomSuffixRegex = /-[a-z0-9]{6,9}$/i;
    let hasChanges = false;

    // 1. Migrar perfiles registrados en profiles.json
    if (Array.isArray(this.data?.profiles)) {
      for (const profile of this.data.profiles) {
        if (!profile || !profile.id) continue;
        if (randomSuffixRegex.test(profile.id)) {
          const oldId = profile.id;
          const oldPath = path.join(this.instancesDir, oldId);
          const preferredName = profile.name ? this.cleanFolderName(profile.name) : oldId.replace(randomSuffixRegex, '');
          const newId = this.generateUniqueFolderName(preferredName, oldId);

          if (newId !== oldId) {
            const newPath = path.join(this.instancesDir, newId);
            try {
              if (fs.existsSync(oldPath)) {
                fs.renameSync(oldPath, newPath);
                logger.info(`[ProfileManager] Carpeta migrada limpiamente: "${oldId}" -> "${newId}"`);
              }
              profile.id = newId;
              profile.instancePath = newPath;
              if (this.data.activeProfileId === oldId) {
                this.data.activeProfileId = newId;
              }
              const metaFile = path.join(newPath, 'profile.json');
              if (fs.existsSync(metaFile)) {
                try {
                  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
                  meta.id = newId;
                  meta.instancePath = newPath;
                  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), 'utf8');
                } catch (_) {}
              }
              hasChanges = true;
            } catch (err) {
              logger.warn(`[ProfileManager] No se pudo migrar carpeta "${oldId}":`, err.message);
            }
          }
        }
      }
    }

    // 2. Migrar carpetas huérfanas en instances/
    try {
      const entries = fs.readdirSync(this.instancesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && randomSuffixRegex.test(entry.name)) {
          const oldFolder = entry.name;
          const isRegistered = Array.isArray(this.data?.profiles) && this.data.profiles.some((p) => p.id === oldFolder);
          if (!isRegistered) {
            const oldPath = path.join(this.instancesDir, oldFolder);
            const cleanName = oldFolder.replace(randomSuffixRegex, '');
            const newFolder = this.generateUniqueFolderName(cleanName, oldFolder);
            if (newFolder !== oldFolder) {
              const newPath = path.join(this.instancesDir, newFolder);
              try {
                fs.renameSync(oldPath, newPath);
                logger.info(`[ProfileManager] Carpeta huérfana migrada limpiamente: "${oldFolder}" -> "${newFolder}"`);
                hasChanges = true;
              } catch (renameErr) {
                logger.warn(`[ProfileManager] Error renombrando carpeta huérfana "${oldFolder}":`, renameErr.message);
              }
            }
          }
        }
      }
    } catch (_) {}

    if (hasChanges) {
      this.save();
    }
  }

  /**
   * Estandariza un objeto de perfil asegurando todas las propiedades obligatorias
   * con valores por defecto seguros y sin errores de toUpperCase/toLowerCase.
   */
  sanitizeProfile(raw = {}, folderId = null) {
    const rawObj = (raw && typeof raw === 'object') ? raw : {};
    const name = (rawObj.name || folderId || 'Mi Aventura').toString().trim() || 'Mi Aventura';
    const id = rawObj.id || folderId || this.generateUniqueFolderName(name);
    const mcVersion = (rawObj.mcVersion || '1.21.1').toString().trim();

    // Normalizar nombre de Loader respetando mayúsculas/minúsculas estándar
    let loader = rawObj.loader || rawObj.modLoader || 'NeoForge';
    if (typeof loader === 'string') {
      const lower = loader.toLowerCase().trim();
      if (lower === 'neoforge') loader = 'NeoForge';
      else if (lower === 'forge') loader = 'Forge';
      else if (lower === 'fabric') loader = 'Fabric';
      else if (lower === 'quilt') loader = 'Quilt';
      else if (lower === 'vanilla') loader = 'Vanilla';
      else loader = 'NeoForge';
    } else {
      loader = 'NeoForge';
    }

    // Limpiar versión del loader para aislar sólo el número de versión (ej: "21.1.265")
    const isVanilla = loader.toLowerCase() === 'vanilla';
    const rawVer = rawObj.loaderVersion !== undefined && rawObj.loaderVersion !== null ? rawObj.loaderVersion : (isVanilla ? '' : '21.1.265');
    const loaderVersion = isVanilla ? '' : (String(rawVer).split(' ')[0].trim() || 'latest');

    // Memoria RAM estandarizada
    const ramMin = (rawObj.ramMin || rawObj.memoryMin || '2G').toString().trim() || '2G';
    const ramMax = (rawObj.ramMax || rawObj.memoryMax || '8G').toString().trim() || '8G';

    // Icono personalizado o por defecto
    let icon = rawObj.icon;
    if (!icon || icon === 'creeper') {
      const localIconPath = path.join(this.getInstancePath(id), 'icon.png');
      if (fs.existsSync(localIconPath)) {
        try {
          const b64 = fs.readFileSync(localIconPath).toString('base64');
          icon = `data:image/png;base64,${b64}`;
        } catch (_) {
          icon = 'assets/logo.png';
        }
      } else {
        icon = 'assets/logo.png';
      }
    }

    return {
      id,
      name,
      mcVersion,
      loader,
      loaderVersion,
      javaSelection: rawObj.javaSelection || rawObj.javaVersion || 'auto',
      javaPath: rawObj.javaPath || '',
      ramMin,
      ramMax,
      memoryMin: ramMin, // Compatibilidad hacia atrás
      memoryMax: ramMax, // Compatibilidad hacia atrás
      icon,
      customJvmArgs: rawObj.customJvmArgs || '',
      createdAt: rawObj.createdAt || new Date().toISOString(),
      lastPlayed: rawObj.lastPlayed || null,
      instancePath: this.getInstancePath(id)
    };
  }

  /**
   * Sanea perfiles existentes y escanea carpetas físicas en disco
   */
  sanitizeAndSyncInstances() {
    let hasChanges = false;

    if (!Array.isArray(this.data.profiles)) {
      this.data.profiles = [];
      hasChanges = true;
    }

    const sanitizedProfiles = [];
    const knownIds = new Set();

    // 1. Sanear los que ya están en memoria/JSON
    for (const p of this.data.profiles) {
      if (!p) continue;
      const sanitized = this.sanitizeProfile(p);
      if (!knownIds.has(sanitized.id)) {
        knownIds.add(sanitized.id);
        sanitizedProfiles.push(sanitized);
        this._setupInstanceFolder(sanitized.id, sanitized);
      }
    }

    // 2. Escanear carpetas físicas en <sharedRoot>/instances/
    try {
      if (!fs.existsSync(this.instancesDir)) {
        fs.mkdirSync(this.instancesDir, { recursive: true });
      }

      const entries = fs.readdirSync(this.instancesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const folderId = entry.name;
          if (!knownIds.has(folderId)) {
            const metaFile = path.join(this.instancesDir, folderId, 'profile.json');
            let metaData = {};
            if (fs.existsSync(metaFile)) {
              try {
                metaData = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
              } catch (_) {}
            }
            const recovered = this.sanitizeProfile(metaData, folderId);
            knownIds.add(folderId);
            sanitizedProfiles.push(recovered);
            this._setupInstanceFolder(folderId, recovered);
            hasChanges = true;
            logger.info(`[ProfileManager] Perfil recuperado de carpeta física: ${folderId}`);
          }
        }
      }
    } catch (err) {
      logger.error('Error al escanear carpetas de instancias:', err);
    }

    // 3. Si no existe ningún perfil, crear el perfil por defecto
    if (sanitizedProfiles.length === 0) {
      const defaultProfile = this.sanitizeProfile({
        id: 'default-1211',
        name: 'ShubaCore NeoForge 1.21.1',
        mcVersion: '1.21.1',
        loader: 'NeoForge',
        loaderVersion: '21.1.265',
        ramMin: '2G',
        ramMax: '8G'
      });
      sanitizedProfiles.push(defaultProfile);
      this._setupInstanceFolder(defaultProfile.id, defaultProfile);
      hasChanges = true;
    }

    this.data.profiles = sanitizedProfiles;

    // 4. Validar perfil activo
    const activeExists = this.data.profiles.some((p) => p.id === this.data.activeProfileId);
    if (!activeExists) {
      this.data.activeProfileId = this.data.profiles[0].id;
      hasChanges = true;
    }

    if (hasChanges) {
      this.save();
    }
  }

  init() {
    try {
      if (!fs.existsSync(this.instancesDir)) {
        fs.mkdirSync(this.instancesDir, { recursive: true });
      }

      if (fs.existsSync(this.profilesFile)) {
        try {
          const raw = fs.readFileSync(this.profilesFile, 'utf8');
          this.data = JSON.parse(raw);
          logger.info(`Perfiles cargados: ${this.data.profiles?.length || 0} perfil(es) encontrados.`);
        } catch (readErr) {
          logger.warn(`profiles.json corrupto, recuperando: ${readErr.message}`);
          this.data = { activeProfileId: 'default-1211', profiles: [] };
        }
      }

      // Migrar carpetas antiguas con sufijos aleatorios (-[a-z0-9]{6,9}$) a nombres limpios
      this._migrateOldRandomSuffixFolders();

      this.sanitizeAndSyncInstances();
    } catch (err) {
      logger.error('Error al inicializar ProfileManager:', err);
    }
  }

  _setupInstanceFolder(profileId, profileData) {
    const instanceDir = this.getInstancePath(profileId);
    const modsDir = path.join(instanceDir, 'mods');
    const configDir = path.join(instanceDir, 'config');
    const lockFile = path.join(instanceDir, 'mods-lock.json');
    const metaFile = path.join(instanceDir, 'profile.json');

    if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

    if (!fs.existsSync(lockFile)) {
      fs.writeFileSync(lockFile, JSON.stringify({ version: 1, lastUpdated: new Date().toISOString(), mods: {} }, null, 2), 'utf8');
    }

    if (profileData.icon && profileData.icon.startsWith('data:image')) {
      try {
        const parts = profileData.icon.split(',');
        if (parts[1]) {
          fs.writeFileSync(path.join(instanceDir, 'icon.png'), Buffer.from(parts[1], 'base64'));
        }
      } catch (iconErr) {
        logger.warn('No se pudo guardar icon.png:', iconErr.message);
      }
    }

    fs.writeFileSync(metaFile, JSON.stringify(profileData, null, 2), 'utf8');
  }

  save() {
    try {
      fs.writeFileSync(this.profilesFile, JSON.stringify(this.data, null, 2), 'utf8');
      return true;
    } catch (err) {
      logger.error('Error al guardar profiles.json:', err);
      return false;
    }
  }

  getAll() {
    if (fs.existsSync(this.profilesFile)) {
      try {
        const raw = fs.readFileSync(this.profilesFile, 'utf8');
        this.data = JSON.parse(raw);
      } catch (readErr) {
        logger.warn(`profiles.json no se pudo leer, recuperando: ${readErr.message}`);
      }
    }
    this.sanitizeAndSyncInstances();
    return {
      activeProfileId: this.data.activeProfileId,
      profiles: this.data.profiles.map((p) => this.sanitizeProfile(p))
    };
  }

  getDataDirectory() {
    return this.sharedRoot;
  }

  getProfiles() {
    return this.getAll().profiles;
  }

  getAllProfiles() {
    return this.getAll().profiles;
  }

  getProfile(id) {
    return this.getById(id);
  }

  getActive() {
    const all = this.getAll();
    const found = all.profiles.find((p) => p.id === all.activeProfileId);
    return found || all.profiles[0] || null;
  }

  getActiveProfile() {
    return this.getActive();
  }

  getById(id) {
    if (!id) return this.getActive();
    const all = this.getAll();
    return all.profiles.find((p) => p.id === id) || null;
  }

  setActive(id) {
    const all = this.getAll();
    const exists = all.profiles.some((p) => p.id === id);
    if (!exists) throw new Error(`El perfil con ID ${id} no existe.`);
    this.data.activeProfileId = id;
    this.save();
    logger.info(`Perfil activo cambiado a: ${id}`);
    return this.getActive();
  }

  getInstancePath(profileId) {
    return path.join(this.instancesDir, profileId);
  }

  getActiveInstancePath() {
    const active = this.getActive();
    return active ? this.getInstancePath(active.id) : this.sharedRoot;
  }

  createProfile(data = {}) {
    const rawName = (data.name || '').trim();
    if (!rawName) {
      throw new Error('El nombre del perfil es obligatorio.');
    }

    // Generar nombre de carpeta limpio en instances/ sin sufijos aleatorios
    const id = this.generateUniqueFolderName(rawName);

    const newProfile = this.sanitizeProfile({
      ...data,
      id,
      name: rawName
    });

    logger.info(`Creando nueva instancia aislada para el perfil "${rawName}" (${id})...`);
    this._setupInstanceFolder(id, newProfile);

    this.data.profiles.push(newProfile);
    this.data.activeProfileId = id;
    this.save();

    logger.info(`Perfil "${rawName}" creado exitosamente.`);
    return newProfile;
  }

  updateProfile(id, partial = {}) {
    const all = this.getAll();
    const idx = this.data.profiles.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error(`Perfil ${id} no encontrado.`);

    const current = this.data.profiles[idx];
    const updated = this.sanitizeProfile({
      ...current,
      ...partial,
      id // Mantener el id original
    });

    this.data.profiles[idx] = updated;

    const instanceDir = this.getInstancePath(id);
    const metaFile = path.join(instanceDir, 'profile.json');
    if (fs.existsSync(instanceDir)) {
      fs.writeFileSync(metaFile, JSON.stringify(updated, null, 2), 'utf8');
    }

    this.save();
    return updated;
  }

  deleteProfile(id) {
    const idx = this.data.profiles.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error(`Perfil ${id} no encontrado.`);

    const profileToDelete = this.data.profiles[idx];
    const instanceDir = this.getInstancePath(id);

    try {
      if (fs.existsSync(instanceDir)) {
        fs.rmSync(instanceDir, { recursive: true, force: true });
        logger.info(`Carpeta de instancia eliminada: ${instanceDir}`);
      }
    } catch (err) {
      logger.warn(`No se pudo eliminar completamente la carpeta de instancia ${id}: ${err.message}`);
    }

    this.data.profiles.splice(idx, 1);

    if (this.data.profiles.length === 0) {
      this.init();
      return true;
    }

    if (this.data.activeProfileId === id) {
      this.data.activeProfileId = this.data.profiles[0].id;
    }

    this.save();
    logger.info(`Perfil "${profileToDelete.name}" (${id}) eliminado.`);
    return true;
  }
}

let profileManagerInstance = null;
function getProfileManager(customSharedRoot = null) {
  if (!profileManagerInstance || customSharedRoot) {
    profileManagerInstance = new ProfileManager(customSharedRoot);
  }
  return profileManagerInstance;
}

module.exports = {
  ProfileManager,
  getProfileManager
};
