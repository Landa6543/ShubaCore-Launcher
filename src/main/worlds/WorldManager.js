/**
 * ShubaCore - World Manager (Saves, Backups & QuickPlay Direct Access)
 * Developed by SHUBATECH
 * Scans <instance>/saves/, extracts world metadata, icon.png and level.dat LevelName
 * Manages 1-click .zip backups in <instance>/backups/ and restoration
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { shell } = require('electron');
const AdmZip = require('adm-zip');
const { getProfileManager } = require('../profiles/ProfileManager');
const { defaultLogger: logger } = require('../utils/logger');

class WorldManager {
  constructor() {
    this.profileManager = getProfileManager();
  }

  _getSavesDir(instancePath) {
    const inst = instancePath || this.profileManager.getActiveInstancePath();
    const savesDir = path.join(inst, 'saves');
    if (!fs.existsSync(savesDir)) {
      fs.mkdirSync(savesDir, { recursive: true });
    }
    return savesDir;
  }

  _getBackupsDir(instancePath) {
    const inst = instancePath || this.profileManager.getActiveInstancePath();
    const backupsDir = path.join(inst, 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    return backupsDir;
  }

  _extractLevelName(levelDatPath, fallbackName) {
    try {
      if (!fs.existsSync(levelDatPath)) return fallbackName;
      const buf = fs.readFileSync(levelDatPath);
      const uncompressed = zlib.gunzipSync(buf);

      // Buscar la clave "LevelName" en NBT
      const idx = uncompressed.indexOf('LevelName');
      if (idx !== -1) {
        // Tag String: 2 bytes de longitud de nombre ("LevelName" = 9)
        // seguido por 2 bytes de longitud del valor string
        const valLen = uncompressed.readUInt16BE(idx + 9);
        if (valLen > 0 && valLen < 256 && idx + 11 + valLen <= uncompressed.length) {
          const val = uncompressed.toString('utf8', idx + 11, idx + 11 + valLen);
          if (val && val.trim()) return val.trim();
        }
      }
    } catch (_) {}
    return fallbackName;
  }

  _calcDirSize(dirPath) {
    let totalSize = 0;
    try {
      const files = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const file of files) {
        const full = path.join(dirPath, file.name);
        if (file.isDirectory()) {
          totalSize += this._calcDirSize(full);
        } else if (file.isFile()) {
          try {
            totalSize += fs.statSync(full).size;
          } catch (_) {}
        }
      }
    } catch (_) {}
    return totalSize;
  }

  _formatSize(bytes) {
    if (!bytes || bytes <= 0) return '0 MB';
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Lista todos los mundos guardados en <instanceDir>/saves/
   */
  async listWorlds(instancePath) {
    const savesDir = this._getSavesDir(instancePath);
    const backupsDir = this._getBackupsDir(instancePath);

    if (!fs.existsSync(savesDir)) return [];

    const entries = fs.readdirSync(savesDir, { withFileTypes: true });
    const worlds = [];

    // Obtener lista de backups existentes para calcular contadores
    let allBackups = [];
    if (fs.existsSync(backupsDir)) {
      try {
        allBackups = fs.readdirSync(backupsDir).filter((f) => f.toLowerCase().endsWith('.zip'));
      } catch (_) {}
    }

    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const worldPath = path.join(savesDir, ent.name);
      const levelDatPath = path.join(worldPath, 'level.dat');

      // Solo consideramos carpetas que tengan level.dat o subcarpetas de mundo válidas
      if (!fs.existsSync(levelDatPath)) continue;

      let worldName = ent.name;
      let lastPlayed = new Date().toISOString();
      let icon = null;
      let sizeBytes = 0;

      try {
        const stat = fs.statSync(levelDatPath);
        lastPlayed = stat.mtime.toISOString();
        worldName = this._extractLevelName(levelDatPath, ent.name);
        sizeBytes = this._calcDirSize(worldPath);

        const iconPath = path.join(worldPath, 'icon.png');
        if (fs.existsSync(iconPath)) {
          const iconBuf = fs.readFileSync(iconPath);
          icon = `data:image/png;base64,${iconBuf.toString('base64')}`;
        }
      } catch (err) {
        logger.warn(`[Worlds] Aviso al leer mundo ${ent.name}: ${err.message}`);
      }

      // Contar backups de este mundo específico
      const normFolderName = ent.name.toLowerCase();
      const backupsCount = allBackups.filter((b) => b.toLowerCase().startsWith(normFolderName + '-')).length;

      worlds.push({
        folderName: ent.name,
        worldName,
        lastPlayed,
        lastPlayedFormatted: new Date(lastPlayed).toLocaleString(),
        sizeBytes,
        formattedSize: this._formatSize(sizeBytes),
        icon,
        backupsCount,
        path: worldPath
      });
    }

    // Ordenar por última partida (más reciente primero)
    worlds.sort((a, b) => new Date(b.lastPlayed).getTime() - new Date(a.lastPlayed).getTime());
    return worlds;
  }

  /**
   * Crea un backup .zip de un mundo en <instanceDir>/backups/
   */
  async createBackup(instancePath, folderName) {
    if (!folderName) throw new Error('Falta especificar la carpeta del mundo.');
    const savesDir = this._getSavesDir(instancePath);
    const backupsDir = this._getBackupsDir(instancePath);
    const worldPath = path.join(savesDir, folderName);

    if (!fs.existsSync(worldPath)) {
      throw new Error(`El mundo "${folderName}" no existe en ${savesDir}.`);
    }

    // Formatear timestamp local: YYYY-MM-DD_HH-mm-ss
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const backupFileName = `${folderName}-${timestamp}.zip`;
    const backupFilePath = path.join(backupsDir, backupFileName);

    logger.info(`[Worlds] Creando backup para "${folderName}" en "${backupFilePath}"...`);

    const zip = new AdmZip();
    zip.addLocalFolder(worldPath, '');
    zip.writeZip(backupFilePath);

    const stat = fs.statSync(backupFilePath);
    logger.info(`⚡ [Worlds] Backup creado con éxito: ${backupFileName} (${this._formatSize(stat.size)})`);

    return {
      success: true,
      backupFileName,
      backupFilePath,
      sizeBytes: stat.size,
      formattedSize: this._formatSize(stat.size),
      folderName
    };
  }

  /**
   * Lista todos los backups disponibles para un mundo o para todos los mundos
   */
  async listBackups(instancePath, folderName = null) {
    const backupsDir = this._getBackupsDir(instancePath);
    if (!fs.existsSync(backupsDir)) return [];

    const files = fs.readdirSync(backupsDir);
    const backups = [];

    const filterPrefix = folderName ? `${folderName.toLowerCase()}-` : '';

    for (const f of files) {
      if (!f.toLowerCase().endsWith('.zip')) continue;
      if (filterPrefix && !f.toLowerCase().startsWith(filterPrefix)) continue;

      const fullPath = path.join(backupsDir, f);
      try {
        const stat = fs.statSync(fullPath);
        // Extraer nombre de mundo desde el prefijo del archivo
        const parts = f.replace(/\.zip$/i, '').split('-');
        let extractedWorld = folderName || parts.slice(0, -2).join('-') || parts[0];

        backups.push({
          fileName: f,
          worldName: extractedWorld,
          sizeBytes: stat.size,
          formattedSize: this._formatSize(stat.size),
          createdAt: stat.mtime.toISOString(),
          createdAtFormatted: stat.mtime.toLocaleString(),
          filePath: fullPath
        });
      } catch (_) {}
    }

    // Ordenar de más reciente a más antiguo
    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return backups;
  }

  /**
   * Restaura un backup .zip en <instanceDir>/saves/<targetFolderName>
   */
  async restoreBackup(instancePath, backupFileName, targetFolderName = null) {
    if (!backupFileName) throw new Error('Falta especificar el archivo de backup a restaurar.');
    const backupsDir = this._getBackupsDir(instancePath);
    const savesDir = this._getSavesDir(instancePath);
    const backupFilePath = path.join(backupsDir, backupFileName);

    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`El archivo de backup "${backupFileName}" no existe.`);
    }

    // Determinar nombre de carpeta de destino
    let destFolder = targetFolderName;
    if (!destFolder) {
      // Extraer desde el nombre del archivo: "NombreMundo-YYYY-MM-DD_HH-mm-ss.zip"
      const match = backupFileName.match(/^(.+?)-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.zip$/i);
      destFolder = match ? match[1] : backupFileName.replace(/\.zip$/i, '');
    }

    const targetWorldDir = path.join(savesDir, destFolder);

    logger.info(`[Worlds] Restaurando backup "${backupFileName}" en "${targetWorldDir}"...`);

    const zip = new AdmZip(backupFilePath);
    zip.extractAllTo(targetWorldDir, true);

    logger.info(`⚡ [Worlds] ¡Mundo "${destFolder}" restaurado exitosamente!`);
    return {
      success: true,
      folderName: destFolder,
      targetWorldDir
    };
  }

  /**
   * Elimina un archivo de backup
   */
  async deleteBackup(instancePath, backupFileName) {
    if (!backupFileName) throw new Error('Falta el nombre de backup a eliminar.');
    const backupsDir = this._getBackupsDir(instancePath);
    const targetFile = path.join(backupsDir, backupFileName);

    if (fs.existsSync(targetFile)) {
      fs.unlinkSync(targetFile);
    }
    return { success: true, backupFileName };
  }

  /**
   * Crea un backup rápido de TODOS los mundos existentes en la instancia
   * (Utilizado antes de "Actualizar Todos los Mods")
   */
  async backupAllWorlds(instancePath) {
    const worlds = await this.listWorlds(instancePath);
    const results = [];
    logger.info(`[Worlds] Iniciando backup masivo de seguridad de ${worlds.length} mundo(s)...`);

    for (const w of worlds) {
      try {
        const res = await this.createBackup(instancePath, w.folderName);
        results.push(res);
      } catch (err) {
        logger.warn(`[Worlds] Error al respaldar mundo "${w.folderName}": ${err.message}`);
      }
    }

    return {
      success: true,
      totalCount: worlds.length,
      backedUpCount: results.length,
      results
    };
  }

  /**
   * Abre la carpeta de un mundo específico en el explorador de Windows
   */
  async openWorldFolder(instancePath, folderName) {
    const savesDir = this._getSavesDir(instancePath);
    const targetDir = folderName ? path.join(savesDir, folderName) : savesDir;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    await shell.openPath(targetDir);
    return { success: true, path: targetDir };
  }
}

let instance = null;
function getWorldManager() {
  if (!instance) {
    instance = new WorldManager();
  }
  return instance;
}

module.exports = {
  WorldManager,
  getWorldManager
};
