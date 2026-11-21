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
const os = require('os');
const crypto = require('crypto');
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
    this.deletedInstancesFile = path.join(this.sharedRoot, '.deleted_instances.json');

    this.deletedProfileIds = new Set();
    this._loadDeletedProfileIds();
    this._cleanTrash();

    this.data = {
      activeProfileId: 'default-1211',
      profiles: []
    };

    this.init();
  }

  _loadDeletedProfileIds() {
    try {
      if (fs.existsSync(this.deletedInstancesFile)) {
        const raw = fs.readFileSync(this.deletedInstancesFile, 'utf8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          this.deletedProfileIds = new Set(list);
        }
      }
    } catch (_) {}
  }

  _saveDeletedProfileIds() {
    try {
      fs.writeFileSync(this.deletedInstancesFile, JSON.stringify(Array.from(this.deletedProfileIds), null, 2), 'utf8');
    } catch (_) {}
  }

  _cleanTrash() {
    try {
      const trashDir = path.join(this.sharedRoot, '.trash');
      if (fs.existsSync(trashDir)) {
        this._safeRemoveDirectory(trashDir, true);
      }
    } catch (_) {}
  }

  /**
   * Eliminación segura y definitiva de carpetas en Windows (manejando EBUSY, EPERM y bloqueos)
   */
  _safeRemoveDirectory(targetDir, isTrashCleanup = false) {
    if (!targetDir || !fs.existsSync(targetDir)) return true;

    // 1. Quitar atributos de sólo lectura en Windows de forma recursiva
    if (process.platform === 'win32') {
      try {
        const { spawnSync } = require('child_process');
        spawnSync('attrib', ['-r', `${targetDir}\\*.*`, '/s', '/d'], { windowsHide: true, timeout: 5000 });
      } catch (_) {}
    }

    // 2. Intentar eliminación nativa con reintentos
    try {
      fs.rmSync(targetDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      if (!fs.existsSync(targetDir)) {
        logger.info(`[ProfileManager] Carpeta eliminada limpiamente: ${targetDir}`);
        return true;
      }
    } catch (rmErr) {
      logger.warn(`[ProfileManager] fs.rmSync falló para ${targetDir}: ${rmErr.message}`);
    }

    // 3. Fallback en Windows: cmd.exe /c rmdir /s /q
    if (process.platform === 'win32') {
      try {
        const { spawnSync } = require('child_process');
        spawnSync('cmd.exe', ['/c', 'rmdir', '/s', '/q', `"${targetDir}"`], { windowsHide: true, timeout: 8000 });
        if (!fs.existsSync(targetDir)) {
          logger.info(`[ProfileManager] Carpeta eliminada mediante cmd rmdir: ${targetDir}`);
          return true;
        }
      } catch (cmdErr) {
        logger.warn(`[ProfileManager] cmd rmdir falló: ${cmdErr.message}`);
      }
    }

    // 4. Fallback definitivo: Si aún existe y no es la papelera, mover fuera de instances/
    if (!isTrashCleanup && fs.existsSync(targetDir)) {
      try {
        const trashDir = path.join(this.sharedRoot, '.trash');
        if (!fs.existsSync(trashDir)) {
          fs.mkdirSync(trashDir, { recursive: true });
        }
        const movedTrashPath = path.join(trashDir, `${path.basename(targetDir)}-${Date.now()}`);
        fs.renameSync(targetDir, movedTrashPath);
        logger.info(`[ProfileManager] Carpeta con archivos bloqueados movida fuera de instances/ a papelera: ${movedTrashPath}`);
        // Intentar eliminar la carpeta movida en segundo plano
        setTimeout(() => {
          try {
            fs.rmSync(movedTrashPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
          } catch (_) {}
        }, 3000);
        return true;
      } catch (renameErr) {
        logger.error(`[ProfileManager] No se pudo mover a papelera: ${renameErr.message}`);
      }
    }

    return !fs.existsSync(targetDir);
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
    const rawEdition = (rawObj.edition || '').toString().toLowerCase().trim();
    let edition = rawEdition === 'bedrock' ? 'bedrock' : 'java';

    // Normalizar nombre de Loader respetando mayúsculas/minúsculas estándar
    let loader = rawObj.loader || rawObj.modLoader || 'NeoForge';
    if (typeof loader === 'string') {
      const lower = loader.toLowerCase().trim();
      if (lower === 'bedrock') {
        loader = 'Bedrock';
        edition = 'bedrock';
      } else if (lower === 'neoforge') loader = 'NeoForge';
      else if (lower === 'forge') loader = 'Forge';
      else if (lower === 'fabric') loader = 'Fabric';
      else if (lower === 'quilt') loader = 'Quilt';
      else if (lower === 'vanilla') loader = 'Vanilla';
      else loader = 'NeoForge';
    } else {
      loader = 'NeoForge';
    }

    if (edition === 'bedrock') {
      loader = 'Bedrock';
    }

    // Versión de Minecraft adaptada a la edición
    let mcVersion = (rawObj.mcVersion || '').toString().trim();
    if (!mcVersion) {
      mcVersion = edition === 'bedrock' ? 'Bedrock Latest' : '1.21.1';
    }

    // Limpiar versión del loader para aislar sólo el número de versión (ej: "21.1.265")
    const isVanilla = loader.toLowerCase() === 'vanilla';
    const isBedrock = edition === 'bedrock' || loader.toLowerCase() === 'bedrock';
    const rawVer = rawObj.loaderVersion !== undefined && rawObj.loaderVersion !== null
      ? rawObj.loaderVersion
      : (isVanilla ? '' : (isBedrock ? 'Official' : '21.1.265'));
    const loaderVersion = isVanilla ? '' : (String(rawVer).split(' ')[0].trim() || (isBedrock ? 'Official' : 'latest'));

    // Memoria RAM estandarizada
    const ramMin = (rawObj.ramMin || rawObj.memoryMin || '2G').toString().trim() || '2G';
    const ramMax = (rawObj.ramMax || rawObj.memoryMax || '8G').toString().trim() || '8G';

    // Icono personalizado o por defecto
    const isShubaClient = id === 'shubaclient-263' || (name && name.toLowerCase().includes('shubaclient'));
    const blueB64 = this._getBlueLogoBase64();
    const blueBuf = this._getBlueLogoBuffer();
    const officialB64 = this._getOfficialLogoBase64();
    const officialBuf = this._getOfficialLogoBuffer();

    let icon = rawObj.icon;
    const localIconPath = path.join(this.getInstancePath(id), 'icon.png');
    if (icon && typeof icon === 'string' && icon.startsWith('data:image')) {
      // Si se pasa un nuevo icono explícito (data:image), se respeta la nueva imagen
    } else if (fs.existsSync(localIconPath)) {
      try {
        const stats = fs.statSync(localIconPath);
        // Si es ShubaClient, sincronizar con el logo oficial del cliente (S azul oficial de 103 KB)
        if (isShubaClient && blueBuf && (stats.size !== blueBuf.length || stats.size === 132277 || stats.size === 79584 || stats.size === 160405 || stats.size < 1000)) {
          fs.writeFileSync(localIconPath, blueBuf);
          icon = blueB64;
        } else {
          const b64 = fs.readFileSync(localIconPath).toString('base64');
          icon = `data:image/png;base64,${b64}`;
        }
      } catch (_) {}
    } else if (isShubaClient && blueBuf) {
      try {
        fs.writeFileSync(localIconPath, blueBuf);
        icon = blueB64;
      } catch (_) {}
    }

    if (!icon || icon === 'creeper' || icon === 'default' || icon === 'icon.png' || icon === 'assets/logo.png') {
      if (rawObj.iconUrl && (rawObj.iconUrl.startsWith('http://') || rawObj.iconUrl.startsWith('https://')) && !isShubaClient) {
        icon = rawObj.iconUrl;
      } else {
        icon = isShubaClient ? (blueB64 || officialB64) : (officialB64 || 'assets/logo.png');
      }
    }

    let modsCount = 0;
    const instPath = this.getInstancePath(id);
    try {
      if (edition === 'bedrock') {
        const bpDir = path.join(instPath, 'behavior_packs');
        const rpDir = path.join(instPath, 'resource_packs');
        let count = 0;
        if (fs.existsSync(bpDir)) count += fs.readdirSync(bpDir).length;
        if (fs.existsSync(rpDir)) count += fs.readdirSync(rpDir).length;
        modsCount = count;
      } else {
        const modsDir = path.join(instPath, 'mods');
        if (fs.existsSync(modsDir)) {
          modsCount = fs.readdirSync(modsDir).filter((f) => f.toLowerCase().endsWith('.jar')).length;
        }
      }
    } catch (_) {}

    return {
      id,
      name,
      edition,
      isBedrock: edition === 'bedrock',
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
      instancePath: instPath,
      modsCount
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
      // Si fue marcado como eliminado, descartarlo
      if (this.deletedProfileIds && this.deletedProfileIds.has(p.id)) {
        hasChanges = true;
        continue;
      }

      const sanitized = this.sanitizeProfile(p);
      const instPath = this.getInstancePath(sanitized.id);

      if (!knownIds.has(sanitized.id)) {
        knownIds.add(sanitized.id);
        sanitizedProfiles.push(sanitized);
        // Sólo configurar la carpeta si ya existe en disco
        // Evita recrear carpetas que el usuario eliminó externamente
        if (fs.existsSync(instPath)) {
          this._setupInstanceFolder(sanitized.id, sanitized);
        }
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

          // Ignorar carpetas del sistema
          if (folderId === '.trash' || folderId.startsWith('.')) {
            continue;
          }

          // Si el ID está en la lista de eliminados, NUNCA resucitarlo
          if (this.deletedProfileIds && this.deletedProfileIds.has(folderId)) {
            logger.info(`[ProfileManager] Ignorando carpeta de instancia eliminada: ${folderId}`);
            this._safeRemoveDirectory(path.join(this.instancesDir, folderId));
            continue;
          }

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

    // 3. Eliminar perfiles temporales o generados por error y asegurar perfil por defecto si la lista estuviera vacía
    const cleanedProfiles = sanitizedProfiles.filter((p) => p.id !== 'shubaclient-ultra-fps');
    if (cleanedProfiles.length !== sanitizedProfiles.length) {
      hasChanges = true;
    }

    if (cleanedProfiles.length === 0) {
      const defaultProfile = this.sanitizeProfile({
        id: 'shubaclient-263',
        name: 'ShubaClient',
        mcVersion: '26.3',
        loader: 'Fabric',
        loaderVersion: '0.20.1',
        ramMin: '2G',
        ramMax: '6G',
        icon: this._getOfficialLogoBase64(),
        summary: 'Cliente oficial ShubaClient: máxima tasa de FPS en 26.3.'
      });
      cleanedProfiles.push(defaultProfile);
      this._setupInstanceFolder(defaultProfile.id, defaultProfile);
      this._populateDefaultShubaClientMods(this.getInstancePath(defaultProfile.id));
      hasChanges = true;
    }

    this.data.profiles = cleanedProfiles;

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

  _getBlueLogoBuffer() {
    const candidatePaths = [
      path.join(__dirname, '..', '..', 'renderer', 'assets', 'shubaclient_mod_logo.png'),
      path.resolve(process.cwd(), 'shubaclient_mod_logo.png'),
      path.resolve(process.cwd(), 'src', 'renderer', 'assets', 'shubaclient_mod_logo.png')
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          const buf = fs.readFileSync(p);
          if (buf && buf.length > 1000) return buf;
        } catch (_) {}
      }
    }
    return null;
  }

  _getBlueLogoBase64() {
    const buf = this._getBlueLogoBuffer();
    if (buf) {
      return `data:image/png;base64,${buf.toString('base64')}`;
    }
    return 'assets/shubaclient_mod_logo.png';
  }

  _getOfficialLogoBuffer() {
    const candidatePaths = [
      path.join(__dirname, '..', '..', 'renderer', 'assets', 'logo.png'),
      path.join(__dirname, '..', '..', '..', 'logo.png'),
      path.join(__dirname, '..', '..', 'renderer', 'logo.png'),
      path.resolve(process.cwd(), 'src', 'renderer', 'assets', 'logo.png'),
      path.resolve(process.cwd(), 'logo.png')
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          const buf = fs.readFileSync(p);
          if (buf && buf.length > 1000) return buf;
        } catch (_) {}
      }
    }
    return null;
  }

  _getOfficialLogoBase64() {
    const buf = this._getOfficialLogoBuffer();
    if (buf) {
      return `data:image/png;base64,${buf.toString('base64')}`;
    }
    return 'assets/logo.png';
  }

  _populateDefaultShubaClientMods(instanceDir, onProgress = null) {
    const modsDir = path.join(instanceDir, 'mods');
    const configDir = path.join(instanceDir, 'config');
    const iconFile = path.join(instanceDir, 'icon.png');
    if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

    // 1. Asegurar icono oficial del modpack ShubaClient (S azul)
    if (!fs.existsSync(iconFile)) {
      const logoBuf = this._getBlueLogoBuffer() || this._getOfficialLogoBuffer();
      if (logoBuf) {
        try { fs.writeFileSync(iconFile, logoBuf); } catch (_) {}
      }
    }

    // 2. Buscar mods en directorios locales disponibles (exclusivamente Fabric 26.3)
    const userAppdata = process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : os.homedir());
    const potentialDirs = [
      path.join(os.homedir(), 'Desktop', 'ShubaCoreMod', 'build', 'libs'),
      path.join(os.homedir(), 'Desktop', 'ShubaCoreMod', 'dist-shubaclient-mods', '26.3'),
      path.join(this.sharedRoot, 'runtime', 'client-mods'),
      path.join(this.sharedRoot, 'runtime', 'client-mods', 'deps'),
      path.join(this.sharedRoot, 'runtime', 'client-mods', 'opt'),
      path.join(userAppdata, '.shubacore', 'runtime', 'client-mods'),
      path.join(userAppdata, '.shubacore', 'runtime', 'client-mods', 'deps'),
      path.join(userAppdata, '.shubacore', 'runtime', 'client-mods', 'opt'),
      path.join(userAppdata, 'Polyfrost', 'OneClient', 'clusters', '26.3 Fabric', 'mods'),
      path.join(userAppdata, 'Polyfrost', 'OneClient', '.minecraft', 'mods', '26.3 Fabric'),
      path.resolve(process.cwd(), '.shubacore-data', 'runtime', 'client-mods'),
      path.resolve(process.cwd(), '.shubacore-data', 'runtime', 'client-mods', 'deps'),
      path.resolve(process.cwd(), '.shubacore-data', 'runtime', 'client-mods', 'opt')
    ];

    const availableJars = new Map();
    for (const dir of potentialDirs) {
      if (fs.existsSync(dir)) {
        try {
          const files = fs.readdirSync(dir);
          for (const f of files) {
            if (f.toLowerCase().endsWith('.jar')) {
              const lower = f.toLowerCase();
              if (lower === 'shubaclient-base.jar' || lower === 'shubaclient-custom.jar') continue;
              // Rechazar estrictamente mods empaquetados para Forge dentro de instancias de Fabric
              if (lower.includes('-forge-') || lower.endsWith('-forge.jar')) continue;
              if (!availableJars.has(lower)) {
                availableJars.set(lower, path.join(dir, f));
              }
            }
          }
        } catch (_) {}
      }
    }

    const requiredModPatterns = [
      { pattern: /^shubaclient-ui.*\.jar$/i, name: 'ShubaClient-UI.jar' },
      { pattern: /^shubaconfig.*26\.3.*\.jar$/i, name: 'ShubaConfig-26.3-1.7.1.jar' },
      { pattern: /^shubadium.*26\.3.*\.jar$/i, name: 'ShubaDium-26.3-1.4.7.jar' },
      { pattern: /^fabric-api.*26\.3.*\.jar$/i, name: 'fabric-api-0.166.2+26.3.jar' },
      { pattern: /^fabric-language-kotlin.*\.jar$/i, name: 'fabric-language-kotlin-1.14.2+kotlin.2.4.21.jar' },
      { pattern: /^compose-bundle.*\.jar$/i, name: 'compose-bundle-2.1.0+compose.1.13.0-alpha02.jar' },
      { pattern: /^lithium-fabric.*26\.3.*\.jar$/i, name: 'lithium-fabric-0.26.3+mc26.3.jar' },
      { pattern: /^ferritecore.*fabric.*\.jar$/i, name: 'ferritecore-9.0.0-fabric.jar' },
      { pattern: /^immediatelyfast.*26\.3.*\.jar$/i, name: 'ImmediatelyFast-Fabric-1.17.1+26.3.jar' },
      { pattern: /^entityculling-fabric.*1\.12.*26\.3.*\.jar$/i, name: 'entityculling-fabric-1.12.1-mc26.3.jar' },
      { pattern: /^rsls.*\.jar$/i, name: 'rsls-1.4.0.jar' },
      { pattern: /^sodium-extra-fabric.*26\.3.*\.jar$/i, name: 'sodium-extra-fabric-0.9.5+mc26.3.jar' },
      { pattern: /^sodium-fabric.*26\.3.*\.jar$/i, name: 'sodium-fabric-0.9.2+mc26.3.jar' },
      { pattern: /^sodium-shadowy-path-blocks.*\.jar$/i, name: 'sodium-shadowy-path-blocks-fabric-8.0.0.jar' },
      { pattern: /^clumps-fabric.*26\.3.*\.jar$/i, name: 'Clumps-fabric-26.3-26.3.2.jar' }
    ];

    const lockPath = path.join(instanceDir, 'mods-lock.json');
    let lockData = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      mods: {}
    };
    if (fs.existsSync(lockPath)) {
      try { lockData = JSON.parse(fs.readFileSync(lockPath, 'utf8')); } catch (_) {}
    }

    let copiedCount = 0;
    for (const req of requiredModPatterns) {
      let matchedSourcePath = null;
      let targetFileName = req.name;

      for (const [key, fullPath] of availableJars.entries()) {
        if (req.pattern.test(key) || req.pattern.test(path.basename(fullPath))) {
          matchedSourcePath = fullPath;
          targetFileName = path.basename(fullPath);
          break;
        }
      }

      if (matchedSourcePath && fs.existsSync(matchedSourcePath)) {
        const destFile = path.join(modsDir, targetFileName);
        try {
          if (!fs.existsSync(destFile)) {
            fs.copyFileSync(matchedSourcePath, destFile);
          }
          copiedCount++;
          lockData.mods[targetFileName] = {
            fileName: targetFileName,
            name: targetFileName.replace(/\.jar$/i, ''),
            displayName: targetFileName.replace(/\.jar$/i, ''),
            source: 'shubacore',
            projectId: 'shubaclient',
            fileId: '',
            downloadUrl: 'local://shubaclient',
            version: '26.3',
            installedAt: new Date().toISOString(),
            enabled: true,
            iconUrl: null
          };
        } catch (copyErr) {
          logger.warn(`No se pudo copiar ${targetFileName}: ${copyErr.message}`);
        }
      }
    }

    // Purgar cualquier archivo arcaico de ModernFix en instancias de 26.3 para prevenir ClassTweakerFormatException
    try {
      if (fs.existsSync(modsDir)) {
        const currentMods = fs.readdirSync(modsDir);
        for (const f of currentMods) {
          if (/modernfix/i.test(f)) {
            try {
              fs.unlinkSync(path.join(modsDir, f));
              logger.info(`[ProfileManager] ✅ Purgado mod incompatible ${f} de instancia 26.3`);
            } catch (_) {}
          }
        }
      }
    } catch (_) {}

    try {
      const { getModManager } = require('../mods/ModManager');
      getModManager()._applyShubaCoreIdentity(instanceDir, lockData);
    } catch (_) {}

    try {
      fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2), 'utf8');
    } catch (_) {}

    try {
      const { getClientModPatcher } = require('../client/ClientModPatcher');
      getClientModPatcher().prepareInstanceConfig(instanceDir);
    } catch (_) {}

    try {
      const optsFile = path.join(instanceDir, 'options.txt');
      if (!fs.existsSync(optsFile)) {
        const defaultOptions = [
          'version:3955',
          'autoJump:false',
          'lang:es_es',
          'graphicsPreset:"custom"',
          'preferredGraphicsBackend:"vulkan"',
          'renderDistance:12',
          'simulationDistance:10',
          'gamma:1.0',
          'maxFps:260'
        ].join('\n') + '\n';
        fs.writeFileSync(optsFile, defaultOptions, 'utf8');
      }
    } catch (_) {}

    logger.info(`[SHUBATECH] Modpack oficial ShubaClient poblado con éxito en: ${instanceDir} (${copiedCount} mods copiados).`);
    return copiedCount;
  }

  _setupInstanceFolder(profileId, profileData) {
    const instanceDir = this.getInstancePath(profileId);
    const modsDir = path.join(instanceDir, 'mods');
    const configDir = path.join(instanceDir, 'config');
    const lockFile = path.join(instanceDir, 'mods-lock.json');
    const metaFile = path.join(instanceDir, 'profile.json');
    const localIconPath = path.join(instanceDir, 'icon.png');

    if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

    // Si es perfil Bedrock, inicializar carpetas para Add-ons y mundos
    if (profileData.edition === 'bedrock' || profileData.loader === 'Bedrock') {
      try {
        const { getBedrockManager } = require('../bedrock/BedrockManager');
        getBedrockManager().setupInstanceFolders(instanceDir);
      } catch (_) {}
    }

    if (!fs.existsSync(lockFile)) {
      fs.writeFileSync(lockFile, JSON.stringify({ version: 1, lastUpdated: new Date().toISOString(), mods: {} }, null, 2), 'utf8');
    }

    if (profileData.icon && profileData.icon.startsWith('data:image')) {
      try {
        const parts = profileData.icon.split(',');
        if (parts[1]) {
          fs.writeFileSync(localIconPath, Buffer.from(parts[1], 'base64'));
        }
      } catch (iconErr) {
        logger.warn('No se pudo guardar icon.png:', iconErr.message);
      }
    } else if (!fs.existsSync(localIconPath)) {
      const isShuba = profileId === 'shubaclient-263' || (profileData.name && profileData.name.toLowerCase().includes('shubaclient'));
      const logoBuf = isShuba ? (this._getBlueLogoBuffer() || this._getOfficialLogoBuffer()) : this._getOfficialLogoBuffer();
      if (logoBuf) {
        try {
          fs.writeFileSync(localIconPath, logoBuf);
        } catch (_) {}
      }
    }

    // Si es la instancia oficial ShubaClient, sincronizar con el logo azul oficial
    const isShubaClient = profileId === 'shubaclient-263' || (profileData.name && profileData.name.toLowerCase().includes('shubaclient'));
    if (isShubaClient) {
      const blueBuf = this._getBlueLogoBuffer();
      if (blueBuf) {
        let needsWrite = !fs.existsSync(localIconPath);
        if (!needsWrite) {
          try {
            const st = fs.statSync(localIconPath);
            if (st.size !== blueBuf.length || st.size === 132277 || st.size === 79584 || st.size < 1000) needsWrite = true;
          } catch (_) {}
        }
        if (needsWrite) {
          try { fs.writeFileSync(localIconPath, blueBuf); } catch (_) {}
        }
      }
    }
    let currentModsCount = 0;
    try {
      if (fs.existsSync(modsDir)) {
        currentModsCount = fs.readdirSync(modsDir).filter(f => f.toLowerCase().endsWith('.jar')).length;
      }
    } catch (_) {}

    if (isShubaClient && currentModsCount === 0) {
      try {
        this._populateDefaultShubaClientMods(instanceDir);
      } catch (popErr) {
        logger.warn(`Aviso al poblar mods en ${profileId}: ${popErr.message}`);
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

  setActiveProfile(id) {
    return this.setActive(id);
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

    // Si este ID estuvo previamente en la lista de eliminados, reactivarlo limpiamente
    if (this.deletedProfileIds && this.deletedProfileIds.has(id)) {
      this.deletedProfileIds.delete(id);
      this._saveDeletedProfileIds();
    }

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
      if (updated.icon && updated.icon.startsWith('data:image')) {
        try {
          const parts = updated.icon.split(',');
          if (parts[1]) {
            fs.writeFileSync(path.join(instanceDir, 'icon.png'), Buffer.from(parts[1], 'base64'));
            this.saveCustomIcon(updated.icon);
          }
        } catch (_) {}
      }
    }

    this.save();
    return updated;
  }

  deleteProfile(id) {
    const idx = this.data.profiles.findIndex((p) => p.id === id);
    if (idx < 0) {
      this.deletedProfileIds.add(id);
      this._saveDeletedProfileIds();
      const instanceDir = this.getInstancePath(id);
      this._safeRemoveDirectory(instanceDir);
      return true;
    }

    const profileToDelete = this.data.profiles[idx];
    const defaultInstDir = this.getInstancePath(id);
    const customInstDir = profileToDelete.instancePath;

    // 1. Marcar como ID eliminado persistentemente para NUNCA resucitarlo
    this.deletedProfileIds.add(id);
    this._saveDeletedProfileIds();

    // 2. Eliminar carpeta física en disco de forma segura
    this._safeRemoveDirectory(defaultInstDir);
    if (customInstDir && customInstDir !== defaultInstDir && customInstDir !== this.sharedRoot) {
      this._safeRemoveDirectory(customInstDir);
    }

    // 3. Remover de la lista de perfiles
    this.data.profiles.splice(idx, 1);

    // 4. Si la lista quedó vacía, regenerar el perfil por defecto oficial
    if (this.data.profiles.length === 0) {
      this.deletedProfileIds.delete('shubaclient-263');
      this._saveDeletedProfileIds();
      this.init();
      return true;
    }

    // 5. Si se eliminó el perfil activo, cambiar al primer perfil disponible
    if (this.data.activeProfileId === id) {
      this.data.activeProfileId = this.data.profiles[0].id;
    }

    this.save();
    logger.info(`Perfil "${profileToDelete.name}" (${id}) eliminado definitivamente.`);
    return true;
  }

  getIconsHistoryDir() {
    const dir = path.join(this.sharedRoot, 'cache', 'profile-icons');
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
    }
    return dir;
  }

  getIconHistory() {
    const icons = [];
    const seenHashes = new Set();

    // 1. Añadir iconos guardados en cache/profile-icons/
    const historyDir = this.getIconsHistoryDir();
    if (fs.existsSync(historyDir)) {
      try {
        const files = fs.readdirSync(historyDir);
        for (const file of files) {
          if (/\.(png|jpe?g|webp)$/i.test(file)) {
            const fullPath = path.join(historyDir, file);
            try {
              const buf = fs.readFileSync(fullPath);
              const hash = crypto.createHash('md5').update(buf).digest('hex');
              if (!seenHashes.has(hash)) {
                seenHashes.add(hash);
                icons.push({
                  id: `history-${file}`,
                  name: file,
                  dataUrl: `data:image/png;base64,${buf.toString('base64')}`
                });
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
    }

    // 2. Escanear iconos existentes de todas las instancias
    if (fs.existsSync(this.instancesDir)) {
      try {
        const dirs = fs.readdirSync(this.instancesDir);
        for (const d of dirs) {
          const iconPath = path.join(this.instancesDir, d, 'icon.png');
          if (fs.existsSync(iconPath)) {
            try {
              const buf = fs.readFileSync(iconPath);
              const hash = crypto.createHash('md5').update(buf).digest('hex');
              if (!seenHashes.has(hash)) {
                seenHashes.add(hash);
                icons.push({
                  id: `instance-${d}`,
                  name: d,
                  dataUrl: `data:image/png;base64,${buf.toString('base64')}`
                });
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
    }

    return icons;
  }

  saveCustomIcon(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') return null;
    try {
      const parts = dataUrl.split(',');
      if (!parts[1]) return null;
      const buf = Buffer.from(parts[1], 'base64');
      const hash = crypto.createHash('md5').update(buf).digest('hex');
      const historyDir = this.getIconsHistoryDir();
      const destPath = path.join(historyDir, `icon_${hash}.png`);
      fs.writeFileSync(destPath, buf);
      return `data:image/png;base64,${buf.toString('base64')}`;
    } catch (_) {
      return null;
    }
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
