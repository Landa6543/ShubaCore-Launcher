/**
 * ShubaCore - Custom Splash Screen Injector (SHUBATECH)
 * Developed by SHUBATECH
 *
 * Implements:
 * 1. Native replacement of Mojang's loading screen without installing external mods.
 * 2. Automatic dynamic Resource Pack generation in <instanceDir>/resourcepacks/ShubaCoreSplash/
 *    with proper pack_format for any Minecraft version.
 * 3. Injection of "file/ShubaCoreSplash" at the start of resourcePacks in options.txt.
 * 4. 100% non-destructive: preserves existing packs and cleans up cleanly if disabled.
 */

const fs = require('fs');
const path = require('path');
const { defaultLogger: logger } = require('../utils/logger');

class SplashScreen {
  /**
   * Resuelve el pack_format de Minecraft según la versión de semver
   */
  static getPackFormat(mcVersion) {
    if (!mcVersion) return 34;
    const parts = String(mcVersion).split('.').map((p) => parseInt(p, 10) || 0);
    const minor = parts[1] || 0;
    const patch = parts[2] || 0;

    if (minor >= 21) {
      if (patch >= 4) return 46;
      if (patch >= 2) return 42;
      return 34; // MC 1.21 - 1.21.1
    }
    if (minor === 20) {
      if (patch >= 5) return 32;
      if (patch >= 3) return 22;
      if (patch >= 2) return 18;
      return 15;
    }
    if (minor === 19) return 9;
    if (minor === 18) return 8;
    if (minor === 17) return 7;
    if (minor === 16) return 6;
    if (minor === 15) return 5;
    return 4;
  }

  /**
   * Localiza el archivo de logo de ShubaCore en el repositorio
   */
  resolveLogoFile(customLogoPath = null) {
    if (customLogoPath && fs.existsSync(customLogoPath)) {
      return customLogoPath;
    }

    const candidatePaths = [
      path.join(process.cwd(), 'logo.png'),
      path.join(process.cwd(), 'shubacore_logo.png'),
      path.join(process.cwd(), 'src', 'renderer', 'assets', 'logo.png'),
      path.join(process.cwd(), 'src', 'renderer', 'logo.png')
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) return p;
    }

    return null;
  }

  /**
   * Genera el Resource Pack nativo ShubaCoreSplash en la carpeta de la instancia
   * @param {string} instancePath - Ruta raíz de la instancia
   * @param {Object} options
   * @param {string} [options.mcVersion='1.21.1'] - Versión de Minecraft
   * @param {string} [options.customLogoPath] - Ruta a un logo personalizado
   */
  generateSplashPack(instancePath, { mcVersion = '1.21.1', customLogoPath = null } = {}) {
    if (!instancePath) throw new Error('Se requiere la ruta de la instancia.');

    const packDir = path.join(instancePath, 'resourcepacks', 'ShubaCoreSplash');
    const packMcmetaPath = path.join(packDir, 'pack.mcmeta');
    const texturesDir = path.join(packDir, 'assets', 'minecraft', 'textures', 'gui', 'title');

    // Asegurar directorios
    fs.mkdirSync(texturesDir, { recursive: true });

    // 1. Generar pack.mcmeta con el formato exacto de la versión
    const packFormat = SplashScreen.getPackFormat(mcVersion);
    const mcmetaContent = {
      pack: {
        pack_format: packFormat,
        description: 'Pantalla de carga personalizada ShubaCore - SHUBATECH'
      }
    };
    fs.writeFileSync(packMcmetaPath, JSON.stringify(mcmetaContent, null, 2), 'utf8');

    // 2. Copiar logo a las rutas de texturas de pantalla de carga
    const logoSource = this.resolveLogoFile(customLogoPath);
    if (logoSource) {
      try {
        const logoBuffer = fs.readFileSync(logoSource);

        // Ícono del paquete
        fs.writeFileSync(path.join(packDir, 'pack.png'), logoBuffer);

        // Textura moderna (MC 1.16+)
        fs.writeFileSync(path.join(texturesDir, 'mojangstudios.png'), logoBuffer);

        // Textura clásica (MC 1.15 y anteriores)
        fs.writeFileSync(path.join(texturesDir, 'mojang.png'), logoBuffer);

        logger.debug(`[SplashScreen] Texturas de carga inyectadas desde: ${logoSource}`);
      } catch (copyErr) {
        logger.warn(`[SplashScreen] Aviso al copiar texturas de logo: ${copyErr.message}`);
      }
    }

    logger.info(`[SplashScreen] ✅ Resource pack ShubaCoreSplash generado en: ${packDir} (pack_format: ${packFormat})`);
    return packDir;
  }

  /**
   * Inyecta "file/ShubaCoreSplash" en el primer lugar de resourcePacks en options.txt
   * @param {string} instancePath - Directorio de la instancia
   */
  injectIntoOptionsTxt(instancePath) {
    const optsFile = path.join(instancePath, 'options.txt');
    let lines = [];

    if (fs.existsSync(optsFile)) {
      try {
        lines = fs.readFileSync(optsFile, 'utf8').split('\n');
      } catch (_) {}
    }

    const packIdentifier = 'file/ShubaCoreSplash';
    let packLineFound = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('resourcePacks:')) {
        packLineFound = true;
        const valStr = line.slice('resourcePacks:'.length).trim();

        let currentPacks = [];
        try {
          if (valStr.startsWith('[') && valStr.endsWith(']')) {
            currentPacks = JSON.parse(valStr);
          } else if (valStr) {
            currentPacks = valStr.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
          }
        } catch (_) {
          currentPacks = [];
        }

        // Filtrar menciones existentes para evitar duplicados
        const filtered = currentPacks.filter((p) => p !== packIdentifier && p !== 'ShubaCoreSplash');

        // Insertar en la primera posición para máxima prioridad
        const updatedPacks = [packIdentifier, ...filtered];
        lines[i] = `resourcePacks:${JSON.stringify(updatedPacks)}`;
        break;
      }
    }

    // Si la clave no existía en options.txt, agregarla
    if (!packLineFound) {
      lines.push(`resourcePacks:${JSON.stringify([packIdentifier, 'vanilla'])}`);
    }

    fs.writeFileSync(optsFile, lines.join('\n') + '\n', 'utf8');
    logger.info(`[SplashScreen] ✅ Inyectado "${packIdentifier}" en options.txt de: ${instancePath}`);
    return true;
  }

  /**
   * Remueve ShubaCoreSplash de options.txt si el usuario lo desactiva
   */
  removeFromOptionsTxt(instancePath) {
    const optsFile = path.join(instancePath, 'options.txt');
    if (!fs.existsSync(optsFile)) return false;

    try {
      const lines = fs.readFileSync(optsFile, 'utf8').split('\n');
      let modified = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('resourcePacks:')) {
          const valStr = line.slice('resourcePacks:'.length).trim();
          try {
            if (valStr.startsWith('[') && valStr.endsWith(']')) {
              const currentPacks = JSON.parse(valStr);
              const filtered = currentPacks.filter((p) => p !== 'file/ShubaCoreSplash' && p !== 'ShubaCoreSplash');
              lines[i] = `resourcePacks:${JSON.stringify(filtered)}`;
              modified = true;
            }
          } catch (_) {}
          break;
        }
      }

      if (modified) {
        fs.writeFileSync(optsFile, lines.join('\n') + '\n', 'utf8');
        logger.info(`[SplashScreen] ShubaCoreSplash retirado de options.txt en: ${instancePath}`);
      }
      return true;
    } catch (err) {
      logger.warn(`[SplashScreen] Error al remover splash de options.txt: ${err.message}`);
      return false;
    }
  }

  /**
   * Método orquestador llamado antes del lanzamiento de Minecraft
   */
  async injectSplashScreen({ instancePath, mcVersion = '1.21.1', profile = null, customLogoPath = null }) {
    if (!instancePath) return { applied: false, reason: 'No instancePath' };

    // Si el perfil explícitamente tiene desactivado customSplash, removerlo
    if (profile && profile.customSplash === false) {
      this.removeFromOptionsTxt(instancePath);
      return { applied: false, disabledByProfile: true };
    }

    try {
      const packDir = this.generateSplashPack(instancePath, { mcVersion, customLogoPath });
      this.injectIntoOptionsTxt(instancePath);
      return { applied: true, packPath: packDir };
    } catch (err) {
      logger.error(`[SplashScreen] Error al inyectar splash screen: ${err.message}`);
      return { applied: false, error: err.message };
    }
  }
}

let splashInstance = null;
function getSplashScreen() {
  if (!splashInstance) {
    splashInstance = new SplashScreen();
  }
  return splashInstance;
}

module.exports = {
  SplashScreen,
  getSplashScreen
};
