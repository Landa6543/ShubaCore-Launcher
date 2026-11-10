/**
 * ShubaCore - Loader Version Resolver
 * Developed by SHUBATECH
 * Fetches real-time available loader versions from official APIs:
 * - NeoForge Maven API (maven.neoforged.net)
 * - Fabric Meta API (meta.fabricmc.net)
 * - Forge Maven Metadata (maven.minecraftforge.net)
 * - Quilt Meta API (meta.quiltmc.org)
 */

const { defaultLogger: logger } = require('../utils/logger');

class LoaderVersionResolver {
  /**
   * Obtiene la versión recomendada por defecto de forma síncrona/fallback
   */
  static getRecommendedLoaderVersion(mcVersion, loader) {
    const norm = (loader || 'vanilla').toLowerCase().trim();
    if (norm === 'neoforge') {
      if (mcVersion === '1.21.1') return '21.1.65';
      if (mcVersion === '1.20.4') return '20.4.80';
      if (mcVersion === '1.20.1') return '20.1.0';
      return 'latest';
    }
    if (norm === 'forge') {
      if (mcVersion === '1.20.1') return '47.3.0';
      if (mcVersion === '1.21.1') return '52.1.21';
      return 'latest';
    }
    if (norm === 'fabric') {
      return '0.16.10';
    }
    if (norm === 'quilt') {
      return '0.27.1';
    }
    return 'latest';
  }

  /**
   * Obtiene la lista completa de versiones disponibles de un loader para una versión de Minecraft
   *
   * @param {string} loader - 'neoforge' | 'forge' | 'fabric' | 'quilt' | 'vanilla'
   * @param {string} mcVersion - ej: '1.21.1', '1.20.1'
   * @returns {Promise<Array<string>>} Versiones ordenadas de más reciente a más antigua
   */
  static async getAvailableLoaderVersions(loader, mcVersion) {
    const normLoader = (loader || 'vanilla').toLowerCase().trim();
    logger.info(`Consultando versiones disponibles de ${normLoader.toUpperCase()} para MC ${mcVersion}...`);

    switch (normLoader) {
      case 'neoforge':
        return await LoaderVersionResolver._getNeoForgeVersions(mcVersion);
      case 'fabric':
        return await LoaderVersionResolver._getFabricVersions(mcVersion);
      case 'forge':
        return await LoaderVersionResolver._getForgeVersions(mcVersion);
      case 'quilt':
        return await LoaderVersionResolver._getQuiltVersions(mcVersion);
      case 'vanilla':
      default:
        return ['latest'];
    }
  }

  /**
   * NeoForge API: https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge
   */
  static async _getNeoForgeVersions(mcVersion) {
    try {
      // Determinar prefijo de versión de NeoForge según MC (ej: 1.21.1 -> "21.1.", 1.20.4 -> "20.4.", 1.20.1 -> "20.1.")
      const match = mcVersion.match(/^1\.(\d+)(?:\.(\d+))?/);
      let prefix = '';
      if (match) {
        const major = match[1];
        const minor = match[2] !== undefined ? match[2] : '0';
        prefix = `${major}.${minor}.`;
      }

      const res = await fetch('https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge', {
        headers: { 'User-Agent': 'SHUBATECH/ShubaCore/1.0.0' }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} al consultar NeoForge Maven`);
      }

      const data = await res.json();
      const allVersions = data.versions || [];

      // Filtrar por el prefijo exacto y ordenar de la más reciente a la más antigua
      const filtered = allVersions
        .filter((v) => (prefix ? v.startsWith(prefix) : true))
        .reverse();

      logger.info(`NeoForge: ${filtered.length} versiones encontradas para MC ${mcVersion} (Prefijo: "${prefix}")`);

      if (filtered.length > 0) return filtered;
    } catch (err) {
      logger.error('Error al consultar versiones de NeoForge:', err.message);
    }

    // Fallbacks si la red falla
    if (mcVersion === '1.21.1') return ['21.1.265', '21.1.264', '21.1.250', '21.1.249', '21.1.65'];
    if (mcVersion === '1.20.1') return ['20.1.0', '20.1.1'];
    return ['latest'];
  }

  /**
   * Fabric Meta API: https://meta.fabricmc.net/v2/versions/loader/<mc_version>
   */
  static async _getFabricVersions(mcVersion) {
    try {
      const res = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(mcVersion)}`, {
        headers: { 'User-Agent': 'SHUBATECH/ShubaCore/1.0.0' }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} al consultar Fabric Meta`);
      }

      const data = await res.json();
      const versions = (data || []).map((item) => item.loader.version);

      logger.info(`Fabric: ${versions.length} versiones encontradas para MC ${mcVersion}`);
      if (versions.length > 0) return versions;
    } catch (err) {
      logger.error('Error al consultar versiones de Fabric:', err.message);
    }

    return ['0.20.1', '0.20.0', '0.19.5', '0.16.10', '0.15.11'];
  }

  /**
   * Forge Maven XML: https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml
   */
  static async _getForgeVersions(mcVersion) {
    try {
      const res = await fetch('https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml', {
        headers: { 'User-Agent': 'SHUBATECH/ShubaCore/1.0.0' }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} al consultar Forge Maven`);
      }

      const xml = await res.text();
      const versionMatches = [...xml.matchAll(/<version>(.*?)<\/version>/g)].map((m) => m[1]);

      const prefix = `${mcVersion}-`;
      const filtered = versionMatches
        .filter((v) => v.startsWith(prefix))
        .map((v) => v.substring(prefix.length))
        .reverse();

      logger.info(`Forge: ${filtered.length} versiones encontradas para MC ${mcVersion}`);
      if (filtered.length > 0) return filtered;
    } catch (err) {
      logger.error('Error al consultar versiones de Forge:', err.message);
    }

    if (mcVersion === '1.20.1') return ['47.4.29', '47.4.0', '47.3.0', '47.2.20'];
    if (mcVersion === '1.21.1') return ['52.1.21', '52.1.20', '51.0.8'];
    return ['latest'];
  }

  /**
   * Quilt Meta API: https://meta.quiltmc.org/v3/versions/loader/<mc_version>
   */
  static async _getQuiltVersions(mcVersion) {
    try {
      const res = await fetch(`https://meta.quiltmc.org/v3/versions/loader/${encodeURIComponent(mcVersion)}`, {
        headers: { 'User-Agent': 'SHUBATECH/ShubaCore/1.0.0' }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} al consultar Quilt Meta`);
      }

      const data = await res.json();
      const versions = (data || []).map((item) => item.loader.version);

      logger.info(`Quilt: ${versions.length} versiones encontradas para MC ${mcVersion}`);
      if (versions.length > 0) return versions;
    } catch (err) {
      logger.error('Error al consultar versiones de Quilt:', err.message);
    }

    return ['0.27.1', '0.26.1', '0.25.0'];
  }
}

module.exports = { LoaderVersionResolver };
