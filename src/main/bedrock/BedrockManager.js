/**
/**
 * ShubaCore - BedrockManager
 * Developed by SHUBATECH
 *
 * Administra la detección, lanzamiento nativo y gestión de Add-ons (.mcpack, .mcaddon, .mcworld)
 * para Minecraft Bedrock Edition en Windows (Microsoft Store / Xbox App).
 */

const fs = require('fs');
const path = require('path');
const { shell } = require('electron');
const { execSync, exec } = require('child_process');
const AdmZip = require('adm-zip');
const logger = require('../utils/logger').defaultLogger || console;

class BedrockManager {
  constructor(options = {}) {
    this.packageFamily = 'Microsoft.MinecraftUWP_8wekyb3d8bbwe';
    this.previewPackageFamily = 'Microsoft.MinecraftWindowsBeta_8wekyb3d8bbwe';
    this.storeProductId = '9NBLGGH2JHXJ';
    this.storeUrl = `ms-windows-store://pdp/?ProductId=${this.storeProductId}`;
    this.webStoreUrl = 'https://www.xbox.com/games/store/minecraft-for-windows/9nblggh2jhxj';
  }

  /**
   * Obtiene la ruta al directorio LocalState/games/com.mojang oficial de Bedrock en Windows
   */
  getComMojangPath() {
    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) return null;

    // 1. Bedrock Oficial Release
    const officialPath = path.join(
      localAppData,
      'Packages',
      this.packageFamily,
      'LocalState',
      'games',
      'com.mojang'
    );
    if (fs.existsSync(officialPath)) return officialPath;

    // 2. Bedrock Preview / Beta
    const previewPath = path.join(
      localAppData,
      'Packages',
      this.previewPackageFamily,
      'LocalState',
      'games',
      'com.mojang'
    );
    if (fs.existsSync(previewPath)) return previewPath;

    return null;
  }

  /**
   * Comprueba si Minecraft Bedrock está instalado en el sistema Windows
   */
  isInstalled() {
    // A. Comprobar si existe la carpeta de datos de la aplicación UWP
    const mojangPath = this.getComMojangPath();
    if (mojangPath) return true;

    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      const uwpDir = path.join(localAppData, 'Packages', this.packageFamily);
      if (fs.existsSync(uwpDir)) return true;
      const previewDir = path.join(localAppData, 'Packages', this.previewPackageFamily);
      if (fs.existsSync(previewDir)) return true;
    }

    // B. Comprobar registro de Windows para el protocolo "minecraft:"
    try {
      if (process.platform === 'win32') {
        const stdout = execSync('reg query "HKCR\\minecraft" /ve', {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
          timeout: 2000
        });
        if (stdout && stdout.includes('URL:minecraft')) return true;
      }
    } catch (_) {}

    // C. Comprobación rápida vía PowerShell Get-AppxPackage (con timeout de 2.5s)
    try {
      if (process.platform === 'win32') {
        const stdout = execSync(
          'powershell -NoProfile -Command "Get-AppxPackage -Name Microsoft.MinecraftUWP | Select-Object -ExpandProperty PackageFamilyName"',
          {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore'],
            timeout: 3000
          }
        );
        if (stdout && stdout.trim().includes(this.packageFamily)) return true;
      }
    } catch (_) {}

    return false;
  }

  /**
   * Obtiene información detallada del estado de Bedrock
   */
  getBedrockInfo() {
    const installed = this.isInstalled();
    const comMojangPath = this.getComMojangPath();
    const isPreview = !comMojangPath && process.env.LOCALAPPDATA
      ? fs.existsSync(path.join(process.env.LOCALAPPDATA, 'Packages', this.previewPackageFamily))
      : !!(comMojangPath && comMojangPath.includes('MinecraftWindowsBeta'));

    return {
      installed,
      edition: 'bedrock',
      comMojangPath,
      isPreview,
      storeUrl: this.storeUrl,
      webStoreUrl: this.webStoreUrl
    };
  }

  /**
   * Abre la ficha de Minecraft en la Microsoft Store de Windows
   */
  async openStore() {
    try {
      await shell.openExternal(this.storeUrl);
      return { success: true, url: this.storeUrl };
    } catch (err) {
      logger.warn('[BedrockManager] No se pudo abrir Store URI, intentando URL web:', err.message);
      await shell.openExternal(this.webStoreUrl);
      return { success: true, url: this.webStoreUrl };
    }
  }

  /**
   * Lanza Minecraft Bedrock en Windows usando el protocolo nativo minecraft://
   */
  async launch(options = {}) {
    const installed = this.isInstalled();
    if (!installed) {
      logger.warn('[BedrockManager] Intento de lanzar Bedrock pero no está instalado.');
      return {
        success: false,
        notInstalled: true,
        error: 'Minecraft Bedrock Edition no está instalado en este equipo. Instálalo desde la Microsoft Store o la app de Xbox.',
        storeUrl: this.storeUrl,
        webStoreUrl: this.webStoreUrl
      };
    }

    let protocolUrl = 'minecraft://';

    // Si se especifica un servidor para autoconexión en Bedrock:
    // Formato: minecraft://?addExternalServer=Nombre|ip:puerto
    if (options.serverAddress) {
      const serverName = options.serverName || 'ShubaCore Server';
      protocolUrl = `minecraft://?addExternalServer=${encodeURIComponent(serverName)}|${options.serverAddress}`;
    }

    logger.info(`[BedrockManager] Lanzando Minecraft Bedrock mediante: ${protocolUrl}`);

    try {
      await shell.openExternal(protocolUrl);
      return {
        success: true,
        isBedrock: true,
        method: 'protocol',
        url: protocolUrl
      };
    } catch (err) {
      logger.warn(`[BedrockManager] Falló shell.openExternal('${protocolUrl}'), probando UWP shell execution:`, err.message);
      return new Promise((resolve) => {
        exec(`explorer.exe shell:AppsFolder\\${this.packageFamily}!App`, (uwpErr) => {
          if (uwpErr) {
            logger.error('[BedrockManager] Error al lanzar UWP:', uwpErr.message);
            resolve({ success: false, error: uwpErr.message });
          } else {
            resolve({ success: true, isBedrock: true, method: 'uwp-shell' });
          }
        });
      });
    }
  }

  /**
   * Asegura la estructura de directorios de Add-ons para una instancia Bedrock en ShubaCore
   */
  setupInstanceFolders(instancePath) {
    if (!instancePath) return;
    const folders = ['behavior_packs', 'resource_packs', 'worlds', 'skin_packs'];
    for (const folder of folders) {
      const p = path.join(instancePath, folder);
      if (!fs.existsSync(p)) {
        fs.mkdirSync(p, { recursive: true });
      }
    }
  }

  /**
   * Escanea los Add-ons instalados en la instancia
   */
  getInstalledAddons(instancePath) {
    if (!instancePath || !fs.existsSync(instancePath)) {
      return { behaviorPacks: [], resourcePacks: [], worlds: [] };
    }

    const scanDir = (dirPath) => {
      if (!fs.existsSync(dirPath)) return [];
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        return entries.map((entry) => {
          const fullPath = path.join(dirPath, entry.name);
          let manifest = null;
          let iconPath = null;

          if (entry.isDirectory()) {
            const manifestPath = path.join(fullPath, 'manifest.json');
            if (fs.existsSync(manifestPath)) {
              try {
                manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
              } catch (_) {}
            }
            const candIcon = path.join(fullPath, 'pack_icon.png');
            if (fs.existsSync(candIcon)) {
              iconPath = candIcon;
            }
          }

          return {
            name: (manifest && manifest.header && manifest.header.name) || entry.name,
            description: (manifest && manifest.header && manifest.header.description) || '',
            version: (manifest && manifest.header && manifest.header.version) || '',
            folderName: entry.name,
            fullPath,
            isDirectory: entry.isDirectory(),
            hasManifest: !!manifest,
            iconPath
          };
        });
      } catch (err) {
        logger.warn(`[BedrockManager] Error al escanear ${dirPath}:`, err.message);
        return [];
      }
    };

    return {
      behaviorPacks: scanDir(path.join(instancePath, 'behavior_packs')),
      resourcePacks: scanDir(path.join(instancePath, 'resource_packs')),
      worlds: scanDir(path.join(instancePath, 'worlds'))
    };
  }

  /**
   * Importa un archivo .mcpack, .mcaddon o .mcworld en la instancia y opcionalmente en com.mojang
   */
  async importAddonFile(sourceFilePath, instancePath, syncToComMojang = false) {
    if (!fs.existsSync(sourceFilePath)) {
      throw new Error(`El archivo de Add-on no existe: ${sourceFilePath}`);
    }

    const ext = path.extname(sourceFilePath).toLowerCase();
    const baseName = path.basename(sourceFilePath, ext);
    this.setupInstanceFolders(instancePath);

    logger.info(`[BedrockManager] Importando archivo de Add-on Bedrock: ${sourceFilePath} (${ext})`);

    const result = {
      success: true,
      file: path.basename(sourceFilePath),
      type: 'unknown',
      installedTo: []
    };

    const zip = new AdmZip(sourceFilePath);

    if (ext === '.mcworld') {
      result.type = 'world';
      const targetDir = path.join(instancePath, 'worlds', baseName);
      zip.extractAllTo(targetDir, true);
      result.installedTo.push(targetDir);

      if (syncToComMojang) {
        const mojangPath = this.getComMojangPath();
        if (mojangPath) {
          const mojangTarget = path.join(mojangPath, 'minecraftWorlds', baseName);
          zip.extractAllTo(mojangTarget, true);
          result.installedTo.push(mojangTarget);
        }
      }
    } else if (ext === '.mcpack') {
      // Determinar si es resource_pack o behavior_pack leyendo manifest.json
      let packType = 'resource_packs';
      try {
        const manifestEntry = zip.getEntry('manifest.json');
        if (manifestEntry) {
          const manifestJson = JSON.parse(zip.readAsText(manifestEntry));
          const modules = (manifestJson && manifestJson.modules) || [];
          const hasBehavior = modules.some((m) => m.type === 'data' || m.type === 'javascript' || m.type === 'script');
          if (hasBehavior) packType = 'behavior_packs';
        }
      } catch (_) {}

      result.type = packType === 'behavior_packs' ? 'behavior' : 'resource';
      const targetDir = path.join(instancePath, packType, baseName);
      zip.extractAllTo(targetDir, true);
      result.installedTo.push(targetDir);

      if (syncToComMojang) {
        const mojangPath = this.getComMojangPath();
        if (mojangPath) {
          const mojangTarget = path.join(mojangPath, packType, baseName);
          zip.extractAllTo(mojangTarget, true);
          result.installedTo.push(mojangTarget);
        }
      }
    } else if (ext === '.mcaddon') {
      result.type = 'addon';
      // Un archivo .mcaddon suele ser un zip que contiene subarchivos .mcpack o carpetas
      const tempExtract = path.join(instancePath, '.temp_extract_' + Date.now());
      zip.extractAllTo(tempExtract, true);

      try {
        const entries = fs.readdirSync(tempExtract);
        for (const entry of entries) {
          const subPath = path.join(tempExtract, entry);
          if (entry.toLowerCase().endsWith('.mcpack')) {
            await this.importAddonFile(subPath, instancePath, syncToComMojang);
          } else if (fs.statSync(subPath).isDirectory()) {
            // Verificar si tiene manifest
            const mPath = path.join(subPath, 'manifest.json');
            let packType = 'resource_packs';
            if (fs.existsSync(mPath)) {
              try {
                const manifest = JSON.parse(fs.readFileSync(mPath, 'utf8'));
                const modules = manifest.modules || [];
                if (modules.some((m) => m.type === 'data' || m.type === 'javascript' || m.type === 'script')) {
                  packType = 'behavior_packs';
                }
              } catch (_) {}
            }
            const target = path.join(instancePath, packType, entry);
            if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });
            this._copyDirRecursive(subPath, target);
            result.installedTo.push(target);
          }
        }
      } finally {
        try {
          fs.rmSync(tempExtract, { recursive: true, force: true });
        } catch (_) {}
      }
    } else {
      throw new Error(`Extensión no compatible para Add-on Bedrock: ${ext}. Debe ser .mcpack, .mcaddon o .mcworld`);
    }

    logger.info(`[BedrockManager] Add-on ${result.file} importado exitosamente como tipo: ${result.type}`);
    return result;
  }

  /**
   * Abre el archivo con el sistema operativo para que Minecraft Bedrock lo auto-importe nativamente
   */
  async openWithNativeBedrock(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`El archivo no existe: ${filePath}`);
    }
    return shell.openPath(filePath);
  }

  _copyDirRecursive(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        this._copyDirRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

let instance = null;

function getBedrockManager() {
  if (!instance) {
    instance = new BedrockManager();
  }
  return instance;
}

module.exports = {
  BedrockManager,
  getBedrockManager
};
