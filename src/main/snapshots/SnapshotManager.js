/**
 * ShubaCore - Snapshot Manager (Puntos de Restauración y Copias de Seguridad)
 * Developed by SHUBATECH
 * Crea copias de seguridad comprimidas (.zip) de mods, configs, opciones y mundos.
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { defaultLogger: logger } = require('../utils/logger');

class SnapshotManager {
  constructor(options = {}) {
    this.options = options;
  }

  _getSnapshotsDir(instancePath) {
    const dir = path.join(instancePath, '.snapshots');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  _getMetadataPath(instancePath) {
    return path.join(this._getSnapshotsDir(instancePath), 'snapshots.json');
  }

  _loadMetadata(instancePath) {
    const metaPath = this._getMetadataPath(instancePath);
    if (!fs.existsSync(metaPath)) return [];
    try {
      const data = fs.readFileSync(metaPath, 'utf8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  _saveMetadata(instancePath, snapshots) {
    const metaPath = this._getMetadataPath(instancePath);
    try {
      fs.writeFileSync(metaPath, JSON.stringify(snapshots, null, 2), 'utf8');
      return true;
    } catch (err) {
      logger.error('[SnapshotManager] Error al guardar snapshots.json:', err);
      return false;
    }
  }

  /**
   * Lista todos los puntos de restauración disponibles para una instancia
   */
  listSnapshots(instancePath) {
    if (!instancePath || !fs.existsSync(instancePath)) return [];
    const meta = this._loadMetadata(instancePath);
    const snapshotsDir = this._getSnapshotsDir(instancePath);

    // Verificar que los archivos físicos .zip aún existan en disco
    const validSnapshots = meta.filter(s => {
      const zipPath = path.join(snapshotsDir, s.filename || `${s.id}.zip`);
      return fs.existsSync(zipPath);
    });

    if (validSnapshots.length !== meta.length) {
      this._saveMetadata(instancePath, validSnapshots);
    }

    return validSnapshots.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }

  /**
   * Crea un nuevo punto de restauración
   * @param {string} instancePath
   * @param {object} options - { label, includeWorlds, isAuto }
   */
  async createSnapshot(instancePath, options = {}) {
    if (!instancePath || !fs.existsSync(instancePath)) {
      throw new Error('Carpeta de instancia no encontrada.');
    }

    const timestamp = Date.now();
    const id = `snap_${timestamp}`;
    const filename = `${id}.zip`;
    const snapshotsDir = this._getSnapshotsDir(instancePath);
    const targetZipPath = path.join(snapshotsDir, filename);

    const label = options.label && options.label.trim().length > 0
      ? options.label.trim()
      : `Punto de restauración - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const includeWorlds = Boolean(options.includeWorlds);
    const zip = new AdmZip();

    let modsCount = 0;

    // 1. Respaldar carpeta mods/
    const modsDir = path.join(instancePath, 'mods');
    if (fs.existsSync(modsDir)) {
      const modFiles = fs.readdirSync(modsDir);
      for (const file of modFiles) {
        if (file.endsWith('.jar') || file.endsWith('.disabled')) {
          modsCount++;
        }
      }
      zip.addLocalFolder(modsDir, 'mods');
    }

    // 2. Respaldar carpeta config/
    const configDir = path.join(instancePath, 'config');
    if (fs.existsSync(configDir)) {
      zip.addLocalFolder(configDir, 'config');
    }

    // 3. Respaldar carpeta defaultconfigs/ (si existe)
    const defaultConfigsDir = path.join(instancePath, 'defaultconfigs');
    if (fs.existsSync(defaultConfigsDir)) {
      zip.addLocalFolder(defaultConfigsDir, 'defaultconfigs');
    }

    // 4. Respaldar options.txt
    const optionsTxt = path.join(instancePath, 'options.txt');
    if (fs.existsSync(optionsTxt)) {
      zip.addLocalFile(optionsTxt);
    }

    // 5. Respaldar mods-lock.json / profile.json
    const modsLock = path.join(instancePath, 'mods-lock.json');
    if (fs.existsSync(modsLock)) {
      zip.addLocalFile(modsLock);
    }

    // 6. Opcionalmente respaldar saves/ (mundos)
    if (includeWorlds) {
      const savesDir = path.join(instancePath, 'saves');
      if (fs.existsSync(savesDir)) {
        zip.addLocalFolder(savesDir, 'saves');
      }
    }

    // Guardar archivo .zip en disco de forma síncrona
    zip.writeZip(targetZipPath);

    const stat = fs.statSync(targetZipPath);
    const sizeBytes = stat.size;
    const sizeFormatted = this._formatBytes(sizeBytes);

    const snapshotEntry = {
      id,
      filename,
      label,
      timestamp,
      createdAt: new Date().toISOString(),
      sizeBytes,
      sizeFormatted,
      modsCount,
      includeWorlds,
      isAuto: Boolean(options.isAuto)
    };

    const currentMeta = this._loadMetadata(instancePath);
    currentMeta.unshift(snapshotEntry);

    // Mantener un máximo de 15 snapshots para no saturar el almacenamiento
    const trimmedMeta = currentMeta.slice(0, 15);
    this._saveMetadata(instancePath, trimmedMeta);

    logger.info(`[SnapshotManager] Snapshot creado exitosamente: "${label}" (${sizeFormatted}, ${modsCount} mods)`);
    return { success: true, snapshot: snapshotEntry };
  }

  /**
   * Restaura un punto de restauración sobre la instancia
   * @param {string} instancePath
   * @param {string} snapshotId
   */
  async restoreSnapshot(instancePath, snapshotId) {
    if (!instancePath || !fs.existsSync(instancePath)) {
      throw new Error('Carpeta de instancia no encontrada.');
    }

    const snapshots = this.listSnapshots(instancePath);
    const target = snapshots.find(s => s.id === snapshotId);
    if (!target) {
      throw new Error(`Punto de restauración ${snapshotId} no encontrado.`);
    }

    const snapshotsDir = this._getSnapshotsDir(instancePath);
    const zipPath = path.join(snapshotsDir, target.filename || `${target.id}.zip`);

    if (!fs.existsSync(zipPath)) {
      throw new Error(`El archivo de respaldo ${target.filename} no existe en disco.`);
    }

    logger.info(`[SnapshotManager] Restaurando snapshot: ${target.label} (${target.id})...`);

    // 1. Limpiar carpeta mods/ actual para evitar colisiones de mods duplicados
    const modsDir = path.join(instancePath, 'mods');
    if (fs.existsSync(modsDir)) {
      try {
        const existingMods = fs.readdirSync(modsDir);
        for (const file of existingMods) {
          if (file.endsWith('.jar') || file.endsWith('.disabled')) {
            fs.unlinkSync(path.join(modsDir, file));
          }
        }
      } catch (cleanErr) {
        logger.warn('[SnapshotManager] Error al limpiar mods/ previo a la restauración:', cleanErr);
      }
    } else {
      fs.mkdirSync(modsDir, { recursive: true });
    }

    // 2. Extraer el contenido del .zip sobre la raíz de la instancia
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(instancePath, true);

    logger.info(`[SnapshotManager] Snapshot ${target.id} restaurado con éxito en ${instancePath}`);
    return {
      success: true,
      restoredSnapshot: target
    };
  }

  /**
   * Elimina un punto de restauración
   */
  deleteSnapshot(instancePath, snapshotId) {
    if (!instancePath || !fs.existsSync(instancePath)) return { success: false };

    const snapshotsDir = this._getSnapshotsDir(instancePath);
    const meta = this._loadMetadata(instancePath);
    const target = meta.find(s => s.id === snapshotId);

    if (target) {
      const zipPath = path.join(snapshotsDir, target.filename || `${target.id}.zip`);
      if (fs.existsSync(zipPath)) {
        try {
          fs.unlinkSync(zipPath);
        } catch (_) {}
      }
    }

    const remaining = meta.filter(s => s.id !== snapshotId);
    this._saveMetadata(instancePath, remaining);
    return { success: true, remainingCount: remaining.length };
  }

  _formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

let snapshotManagerInstance = null;
function getSnapshotManager() {
  if (!snapshotManagerInstance) {
    snapshotManagerInstance = new SnapshotManager();
  }
  return snapshotManagerInstance;
}

module.exports = {
  SnapshotManager,
  getSnapshotManager
};
