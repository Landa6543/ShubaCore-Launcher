/**
 * ShubaCore - Dedicated Server Mod Filter & Exporter
 * Developed by SHUBATECH
 *
 * Implements intelligent client-to-server mod synchronization:
 * 1. Client-Side Only Blacklist (Sodium, Embeddium, Iris, Oculus, EntityCulling, SoundPhysics, HUDs, etc.).
 * 2. Deep JAR inspection:
 *    - fabric.mod.json / quilt.mod.json (`environment: "client"`)
 *    - META-INF/neoforge.mods.toml / mods.toml (`displayTest="IGNORE_SERVER"`)
 * 3. Automatic copying of server-compatible content mods and configs.
 * 4. Exporting complete server packs (.zip) ready for VPS / hosting.
 */

const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { defaultLogger: logger } = require('../utils/logger');

// Lista exhaustiva de mods exclusivamente del lado del cliente (gráficos, shaders, audio local, HUDs, inputs)
const CLIENT_ONLY_MOD_KEYWORDS = [
  'sodium',
  'embeddium',
  'rubidium',
  'iris',
  'oculus',
  'entityculling',
  'entity-culling',
  'entity_culling',
  'immediatelyfast',
  'immediately-fast',
  'reeses-sodium-options',
  'reeses_sodium_options',
  'reesessodiumoptions',
  'sodium-extra',
  'sodium_extra',
  'sodiumextra',
  'embeddium-extra',
  'embeddium_extra',
  'continuity',
  'lambdynamiclights',
  'dynamiclights',
  'dynamic-lights',
  '3dskinlayers',
  'skinlayers3d',
  'skinlayers-3d',
  'notenoughanimations',
  'not-enough-animations',
  'emi',
  'controlling',
  'searchables',
  'mousetweaks',
  'mouse-tweaks',
  'mousetweak',
  'toastcontrol',
  'toast-control',
  'packmenu',
  'fancymenu',
  'fancy-menu',
  'drippyloadingscreen',
  'drippy-loading-screen',
  'legendarytooltips',
  'legendary-tooltips',
  'soundphysics',
  'sound-physics',
  'soundphysicsremastered',
  'sound_physics_remastered',
  'ambientsounds',
  'ambient-sounds',
  'presencefootsteps',
  'presence-footsteps',
  'appleskin',
  'apple-skin',
  'dynamiccrosshair',
  'dynamic-crosshair',
  'shulkerboxtooltip',
  'shulker-box-tooltip',
  'custom-fov',
  'betterf3',
  'better-f3',
  'fpsreducer',
  'fps-reducer',
  'smoothboot',
  'smooth-boot',
  'smoothchunk',
  'borderlessmining',
  'borderless-mining',
  'cullleaves',
  'cull-leaves',
  'cubes-without-borders',
  'item-borders',
  'itemborders',
  'chat_heads',
  'chatheads',
  'xaerominimap',
  'xaeroworldmap',
  'xaero-minimap',
  'xaero-worldmap',
  'xaeros-minimap',
  'xaeros-worldmap',
  'invmove',
  'inventory-move',
  'zoomify',
  'ok-zoomer',
  'wi-zoom',
  'logical-zoom',
  'resourcify',
  'authme-client',
  'modernfix-client',
  'ferritecore-client'
];

class ServerModFilter {
  /**
   * Determina si un archivo .jar es exclusivo del lado cliente
   *
   * @param {string} jarFilePath - Ruta absoluta al archivo .jar
   * @param {string} fileName - Nombre del archivo .jar
   * @returns {{ isClientOnly: boolean, reason?: string }}
   */
  static isClientOnlyMod(jarFilePath, fileName = null) {
    const rawName = (fileName || path.basename(jarFilePath)).toLowerCase();

    // 1. Detección rápida por palabras clave en el nombre del archivo
    for (const keyword of CLIENT_ONLY_MOD_KEYWORDS) {
      const sanitized = rawName.replace(/[^a-z0-9_-]/g, '-');
      // Coincidencia exacta de token o prefijo
      const regex = new RegExp(`(^|[_-])${keyword}([_-]|$)`, 'i');
      if (regex.test(sanitized) || sanitized.startsWith(keyword + '-') || sanitized.startsWith(keyword + '_')) {
        return {
          isClientOnly: true,
          reason: `Mod cliente identificado por lista negra (${keyword})`
        };
      }
    }

    // 2. Inspección profunda de metadatos internos dentro del .jar
    if (fs.existsSync(jarFilePath)) {
      try {
        const zip = new AdmZip(jarFilePath);
        const zipEntries = zip.getEntries();

        // 2.1 Inspeccionar fabric.mod.json / quilt.mod.json
        const fabricEntry = zipEntries.find((e) => e.entryName === 'fabric.mod.json' || e.entryName === 'quilt.mod.json');
        if (fabricEntry) {
          try {
            const raw = fabricEntry.getData().toString('utf8');
            const data = JSON.parse(raw);
            if (data.environment === 'client' || data.environment === 'client-only') {
              return {
                isClientOnly: true,
                reason: `Metadato ${fabricEntry.entryName} especifica "environment: client"`
              };
            }
          } catch (_) {}
        }

        // 2.2 Inspeccionar META-INF/neoforge.mods.toml o META-INF/mods.toml
        const tomlEntry = zipEntries.find((e) =>
          e.entryName === 'META-INF/neoforge.mods.toml' ||
          e.entryName === 'META-INF/mods.toml'
        );
        if (tomlEntry) {
          try {
            const rawToml = tomlEntry.getData().toString('utf8');
            // Verificar si declara displayTest="IGNORE_SERVER" o si especifica clientSideOnly=true
            if (rawToml.includes('displayTest="IGNORE_SERVER"') && (
              rawToml.includes('clientSideOnly=true') ||
              rawToml.includes('side="CLIENT"')
            )) {
              return {
                isClientOnly: true,
                reason: `Metadato TOML especifica displayTest IGNORE_SERVER / clientSideOnly`
              };
            }
          } catch (_) {}
        }
      } catch (zipErr) {
        // Si el jar está protegido o corrupto, se mantiene la decisión previa
        logger.debug(`[ServerModFilter] Aviso al inspeccionar .jar ${rawName}: ${zipErr.message}`);
      }
    }

    return { isClientOnly: false };
  }

  /**
   * Sincroniza mods desde una instancia cliente a una carpeta de servidor dedicado
   * Filtrando automáticamente los mods cliente para evitar crasheos.
   *
   * @param {Object} options
   * @param {string} options.clientInstancePath - Directorio raíz de la instancia cliente
   * @param {string} options.serverPath - Directorio raíz del servidor dedicado
   * @param {boolean} [options.copyConfigs=true] - Copiar también config/ y defaultconfigs/
   * @returns {Promise<{ success: boolean, totalCopied: number, totalSkipped: number, copiedMods: string[], skippedMods: Array<{ name: string, reason: string }> }>}
   */
  static async syncModsToDedicatedServer({ clientInstancePath, serverPath, copyConfigs = true }) {
    if (!fs.existsSync(clientInstancePath)) {
      throw new Error(`La instancia cliente seleccionada no existe: ${clientInstancePath}`);
    }
    if (!fs.existsSync(serverPath)) {
      fs.mkdirSync(serverPath, { recursive: true });
    }

    const clientModsDir = path.join(clientInstancePath, 'mods');
    const serverModsDir = path.join(serverPath, 'mods');
    if (!fs.existsSync(serverModsDir)) {
      fs.mkdirSync(serverModsDir, { recursive: true });
    }

    const copiedMods = [];
    const skippedMods = [];

    if (fs.existsSync(clientModsDir)) {
      const files = fs.readdirSync(clientModsDir);

      for (const file of files) {
        if (!file.endsWith('.jar') || file.endsWith('.disabled')) {
          continue;
        }

        const sourcePath = path.join(clientModsDir, file);
        const check = ServerModFilter.isClientOnlyMod(sourcePath, file);

        if (check.isClientOnly) {
          skippedMods.push({
            name: file,
            reason: check.reason || 'Mod exclusivo de cliente'
          });
          logger.info(`[ServerModFilter] ⏭ Omitido mod de cliente: "${file}" (${check.reason})`);
        } else {
          const destPath = path.join(serverModsDir, file);
          fs.copyFileSync(sourcePath, destPath);
          copiedMods.push(file);
        }
      }
    }

    // Sincronizar configs si se solicitó
    if (copyConfigs) {
      const clientConfigDir = path.join(clientInstancePath, 'config');
      const serverConfigDir = path.join(serverPath, 'config');
      if (fs.existsSync(clientConfigDir)) {
        ServerModFilter._copyDirRecursive(clientConfigDir, serverConfigDir);
        logger.info(`[ServerModFilter] Carpeta config/ sincronizada exitosamente al servidor.`);
      }

      const clientDefaultConfigsDir = path.join(clientInstancePath, 'defaultconfigs');
      const serverDefaultConfigsDir = path.join(serverPath, 'defaultconfigs');
      if (fs.existsSync(clientDefaultConfigsDir)) {
        ServerModFilter._copyDirRecursive(clientDefaultConfigsDir, serverDefaultConfigsDir);
        logger.info(`[ServerModFilter] Carpeta defaultconfigs/ sincronizada exitosamente al servidor.`);
      }
    }

    logger.info(`[ServerModFilter] ⚡ Sincronizados ${copiedMods.length} mods al servidor (Omitidos ${skippedMods.length} mods exclusivos de cliente para evitar crasheos)`);

    return {
      success: true,
      totalCopied: copiedMods.length,
      totalSkipped: skippedMods.length,
      syncedCount: copiedMods.length,
      skippedCount: skippedMods.length,
      copiedMods,
      skippedMods
    };
  }

  /**
   * Exporta un paquete completo de servidor (.zip) listo para subir a hosting o VPS
   *
   * @param {Object} options
   * @param {string} options.serverPath - Directorio del servidor
   * @param {string} options.outputPath - Ruta del archivo .zip resultante
   * @param {string} [options.serverName='ShubaCore_Server']
   * @returns {Promise<{ success: boolean, zipPath: string, sizeFormatted: string }>}
   */
  static async exportServerPackZip({ serverPath, outputPath, serverName = 'ShubaCore_Server' }) {
    if (!fs.existsSync(serverPath)) {
      throw new Error(`El directorio del servidor no existe: ${serverPath}`);
    }

    const zip = new AdmZip();

    // 1. Agregar carpeta mods/
    const modsDir = path.join(serverPath, 'mods');
    if (fs.existsSync(modsDir)) {
      zip.addLocalFolder(modsDir, 'mods');
    }

    // 2. Agregar carpeta config/
    const configDir = path.join(serverPath, 'config');
    if (fs.existsSync(configDir)) {
      zip.addLocalFolder(configDir, 'config');
    }

    // 3. Agregar carpeta defaultconfigs/
    const defaultConfigsDir = path.join(serverPath, 'defaultconfigs');
    if (fs.existsSync(defaultConfigsDir)) {
      zip.addLocalFolder(defaultConfigsDir, 'defaultconfigs');
    }

    // 4. Agregar server.properties y eula.txt si existen
    const serverProps = path.join(serverPath, 'server.properties');
    if (fs.existsSync(serverProps)) {
      zip.addLocalFile(serverProps, '');
    }

    const eulaFile = path.join(serverPath, 'eula.txt');
    if (fs.existsSync(eulaFile)) {
      zip.addLocalFile(eulaFile, '');
    } else {
      zip.addFile('eula.txt', Buffer.from('eula=true\n', 'utf8'));
    }

    // 5. Scripts de arranque de servidor (.bat y .sh) preconfigurados
    const startBat = `@echo off\ntitle ${serverName} - ShubaCore Server\njava -Xms2G -Xmx6G -XX:+UseG1GC -jar server.jar nogui\npause\n`;
    const startSh = `#!/bin/bash\njava -Xms2G -Xmx6G -XX:+UseG1GC -jar server.jar nogui\n`;
    zip.addFile('start_server.bat', Buffer.from(startBat, 'utf8'));
    zip.addFile('start_server.sh', Buffer.from(startSh, 'utf8'));

    // Asegurar directorio destino
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    zip.writeZip(outputPath);

    const stats = fs.statSync(outputPath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(1);
    const sizeFormatted = stats.size > 1048576 ? `${sizeMb} MB` : `${Math.round(stats.size / 1024)} KB`;

    logger.info(`[ServerModFilter] ⚡ Pack de servidor exportado con éxito en: "${outputPath}" (${sizeFormatted})`);

    return {
      success: true,
      zipPath: outputPath,
      sizeFormatted
    };
  }

  static _copyDirRecursive(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        ServerModFilter._copyDirRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

module.exports = {
  ServerModFilter,
  CLIENT_ONLY_MOD_KEYWORDS
};
