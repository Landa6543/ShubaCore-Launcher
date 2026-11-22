/**
 * ShubaCore - Mod Manager (Dual: CurseForge + Modrinth)
 * Developed by SHUBATECH
 *
 * Handles:
 * - Unified Mod Search across CurseForge and Modrinth with embedded API key
 * - Dependency resolution (CurseForge relationType === 3, Modrinth dependency_type === "required")
 * - Metadata registry in `mods-lock.json`
 * - Automatic detection of custom/manual `.jar` files (source: "custom")
 * - Instant Optimization Pack (Embeddium/Sodium, FerriteCore, ModernFix, EntityCulling, Clumps)
 * - Public Modpacks installer (.mrpack Modrinth and manifest.json CurseForge)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');
const { finished } = require('stream/promises');
const AdmZip = require('adm-zip');
const { getConfigManager } = require('../config/ConfigManager');
const { defaultLogger: logger } = require('../utils/logger');

// Llave API oficial de CurseForge embebida por defecto
const DEFAULT_CF_API_KEY = '$2a$10$bL4bIL5pUWqfcO7KQtnMReakwtfHbNKh6v1uTpKlzhwoueEJQnPnm';

// Constantes de API
const MODRINTH_API_URL = 'https://api.modrinth.com/v2';
const CURSEFORGE_API_URL = 'https://api.curseforge.com/v1';
const USER_AGENT = 'SHUBATECH/ShubaCore-Launcher/1.0.0 (contact@shubatech.com)';
const CF_GAME_ID = 432; // Minecraft
const CF_CLASS_ID_MODS = 6;
const CF_CLASS_ID_MODPACKS = 4471;

// REQUISITO 1: Mapeo de categorías oficiales para CurseForge y Modrinth
const CF_CLASS_IDS = {
  mods: 6,
  modpacks: 4471,
  resourcepacks: 12,
  shaders: 6552,
  addons: 4559,
  'bedrock-resourcepacks': 4559,
  'bedrock-worlds': 4559
};

const MODRINTH_PROJECT_TYPES = {
  mods: 'mod',
  modpacks: 'modpack',
  resourcepacks: 'resourcepack',
  shaders: 'shader'
};

// Mapeo exacto de modLoaderType para CurseForge
const CF_LOADER_TYPES = {
  any: 0,
  forge: 1,
  cauldron: 2,
  liteloader: 3,
  fabric: 4,
  quilt: 5,
  neoforge: 6
};

// Mapeo de categorías temáticas para CurseForge y Modrinth
const CF_CATEGORY_IDS = {
  optimization: 6814,
  adventure: 422,
  technology: 412,
  worldgen: 406,
  utility: 423,
  library: 421
};

const MODRINTH_CATEGORY_TAGS = {
  optimization: 'optimization',
  adventure: 'adventure',
  technology: 'technology',
  worldgen: 'worldgen',
  utility: 'utility',
  library: 'library'
};

class ModManager {
  constructor() {
    this.configManager = getConfigManager();
  }

  /**
   * Obtiene la API Key de CurseForge: variable de entorno > config.json > constante embebida
   */
  _getCurseForgeKey() {
    return (
      process.env.CURSEFORGE_API_KEY ||
      this.configManager.get('instance.curseForgeApiKey', '') ||
      DEFAULT_CF_API_KEY
    ).trim();
  }

  /**
   * Resuelve el entorno operativo de un mod: 'server' (Solo Servidor), 'client' (Solo Cliente) o 'both' (Ambos).
   */
  _resolveModEnvironment(modInfo, fileName = '') {
    if (!modInfo && !fileName) return 'both';
    const text = (
      (modInfo?.displayName || '') + ' ' +
      (modInfo?.name || '') + ' ' +
      (modInfo?.title || '') + ' ' +
      (modInfo?.slug || '') + ' ' +
      (modInfo?.projectId || '') + ' ' +
      (modInfo?.fileName || fileName || '') + ' ' +
      (modInfo?.summary || '') + ' ' +
      (modInfo?.description || '') + ' ' +
      (Array.isArray(modInfo?.categories) ? modInfo.categories.join(' ') : '')
    ).toLowerCase();

    // 1. Verificación explícita de campos de Modrinth o metadatos de JAR
    const cSide = String(modInfo?.clientSide || modInfo?.client_side || '').toLowerCase();
    const sSide = String(modInfo?.serverSide || modInfo?.server_side || '').toLowerCase();
    if (cSide === 'unsupported' && (sSide === 'required' || sSide === 'optional')) return 'server';
    if (sSide === 'unsupported' && (cSide === 'required' || cSide === 'optional')) return 'client';

    const envVal = Array.isArray(modInfo?.environment)
      ? modInfo.environment.map(e => String(e).toLowerCase())
      : [String(modInfo?.environment || '').toLowerCase()];
    if (envVal.some(e => e.includes('server_only') || e.includes('dedicated_server_only') || e === 'server')) return 'server';
    if (envVal.some(e => e.includes('client_only') || e === 'client')) return 'client';

    // 2. Patrones de mods Solo Servidor (worldgen/estructuras en servidor, optimización de servidor, utilidades y administración)
    const serverPatterns = [
      /yung/i,
      /better\s*(dungeon|nether|fortress|mineshaft|temple|ocean|monument|stronghold|witch|bridge|desert|jungle)/i,
      /servercore/i,
      /ai-improvements|aiimprovements/i,
      /alltheleaks/i,
      /chunky|pregen/i,
      /dynmap|bluemap|pl3xmap|squaremap/i,
      /luckperms|permissionsex|ftbranks/i,
      /ledger|coreprotect|griefdefender|worldguard|flan/i,
      /worldedit|fastasyncworldedit|\bfawe\b/i,
      /geyser|floodgate|viaversion|viabackwards|viarewind/i,
      /discordsrv|chatbridge/i,
      /easyauth|simpleauth|authme|banhammer/i,
      /themis|grimac|vulcan|matrix-anticheat|anticheat/i,
      /clearlag|mobcap|entitylimiter|viewdistance|\bvmp\b|\bc2me\b/i,
      /netherportalfix|letmedespawn|lithostitched|packetfixer/i,
      /fastworkbench|fastfurnace/i,
      /\bcarpet\b|fabric-carpet/i,
      /\bspark\b|playeranalytics|\bservux\b|\brcon\b/i,
      /server\s*(side|only|utility|tools|performance|optimization|manager)/i,
      /dedicated\s*server/i,
      /only\s*on\s*(the\s*)?server/i
    ];
    if (serverPatterns.some(p => p.test(text))) return 'server';

    // 3. Patrones de mods Solo Cliente
    const clientPatterns = [
      /sodium|iris|rubidium|oculus|embeddium|entityculling|ferritecore|immediatelyfast|modernfix|krypton/i,
      /optifine|zoom|replaymod|customskinloader|appleskin|mousewheelie|controlling|smoothboot|dynamiclights/i,
      /shulkerboxtooltip|notenoughanimations|waveycapes|skinview|cloth-config|soundphysics|presencefootsteps/i,
      /xaero|journeymap|voxelmap|resourceloader|custommainmenu|darkloading|fancymenu|borderless/i,
      /\bneat\b|wthit|jade|\btoast\b|invtweaks|itemphysic|physicsmod|customcrosshair|fallingleaves/i,
      /betterf3|visuality|drippy|torohealth|modmenu/i,
      /client\s*(side|only|cosmetic|visual|hud|gui)/i,
      /only\s*on\s*(the\s*)?client/i
    ];
    if (clientPatterns.some(p => p.test(text))) return 'client';

    return 'both';
  }

  // =========================================================================
  // 1. BÚSQUEDA UNIFICADA (CurseForge + Modrinth)
  // =========================================================================

  /**
   * REQUISITO 1: Búsqueda unificada y paginada en Modrinth y CurseForge
   * Soporta 4 categorías: "mods", "modpacks", "resourcepacks", "shaders"
   * Filtros temáticos y ordenamiento (popular, updated, name)
   *
   * @param {Object} options
   * @param {string} [options.query=''] - Texto a buscar (vacío para populares)
   * @param {string} [options.mcVersion='1.21.1'] - Versión de Minecraft
   * @param {string} [options.loader='neoforge'] - Loader
   * @param {string} [options.source='both'] - 'both' | 'curseforge' | 'modrinth'
   * @param {string} [options.contentType='mods'] - 'mods' | 'modpacks' | 'resourcepacks' | 'shaders'
   * @param {number} [options.page=1] - Número de página (1-based)
   * @param {number} [options.pageSize=20] - Cantidad por página
   * @param {string} [options.sortBy='popular'] - 'popular' | 'updated' | 'name'
   * @param {string} [options.category='all'] - Categoría temática
   * @param {string} [options.environment='all'] - 'all' | 'client' | 'server' | 'both'
   * @returns {Promise<Object>} { results, totalCount, currentPage, pageSize, totalPages, hasMore }
   */
  async searchContent({
    query = '',
    mcVersion = '1.21.1',
    loader = 'neoforge',
    source = 'both',
    contentType = 'mods',
    page = 1,
    pageSize = 20,
    sortBy = 'popular',
    category = 'all',
    environment = 'all'
  } = {}) {
    const isPopular = !query || query.trim() === '';
    const safeType = (contentType || 'mods').toLowerCase();
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safePageSize = Math.max(1, parseInt(pageSize, 10) || 20);
    const offset = (safePage - 1) * safePageSize;

    logger.info(`Búsqueda de catálogo [${source.toUpperCase()}] Tipo: ${safeType} (Pág. ${safePage}, Tamaño: ${safePageSize}, Orden: ${sortBy}, Cat: ${category}, Env: ${environment}) ${isPopular ? '(Populares)' : `"${query}"`} (MC ${mcVersion}, Loader: ${loader})`);

    const normalizedLoader = (loader || 'neoforge').toLowerCase();
    const isBedrock = normalizedLoader.includes('bedrock') || safeType === 'addons' || safeType === 'bedrock-resourcepacks' || safeType === 'bedrock-worlds';
    const shouldSearchModrinth = (source === 'both' || source === 'modrinth') && !isBedrock;
    const shouldSearchCurseForge = source === 'both' || source === 'curseforge' || isBedrock;

    const tasks = [];
    if (shouldSearchModrinth) {
      tasks.push(this._searchModrinthContent(query, mcVersion, normalizedLoader, safeType, safePageSize, offset, sortBy, category, environment));
    }
    if (shouldSearchCurseForge) {
      tasks.push(this._searchCurseForgeContent(query, mcVersion, normalizedLoader, safeType, safePageSize, offset, sortBy, category, environment));
    }

    const settled = await Promise.allSettled(tasks);
    let allItems = [];
    let totalCount = 0;

    settled.forEach((res) => {
      if (res.status === 'fulfilled' && res.value) {
        allItems.push(...(res.value.items || []));
        totalCount += (res.value.totalCount || 0);
      }
    });

    // Ordenamiento unificado de la lista combinada
    if (sortBy === 'name') {
      allItems.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'updated') {
      allItems.sort((a, b) => new Date(b.dateModified || 0) - new Date(a.dateModified || 0));
    } else {
      // Por defecto: descargas / popularidad
      allItems.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    }

    // Si consultamos ambas fuentes, recortamos a safePageSize
    let pagedResults = source === 'both' ? allItems.slice(0, safePageSize) : allItems;

    // Si estamos en la categoría modpacks, incluir el modpack oficial ShubaClient al inicio
    if (safeType === 'modpacks') {
      const qLower = query.toLowerCase();
      const matchesShuba = !query || qLower.includes('shuba') || qLower.includes('client') || qLower.includes('fps') || qLower.includes('optimi') || qLower.includes('26.3') || qLower.includes('vulkan');
      const matchesMc = !mcVersion || mcVersion === '26.3' || mcVersion === 'all';
      const matchesLoader = !loader || loader === 'fabric' || loader === 'all';
      const matchesSource = !source || source === 'both' || source === 'custom' || source === 'github' || source === 'all';

      if (matchesShuba && matchesMc && matchesLoader && matchesSource && safePage === 1) {
        const officialPack = this.getOfficialShubaClientModpackInfo();
        pagedResults = [officialPack, ...pagedResults.filter((p) => p.id !== 'shubaclient')].slice(0, safePageSize);
        totalCount++;
      }
    }

    // REQUISITO: Joyas Ocultas oficiales de CurseForge en el tope del catálogo
    if (safePage === 1 && !query && shouldSearchCurseForge && (safeType === 'mods' || safeType === 'modpacks')) {
      try {
        const featuredRes = await this._searchCurseForgeContent('', mcVersion, normalizedLoader, safeType, 10, 0, 'featured', category, environment);
        if (featuredRes && featuredRes.items && featuredRes.items.length > 0) {
          // Filtrar estrictamente los proyectos que CurseForge cataloga oficialmente como isFeatured === true
          const featuredItems = featuredRes.items
            .filter((item) => item.isFeatured)
            .map((item) => ({
              ...item,
              isHiddenGem: true,
              isFeatured: true
            }));
          const existingIds = new Set(pagedResults.map((p) => p.id));
          const newFeatured = featuredItems.filter((f) => !existingIds.has(f.id));
          if (newFeatured.length > 0) {
            if (safeType === 'modpacks' && pagedResults[0]?.isOfficial) {
              pagedResults = [pagedResults[0], ...newFeatured, ...pagedResults.slice(1)].slice(0, safePageSize);
            } else {
              pagedResults = [...newFeatured, ...pagedResults].slice(0, safePageSize);
            }
          }
        }
      } catch (fErr) {
        logger.debug('[Joyas Ocultas] Fallback:', fErr.message);
      }
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));
    const hasMore = safePage < totalPages;

    logger.info(`Búsqueda de ${safeType} completada. Mostrando ${pagedResults.length} de ~${totalCount} resultados.`);

    return {
      results: pagedResults,
      totalCount,
      currentPage: safePage,
      pageSize: safePageSize,
      totalPages,
      hasMore
    };
  }

  /**
   * Método de compatibilidad para searchMods tradicional (devuelve Array con metadatos paginados adjuntos)
   */
  async searchMods(options = {}) {
    const page = options.page || (options.offset ? Math.floor(options.offset / (options.limit || 20)) + 1 : 1);
    const pageSize = options.limit || options.pageSize || 25;

    const res = await this.searchContent({
      ...options,
      contentType: options.contentType || 'mods',
      page,
      pageSize
    });

    const list = res.results || [];
    list.totalCount = res.totalCount;
    list.currentPage = res.currentPage;
    list.pageSize = res.pageSize;
    list.totalPages = res.totalPages;
    list.hasMore = res.hasMore;
    return list;
  }

  /**
   * Búsqueda específica en CurseForge API para cualquier categoría
   */
  async _searchCurseForgeContent(query, mcVersion, loader, contentType, limit, offset, sortBy = 'popular', category = 'all', environment = 'all') {
    const apiKey = this._getCurseForgeKey();
    const classId = CF_CLASS_IDS[contentType] || CF_CLASS_IDS.mods;

    try {
      const isBedrock = (loader || '').toLowerCase().includes('bedrock') || contentType === 'addons' || contentType === 'bedrock-resourcepacks' || contentType === 'bedrock-worlds';
      const cfLoader = CF_LOADER_TYPES[loader] !== undefined ? CF_LOADER_TYPES[loader] : CF_LOADER_TYPES.any;
      const url = new URL(`${CURSEFORGE_API_URL}/mods/search`);
      url.searchParams.append('gameId', String(CF_GAME_ID)); // 432
      url.searchParams.append('classId', String(classId));

      if (query && query.trim() !== '') {
        url.searchParams.append('searchFilter', query.trim());
      }
      if (mcVersion && !isBedrock) {
        url.searchParams.append('gameVersion', mcVersion);
      }
      // Para Texturas (resourcepacks), Shaders y Addons de Bedrock NO enviar modLoaderType
      if (!isBedrock && (contentType === 'mods' || contentType === 'modpacks') && cfLoader > 0) {
        url.searchParams.append('modLoaderType', String(cfLoader));
      }

      // Filtro de categoría temática si aplica
      if (contentType === 'bedrock-resourcepacks') {
        url.searchParams.append('categoryId', '4561');
      } else if (contentType === 'bedrock-worlds') {
        url.searchParams.append('categoryId', '4560');
      } else if (category && category !== 'all' && CF_CATEGORY_IDS[category]) {
        url.searchParams.append('categoryId', String(CF_CATEGORY_IDS[category]));
      }

      // Ordenamiento
      if (sortBy === 'name') {
        url.searchParams.append('sortField', '4'); // Name
        url.searchParams.append('sortOrder', 'asc');
      } else if (sortBy === 'updated') {
        url.searchParams.append('sortField', '3'); // LastUpdated
        url.searchParams.append('sortOrder', 'desc');
      } else if (sortBy === 'featured') {
        url.searchParams.append('sortField', '1'); // Featured (Joyas Ocultas oficiales de CurseForge)
        url.searchParams.append('sortOrder', 'desc');
      } else {
        // Popularidad (Total Downloads = 2)
        url.searchParams.append('sortField', '2');
        url.searchParams.append('sortOrder', 'desc');
      }

      url.searchParams.append('pageSize', String(limit));
      url.searchParams.append('index', String(offset));

      logger.debug(`[CurseForge GET] ${url.toString()}`);

      const response = await fetch(url.toString(), {
        headers: {
          'x-api-key': apiKey,
          Accept: 'application/json',
          'User-Agent': USER_AGENT
        },
        signal: AbortSignal.timeout(12000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[CurseForge HTTP ${response.status}]: ${errorText}`);
        return { items: [], totalCount: 0 };
      }

      const data = await response.json();
      const mods = data.data || [];
      const totalCount = (data.pagination && data.pagination.totalCount) || mods.length;

      logger.info(`[CurseForge] ${mods.length} elementos (${contentType}) recibidos. Total reportado: ${totalCount}`);

      const mapped = mods.map((mod) => {
        const latestFile = (mod.latestFiles && mod.latestFiles[0]) || {};
        const gameVersions = (latestFile.gameVersions || []).filter((v) => /^\d+\.\d+(\.\d+)?$/.test(v));
        const loaders = [];
        (mod.latestFilesIndexes || []).forEach((idx) => {
          if (idx.modLoader === 1 && !loaders.includes('forge')) loaders.push('forge');
          if (idx.modLoader === 4 && !loaders.includes('fabric')) loaders.push('fabric');
          if (idx.modLoader === 5 && !loaders.includes('quilt')) loaders.push('quilt');
          if (idx.modLoader === 6 && !loaders.includes('neoforge')) loaders.push('neoforge');
        });

        const detectedEnv = this._resolveModEnvironment(mod);
        const cSide = detectedEnv === 'server' ? 'unsupported' : (detectedEnv === 'client' ? 'required' : 'both');
        const sSide = detectedEnv === 'client' ? 'unsupported' : (detectedEnv === 'server' ? 'required' : 'both');

        return {
          id: String(mod.id),
          slug: mod.slug,
          source: 'curseforge',
          contentType,
          title: mod.name,
          author: mod.authors && mod.authors[0] ? mod.authors[0].name : 'Desconocido',
          summary: mod.summary || '',
          iconUrl: (mod.logo && (mod.logo.thumbnailUrl || mod.logo.url)) || '',
          downloads: mod.downloadCount || 0,
          websiteUrl: (mod.links && mod.links.websiteUrl) || `https://www.curseforge.com/minecraft/${contentType === 'resourcepacks' ? 'texture-packs' : (contentType === 'shaders' ? 'shaders' : (contentType === 'modpacks' ? 'modpacks' : 'mc-mods'))}/${mod.slug}`,
          dateModified: mod.dateModified,
          categories: (mod.categories || []).map((c) => c.name),
          fileSize: latestFile.fileLength || 0,
          gameVersions: gameVersions.length > 0 ? gameVersions : [mcVersion],
          loaders: loaders.length > 0 ? loaders : [loader],
          clientSide: cSide,
          serverSide: sSide,
          environment: detectedEnv,
          isFeatured: Boolean(mod.isFeatured || sortBy === 'featured'),
          isHiddenGem: Boolean(mod.isFeatured || sortBy === 'featured'),
          latestFileId: latestFile.id ? String(latestFile.id) : null
        };
      });

      let filtered = mapped;
      if (environment && environment !== 'all') {
        filtered = mapped.filter((item) => {
          if (environment === 'server') return item.environment === 'server';
          if (environment === 'client') return item.environment === 'client';
          if (environment === 'both') return item.environment === 'both';
          return true;
        });
      }

      return { items: filtered, totalCount: filtered.length < mapped.length ? filtered.length : totalCount };
    } catch (err) {
      if (err.name === 'TimeoutError' || (err.message && err.message.toLowerCase().includes('timeout'))) {
        logger.warn(`[CurseForge] Tiempo de espera agotado al consultar API (${err.message}).`);
      } else {
        logger.error('[CurseForge Exception]:', err.message);
      }
      return { items: [], totalCount: 0 };
    }
  }

  /**
   * Búsqueda específica en Modrinth API para cualquier categoría
   */
  async _searchModrinthContent(query, mcVersion, loader, contentType, limit, offset, sortBy = 'popular', category = 'all', environment = 'all') {
    const projectType = MODRINTH_PROJECT_TYPES[contentType] || 'mod';

    try {
      const facets = [
        [`project_type:${projectType}`]
      ];

      if (mcVersion) {
        facets.push([`versions:${mcVersion}`]);
      }

      // Para Texturas y Shaders NO filtrar por categories:<loader>
      if ((contentType === 'mods' || contentType === 'modpacks') && loader && loader !== 'vanilla') {
        facets.push([`categories:${loader}`]);
      }

      // Filtro de categoría temática si aplica
      if (category && category !== 'all' && MODRINTH_CATEGORY_TAGS[category]) {
        facets.push([`categories:${MODRINTH_CATEGORY_TAGS[category]}`]);
      }

      // Filtro nativo de entorno para Modrinth
      if (environment === 'server') {
        facets.push([`client_side:unsupported`]);
      } else if (environment === 'client') {
        facets.push([`server_side:unsupported`]);
      }

      const url = new URL(`${MODRINTH_API_URL}/search`);
      if (query && query.trim() !== '') {
        url.searchParams.append('query', query.trim());
      }
      url.searchParams.append('facets', JSON.stringify(facets));

      if (sortBy === 'updated') {
        url.searchParams.append('index', 'updated');
      } else if (sortBy === 'name') {
        url.searchParams.append('index', 'relevance');
      } else {
        url.searchParams.append('index', 'downloads');
      }

      url.searchParams.append('limit', String(limit));
      url.searchParams.append('offset', String(offset));

      logger.debug(`[Modrinth GET] ${url.toString()}`);

      const response = await fetch(url.toString(), {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(12000)
      });

      if (!response.ok) {
        const errText = await response.text();
        logger.error(`[Modrinth HTTP ${response.status}]: ${errText}`);
        return { items: [], totalCount: 0 };
      }

      const data = await response.json();
      const hits = data.hits || [];
      const totalCount = data.total_hits || hits.length;

      logger.info(`[Modrinth] ${hits.length} elementos (${contentType}) recibidos. Total reportado: ${totalCount}`);

      const mapped = hits.map((hit) => {
        const detectedEnv = this._resolveModEnvironment(hit);
        return {
          id: hit.project_id,
          slug: hit.slug,
          source: 'modrinth',
          contentType,
          title: hit.title,
          author: hit.author,
          summary: hit.description || '',
          iconUrl: hit.icon_url || '',
          downloads: hit.downloads || 0,
          follows: hit.follows || 0,
          websiteUrl: `https://modrinth.com/${projectType}/${hit.slug}`,
          dateModified: hit.date_modified,
          categories: hit.categories || [],
          gameVersions: hit.versions || [],
          loaders: hit.loaders || [],
          clientSide: hit.client_side || (detectedEnv === 'server' ? 'unsupported' : (detectedEnv === 'client' ? 'required' : 'optional')),
          serverSide: hit.server_side || (detectedEnv === 'client' ? 'unsupported' : (detectedEnv === 'server' ? 'required' : 'optional')),
          environment: detectedEnv,
          gallery: hit.gallery || []
        };
      });

      let filtered = mapped;
      if (environment && environment !== 'all') {
        filtered = mapped.filter((item) => {
          if (environment === 'server') return item.environment === 'server';
          if (environment === 'client') return item.environment === 'client';
          if (environment === 'both') return item.environment === 'both';
          return true;
        });
      }

      return { items: filtered, totalCount: filtered.length < mapped.length ? filtered.length : totalCount };
    } catch (err) {
      if (err.name === 'TimeoutError' || (err.message && err.message.toLowerCase().includes('timeout'))) {
        logger.warn(`[Modrinth] Tiempo de espera agotado al consultar API (${err.message}).`);
      } else {
        logger.error('[Modrinth Exception]:', err.message);
      }
      return { items: [], totalCount: 0 };
    }
  }

  // =========================================================================
  // 1b. DESCARGA INTELIGENTE POR CATEGORÍA (Mods, Texturas, Shaders, Modpacks)
  // =========================================================================

  /**
   * REQUISITO 1: Descarga inteligente según categoría (mods, resourcepacks, shaders, modpacks)
   */
  async downloadContent({
    projectId,
    source = 'modrinth',
    mcVersion = '1.21.1',
    loader = 'neoforge',
    contentType = 'mods',
    instancePath = null,
    onProgress = null,
    iconUrl = null,
    author = null,
    summary = null,
    title = null
  }) {
    const targetType = (contentType || 'mods').toLowerCase();
    const activeInstance = instancePath || this.configManager.getInstanceDirectory();

    // 0. CONTENIDO BEDROCK (Addons, Bedrock Resource Packs, Mundos)
    if (targetType === 'addons' || targetType === 'bedrock-resourcepacks' || targetType === 'bedrock-worlds' || (loader && String(loader).toLowerCase() === 'bedrock')) {
      logger.info(`[BedrockCatalog] Descargando contenido Bedrock (${targetType}) para ${projectId} (${source})...`);
      const fileInfo = await this._resolveCurseForgeFile(projectId, null, 'bedrock');
      if (!fileInfo || !fileInfo.downloadUrl) {
        throw new Error(`No se encontró un archivo descargable para el contenido Bedrock ${projectId}.`);
      }
      const tempCacheDir = path.join(activeInstance, 'cache', 'bedrock_downloads');
      if (!fs.existsSync(tempCacheDir)) fs.mkdirSync(tempCacheDir, { recursive: true });
      const destFile = path.join(tempCacheDir, fileInfo.fileName);

      if (onProgress) onProgress({ type: targetType, percent: 0, fileName: fileInfo.fileName, message: `Descargando ${fileInfo.fileName}...` });
      await this._downloadStream(fileInfo.downloadUrl, destFile, (pct) => {
        if (onProgress) onProgress({ type: targetType, percent: pct, fileName: fileInfo.fileName, message: `Descargando ${fileInfo.fileName}... (${pct}%)` });
      });

      const { getBedrockManager } = require('../bedrock/BedrockManager');
      const bm = getBedrockManager();
      const importResult = await bm.importAddonFile(destFile, activeInstance, true);

      logger.info(`[BedrockCatalog] Contenido instalado y sincronizado con éxito: ${fileInfo.fileName}`);
      return {
        success: true,
        contentType: targetType,
        fileName: fileInfo.fileName,
        path: destFile,
        importResult
      };
    }

    // 1. MODS: destino <instanceDir>/mods con resolución de dependencias
    if (targetType === 'mods') {
      return await this.downloadMod({
        projectId,
        source,
        mcVersion,
        loader,
        instancePath: activeInstance,
        onProgress,
        iconUrl,
        author,
        summary,
        title
      });
    }

    // 2. RESOURCE PACKS (Texturas): destino <instanceDir>/resourcepacks/
    if (targetType === 'resourcepacks') {
      const targetDir = path.join(activeInstance, 'resourcepacks');
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      logger.info(`[ResourcePack] Resolviendo archivo para ${projectId} (${source})...`);
      let fileInfo = null;
      if (source === 'modrinth') {
        fileInfo = await this._resolveModrinthFile(projectId, mcVersion, null);
      } else {
        fileInfo = await this._resolveCurseForgeFile(projectId, mcVersion, null);
      }

      if (!fileInfo || !fileInfo.downloadUrl) {
        throw new Error(`No se encontró enlace de descarga para el paquete de recursos ${projectId}.`);
      }

      const destPath = path.join(targetDir, fileInfo.fileName);
      await this._downloadStream(fileInfo.downloadUrl, destPath, (pct) => {
        if (onProgress) onProgress({ type: 'resourcepack', percent: pct, fileName: fileInfo.fileName });
      });

      logger.info(`[ResourcePack] Descargado exitosamente en: ${destPath}`);
      return {
        success: true,
        contentType: 'resourcepacks',
        fileName: fileInfo.fileName,
        path: destPath
      };
    }

    // 3. SHADERS: destino <instanceDir>/shaderpacks/ + Auto-instalación de Iris si falta
    if (targetType === 'shaders') {
      const targetDir = path.join(activeInstance, 'shaderpacks');
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      logger.info(`[Shader] Resolviendo archivo para shader ${projectId} (${source})...`);
      let fileInfo = null;
      if (source === 'modrinth') {
        fileInfo = await this._resolveModrinthFile(projectId, mcVersion, null);
      } else {
        fileInfo = await this._resolveCurseForgeFile(projectId, mcVersion, null);
      }

      if (!fileInfo || !fileInfo.downloadUrl) {
        throw new Error(`No se encontró enlace de descarga para el shader ${projectId}.`);
      }

      const destPath = path.join(targetDir, fileInfo.fileName);
      await this._downloadStream(fileInfo.downloadUrl, destPath, (pct) => {
        if (onProgress) onProgress({ type: 'shader', percent: pct, fileName: fileInfo.fileName });
      });

      // Verificar y ofrecer/auto-instalar mod de shaders (Iris / Oculus) si no está en /mods
      const modsDir = path.join(activeInstance, 'mods');
      if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });
      const hasShaderMod = fs.readdirSync(modsDir).some((f) => {
        const l = f.toLowerCase();
        return l.includes('iris') || l.includes('oculus');
      });

      let shaderModInstalled = false;
      if (!hasShaderMod) {
        logger.info(`[Shader] No se detectó motor de shaders (Iris/Oculus). Instalando Iris automáticamente...`);
        try {
          await this.downloadMod({
            projectId: 'iris',
            source: 'modrinth',
            mcVersion,
            loader,
            instancePath: activeInstance
          });
          shaderModInstalled = true;
          logger.info(`[Shader] Iris instalado con éxito en /mods para soporte de shaders.`);
        } catch (sErr) {
          logger.warn(`No se pudo auto-instalar Iris: ${sErr.message}`);
        }
      }

      logger.info(`[Shader] Shader instalado en: ${destPath}`);
      return {
        success: true,
        contentType: 'shaders',
        fileName: fileInfo.fileName,
        path: destPath,
        shaderModInstalled
      };
    }

    // 4. MODPACKS: crear nuevo perfil automático e instalar paquete
    if (targetType === 'modpacks') {
      if (projectId === 'shubaclient' || projectId === 'shubaclient-263' || source === 'shubacore') {
        logger.info('[Modpack] Descargando e instalando Modpack Oficial ShubaClient 26.3...');
        return await this.installOfficialShubaClientModpack({ onProgress, targetName: title || 'ShubaClient' });
      }

      logger.info(`[Modpack] Descargando modpack ${projectId} (${source}) y creando nuevo perfil...`);
      let fileInfo = null;
      if (source === 'modrinth') {
        fileInfo = await this._resolveModrinthFile(projectId, mcVersion, loader);
      } else {
        fileInfo = await this._resolveCurseForgeFile(projectId, mcVersion, loader);
      }

      if (!fileInfo || !fileInfo.downloadUrl) {
        throw new Error(`No se encontró archivo para el modpack ${projectId}.`);
      }

      const tempDir = path.join(this.configManager.getInstanceDirectory(), 'cache', 'temp_modpacks');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const tempPackFile = path.join(tempDir, fileInfo.fileName);

      if (onProgress) onProgress({ type: 'modpack_download', percent: 0, fileName: fileInfo.fileName, message: `Descargando paquete ${fileInfo.fileName}...` });
      await this._downloadStream(fileInfo.downloadUrl, tempPackFile, (pct) => {
        if (onProgress) onProgress({ type: 'modpack_download', percent: pct, fileName: fileInfo.fileName, message: `Descargando paquete ${fileInfo.fileName}... (${pct}%)` });
      });

      // Instalar en la nueva instancia deduciendo loader y MC version del modpack
      const installRes = await this.installModpackFile({
        packPath: tempPackFile,
        instancePath: null,
        createProfile: true,
        onProgress,
        iconUrl
      });

      return {
        success: true,
        contentType: 'modpacks',
        fileName: fileInfo.fileName,
        profile: installRes.profile,
        details: installRes
      };
    }

    throw new Error(`Tipo de contenido no soportado: ${contentType}`);
  }

  // =========================================================================
  // 2. DESCARGA CON DEPENDENCIAS & REGISTRO DE METADATOS (mods-lock.json)
  // =========================================================================

  /**
   * Resuelve y descarga un mod junto con sus dependencias obligatorias
   */
  async downloadMod({ projectId, source, mcVersion, loader, instancePath = null, onProgress = null, iconUrl = null, author = null, summary = null, title = null }, visitedDependencies = new Set()) {
    const activeInstance = instancePath || this.configManager.getInstanceDirectory();
    const modsDir = path.join(activeInstance, 'mods');
    if (!fs.existsSync(modsDir)) {
      fs.mkdirSync(modsDir, { recursive: true });
    }

    const depKey = `${source}:${projectId}`;
    if (visitedDependencies.has(depKey)) {
      logger.debug(`Dependencia ${depKey} ya procesada. Omitiendo ciclo.`);
      return null;
    }
    visitedDependencies.add(depKey);

    logger.info(`Iniciando descarga de mod [${source.toUpperCase()}]: ${projectId}...`);

    let fileInfo = null;
    if (source === 'modrinth') {
      fileInfo = await this._resolveModrinthFile(projectId, mcVersion, loader);
    } else if (source === 'curseforge') {
      fileInfo = await this._resolveCurseForgeFile(projectId, mcVersion, loader);
    } else {
      throw new Error(`Fuente no soportada: ${source}`);
    }

    if (!fileInfo || !fileInfo.downloadUrl) {
      throw new Error(`No se encontró un archivo compatible para el mod ${projectId} en MC ${mcVersion} (${loader}).`);
    }

    // 1. Resolver y descargar dependencias obligatorias primero
    if (fileInfo.requiredDependencies && fileInfo.requiredDependencies.length > 0) {
      logger.info(`El mod ${fileInfo.displayName} requiere ${fileInfo.requiredDependencies.length} dependencias obligatorias:`);
      for (const depId of fileInfo.requiredDependencies) {
        try {
          if (onProgress) onProgress({ type: 'dependency', message: `Descargando dependencia requerida: ${depId}` });
          await this.downloadMod({
            projectId: depId,
            source,
            mcVersion,
            loader,
            instancePath: activeInstance,
            onProgress
          }, visitedDependencies);
        } catch (depErr) {
          logger.warn(`No se pudo descargar automáticamente la dependencia ${depId}: ${depErr.message}`);
        }
      }
    }

    // 2. Descargar archivo .jar principal
    const targetFilePath = path.join(modsDir, fileInfo.fileName);

    if (fs.existsSync(targetFilePath)) {
      logger.info(`El archivo ${fileInfo.fileName} ya existe en /mods. Actualizando registro...`);
    } else {
      logger.info(`Descargando ${fileInfo.fileName} desde: ${fileInfo.downloadUrl}`);
      await this._downloadStream(fileInfo.downloadUrl, targetFilePath, (pct) => {
        if (onProgress) onProgress({ type: 'mod', fileName: fileInfo.fileName, percent: pct });
      }, {
        sha1: fileInfo.sha1,
        fileName: fileInfo.fileName,
        mcVersion,
        loader
      });
      logger.info(`Descarga finalizada: ${fileInfo.fileName}`);
    }

    // 3. Registrar en mods-lock.json
    const cleanName = this._cleanJarName(fileInfo.fileName);
    const resolvedDisplay = title || fileInfo.displayName || cleanName;
    const record = {
      fileName: fileInfo.fileName,
      name: cleanName,
      displayName: resolvedDisplay,
      source: source || 'custom',
      projectId: String(projectId),
      fileId: String(fileInfo.fileId || ''),
      downloadUrl: fileInfo.downloadUrl,
      installedAt: new Date().toISOString(),
      version: fileInfo.versionNumber || '',
      enabled: true,
      dependencies: fileInfo.requiredDependencies || [],
      iconUrl: iconUrl || fileInfo.iconUrl || null,
      author: author || fileInfo.author || null,
      summary: summary || fileInfo.summary || null
    };

    this._updateLockFile(activeInstance, record);
    return record;
  }

  async _resolveModrinthFile(projectId, mcVersion, loader = null, channel = 'release') {
    let url = `${MODRINTH_API_URL}/project/${projectId}/version`;
    const queryParams = [];
    if (mcVersion) queryParams.push(`game_versions=["${mcVersion}"]`);
    if (loader && loader !== 'vanilla') queryParams.push(`loaders=["${loader}"]`);
    if (queryParams.length > 0) url += `?${queryParams.join('&')}`;

    let res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    let versions = [];
    if (res.ok) {
      versions = await res.json();
    }

    // Fallback: si con filtros específicos no hay versiones, consultar las versiones globales del proyecto
    if (!versions || versions.length === 0) {
      const fallbackUrl = `${MODRINTH_API_URL}/project/${projectId}/version`;
      res = await fetch(fallbackUrl, { headers: { 'User-Agent': USER_AGENT } });
      if (res.ok) {
        versions = await res.json();
      }
    }

    if (!versions || versions.length === 0) {
      return null;
    }

    // Filtrar estrictamente por loader para no instalar mods de loaders incompatibles (ej. Forge en Fabric)
    if (loader && loader !== 'vanilla') {
      const normLoader = String(loader).toLowerCase().trim();
      const loaderFiltered = versions.filter((v) => {
        const vLoaders = (v.loaders || []).map((l) => String(l).toLowerCase().trim());
        if (normLoader === 'fabric') return vLoaders.includes('fabric') || vLoaders.includes('quilt');
        if (normLoader === 'quilt') return vLoaders.includes('quilt') || vLoaders.includes('fabric');
        if (normLoader === 'neoforge') return vLoaders.includes('neoforge');
        if (normLoader === 'forge') return vLoaders.includes('forge');
        return vLoaders.includes(normLoader);
      });
      if (loaderFiltered.length > 0) {
        versions = loaderFiltered;
      } else {
        logger.warn(`[ResolveModrinthFile] Mod ${projectId} no tiene versiones para el loader ${loader}. Rechazando instalación incompatible.`);
        return null;
      }
    }

    const candidateChannel = (channel || 'release').toLowerCase();
    if (candidateChannel !== 'all') {
      const filteredByChannel = versions.filter((v) => {
        const vt = (v.version_type || 'release').toLowerCase();
        if (candidateChannel === 'release') return vt === 'release';
        if (candidateChannel === 'beta') return vt === 'release' || vt === 'beta';
        return true;
      });
      if (filteredByChannel.length > 0) versions = filteredByChannel;
    }

    const selectedVersion = versions[0];
    const primaryFile = selectedVersion.files.find((f) => f.primary) || selectedVersion.files[0];

    if (!primaryFile) return null;

    // Dependencias obligatorias: dependency_type === "required"
    const requiredDependencies = (selectedVersion.dependencies || [])
      .filter((d) => d.dependency_type === 'required' && d.project_id)
      .map((d) => d.project_id);

    return {
      fileName: primaryFile.filename,
      displayName: selectedVersion.name || primaryFile.filename,
      fileId: selectedVersion.id,
      downloadUrl: primaryFile.url,
      versionNumber: selectedVersion.version_number,
      requiredDependencies
    };
  }

  async _resolveCurseForgeFile(projectId, mcVersion, loader = null) {
    const apiKey = this._getCurseForgeKey();
    const cfLoader = (loader && CF_LOADER_TYPES[loader] !== undefined) ? CF_LOADER_TYPES[loader] : CF_LOADER_TYPES.any;
    
    let url = `${CURSEFORGE_API_URL}/mods/${projectId}/files`;
    const params = [];
    if (mcVersion) params.push(`gameVersion=${encodeURIComponent(mcVersion)}`);
    if (cfLoader > 0) params.push(`modLoaderType=${cfLoader}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    let res = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json',
        'User-Agent': USER_AGENT
      }
    });

    let files = [];
    if (res.ok) {
      const data = await res.json();
      files = data.data || [];
    }

    // Fallback: si con versión exacta no se encontró, buscar respetando siempre el loader
    if (files.length === 0) {
      const fallbackParams = cfLoader > 0 ? `?modLoaderType=${cfLoader}` : '';
      res = await fetch(`${CURSEFORGE_API_URL}/mods/${projectId}/files${fallbackParams}`, {
        headers: {
          'x-api-key': apiKey,
          Accept: 'application/json',
          'User-Agent': USER_AGENT
        }
      });
      if (res.ok) {
        const data = await res.json();
        files = data.data || [];
      }
    }

    // Filtrar estrictamente por loader para no instalar mods de loaders incompatibles
    if (loader && loader !== 'vanilla' && loader !== 'bedrock' && files.length > 0) {
      const normLoader = String(loader).toLowerCase().trim();
      const loaderFiltered = files.filter((f) => {
        const gv = (f.gameVersions || []).map((v) => String(v).toLowerCase().trim());
        const fn = (f.fileName || '').toLowerCase();
        if (normLoader === 'fabric') return gv.includes('fabric') || fn.includes('fabric');
        if (normLoader === 'neoforge') return gv.includes('neoforge') || fn.includes('neoforge');
        if (normLoader === 'forge') return (gv.includes('forge') && !gv.includes('neoforge')) || (fn.includes('forge') && !fn.includes('neoforge'));
        if (normLoader === 'quilt') return gv.includes('quilt') || gv.includes('fabric');
        return true;
      });
      if (loaderFiltered.length > 0) {
        files = loaderFiltered;
      } else {
        logger.warn(`[ResolveCurseForgeFile] Mod ${projectId} no tiene archivos para el loader ${loader}. Rechazando instalación incompatible.`);
        return null;
      }
    }

    if (files.length === 0) return null;

    const file = files[0];

    // Dependencias obligatorias en CurseForge: relationType === 3 (RequiredDependency)
    const requiredDependencies = (file.dependencies || [])
      .filter((dep) => dep.relationType === 3 && dep.modId)
      .map((dep) => String(dep.modId));

    const sha1Obj = (file.hashes || []).find((h) => h.algo === 1);
    const sha1 = sha1Obj ? sha1Obj.value : null;

    let downloadUrl = file.downloadUrl;
    if (!downloadUrl && file.id && file.fileName) {
      downloadUrl = this._buildCurseForgeEdgeUrl(file.id, file.fileName);
    }

    if (!downloadUrl && (sha1 || file.fileName)) {
      const fallback = await this._tryResolveModrinthFallback(sha1, file.fileName, mcVersion, loader);
      if (fallback && fallback.url) {
        downloadUrl = fallback.url;
      }
    }

    return {
      fileName: file.fileName,
      displayName: file.displayName || file.fileName,
      fileId: String(file.id),
      downloadUrl: downloadUrl,
      versionNumber: file.gameVersions ? file.gameVersions.join(', ') : '',
      requiredDependencies,
      sha1
    };
  }

  /**
   * Intenta resolver una URL de descarga alternativa en Modrinth usando el hash SHA-1
   * del archivo o el nombre de archivo cuando CurseForge bloquea la descarga por terceros (HTTP 403 / URL nula).
   * Equivalente al comportamiento de Prism Launcher (FileResolvingTask.cpp).
   */
  async _tryResolveModrinthFallback(sha1 = null, fileName = null, mcVersion = null, loader = null) {
    // 1. Búsqueda exacta por hash SHA-1 en Modrinth (método oficial y exacto de Prism)
    if (sha1) {
      try {
        const hashRes = await fetch(`https://api.modrinth.com/v2/version_file/${sha1}?algorithm=sha1`, {
          headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }
        });
        if (hashRes.ok) {
          const versionData = await hashRes.json();
          if (versionData && Array.isArray(versionData.files) && versionData.files.length > 0) {
            const matchedFile = versionData.files.find((f) => f.hashes && f.hashes.sha1 && f.hashes.sha1.toLowerCase() === sha1.toLowerCase()) || versionData.files[0];
            if (matchedFile && matchedFile.url) {
              logger.info(`[Modrinth Fallback] Archivo idéntico localizado en Modrinth por SHA-1: ${matchedFile.filename} (${matchedFile.url})`);
              return { url: matchedFile.url, fileName: matchedFile.filename || fileName };
            }
          }
        }
      } catch (err) {
        logger.debug(`[Modrinth Fallback] Falló búsqueda por SHA-1: ${err.message}`);
      }
    }

    // 2. Búsqueda por nombre de archivo o slug si el hash no resolvió
    if (fileName) {
      try {
        const cleanSlug = fileName.replace(/\.jar$/i, '').split(/[-_+](?:neoforge|forge|fabric|quilt|mc\d|\d+\.\d+)/i)[0].toLowerCase().trim();
        if (cleanSlug && cleanSlug.length >= 2) {
          const searchUrl = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(cleanSlug)}&limit=1`;
          const sRes = await fetch(searchUrl, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
          if (sRes.ok) {
            const sData = await sRes.json();
            const hit = sData.hits && sData.hits[0];
            if (hit && hit.slug) {
              const fileInfo = await this._resolveModrinthFile(hit.slug, mcVersion, loader);
              if (fileInfo && fileInfo.downloadUrl) {
                logger.info(`[Modrinth Fallback] Mod compatible encontrado en Modrinth por slug "${hit.slug}": ${fileInfo.downloadUrl}`);
                return { url: fileInfo.downloadUrl, fileName: fileInfo.fileName || fileName };
              }
            }
          }
        }
      } catch (err) {
        logger.debug(`[Modrinth Fallback] Falló búsqueda por slug: ${err.message}`);
      }
    }

    return null;
  }

  async _downloadStream(url, destPath, onProgress = null, fallbackOptions = null) {
    let targetUrl = url;
    let res = null;

    if (targetUrl) {
      try {
        res = await fetch(targetUrl, { headers: { 'User-Agent': USER_AGENT } });
      } catch (netErr) {
        logger.warn(`[Download] Error de red al conectar a ${targetUrl}: ${netErr.message}`);
      }
    }

    if (!res || !res.ok) {
      const status = res ? res.status : 'ERR';
      logger.warn(`[Download] Descarga inicial fallida (${status}) en ${targetUrl}. Verificando fallback de Modrinth...`);
      if (fallbackOptions) {
        const fallback = await this._tryResolveModrinthFallback(
          fallbackOptions.sha1,
          fallbackOptions.fileName,
          fallbackOptions.mcVersion,
          fallbackOptions.loader
        );
        if (fallback && fallback.url) {
          logger.info(`[Modrinth Fallback] Reintentando descarga exitosa desde: ${fallback.url}`);
          targetUrl = fallback.url;
          try {
            res = await fetch(targetUrl, { headers: { 'User-Agent': USER_AGENT } });
          } catch (retryErr) {
            logger.warn(`[Download] Error en reintento con Modrinth: ${retryErr.message}`);
          }
        }
      }
    }

    if (!res || !res.ok) {
      throw new Error(`HTTP ${res ? res.status : 'error'} al descargar ${targetUrl}`);
    }

    const total = parseInt(res.headers.get('content-length') || '0', 10);
    let received = 0;

    const fileStream = fs.createWriteStream(destPath);
    const bodyStream = Readable.fromWeb(res.body);

    bodyStream.on('data', (chunk) => {
      received += chunk.length;
      if (total > 0 && onProgress) {
        onProgress(Math.min(100, Math.round((received / total) * 100)));
      }
    });

    await finished(bodyStream.pipe(fileStream));
  }

  // =========================================================================
  // GESTIÓN DE mods-lock.json & ESCANEO DE MODS CUSTOM
  // =========================================================================

  _getLockFilePath(instancePath) {
    return path.join(instancePath, 'mods-lock.json');
  }

  _readLockFile(instancePath) {
    const lockPath = this._getLockFilePath(instancePath);
    try {
      if (fs.existsSync(lockPath)) {
        const raw = fs.readFileSync(lockPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (!parsed.mods || Array.isArray(parsed.mods) || typeof parsed.mods !== 'object') {
            parsed.mods = {};
          }
          return parsed;
        }
      }
    } catch (e) {
      logger.error('Error al leer mods-lock.json:', e);
    }

    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      mods: {}
    };
  }

  _updateLockFile(instancePath, modRecord) {
    const lockData = this._readLockFile(instancePath);
    lockData.mods[modRecord.fileName] = modRecord;
    lockData.lastUpdated = new Date().toISOString();

    const lockPath = this._getLockFilePath(instancePath);
    fs.writeFileSync(lockPath, JSON.stringify(lockData, null, 2), 'utf8');
  }

  _getBlueLogoBase64() {
    const candidatePaths = [
      path.join(__dirname, '..', '..', 'renderer', 'assets', 'shubaclient_mod_logo.png'),
      path.resolve(process.cwd(), 'shubaclient_mod_logo.png'),
      path.resolve(process.cwd(), 'src', 'renderer', 'assets', 'shubaclient_mod_logo.png')
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          const buf = fs.readFileSync(p);
          if (buf && buf.length > 1000) return `data:image/png;base64,${buf.toString('base64')}`;
        } catch (_) {}
      }
    }
    return 'assets/shubaclient_mod_logo.png';
  }

  /**
   * Mods propios de ShubaCore (ShubaClient UI, ShubaConfig, ShubaDium...).
   * Se identifican por "custom.shubacore" en fabric.mod.json (o autor SHUBATECH).
   * Nunca se buscan en Modrinth/CurseForge ni se "actualizan" con los originales:
   * se muestran siempre con el nombre, autor e icono oficial de Shuba (S blanca con fondo azul).
   * Devuelve el Set de nombres de archivo que son de ShubaCore.
   */
  _applyShubaCoreIdentity(instancePath, lockData) {
    const shubaFiles = new Set();
    const modsDir = path.join(instancePath, 'mods');
    let changed = false;
    for (const [fileName, entry] of Object.entries(lockData.mods || {})) {
      // FILTRO ULTRA-RÁPIDO: Solo los archivos de ShubaCore necesitan esta verificación
      const isShubaCandidate = entry.source === 'shubacore' ||
                               /shubaclient|shubaconfig|shubadium|shubahost|polyplus|oneconfig|polydium/i.test(fileName) ||
                               (entry.projectId && /shuba|polyplus|oneconfig|polydium/i.test(String(entry.projectId)));
      if (!isShubaCandidate) continue;

      const realName = entry.fileName || fileName;
      let jarPath = path.join(modsDir, realName);
      if (!fs.existsSync(jarPath) && fs.existsSync(jarPath + '.disabled')) jarPath += '.disabled';
      const meta = this._extractJarMetadata(jarPath);
      if (!meta) continue;
      const isShuba = meta.shubacore ||
                      (meta.modId && (meta.modId === 'polyplus' || meta.modId === 'oneconfig' || meta.modId === 'polydium' || meta.modId === 'shubahost' || meta.modId === 'shubaclient')) ||
                      /shubaclient|shubaconfig|shubadium|shubahost/i.test(fileName);
      if (!isShuba) continue;
      shubaFiles.add(fileName);

      const modIcon = this._getBlueLogoBase64();

      const wanted = {
        source: 'shubacore',
        projectId: null,
        fileId: null,
        displayName: meta?.name || entry.displayName || this._cleanJarName(fileName),
        name: meta?.name || entry.name || this._cleanJarName(fileName),
        author: meta?.author || 'SHUBATECH',
        summary: meta?.description || entry.summary || 'Mod oficial del ecosistema ShubaCore.',
        version: meta?.version || entry.version,
        iconUrl: modIcon
      };
      for (const [k, v] of Object.entries(wanted)) {
        if (v !== undefined && entry[k] !== v) { entry[k] = v; changed = true; }
      }
    }
    if (changed) {
      lockData.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this._getLockFilePath(instancePath), JSON.stringify(lockData, null, 2), 'utf8');
    }
    return shubaFiles;
  }

  _cleanJarName(fileName) {
    if (!fileName || typeof fileName !== 'string') return 'Mod Desconocido';
    let base = fileName.replace(/\.disabled$/i, '').replace(/\.jar$/i, '');
    const parts = base.split(/[-_+](?:neoforge|forge|fabric|quilt|mc\d|\d+\.\d+)/i);
    if (parts[0] && parts[0].trim().length > 1) {
      base = parts[0].trim();
    }
    base = base.replace(/_/g, ' ').trim();
    if (!base) return fileName.replace(/\.disabled$/i, '').replace(/\.jar$/i, '');
    return base.charAt(0).toUpperCase() + base.slice(1);
  }

  /**
   * Construye la URL oficial de descarga directa de CurseForge Edge CDN
   * Si id = 5020034 -> edge.forgecdn.net/files/5020/34/filename.jar
   */
  _buildCurseForgeEdgeUrl(fileId, fileName) {
    if (!fileId || !fileName) return '';
    const idStr = String(fileId);
    const part1 = idStr.slice(0, 4);
    const part2 = idStr.slice(4).replace(/^0+/, '') || '0';
    return `https://edge.forgecdn.net/files/${part1}/${part2}/${encodeURIComponent(fileName)}`;
  }

  /**
   * Extrae loader y versión de loader desde manifest.minecraft.modLoaders de CurseForge
   * ej: "neoforge-21.1.265" -> loader: "NeoForge", loaderVersion: "21.1.265"
   */
  _parseCurseForgeModLoader(modLoaders = []) {
    if (!Array.isArray(modLoaders) || modLoaders.length === 0) {
      return { loader: 'NeoForge', loaderVersion: '', rawLoader: 'neoforge' };
    }
    const primaryEntry = modLoaders.find((ml) => ml && ml.primary) || modLoaders[0] || {};
    const idStr = primaryEntry.id ? String(primaryEntry.id).trim() : '';
    if (!idStr) {
      return { loader: 'NeoForge', loaderVersion: '', rawLoader: 'neoforge' };
    }

    const hyphenIdx = idStr.indexOf('-');
    if (hyphenIdx > 0) {
      const rawLoader = idStr.substring(0, hyphenIdx).toLowerCase();
      const loaderVersion = idStr.substring(hyphenIdx + 1);
      let loader = 'NeoForge';
      if (rawLoader === 'neoforge') loader = 'NeoForge';
      else if (rawLoader === 'forge') loader = 'Forge';
      else if (rawLoader === 'fabric') loader = 'Fabric';
      else if (rawLoader === 'quilt') loader = 'Quilt';
      return { loader, loaderVersion, rawLoader };
    }

    const rawLoader = idStr.toLowerCase();
    let loader = idStr;
    if (rawLoader === 'neoforge') loader = 'NeoForge';
    else if (rawLoader === 'forge') loader = 'Forge';
    else if (rawLoader === 'fabric') loader = 'Fabric';
    else if (rawLoader === 'quilt') loader = 'Quilt';
    return { loader, loaderVersion: '', rawLoader };
  }

  /**
   * Ejecuta tareas asíncronas con un pool de concurrencia limitado
   */
  async _runWithConcurrency(items, concurrency, fn) {
    if (!items || items.length === 0) return [];
    let index = 0;
    const results = new Array(items.length);
    const workerCount = Math.min(concurrency, items.length);

    const workers = Array.from({ length: workerCount }, async () => {
      while (true) {
        const currentIndex = index++;
        if (currentIndex >= items.length) break;
        try {
          results[currentIndex] = await fn(items[currentIndex], currentIndex);
        } catch (err) {
          logger.warn(`[ConcurrencyWorker] Error procesando elemento ${currentIndex}: ${err.message}`);
          results[currentIndex] = null;
        }
      }
    });

    await Promise.all(workers);
    return results;
  }

  /**
   * Calcula el CurseForge Fingerprint oficial (MurmurHash2 de 32 bits normalizado)
   * Filtra bytes de espacio en blanco: 9 (\t), 10 (\n), 13 (\r), 32 (' ')
   */
  computeCurseForgeFingerprint(buffer) {
    if (!buffer || buffer.length === 0) return 0;

    let filteredLength = 0;
    for (let i = 0; i < buffer.length; i++) {
      const b = buffer[i];
      if (b !== 9 && b !== 10 && b !== 13 && b !== 32) {
        filteredLength++;
      }
    }

    const clean = Buffer.allocUnsafe(filteredLength);
    let pos = 0;
    for (let i = 0; i < buffer.length; i++) {
      const b = buffer[i];
      if (b !== 9 && b !== 10 && b !== 13 && b !== 32) {
        clean[pos++] = b;
      }
    }

    const m = 0x5bd1e995;
    const r = 24;
    const len = clean.length;
    let h = (1 ^ len) >>> 0;

    let i = 0;
    while (len - i >= 4) {
      let k = clean.readUInt32LE(i);
      k = Math.imul(k, m) >>> 0;
      k = (k ^ (k >>> r)) >>> 0;
      k = Math.imul(k, m) >>> 0;

      h = Math.imul(h, m) >>> 0;
      h = (h ^ k) >>> 0;
      i += 4;
    }

    const remaining = len - i;
    if (remaining === 3) {
      h = (h ^ (clean[i + 2] << 16)) >>> 0;
      h = (h ^ (clean[i + 1] << 8)) >>> 0;
      h = (h ^ clean[i]) >>> 0;
      h = Math.imul(h, m) >>> 0;
    } else if (remaining === 2) {
      h = (h ^ (clean[i + 1] << 8)) >>> 0;
      h = (h ^ clean[i]) >>> 0;
      h = Math.imul(h, m) >>> 0;
    } else if (remaining === 1) {
      h = (h ^ clean[i]) >>> 0;
      h = Math.imul(h, m) >>> 0;
    }

    h = (h ^ (h >>> 13)) >>> 0;
    h = Math.imul(h, m) >>> 0;
    h = (h ^ (h >>> 15)) >>> 0;

    return h >>> 0;
  }

  _extractVersionFromFileName(fileName) {
    if (!fileName || typeof fileName !== 'string') return '';
    let clean = fileName.replace(/\.jar$/i, '').replace(/\.disabled$/i, '');
    const parts = clean.split(/[-_+]/);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (/^\d+\.\d+/.test(p) && !/^1\.(?:16|17|18|19|20|21)(?:\.\d+)?$/.test(p)) {
        return p;
      }
    }
    const anyVer = clean.match(/(\d+\.\d+(?:\.\d+)*)/g);
    if (anyVer && anyVer.length > 0) {
      return anyVer[anyVer.length - 1];
    }
    return clean;
  }

  /**
   * Extrae metadatos e icono nativo PNG directamente desde el interior del archivo .jar
   * Soporta NeoForge, Forge, Fabric, Quilt y mods clásicos (mcmod.info)
   */
  _extractJarMetadata(jarPath) {
    if (!jarPath || !fs.existsSync(jarPath)) return null;
    try {
      const zip = new AdmZip(jarPath);

      let meta = {
        name: null,
        modId: null,
        version: null,
        author: null,
        description: null,
        iconBase64: null,
        environment: null
      };

      const neoTomlEntry = zip.getEntry('META-INF/neoforge.mods.toml') || zip.getEntry('META-INF/mods.toml');
      const fabricEntry = zip.getEntry('fabric.mod.json') || zip.getEntry('quilt.mod.json');
      const mcmodEntry = zip.getEntry('mcmod.info');

      let logoFileName = null;

      if (neoTomlEntry) {
        const content = neoTomlEntry.getData().toString('utf8');
        const modsSectionMatch = content.match(/\[\[mods\]\]([\s\S]*?)(?:\[\[|$)/i);
        const modBlock = modsSectionMatch ? modsSectionMatch[1] : content;

        const nameMatch = modBlock.match(/(?:displayName|name)\s*=\s*["']([^"']+)["']/i) || content.match(/(?:displayName|name)\s*=\s*["']([^"']+)["']/i);
        const modIdMatch = modBlock.match(/modId\s*=\s*["']([^"']+)["']/i) || content.match(/modId\s*=\s*["']([^"']+)["']/i);
        const verMatch = modBlock.match(/version\s*=\s*["']([^"']+)["']/i);
        const authorMatch = modBlock.match(/(?:authors|author|credits)\s*=\s*["']([^"']+)["']/i) || content.match(/(?:authors|author|credits)\s*=\s*["']([^"']+)["']/i);
        const logoMatch = modBlock.match(/logoFile\s*=\s*["']([^"']+)["']/i) || content.match(/logoFile\s*=\s*["']([^"']+)["']/i);
        const descMatch = modBlock.match(/description\s*=\s*(?:'''|""")([\s\S]*?)(?:'''|""")|description\s*=\s*["']([^"']+)["']/i) || content.match(/description\s*=\s*(?:'''|""")([\s\S]*?)(?:'''|""")|description\s*=\s*["']([^"']+)["']/i);
        const sideMatch = modBlock.match(/side\s*=\s*["']([^"']+)["']/i);

        if (nameMatch) meta.name = nameMatch[1];
        if (modIdMatch) meta.modId = modIdMatch[1];
        if (verMatch && verMatch[1] !== '${file.jarVersion}') meta.version = verMatch[1];
        if (authorMatch) meta.author = authorMatch[1];
        if (logoMatch) logoFileName = logoMatch[1];
        if (descMatch) meta.description = (descMatch[1] || descMatch[2] || '').trim();
        if (sideMatch) meta.environment = sideMatch[1].toLowerCase();
      } else if (fabricEntry) {
        try {
          const json = JSON.parse(fabricEntry.getData().toString('utf8'));
          meta.name = json.name;
          meta.modId = json.id;
          meta.version = json.version;
          meta.description = json.description;
          if (json.environment) meta.environment = json.environment;
          if (Array.isArray(json.authors)) {
            meta.author = json.authors.map((a) => (typeof a === 'string' ? a : (a.name || ''))).filter(Boolean).join(', ');
          } else if (typeof json.authors === 'string') {
            meta.author = json.authors;
          }
          meta.shubacore = Boolean(json.custom && json.custom.shubacore) ||
                           /shubatech/i.test(meta.author || '') ||
                           /shuba/i.test(meta.name || '') ||
                           (json.id && (json.id === 'polyplus' || json.id === 'oneconfig' || json.id === 'polydium'));
          if (typeof json.icon === 'string') {
            logoFileName = json.icon;
          } else if (json.icon && typeof json.icon === 'object') {
            logoFileName = Object.values(json.icon)[0];
          }
        } catch (_) {}
      } else if (mcmodEntry) {
        try {
          const json = JSON.parse(mcmodEntry.getData().toString('utf8'));
          const m = Array.isArray(json) ? json[0] : (json.modList ? json.modList[0] : json);
          if (m) {
            meta.name = m.name;
            meta.modId = m.modid;
            meta.version = m.version;
            meta.description = m.description;
            meta.author = Array.isArray(m.authorList) ? m.authorList.join(', ') : m.authorList;
            logoFileName = m.logoFile;
          }
        } catch (_) {}
      }

      meta.environment = this._resolveModEnvironment(meta, path.basename(jarPath));

      // Búsqueda directa del icono sin iterar miles de archivos
      let iconEntry = null;
      if (logoFileName) {
        const cleanLogo = logoFileName.replace(/^[/\\]+/, '');
        iconEntry = zip.getEntry(cleanLogo) ||
                    zip.getEntry(logoFileName) ||
                    (meta.modId ? (zip.getEntry('assets/' + meta.modId + '/' + cleanLogo) || zip.getEntry('assets/' + meta.modId + '/textures/gui/' + cleanLogo)) : null);
      }

      if (!iconEntry) {
        const commonNames = ['icon.png', 'logo.png', 'pack.png'];
        for (const cn of commonNames) {
          iconEntry = zip.getEntry(cn);
          if (iconEntry) break;
          if (meta.modId) {
            iconEntry = zip.getEntry('assets/' + meta.modId + '/' + cn) ||
                        zip.getEntry('assets/' + meta.modId + '/textures/gui/' + cn);
            if (iconEntry) break;
          }
        }
      }

      if (iconEntry) {
        const buf = iconEntry.getData();
        if (buf && buf.length > 0) {
          meta.iconBase64 = 'data:image/png;base64,' + buf.toString('base64');
        }
      }

      return meta;
    } catch (err) {
      logger.debug(`[ExtractJarMetadata] Error al procesar ${jarPath}: ${err.message}`);
      return null;
    }
  }

  scanAndSyncMods(instancePath = null) {
    const activeInstance = instancePath || this.configManager.getInstanceDirectory();
    const modsDir = path.join(activeInstance, 'mods');

    if (!fs.existsSync(modsDir)) {
      fs.mkdirSync(modsDir, { recursive: true });
    }

    const lockData = this._readLockFile(activeInstance);
    if (!lockData.mods) lockData.mods = {};
    const filesOnDisk = fs.readdirSync(modsDir);
    const validFiles = new Set(filesOnDisk.filter((f) => f.endsWith('.jar') || f.endsWith('.jar.disabled')));

    // Mapeo O(1) de claves existentes en mods-lock.json
    const lockMap = new Map();
    for (const k of Object.keys(lockData.mods)) {
      lockMap.set(k, k);
      lockMap.set(k.replace(/\.disabled$/i, ''), k);
      lockMap.set(`${k}.disabled`, k);
    }

    // Caché rápida persistente en disco (.shubacore-mods-cache.json)
    const cacheFile = path.join(activeInstance, '.shubacore-mods-cache.json');
    let diskCache = {};
    if (fs.existsSync(cacheFile)) {
      try {
        diskCache = JSON.parse(fs.readFileSync(cacheFile, 'utf8')) || {};
      } catch (_) {
        diskCache = {};
      }
    }
    let cacheDirty = false;
    let lockModified = false;

    const getJarMetaWithCache = (filePath, file, stats) => {
      // Acierto de caché: si ya fue analizado antes y el mtime y tamaño coinciden, retornar sin tocar el disco
      if (stats && diskCache[file] && diskCache[file].mtimeMs === stats.mtimeMs && diskCache[file].size === stats.size && (diskCache[file].metadata || diskCache[file].checked)) {
        return diskCache[file].metadata || null;
      }
      const extracted = this._extractJarMetadata(filePath);
      if (stats) {
        diskCache[file] = {
          mtimeMs: stats.mtimeMs,
          size: stats.size,
          checked: true,
          metadata: extracted
        };
        cacheDirty = true;
      }
      return extracted;
    };

    // 1. Detectar archivos introducidos manualmente o ya existentes
    for (const file of validFiles) {
      const isEnabled = !file.endsWith('.disabled');
      const baseName = file.replace(/\.disabled$/i, '');
      const filePath = path.join(modsDir, file);

      let sizeFormatted = '';
      let fileStats = null;
      try {
        if (fs.existsSync(filePath)) {
          fileStats = fs.statSync(filePath);
          const bytes = fileStats.size;
          if (bytes >= 1024 * 1024) {
            sizeFormatted = (bytes / (1024 * 1024)).toFixed(1) + ' MB';
          } else if (bytes >= 1024) {
            sizeFormatted = (bytes / 1024).toFixed(0) + ' KB';
          } else {
            sizeFormatted = bytes + ' B';
          }
        }
      } catch (e) {}

      const existingKey = lockMap.get(file) || lockMap.get(baseName);
      const cleanTitle = this._cleanJarName(file);

      if (!existingKey) {
        logger.info(`[Auto-Detect] Mod manual detectado en /mods: ${file}. Analizando metadatos internos del .jar...`);
        const jarMeta = getJarMetaWithCache(filePath, file, fileStats);
        const resolvedTitle = (jarMeta && jarMeta.name) ? jarMeta.name : cleanTitle;
        const resolvedAuthor = (jarMeta && jarMeta.author) ? jarMeta.author : null;
        const resolvedVersion = (jarMeta && jarMeta.version) ? jarMeta.version : 'custom';
        const resolvedSummary = (jarMeta && jarMeta.description) ? jarMeta.description : null;
        const resolvedIcon = (jarMeta && jarMeta.iconBase64) ? jarMeta.iconBase64 : null;
        const resolvedEnv = (jarMeta && jarMeta.environment) ? jarMeta.environment : this._resolveModEnvironment(jarMeta, file);

        lockData.mods[file] = {
          fileName: file,
          name: resolvedTitle,
          displayName: resolvedTitle,
          source: 'custom',
          projectId: jarMeta && jarMeta.modId ? jarMeta.modId : null,
          fileId: null,
          downloadUrl: null,
          installedAt: new Date().toISOString(),
          version: resolvedVersion,
          versionNumber: resolvedVersion,
          enabled: isEnabled,
          sizeFormatted,
          dependencies: [],
          iconUrl: resolvedIcon,
          author: resolvedAuthor,
          summary: resolvedSummary,
          environment: resolvedEnv,
          clientSide: resolvedEnv === 'server' ? 'unsupported' : (resolvedEnv === 'client' ? 'required' : 'optional'),
          serverSide: resolvedEnv === 'client' ? 'unsupported' : (resolvedEnv === 'server' ? 'required' : 'optional')
        };
        lockMap.set(file, file);
        lockMap.set(baseName, file);
        lockModified = true;
      } else {
        const modEntry = lockData.mods[existingKey];
        if (existingKey !== file) {
          delete lockData.mods[existingKey];
          modEntry.fileName = file;
          lockData.mods[file] = modEntry;
          lockModified = true;
        }
        if (modEntry.enabled !== isEnabled) {
          modEntry.enabled = isEnabled;
          lockModified = true;
        }
        if (sizeFormatted && modEntry.sizeFormatted !== sizeFormatted) {
          modEntry.sizeFormatted = sizeFormatted;
          lockModified = true;
        }

        // Sincronizar o actualizar entorno de ejecución (Solo Servidor, Solo Cliente o Ambos)
        const resolvedEnv = this._resolveModEnvironment(modEntry, file);
        if (modEntry.environment !== resolvedEnv) {
          modEntry.environment = resolvedEnv;
          modEntry.clientSide = resolvedEnv === 'server' ? 'unsupported' : (resolvedEnv === 'client' ? 'required' : 'optional');
          modEntry.serverSide = resolvedEnv === 'client' ? 'unsupported' : (resolvedEnv === 'server' ? 'required' : 'optional');
          lockModified = true;
        }

        // Corregir valores nulos, vacíos o "undefined"
        if (!modEntry.displayName || modEntry.displayName === 'undefined' || modEntry.displayName.trim() === '') {
          modEntry.displayName = cleanTitle;
          lockModified = true;
        }
        if (!modEntry.name || modEntry.name === 'undefined' || modEntry.name.trim() === '') {
          modEntry.name = modEntry.displayName || cleanTitle;
          lockModified = true;
        }
        if (!modEntry.source || modEntry.source === 'undefined' || modEntry.source.trim() === '') {
          modEntry.source = 'custom';
          lockModified = true;
        }

        // Si le falta icono o autor y NO se ha verificado aún en caché, consultar sin repetir
        if ((!modEntry.iconUrl || !modEntry.author) && (!diskCache[file] || (!diskCache[file].checked && !diskCache[file].metadata))) {
          const jarMeta = getJarMetaWithCache(filePath, file, fileStats);
          if (jarMeta) {
            if (jarMeta.iconBase64 && !modEntry.iconUrl) { modEntry.iconUrl = jarMeta.iconBase64; lockModified = true; }
            if (jarMeta.author && !modEntry.author) { modEntry.author = jarMeta.author; lockModified = true; }
            if (jarMeta.description && !modEntry.summary) { modEntry.summary = jarMeta.description; lockModified = true; }
            if (jarMeta.name && (!modEntry.displayName || modEntry.displayName === 'undefined' || modEntry.displayName === cleanTitle)) {
              modEntry.displayName = jarMeta.name;
              modEntry.name = jarMeta.name;
              lockModified = true;
            }
            if (jarMeta.version && (!modEntry.versionNumber || modEntry.versionNumber === 'custom')) {
              modEntry.versionNumber = jarMeta.version;
              modEntry.version = jarMeta.version;
              lockModified = true;
            }
          }
        }
      }
    }

    // Guardar caché de metadatos en disco sólo si hubo novedades
    if (cacheDirty) {
      Object.keys(diskCache).forEach((k) => {
        if (!validFiles.has(k)) delete diskCache[k];
      });
      try {
        fs.writeFileSync(cacheFile, JSON.stringify(diskCache), 'utf8');
      } catch (_) {}
    }

    // 2. Limpiar del lockfile los mods eliminados físicamente
    Object.keys(lockData.mods).forEach((key) => {
      if (!validFiles.has(key) && !validFiles.has(`${key}.disabled`)) {
        logger.debug(`Mod ${key} eliminado del disco. Removiendo de mods-lock.json.`);
        delete lockData.mods[key];
        lockModified = true;
      }
    });

    // 3. Garantizar identidad oficial de ShubaCore (logo y autor SHUBATECH)
    this._applyShubaCoreIdentity(activeInstance, lockData);

    if (lockModified) {
      lockData.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this._getLockFilePath(activeInstance), JSON.stringify(lockData, null, 2), 'utf8');
    }

    return Object.values(lockData.mods).map((m) => {
      const clean = this._cleanJarName(m.fileName);
      const displayName = (m.displayName && m.displayName !== 'undefined') ? m.displayName : clean;
      const name = (m.name && m.name !== 'undefined') ? m.name : displayName;
      const source = (m.source && m.source !== 'undefined') ? m.source : 'custom';
      const itemEnv = m.environment || this._resolveModEnvironment(m, m.fileName);
      return {
        ...m,
        name,
        displayName,
        source,
        projectId: m.projectId || null,
        fileId: m.fileId || null,
        versionNumber: m.versionNumber || m.version || '',
        sizeFormatted: m.sizeFormatted || '',
        environment: itemEnv,
        clientSide: m.clientSide || (itemEnv === 'server' ? 'unsupported' : (itemEnv === 'client' ? 'required' : 'optional')),
        serverSide: m.serverSide || (itemEnv === 'client' ? 'unsupported' : (itemEnv === 'server' ? 'required' : 'optional'))
      };
    });
  }

  toggleMod(fileName, enable, instancePath = null) {
    const activeInstance = instancePath || this.configManager.getInstanceDirectory();
    const modsDir = path.join(activeInstance, 'mods');

    const cleanBase = fileName.replace(/\.disabled$/i, '');
    const currentName = enable ? `${cleanBase}.disabled` : cleanBase;
    const targetName = enable ? cleanBase : `${cleanBase}.disabled`;

    const currentPath = path.join(modsDir, currentName);
    const targetPath = path.join(modsDir, targetName);

    if (fs.existsSync(currentPath)) {
      fs.renameSync(currentPath, targetPath);
      logger.info(`Mod ${fileName} ${enable ? 'habilitado' : 'deshabilitado'}.`);
    }

    return this.scanAndSyncMods(activeInstance);
  }

  deleteMod(fileName, instancePath = null) {
    const activeInstance = instancePath || this.configManager.getInstanceDirectory();
    const modsDir = path.join(activeInstance, 'mods');

    const cleanBase = fileName.replace(/\.disabled$/i, '');
    const possiblePaths = [
      path.join(modsDir, fileName),
      path.join(modsDir, cleanBase),
      path.join(modsDir, `${cleanBase}.disabled`)
    ];

    possiblePaths.forEach((p) => {
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
          logger.info(`Archivo de mod eliminado: ${p}`);
        } catch (e) {
          logger.warn(`No se pudo eliminar ${p}: ${e.message}`);
        }
      }
    });

    // Limpiar de caché rápida en disco (.shubacore-mods-cache.json)
    try {
      const cacheFile = path.join(activeInstance, '.shubacore-mods-cache.json');
      if (fs.existsSync(cacheFile)) {
        const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8')) || {};
        delete cache[fileName];
        delete cache[cleanBase];
        delete cache[`${cleanBase}.disabled`];
        fs.writeFileSync(cacheFile, JSON.stringify(cache), 'utf8');
      }
    } catch (_) {}

    return this.scanAndSyncMods(activeInstance);
  }

  // =========================================================================
  // DETALLES DEL MOD Y SELECTOR DE VERSIONES (MODAL ESTILO CURSEFORGE/MODRINTH)
  // =========================================================================

  async getProjectDetails({ projectId, source = 'modrinth', mcVersion = '1.21.1', loader = 'neoforge' }) {
    logger.info(`[ProjectDetails] Consultando detalles para ${projectId} (${source}) en MC ${mcVersion} (${loader})...`);

    // Modpack Oficial Custom de ShubaClient (SHUBATECH)
    if (projectId === 'shubaclient' || projectId === 'shubaclient-263' || source === 'custom' || source === 'shubacore') {
      return this.getOfficialShubaClientModpackDetails();
    }

    let serverPack = null;

    if (source === 'curseforge') {
      const apiKey = this._getCurseForgeKey();
      const cfLoader = CF_LOADER_TYPES[loader] !== undefined ? CF_LOADER_TYPES[loader] : CF_LOADER_TYPES.any;

      // 1. Datos del mod
      const modRes = await fetch(`${CURSEFORGE_API_URL}/mods/${projectId}`, {
        headers: { 'x-api-key': apiKey, Accept: 'application/json', 'User-Agent': USER_AGENT }
      });
      if (!modRes.ok) {
        throw new Error(`CurseForge HTTP ${modRes.status} al consultar proyecto ${projectId}`);
      }
      const modData = (await modRes.json()).data;

      // 2. Descripción completa (HTML)
      let descriptionHtml = modData.summary || '';
      try {
        const descRes = await fetch(`${CURSEFORGE_API_URL}/mods/${projectId}/description`, {
          headers: { 'x-api-key': apiKey, Accept: 'application/json', 'User-Agent': USER_AGENT }
        });
        if (descRes.ok) {
          const descJson = await descRes.json();
          if (descJson && descJson.data) {
            descriptionHtml = descJson.data;
          }
        }
      } catch (e) {
        logger.debug('No se pudo obtener descripción HTML de CurseForge:', e.message);
      }

      // 3. Archivos compatibles
      const isBedrock = (loader || '').toLowerCase().includes('bedrock');
      let filesUrl = `${CURSEFORGE_API_URL}/mods/${projectId}/files?pageSize=50`;
      if (!isBedrock) {
        if (mcVersion) filesUrl += `&gameVersion=${encodeURIComponent(mcVersion)}`;
        if (cfLoader > 0) filesUrl += `&modLoaderType=${cfLoader}`;
      }

      let filesRes = await fetch(filesUrl, {
        headers: { 'x-api-key': apiKey, Accept: 'application/json', 'User-Agent': USER_AGENT }
      });
      let filesData = [];
      if (filesRes.ok) {
        filesData = (await filesRes.json()).data || [];
      }

      if (filesData.length === 0) {
        filesRes = await fetch(`${CURSEFORGE_API_URL}/mods/${projectId}/files?pageSize=50`, {
          headers: { 'x-api-key': apiKey, Accept: 'application/json', 'User-Agent': USER_AGENT }
        });
        if (filesRes.ok) {
          filesData = (await filesRes.json()).data || [];
        }
      }

      // Detección de Paquete de Servidor (Server Pack) para Modpacks en CurseForge
      serverPack = null;
      const fileWithServer = filesData.find((f) => f.serverPackFileId);
      if (fileWithServer && fileWithServer.serverPackFileId) {
        try {
          const sRes = await fetch(`${CURSEFORGE_API_URL}/mods/${projectId}/files/${fileWithServer.serverPackFileId}`, {
            headers: { 'x-api-key': apiKey, Accept: 'application/json', 'User-Agent': USER_AGENT },
            signal: AbortSignal.timeout(4000)
          });
          if (sRes.ok) {
            const sData = (await sRes.json()).data;
            if (sData) {
              let sUrl = sData.downloadUrl;
              if (!sUrl && sData.id && sData.fileName) {
                sUrl = this._buildCurseForgeEdgeUrl(sData.id, sData.fileName);
              }
              let sSize = '';
              if (sData.fileLength) {
                sSize = sData.fileLength >= 1048576 ? (sData.fileLength / 1048576).toFixed(1) + ' MB' : (sData.fileLength / 1024).toFixed(0) + ' KB';
              }
              serverPack = {
                fileId: String(sData.id),
                fileName: sData.fileName,
                displayName: sData.displayName || sData.fileName,
                downloadUrl: sUrl,
                sizeFormatted: sSize,
                parentFileName: fileWithServer.fileName
              };
            }
          }
        } catch (sErr) {
          logger.debug('[ProjectDetails] No se pudo consultar server pack:', sErr.message);
        }
      }

      const files = filesData.map((f) => {
        const releaseType = f.releaseType === 1 ? 'Release' : (f.releaseType === 2 ? 'Beta' : 'Alpha');
        let dlUrl = f.downloadUrl;
        if (!dlUrl && f.id && f.fileName) {
          dlUrl = this._buildCurseForgeEdgeUrl(f.id, f.fileName);
        }
        let sizeFormatted = '';
        if (f.fileLength) {
          sizeFormatted = f.fileLength >= 1048576 ? (f.fileLength / 1048576).toFixed(1) + ' MB' : (f.fileLength / 1024).toFixed(0) + ' KB';
        }
        return {
          fileId: String(f.id),
          fileName: f.fileName,
          displayName: f.displayName || f.fileName,
          versionNumber: f.gameVersions ? f.gameVersions.join(', ') : '',
          releaseType,
          releaseDate: f.fileDate ? new Date(f.fileDate).toLocaleDateString() : '',
          gameVersions: f.gameVersions || [],
          downloadUrl: dlUrl,
          sizeFormatted,
          serverPackFileId: f.serverPackFileId ? String(f.serverPackFileId) : null
        };
      });

      const changelogs = filesData.slice(0, 10).map((f) => ({
        versionNumber: (f.gameVersions || []).join(', ') || f.displayName,
        fileName: f.fileName,
        releaseType: f.releaseType === 1 ? 'Release' : (f.releaseType === 2 ? 'Beta' : 'Alpha'),
        releaseDate: f.fileDate ? new Date(f.fileDate).toLocaleDateString() : '',
        changelog: f.changelog || 'Actualización y mejoras de rendimiento y compatibilidad general.'
      }));

      const dependencies = [];
      (filesData[0]?.dependencies || []).forEach((d) => {
        dependencies.push({
          modId: String(d.modId),
          relationType: d.relationType === 3 ? 'Requerido' : (d.relationType === 2 ? 'Opcional' : 'Incompatible')
        });
      });

      return {
        id: String(modData.id),
        slug: modData.slug,
        title: modData.name,
        author: modData.authors && modData.authors[0] ? modData.authors[0].name : 'Desconocido',
        summary: modData.summary || '',
        descriptionHtml,
        iconUrl: (modData.logo && (modData.logo.thumbnailUrl || modData.logo.url)) || '',
        downloads: modData.downloadCount || 0,
        source: 'curseforge',
        websiteUrl: (modData.links && modData.links.websiteUrl) || `https://www.curseforge.com/minecraft/mc-mods/${modData.slug}`,
        screenshots: (modData.screenshots || []).map((s) => s.url || s.thumbnailUrl).filter(Boolean),
        gallery: (modData.screenshots || []).map((s) => ({ url: s.url || s.thumbnailUrl, title: s.title || modData.name, description: s.description || '' })).filter((g) => Boolean(g.url)),
        changelogs,
        dependencies,
        files,
        serverPack
      };
    } else {
      // Modrinth
      const modRes = await fetch(`${MODRINTH_API_URL}/project/${projectId}`, {
        headers: { 'User-Agent': USER_AGENT }
      });
      if (!modRes.ok) {
        throw new Error(`Modrinth HTTP ${modRes.status} al consultar proyecto ${projectId}`);
      }
      const modData = await modRes.json();

      let vUrl = `${MODRINTH_API_URL}/project/${projectId}/version`;
      const queryParams = [];
      if (mcVersion) queryParams.push(`game_versions=["${mcVersion}"]`);
      if (loader && loader !== 'vanilla') queryParams.push(`loaders=["${loader}"]`);
      if (queryParams.length > 0) vUrl += `?${queryParams.join('&')}`;

      let vRes = await fetch(vUrl, { headers: { 'User-Agent': USER_AGENT } });
      let versionsData = [];
      if (vRes.ok) {
        versionsData = await vRes.json();
      }

      if (!versionsData || versionsData.length === 0) {
        vRes = await fetch(`${MODRINTH_API_URL}/project/${projectId}/version`, {
          headers: { 'User-Agent': USER_AGENT }
        });
        if (vRes.ok) {
          versionsData = await vRes.json();
        }
      }

      const files = (versionsData || []).map((v) => {
        const primary = (v.files || []).find((f) => f.primary) || (v.files || [])[0] || {};
        const releaseType = v.version_type === 'release' ? 'Release' : (v.version_type === 'beta' ? 'Beta' : 'Alpha');
        let sizeFormatted = '';
        if (primary.size) {
          sizeFormatted = primary.size >= 1048576 ? (primary.size / 1048576).toFixed(1) + ' MB' : (primary.size / 1024).toFixed(0) + ' KB';
        }
        return {
          fileId: String(v.id),
          fileName: primary.filename || 'mod.jar',
          displayName: v.name || primary.filename,
          versionNumber: v.version_number,
          releaseType,
          releaseDate: v.date_published ? new Date(v.date_published).toLocaleDateString() : '',
          gameVersions: v.game_versions || [],
          downloadUrl: primary.url,
          sizeFormatted
        };
      });

      const changelogs = (versionsData || []).slice(0, 10).map((v) => ({
        versionNumber: v.version_number || v.name,
        fileName: (v.files && v.files[0] && v.files[0].filename) || '',
        releaseType: v.version_type === 'release' ? 'Release' : (v.version_type === 'beta' ? 'Beta' : 'Alpha'),
        releaseDate: v.date_published ? new Date(v.date_published).toLocaleDateString() : '',
        changelog: v.changelog || 'Actualizaciones regulares de compatibilidad y optimización.'
      }));

      const dependencies = [];
      (versionsData[0]?.dependencies || []).forEach((d) => {
        dependencies.push({
          projectId: d.project_id,
          versionId: d.version_id,
          relationType: d.dependency_type === 'required' ? 'Requerido' : 'Opcional'
        });
      });

      return {
        id: modData.id,
        slug: modData.slug,
        title: modData.title,
        author: modData.organization || modData.team || '',
        summary: modData.description || '',
        descriptionHtml: modData.body || modData.description || '',
        iconUrl: modData.icon_url || '',
        downloads: modData.downloads || 0,
        source: 'modrinth',
        websiteUrl: `https://modrinth.com/mod/${modData.slug}`,
        screenshots: (modData.gallery || []).map((g) => g.url).filter(Boolean),
        gallery: (modData.gallery || []).map((g) => ({ url: g.url, title: g.title || modData.title, description: g.description || '' })),
        changelogs,
        dependencies,
        files,
        serverPack
      };
    }
  }

  /**
   * Instala una versión específica de un mod y reemplaza cualquier versión anterior
   */
  async installModVersion({
    projectId,
    source,
    fileId,
    downloadUrl,
    fileName,
    displayName,
    versionNumber,
    instancePath = null,
    mcVersion = '1.21.1',
    loader = 'neoforge',
    oldFileName = null,
    onProgress = null
  }) {
    const activeInstance = instancePath || this.configManager.getInstanceDirectory();
    const modsDir = path.join(activeInstance, 'mods');
    if (!fs.existsSync(modsDir)) {
      fs.mkdirSync(modsDir, { recursive: true });
    }

    const lockData = this._readLockFile(activeInstance);

    // 1. Si se especificó el archivo antiguo a reemplazar, eliminarlo físicamente de inmediato
    if (oldFileName) {
      const cleanOld = oldFileName.replace(/\.disabled$/i, '');
      const oldFilesToCheck = [
        path.join(modsDir, oldFileName),
        path.join(modsDir, `${oldFileName}.disabled`),
        path.join(modsDir, cleanOld),
        path.join(modsDir, `${cleanOld}.disabled`)
      ];
      oldFilesToCheck.forEach((p) => {
        if (fs.existsSync(p)) {
          try {
            fs.unlinkSync(p);
            logger.info(`[Update Clean] Archivo previo eliminado directamente: ${p}`);
          } catch (e) {
            logger.warn(`No se pudo eliminar archivo previo ${p}:`, e.message);
          }
        }
      });
      delete lockData.mods[oldFileName];
      delete lockData.mods[cleanOld];
      delete lockData.mods[`${cleanOld}.disabled`];
    }

    // 2. Si existe otra versión previa instalada de este mod en el lockfile, eliminar el archivo físico
    const cleanCurrentName = this._cleanJarName(fileName).toLowerCase();
    const existingKey = Object.keys(lockData.mods).find((k) => {
      const m = lockData.mods[k];
      if (oldFileName && (k === oldFileName || m.fileName === oldFileName)) return true;
      if (projectId && m.projectId && String(m.projectId) === String(projectId)) return true;
      if (m.name && this._cleanJarName(m.name).toLowerCase() === cleanCurrentName) return true;
      if (k === fileName) return true;
      return false;
    });

    let preservedMeta = {};
    if (existingKey) {
      const oldEntry = lockData.mods[existingKey];
      preservedMeta = {
        iconUrl: oldEntry.iconUrl,
        author: oldEntry.author,
        summary: oldEntry.summary
      };
      const oldFiles = [
        path.join(modsDir, oldEntry.fileName),
        path.join(modsDir, `${oldEntry.fileName}.disabled`)
      ];
      oldFiles.forEach((p) => {
        if (fs.existsSync(p)) {
          try {
            fs.unlinkSync(p);
            logger.info(`[Version Switch] Archivo previo eliminado: ${p}`);
          } catch (e) {
            logger.warn(`No se pudo eliminar archivo previo ${p}:`, e.message);
          }
        }
      });
      delete lockData.mods[existingKey];
    }

    // 3. Descargar la versión seleccionada
    let targetDownloadUrl = downloadUrl;
    if (!targetDownloadUrl && source === 'curseforge' && fileId && fileName) {
      targetDownloadUrl = this._buildCurseForgeEdgeUrl(fileId, fileName);
    }

    if (!targetDownloadUrl) {
      throw new Error(`No se encontró enlace de descarga para el archivo ${fileName}`);
    }

    const targetFilePath = path.join(modsDir, fileName);
    logger.info(`Descargando versión específica ${fileName} desde ${targetDownloadUrl}...`);

    await this._downloadStream(targetDownloadUrl, targetFilePath, (pct) => {
      if (onProgress) onProgress({ type: 'mod_version', fileName, percent: pct });
    });

    // 3.5. Si la instancia destino es Bedrock o el archivo es un Add-on:
    const isBedrockInst = customInstancePath && (
      fs.existsSync(path.join(customInstancePath, 'behavior_packs')) ||
      fs.existsSync(path.join(customInstancePath, 'resource_packs')) ||
      fileName.endsWith('.mcpack') ||
      fileName.endsWith('.mcaddon') ||
      fileName.endsWith('.mcworld')
    );

    if (isBedrockInst) {
      try {
        const { getBedrockManager } = require('../bedrock/BedrockManager');
        const importRes = await getBedrockManager().importAddonFile(targetFilePath, customInstancePath, true);
        logger.info(`[BedrockCatalog] Add-on importado exitosamente a instancia Bedrock: ${fileName} (${importRes.type})`);
      } catch (bErr) {
        logger.warn(`[BedrockCatalog] Aviso al importar Add-on a instancia: ${bErr.message}`);
      }
    }

    // 4. Registrar en mods-lock.json
    const cleanName = this._cleanJarName(fileName);
    const resolvedDisplay = displayName || cleanName;
    const record = {
      fileName,
      name: cleanName,
      displayName: resolvedDisplay,
      source: source || 'custom',
      projectId: String(projectId || ''),
      fileId: String(fileId || ''),
      downloadUrl: targetDownloadUrl,
      installedAt: new Date().toISOString(),
      version: versionNumber || '',
      versionNumber: versionNumber || '',
      enabled: true,
      dependencies: [],
      iconUrl: preservedMeta.iconUrl || null,
      author: preservedMeta.author || null,
      summary: preservedMeta.summary || null
    };

    lockData.mods[fileName] = record;
    lockData.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this._getLockFilePath(activeInstance), JSON.stringify(lockData, null, 2), 'utf8');

    return { success: true, record };
  }

  // =========================================================================
  // RESOLUCIÓN EN LOTE DE ICONOS Y METADATOS DE MODS
  // =========================================================================

  /**
   * Resuelve iconos, autores y resúmenes faltantes en mods-lock.json
   * utilizando hash SHA1 en lote de Modrinth y lotes de CurseForge
   */
  async resolveMissingModIcons(instancePath = null) {
    const activeInstance = instancePath || this.configManager.getInstanceDirectory();
    const modsDir = path.join(activeInstance, 'mods');
    if (!fs.existsSync(modsDir)) {
      return { success: true, updatedCount: 0 };
    }

    const lockData = this._readLockFile(activeInstance);
    const shubaFiles = this._applyShubaCoreIdentity(activeInstance, lockData);
    const modEntries = Object.entries(lockData.mods || {}).filter(([fileName]) => !shubaFiles.has(fileName));

    // Identificar mods que necesitan icono o autor (los de ShubaCore ya usan sus propios datos)
    const missing = modEntries.filter(([fileName, mod]) => {
      return !mod.iconUrl || !mod.author;
    });

    if (missing.length === 0) {
      return { success: true, updatedCount: 0 };
    }

    logger.info(`[ModIcons] Resolviendo metadatos e iconos para ${missing.length} mods instalados...`);
    let updatedCount = 0;

    const cacheFile = path.join(activeInstance, '.shubacore-mods-cache.json');
    let diskCache = {};
    if (fs.existsSync(cacheFile)) {
      try {
        diskCache = JSON.parse(fs.readFileSync(cacheFile, 'utf8')) || {};
      } catch (_) {
        diskCache = {};
      }
    }
    let cacheUpdated = false;

    // 1. Modrinth & Custom files con SHA1 hash lookup
    const sha1ToModFiles = new Map();
    let iconProcessed = 0;
    for (const [fileName, mod] of missing) {
      const diskPath = path.join(modsDir, fileName);
      const disabledPath = path.join(modsDir, `${fileName}.disabled`);
      const targetPath = fs.existsSync(diskPath) ? diskPath : (fs.existsSync(disabledPath) ? disabledPath : null);

      if (targetPath) {
        try {
          const stats = fs.statSync(targetPath);
          const cachedEntry = diskCache[fileName];
          let sha1 = (cachedEntry && cachedEntry.mtimeMs === stats.mtimeMs && cachedEntry.size === stats.size && cachedEntry.sha1)
            ? cachedEntry.sha1
            : null;
          if (!sha1) {
            const fileBuf = fs.readFileSync(targetPath);
            sha1 = crypto.createHash('sha1').update(fileBuf).digest('hex');
            if (!diskCache[fileName]) diskCache[fileName] = {};
            diskCache[fileName].mtimeMs = stats.mtimeMs;
            diskCache[fileName].size = stats.size;
            diskCache[fileName].sha1 = sha1;
            cacheUpdated = true;
          }
          sha1ToModFiles.set(sha1, fileName);
        } catch (e) {
          logger.debug(`No se pudo hashear ${fileName}: ${e.message}`);
        }
      }

      iconProcessed++;
      if (iconProcessed % 20 === 0) {
        await new Promise((r) => setImmediate(r));
      }
    }

    if (cacheUpdated) {
      try {
        fs.writeFileSync(cacheFile, JSON.stringify(diskCache), 'utf8');
      } catch (_) {}
    }

    // 2. Consulta en lote a Modrinth: POST /v2/version_files
    const hashesList = Array.from(sha1ToModFiles.keys());
    const modrinthProjectIds = new Set();
    const hashToProjectId = new Map();

    if (hashesList.length > 0) {
      try {
        const res = await fetch(`${MODRINTH_API_URL}/version_files`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': USER_AGENT
          },
          body: JSON.stringify({
            hashes: hashesList,
            algorithm: 'sha1'
          })
        });

        if (res.ok) {
          const matchedFiles = await res.json();
          for (const [sha1, verObj] of Object.entries(matchedFiles)) {
            if (verObj && verObj.project_id) {
              modrinthProjectIds.add(verObj.project_id);
              hashToProjectId.set(sha1, verObj.project_id);
            }
          }
        }
      } catch (err) {
        logger.warn(`[ModIcons] Error en consulta batch de Modrinth version_files: ${err.message}`);
      }
    }

    // Si además hay mods con source === 'modrinth' y projectId conocido
    for (const [fileName, mod] of missing) {
      if (mod.source === 'modrinth' && mod.projectId) {
        modrinthProjectIds.add(mod.projectId);
      }
    }

    // 3. Batch lookup de proyectos de Modrinth: GET /v2/projects?ids=[...]
    const modrinthProjectDetails = new Map();
    if (modrinthProjectIds.size > 0) {
      try {
        const idsArr = Array.from(modrinthProjectIds);
        const url = `${MODRINTH_API_URL}/projects?ids=${encodeURIComponent(JSON.stringify(idsArr))}`;
        const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
        if (res.ok) {
          const projects = await res.json();
          if (Array.isArray(projects)) {
            projects.forEach((proj) => {
              modrinthProjectDetails.set(proj.id, proj);
              if (proj.slug) modrinthProjectDetails.set(proj.slug, proj);
            });
          }
        }
      } catch (err) {
        logger.warn(`[ModIcons] Error al obtener detalles de proyectos Modrinth: ${err.message}`);
      }
    }

    // Aplicar datos de Modrinth encontrados
    for (const [sha1, projId] of hashToProjectId.entries()) {
      const fileName = sha1ToModFiles.get(sha1);
      const proj = modrinthProjectDetails.get(projId);
      if (fileName && proj && lockData.mods[fileName]) {
        const m = lockData.mods[fileName];
        let changed = false;
        if (proj.icon_url && !m.iconUrl) {
          m.iconUrl = proj.icon_url;
          changed = true;
        }
        if ((proj.organization || proj.author) && !m.author) {
          m.author = proj.organization || proj.author;
          changed = true;
        }
        if (proj.description && !m.summary) {
          m.summary = proj.description;
          changed = true;
        }
        if (proj.title && (!m.displayName || m.displayName === 'undefined' || m.source === 'custom')) {
          m.displayName = proj.title;
          changed = true;
        }
        if (m.source === 'custom') {
          m.source = 'modrinth';
          m.projectId = proj.id;
          changed = true;
        }
        if (changed) updatedCount++;
      }
    }

    for (const [fileName, mod] of missing) {
      if (mod.source === 'modrinth' && mod.projectId) {
        const proj = modrinthProjectDetails.get(mod.projectId);
        if (proj) {
          let changed = false;
          if (proj.icon_url && !mod.iconUrl) {
            mod.iconUrl = proj.icon_url;
            changed = true;
          }
          if (!mod.author) {
            mod.author = proj.organization || proj.author || 'Modrinth Creator';
            changed = true;
          }
          if (!mod.summary) {
            mod.summary = proj.description;
            changed = true;
          }
          if (proj.title && (!mod.displayName || mod.displayName === 'undefined')) {
            mod.displayName = proj.title;
            changed = true;
          }
          if (changed) updatedCount++;
        }
      }
    }

    // 4. CurseForge Batch: POST /v1/mods con { modIds: [number, ...] }
    const cfModIds = [];
    const cfIdToFileName = new Map();

    for (const [fileName, mod] of missing) {
      if (mod.source === 'curseforge' && mod.projectId) {
        const numId = parseInt(mod.projectId, 10);
        if (!isNaN(numId)) {
          cfModIds.push(numId);
          cfIdToFileName.set(numId, fileName);
        }
      }
    }

    if (cfModIds.length > 0) {
      try {
        const apiKey = this._getCurseForgeKey();
        const res = await fetch(`${CURSEFORGE_API_URL}/mods`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            Accept: 'application/json',
            'User-Agent': USER_AGENT
          },
          body: JSON.stringify({ modIds: cfModIds })
        });

        if (res.ok) {
          const data = await res.json();
          const list = data.data || [];
          for (const item of list) {
            const fileName = cfIdToFileName.get(item.id);
            if (fileName && lockData.mods[fileName]) {
              const m = lockData.mods[fileName];
              let changed = false;
              const icon = item.logo?.thumbnailUrl || item.logo?.url;
              if (icon && !m.iconUrl) {
                m.iconUrl = icon;
                changed = true;
              }
              const author = Array.isArray(item.authors) && item.authors.length > 0 ? item.authors[0].name : null;
              if (author && !m.author) {
                m.author = author;
                changed = true;
              }
              if (item.summary && !m.summary) {
                m.summary = item.summary;
                changed = true;
              }
              if (item.name && (!m.displayName || m.displayName === 'undefined')) {
                m.displayName = item.name;
                changed = true;
              }
              if (changed) updatedCount++;
            }
          }
        }
      } catch (cfErr) {
        logger.warn(`[ModIcons] Error en consulta batch de CurseForge: ${cfErr.message}`);
      }
    }

    // 5. Paso B (Avanzado): Búsqueda en la API de CurseForge por nombre para mods sin resolver
    const stillNeedOnline = missing.filter(([fn]) => {
      const m = lockData.mods[fn];
      return m && (!m.iconUrl || m.iconUrl === 'assets/logo.png');
    });

    if (stillNeedOnline.length > 0) {
      try {
        const apiKey = this._getCurseForgeKey();
        for (const [fileName] of stillNeedOnline.slice(0, 35)) {
          const m = lockData.mods[fileName];
          if (!m || (m.iconUrl && m.iconUrl !== 'assets/logo.png')) continue;
          const query = (m.displayName && m.displayName !== 'undefined') ? m.displayName : this._cleanJarName(fileName);
          if (!query || query.length < 3) continue;

          try {
            const cfUrl = `${CURSEFORGE_API_URL}/mods/search?gameId=${CF_GAME_ID}&classId=${CF_CLASS_ID_MODS}&searchFilter=${encodeURIComponent(query)}&pageSize=1`;
            const cfSearchRes = await fetch(cfUrl, {
              headers: {
                'x-api-key': apiKey,
                Accept: 'application/json',
                'User-Agent': USER_AGENT
              }
            });
            if (cfSearchRes.ok) {
              const cfData = await cfSearchRes.json();
              const match = cfData.data && cfData.data[0];
              if (match) {
                const icon = match.logo?.thumbnailUrl || match.logo?.url;
                if (icon) {
                  m.iconUrl = icon;
                  if (!m.author && match.authors && match.authors[0]) m.author = match.authors[0].name;
                  if (!m.summary && match.summary) m.summary = match.summary;
                  if (!m.displayName || m.displayName === 'undefined') m.displayName = match.name;
                  m.projectId = String(match.id);
                  m.source = 'curseforge';
                  updatedCount++;
                }
              }
            }
          } catch (_) {}
        }
      } catch (cfSearchErr) {
        logger.debug(`[ModIcons] Error en búsqueda de CurseForge: ${cfSearchErr.message}`);
      }
    }

    // 6. Paso C: Extracción Local desde el interior del archivo .jar (100% Infalible con AdmZip)
    for (const [fileName] of missing) {
      const m = lockData.mods[fileName];
      if (!m) continue;

      const needsIcon = !m.iconUrl || m.iconUrl === 'assets/logo.png';
      const needsMeta = !m.author || !m.displayName || m.displayName === 'undefined' || m.source === 'custom';

      if (needsIcon || needsMeta) {
        const diskPath = path.join(modsDir, fileName);
        const disabledPath = path.join(modsDir, `${fileName}.disabled`);
        const targetPath = fs.existsSync(diskPath) ? diskPath : (fs.existsSync(disabledPath) ? disabledPath : null);

        if (targetPath) {
          const localMeta = this._extractJarMetadata(targetPath);
          if (localMeta) {
            let changed = false;
            if (localMeta.iconBase64 && (!m.iconUrl || m.iconUrl === 'assets/logo.png')) {
              m.iconUrl = localMeta.iconBase64;
              changed = true;
            }
            if (localMeta.author && !m.author) {
              m.author = localMeta.author;
              changed = true;
            }
            if (localMeta.description && !m.summary) {
              m.summary = localMeta.description;
              changed = true;
            }
            if (localMeta.name && (!m.displayName || m.displayName === 'undefined' || m.displayName === this._cleanJarName(fileName))) {
              m.displayName = localMeta.name;
              m.name = localMeta.name;
              changed = true;
            }
            if (localMeta.version && (!m.versionNumber || m.versionNumber === 'custom')) {
              m.versionNumber = localMeta.version;
              m.version = localMeta.version;
              changed = true;
            }
            if (changed) updatedCount++;
          }
        }
      }

      // Garantizar que ningún mod quede con iconUrl vacío o nulo
      if (!m.iconUrl) {
        m.iconUrl = 'assets/logo.png';
        updatedCount++;
      }
    }

    // Guardar cambios en el lockfile
    if (updatedCount > 0) {
      lockData.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this._getLockFilePath(activeInstance), JSON.stringify(lockData, null, 2), 'utf8');
      logger.info(`[ModIcons] Se actualizaron metadatos e iconos para ${updatedCount} mods.`);
    }

    return {
      success: true,
      updatedCount,
      mods: lockData.mods
    };
  }

  // =========================================================================
  // DETECCIÓN Y ACTUALIZACIÓN DE MODS
  // =========================================================================

  async checkForModUpdates(instancePath = null, mcVersion = '1.21.1', loader = 'neoforge', channel = 'release') {
    const activeInstance = instancePath || this.configManager.getInstanceDirectory();
    const modsDir = path.join(activeInstance, 'mods');
    if (!fs.existsSync(modsDir)) {
      return { updates: [], count: 0 };
    }

    const candidateChannel = (channel || 'release').toLowerCase();
    const isChannelMatch = (relType) => {
      if (!relType) return true;
      if (typeof relType === 'number') {
        if (candidateChannel === 'release') return relType === 1;
        if (candidateChannel === 'beta') return relType <= 2;
        return true;
      }
      const str = String(relType).toLowerCase();
      if (candidateChannel === 'release') return str === 'release';
      if (candidateChannel === 'beta') return str === 'release' || str === 'beta';
      return true;
    };

    // 1. Sincronizar mods físicos en disco con mods-lock.json
    this.scanAndSyncMods(activeInstance);
    const lockData = this._readLockFile(activeInstance);

    // Normalizar campos en lockData.mods (evitar inconsistencias de mayúsculas o propiedades alternativas como projectID / fileID / modId)
    for (const [key, m] of Object.entries(lockData.mods || {})) {
      if (m.source) m.source = String(m.source).toLowerCase();
      const pid = m.projectId || m.projectID || m.modId;
      if (pid) m.projectId = String(pid);
      const fid = m.fileId || m.fileID;
      if (fid) m.fileId = String(fid);
    }
    // Los mods propios de ShubaCore no se comparan con Modrinth/CurseForge (si no, se "actualizan" al original de Polyfrost)
    const shubaFiles = this._applyShubaCoreIdentity(activeInstance, lockData);
    const modsList = Object.entries(lockData.mods || {})
      .filter(([fileName]) => !shubaFiles.has(fileName))
      .map(([, m]) => m);

    logger.info(`[CheckUpdates] Buscando actualizaciones (canal: ${candidateChannel}) para ${modsList.length} mods en MC ${mcVersion} (${loader})...`);

    // 2. Calcular SHA1 y CurseForge Fingerprint (MurmurHash2 32-bit normalizado) de cada archivo .jar físico en disco
    const sha1ToMod = new Map();
    const fpToMod = new Map();
    const cfFingerprints = [];
    const modrinthSha1s = [];

    const cacheFile = path.join(activeInstance, '.shubacore-mods-cache.json');
    let diskCache = {};
    if (fs.existsSync(cacheFile)) {
      try {
        diskCache = JSON.parse(fs.readFileSync(cacheFile, 'utf8')) || {};
      } catch (_) {
        diskCache = {};
      }
    }
    let cacheUpdated = false;

    let processedModCount = 0;
    for (const mod of modsList) {
      const isAwakening = /awakening\s*system/i.test(mod.name || '') ||
                          /awakening\s*system/i.test(mod.displayName || '') ||
                          /awakening\s*system/i.test(mod.fileName || '') ||
                          /awakening\s*system/i.test(mod.author || '');
      if (isAwakening) continue;

      const candidates = [
        path.join(modsDir, mod.fileName),
        path.join(modsDir, `${mod.fileName}.disabled`),
        path.join(modsDir, mod.fileName.replace(/\.disabled$/i, ''))
      ];
      let foundPath = null;
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          foundPath = p;
          break;
        }
      }

      if (foundPath) {
        try {
          const stats = fs.statSync(foundPath);
          const cached = diskCache[mod.fileName];
          let sha1 = null;
          let fp = null;

          if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size && cached.sha1 && cached.cfFingerprint) {
            sha1 = cached.sha1;
            fp = cached.cfFingerprint;
          } else {
            const buf = fs.readFileSync(foundPath);
            sha1 = crypto.createHash('sha1').update(buf).digest('hex');
            fp = this.computeCurseForgeFingerprint(buf);
            if (!diskCache[mod.fileName]) diskCache[mod.fileName] = {};
            diskCache[mod.fileName].mtimeMs = stats.mtimeMs;
            diskCache[mod.fileName].size = stats.size;
            diskCache[mod.fileName].sha1 = sha1;
            diskCache[mod.fileName].cfFingerprint = fp;
            cacheUpdated = true;
          }

          mod._sha1 = sha1;
          mod._cfFingerprint = fp;
          if (sha1) {
            sha1ToMod.set(sha1, mod);
            modrinthSha1s.push(sha1);
          }
          if (fp) {
            fpToMod.set(fp, mod);
            cfFingerprints.push(fp);
          }
        } catch (e) {
          logger.debug(`[CheckUpdates] No se pudo procesar archivo ${mod.fileName}: ${e.message}`);
        }
      }

      processedModCount++;
      if (processedModCount % 20 === 0) {
        await new Promise((r) => setImmediate(r));
      }
    }

    if (cacheUpdated) {
      try {
        fs.writeFileSync(cacheFile, JSON.stringify(diskCache), 'utf8');
      } catch (_) {}
    }

    let lockModified = false;
    const apiKey = this._getCurseForgeKey();

    // 3. PASO 1: Identificación masiva en CurseForge mediante Fingerprints (MurmurHash2)
    if (cfFingerprints.length > 0 && apiKey) {
      logger.info(`[CheckUpdates:CF] Enviando ${cfFingerprints.length} fingerprints de CurseForge a POST /v1/fingerprints/${CF_GAME_ID}...`);
      for (let i = 0; i < cfFingerprints.length; i += 200) {
        const chunk = cfFingerprints.slice(i, i + 200);
        try {
          const fpRes = await fetch(`${CURSEFORGE_API_URL}/fingerprints/${CF_GAME_ID}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              Accept: 'application/json',
              'User-Agent': USER_AGENT
            },
            body: JSON.stringify({ fingerprints: chunk })
          });

          if (fpRes.ok) {
            const fpData = await fpRes.json();
            const matches = fpData.data?.exactMatches || [];
            logger.info(`[CheckUpdates:CF] ${matches.length} coincidencias exactas recibidas de CurseForge.`);

            for (const match of matches) {
              if (!match || !match.file) continue;
              const matchedMod = fpToMod.get(match.file.fileFingerprint);
              if (matchedMod && lockData.mods[matchedMod.fileName]) {
                const entry = lockData.mods[matchedMod.fileName];
                entry.source = 'curseforge';
                entry.projectId = String(match.id);
                entry.fileId = String(match.file.id);
                entry.installedFileDate = match.file.fileDate;
                entry.cfFingerprint = match.file.fileFingerprint;
                if (match.file.displayName && (!entry.displayName || entry.displayName === 'undefined' || entry.displayName === this._cleanJarName(matchedMod.fileName))) {
                  entry.displayName = match.file.displayName;
                }
                matchedMod.source = 'curseforge';
                matchedMod.projectId = String(match.id);
                matchedMod.fileId = String(match.file.id);
                matchedMod.installedFileDate = match.file.fileDate;
                matchedMod.cfFingerprint = match.file.fileFingerprint;
                lockModified = true;
              }
            }
          }
        } catch (err) {
          logger.warn(`[CheckUpdates:CF] Error en consulta batch de fingerprints CF: ${err.message}`);
        }
      }
    }

    // 4. PASO 2: Identificación masiva en Modrinth para mods no resueltos por CurseForge
    const stillUnidentified = modsList.filter((m) => {
      const isAwakening = /awakening\s*system/i.test(m.name || '') ||
                          /awakening\s*system/i.test(m.displayName || '') ||
                          /awakening\s*system/i.test(m.fileName || '') ||
                          /awakening\s*system/i.test(m.author || '');
      if (isAwakening) return false;
      return (!m.projectId || m.source === 'custom' || !m.source || m.source === 'undefined') && m._sha1;
    });

    if (stillUnidentified.length > 0) {
      const hashesToQuery = stillUnidentified.map((m) => m._sha1).filter(Boolean);
      try {
        const verFilesRes = await fetch(`${MODRINTH_API_URL}/version_files`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': USER_AGENT
          },
          body: JSON.stringify({
            hashes: hashesToQuery,
            algorithm: 'sha1'
          })
        });

        if (verFilesRes.ok) {
          const verFilesData = await verFilesRes.json();
          for (const [sha1, verObj] of Object.entries(verFilesData)) {
            if (!verObj) continue;
            const targetMod = stillUnidentified.find((m) => m._sha1 === sha1);
            if (targetMod && lockData.mods[targetMod.fileName]) {
              const entry = lockData.mods[targetMod.fileName];
              entry.source = 'modrinth';
              entry.projectId = verObj.project_id;
              entry.fileId = verObj.id;
              if (verObj.version_number && (!entry.version || entry.version === 'custom')) {
                entry.version = verObj.version_number;
                entry.versionNumber = verObj.version_number;
              }
              targetMod.source = 'modrinth';
              targetMod.projectId = verObj.project_id;
              targetMod.fileId = verObj.id;
              lockModified = true;
            }
          }
        }
      } catch (e) {
        logger.debug(`[CheckUpdates] Error en Modrinth /version_files: ${e.message}`);
      }
    }

    // 4B. Para cualquier mod que siga como 'custom', buscar por nombre/modId
    const stillCustom = modsList.filter((m) => {
      const isAwakening = /awakening\s*system/i.test(m.name || '') ||
                          /awakening\s*system/i.test(m.displayName || '') ||
                          /awakening\s*system/i.test(m.fileName || '');
      if (isAwakening) return false;
      return !m.projectId || m.source === 'custom' || !m.source;
    });

    for (const m of stillCustom.slice(0, 30)) {
      const cleanQuery = (m.displayName && m.displayName !== 'undefined') ? m.displayName : this._cleanJarName(m.fileName);
      const searchTerms = [m.projectId, cleanQuery].filter((t) => t && typeof t === 'string' && t.length >= 2);

      let resolved = false;
      for (const term of searchTerms) {
        if (resolved) break;
        try {
          const searchUrl = `${MODRINTH_API_URL}/search?query=${encodeURIComponent(term)}&facets=[["project_type:mod"]]&limit=3`;
          const sRes = await fetch(searchUrl, { headers: { 'User-Agent': USER_AGENT } });
          if (sRes.ok) {
            const sData = await sRes.json();
            const hit = (sData.hits || []).find((h) => {
              const tLow = term.toLowerCase();
              return h.slug.toLowerCase() === tLow ||
                     h.title.toLowerCase() === tLow ||
                     h.project_id === term;
            }) || (sData.hits || [])[0];

            if (hit) {
              const entry = lockData.mods[m.fileName];
              if (entry) {
                entry.source = 'modrinth';
                entry.projectId = hit.project_id || hit.slug;
                if (!entry.displayName || entry.displayName === 'undefined' || entry.displayName === this._cleanJarName(m.fileName)) {
                  entry.displayName = hit.title;
                }
                m.source = 'modrinth';
                m.projectId = hit.project_id || hit.slug;
                lockModified = true;
                resolved = true;
              }
            }
          }
        } catch (_) {}
      }

      if (!resolved && apiKey) {
        for (const term of searchTerms) {
          if (resolved) break;
          try {
            const cfSearchUrl = `${CURSEFORGE_API_URL}/mods/search?gameId=${CF_GAME_ID}&classId=${CF_CLASS_ID_MODS}&searchFilter=${encodeURIComponent(term)}&sortField=2&sortOrder=desc&pageSize=3`;
            const cfRes = await fetch(cfSearchUrl, {
              headers: { 'x-api-key': apiKey, Accept: 'application/json', 'User-Agent': USER_AGENT }
            });
            if (cfRes.ok) {
              const cfData = await cfRes.json();
              const cfHit = (cfData.data || [])[0];
              if (cfHit) {
                const entry = lockData.mods[m.fileName];
                if (entry) {
                  entry.source = 'curseforge';
                  entry.projectId = String(cfHit.id);
                  if (!entry.displayName || entry.displayName === 'undefined' || entry.displayName === this._cleanJarName(m.fileName)) {
                    entry.displayName = cfHit.name;
                  }
                  m.source = 'curseforge';
                  m.projectId = String(cfHit.id);
                  lockModified = true;
                  resolved = true;
                }
              }
            }
          } catch (_) {}
        }
      }
    }

    if (lockModified) {
      lockData.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this._getLockFilePath(activeInstance), JSON.stringify(lockData, null, 2), 'utf8');
    }

    const updatesMap = new Map();
    const normalizedLoader = (loader || 'neoforge').toLowerCase();
    const cfLoaderId = CF_LOADER_TYPES[normalizedLoader] !== undefined
      ? CF_LOADER_TYPES[normalizedLoader]
      : CF_LOADER_TYPES.any;

    // 5. PASO 3: Detección de actualizaciones en CurseForge (usando batch masivo POST /v1/mods y latestFilesIndexes)
    const cfModsToCheck = modsList.filter((m) => {
      const src = (m.source || '').toLowerCase();
      const pid = String(m.projectId || m.projectID || m.modId || '');
      return (src === 'curseforge' || /^\d+$/.test(pid)) && /^\d+$/.test(pid);
    });

    for (const m of cfModsToCheck) {
      m.source = 'curseforge';
      m.projectId = String(m.projectId || m.projectID || m.modId);
      m.fileId = String(m.fileId || m.fileID || '0');
    }

    const cfModIds = Array.from(new Set(cfModsToCheck.map((m) => parseInt(m.projectId, 10)).filter((n) => !isNaN(n))));

    if (cfModIds.length > 0 && apiKey) {
      logger.info(`[CheckUpdates:CF] Comprobando actualizaciones para ${cfModIds.length} mods de CurseForge (MC ${mcVersion}, Loader ${cfLoaderId})...`);

      const pendingCfUpdates = [];
      const cfUpdateFileIds = [];

      // Procesar en lotes masivos de hasta 350 IDs (para 300+ mods se ejecuta en una sola petición HTTP sin saturar rate-limit)
      for (let i = 0; i < cfModIds.length; i += 350) {
        const chunkIds = cfModIds.slice(i, i + 350);
        try {
          const cfModsRes = await fetch(`${CURSEFORGE_API_URL}/mods`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              Accept: 'application/json',
              'User-Agent': USER_AGENT
            },
            body: JSON.stringify({ modIds: chunkIds, filterPcOnly: true })
          });

          if (cfModsRes.ok) {
            const cfModsData = await cfModsRes.json();
            const modsInfoList = cfModsData.data || [];

            for (const cfMod of modsInfoList) {
              if (!cfMod || !cfMod.id) continue;
              const matchingInstalledMods = cfModsToCheck.filter((m) => String(m.projectId) === String(cfMod.id));
              if (matchingInstalledMods.length === 0) continue;

              const indexes = cfMod.latestFilesIndexes || [];

              // Evaluar coincidencia de versión de Minecraft
              const isGameVerMatch = (gv) => {
                if (!gv || typeof gv !== 'string') return false;
                const gvTrim = gv.trim().toLowerCase();
                const mcTrim = mcVersion.trim().toLowerCase();
                if (gvTrim === mcTrim) return true;
                if (gvTrim.startsWith(mcTrim) || mcTrim.startsWith(gvTrim)) return true;
                const mcParts = mcTrim.split('.');
                const gvParts = gvTrim.split('.');
                if (mcParts.length >= 2 && gvParts.length >= 2 && mcParts[0] === gvParts[0] && mcParts[1] === gvParts[1]) {
                  return true;
                }
                return false;
              };

              const mcMatches = indexes.filter((f) => isGameVerMatch(f.gameVersion) && isChannelMatch(f.releaseType));

              // Buscar candidatos según modLoader con orden de prioridad
              let candidates = [];
              if (cfLoaderId === 6) {
                // NeoForge: preferir NeoForge (6), fallback Universal (0), fallback Forge (1)
                candidates = mcMatches.filter((f) => f.modLoader === 6);
                if (candidates.length === 0) candidates = mcMatches.filter((f) => !f.modLoader || f.modLoader === 0);
                if (candidates.length === 0) candidates = mcMatches.filter((f) => f.modLoader === 1);
              } else if (cfLoaderId === 1) {
                // Forge: preferir Forge (1), fallback Universal (0)
                candidates = mcMatches.filter((f) => f.modLoader === 1);
                if (candidates.length === 0) candidates = mcMatches.filter((f) => !f.modLoader || f.modLoader === 0);
              } else if (cfLoaderId === 4) {
                // Fabric: preferir Fabric (4), fallback Universal (0), fallback Quilt (5)
                candidates = mcMatches.filter((f) => f.modLoader === 4);
                if (candidates.length === 0) candidates = mcMatches.filter((f) => !f.modLoader || f.modLoader === 0);
                if (candidates.length === 0) candidates = mcMatches.filter((f) => f.modLoader === 5);
              } else if (cfLoaderId === 5) {
                // Quilt: preferir Quilt (5), fallback Universal (0), fallback Fabric (4)
                candidates = mcMatches.filter((f) => f.modLoader === 5);
                if (candidates.length === 0) candidates = mcMatches.filter((f) => !f.modLoader || f.modLoader === 0);
                if (candidates.length === 0) candidates = mcMatches.filter((f) => f.modLoader === 4);
              } else {
                candidates = mcMatches.filter((f) => f.modLoader === cfLoaderId || !f.modLoader || f.modLoader === 0);
              }

              // Si latestFilesIndexes no trajo candidatos pero cfMod.latestFiles existe en memoria, usarlo
              if (candidates.length === 0 && Array.isArray(cfMod.latestFiles) && cfMod.latestFiles.length > 0) {
                const lfMatches = cfMod.latestFiles.filter((lf) => {
                  if (!lf || !lf.fileName) return false;
                  if (!isChannelMatch(lf.releaseType)) return false;
                  const gvs = lf.gameVersions || [];
                  const hasMc = gvs.some((gv) => isGameVerMatch(gv));
                  if (!hasMc) return false;
                  if (cfLoaderId === 6) {
                    return gvs.some((v) => /neoforge/i.test(v)) || gvs.some((v) => !/fabric|quilt/i.test(v));
                  } else if (cfLoaderId === 1) {
                    return gvs.some((v) => /forge/i.test(v) && !/neoforge/i.test(v)) || gvs.some((v) => !/fabric|quilt|neoforge/i.test(v));
                  } else if (cfLoaderId === 4) {
                    return gvs.some((v) => /fabric/i.test(v)) || gvs.some((v) => /quilt/i.test(v));
                  } else if (cfLoaderId === 5) {
                    return gvs.some((v) => /quilt/i.test(v)) || gvs.some((v) => /fabric/i.test(v));
                  }
                  return true;
                });
                if (lfMatches.length > 0) {
                  candidates = lfMatches.map((lf) => ({
                    fileId: lf.id,
                    filename: lf.fileName,
                    gameVersion: mcVersion,
                    modLoader: cfLoaderId
                  }));
                }
              }

              if (candidates.length === 0) continue;

              // Ordenar: versión exacta de MC primero y luego fileId más reciente
              candidates.sort((a, b) => {
                const aExact = (a.gameVersion === mcVersion) ? 1 : 0;
                const bExact = (b.gameVersion === mcVersion) ? 1 : 0;
                if (aExact !== bExact) return bExact - aExact;
                return (b.fileId || 0) - (a.fileId || 0);
              });

              const candidate = candidates[0];
              if (!candidate || !candidate.fileId) continue;

              for (const installedMod of matchingInstalledMods) {
                const installedFileId = parseInt(installedMod.fileId || '0', 10);
                const installedFileName = (installedMod.fileName || '').replace(/\.disabled$/i, '');
                const isNewerId = candidate.fileId > installedFileId;
                const isDifferentName = candidate.filename && candidate.filename !== installedFileName;

                if (isNewerId || (installedFileId === 0 && isDifferentName)) {
                  pendingCfUpdates.push({
                    installedMod,
                    cfMod,
                    candidateFileId: candidate.fileId,
                    candidateFileName: candidate.filename
                  });
                  cfUpdateFileIds.push(candidate.fileId);
                }
              }
            }
          } else {
            logger.warn(`[CheckUpdates:CF] Error HTTP ${cfModsRes.status} al consultar /v1/mods en batch`);
          }
        } catch (err) {
          logger.warn(`[CheckUpdates:CF] Excepción consultando /v1/mods en batch: ${err.message}`);
        }
      }

      // Obtener detalles completos y downloadUrls para todos los archivos con actualización mediante POST /v1/mods/files masivo
      if (cfUpdateFileIds.length > 0) {
        const uniqueFileIds = Array.from(new Set(cfUpdateFileIds));
        logger.info(`[CheckUpdates:CF] Obteniendo detalles y URLs de descarga para ${uniqueFileIds.length} archivos mediante POST /v1/mods/files batch...`);

        const cfFilesDetailsMap = new Map();
        for (let j = 0; j < uniqueFileIds.length; j += 200) {
          const chunkFileIds = uniqueFileIds.slice(j, j + 200);
          try {
            const filesBatchRes = await fetch(`${CURSEFORGE_API_URL}/mods/files`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                Accept: 'application/json',
                'User-Agent': USER_AGENT
              },
              body: JSON.stringify({ fileIds: chunkFileIds })
            });

            if (filesBatchRes.ok) {
              const filesBatchJson = await filesBatchRes.json();
              const filesList = filesBatchJson.data || [];
              for (const f of filesList) {
                if (f && f.id) {
                  cfFilesDetailsMap.set(f.id, f);
                }
              }
            } else {
              logger.warn(`[CheckUpdates:CF] Error HTTP ${filesBatchRes.status} en /mods/files batch`);
            }
          } catch (batchErr) {
            logger.warn(`[CheckUpdates:CF] Error en consulta batch de /mods/files: ${batchErr.message}`);
          }
        }

        // Poblar updatesMap con cada mod que requiere actualización
        for (const item of pendingCfUpdates) {
          const { installedMod, cfMod, candidateFileId, candidateFileName } = item;
          const fileDetail = cfFilesDetailsMap.get(candidateFileId);
          if (fileDetail && !isChannelMatch(fileDetail.releaseType)) {
            continue;
          }
          const finalFileName = fileDetail?.fileName || candidateFileName;
          const downloadUrl = (fileDetail && fileDetail.downloadUrl)
            ? fileDetail.downloadUrl
            : this._buildCurseForgeEdgeUrl(candidateFileId, finalFileName);
          const curVer = installedMod.version || this._extractVersionFromFileName(installedMod.fileName);
          const newVer = (fileDetail && fileDetail.displayName)
            ? this._extractVersionFromFileName(fileDetail.displayName)
            : this._extractVersionFromFileName(finalFileName);

          updatesMap.set(installedMod.fileName, {
            currentFileName: installedMod.fileName,
            currentFileId: String(installedMod.fileId || 0),
            currentVersion: curVer,
            name: installedMod.displayName || cfMod.name || this._cleanJarName(installedMod.fileName),
            projectId: String(cfMod.id),
            source: 'curseforge',
            latestFile: {
              fileId: String(candidateFileId),
              fileName: finalFileName,
              displayName: fileDetail?.displayName || finalFileName,
              versionNumber: newVer,
              downloadUrl
            }
          });
          logger.info(`[Update Available CF] "${installedMod.name || installedMod.displayName}": v${curVer} (${installedMod.fileName}) -> v${newVer} (${finalFileName})`);
        }
      }
    }

    // 6. PASO 4: Detección de actualizaciones en Modrinth (en paralelo por SHA-1)
    if (modrinthSha1s.length > 0) {
      try {
        const updateBatchRes = await fetch(`${MODRINTH_API_URL}/version_files/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': USER_AGENT
          },
          body: JSON.stringify({
            hashes: modrinthSha1s,
            algorithm: 'sha1',
            loaders: [normalizedLoader],
            game_versions: [mcVersion]
          })
        });

        if (updateBatchRes.ok) {
          const updateBatchData = await updateBatchRes.json();
          for (const [sha1, newVer] of Object.entries(updateBatchData)) {
            if (!newVer || !newVer.files || newVer.files.length === 0) continue;
            const targetMod = sha1ToMod.get(sha1);
            if (!targetMod) continue;

            const vType = (newVer.version_type || 'release').toLowerCase();
            if (candidateChannel === 'release' && vType !== 'release') continue;
            if (candidateChannel === 'beta' && vType !== 'release' && vType !== 'beta') continue;

            const primaryFile = newVer.files.find((f) => f.primary) || newVer.files[0];
            if (!primaryFile || !primaryFile.url) continue;

            const isShaDiff = primaryFile.hashes?.sha1 && primaryFile.hashes.sha1 !== sha1;
            const isNameDiff = primaryFile.filename && primaryFile.filename !== targetMod.fileName;

            if (isShaDiff || isNameDiff) {
              if (!updatesMap.has(targetMod.fileName)) {
                const curVer = targetMod.version || this._extractVersionFromFileName(targetMod.fileName);
                const newVerNum = newVer.version_number || this._extractVersionFromFileName(primaryFile.filename);

                updatesMap.set(targetMod.fileName, {
                  currentFileName: targetMod.fileName,
                  currentFileId: targetMod.fileId || '',
                  currentVersion: curVer,
                  name: targetMod.displayName || targetMod.name || this._cleanJarName(targetMod.fileName),
                  projectId: newVer.project_id || targetMod.projectId,
                  source: 'modrinth',
                  latestFile: {
                    fileId: String(newVer.id),
                    fileName: primaryFile.filename,
                    displayName: newVer.name || primaryFile.filename,
                    versionNumber: newVerNum,
                    downloadUrl: primaryFile.url
                  }
                });
                logger.info(`[Update Available Modrinth] "${targetMod.name}": v${curVer} -> v${newVerNum} (${primaryFile.filename})`);
              }
            }
          }
        }
      } catch (err) {
        logger.warn(`[CheckUpdates:Modrinth] Error en /version_files/update: ${err.message}`);
      }
    }

    // 7. PASO 5: Comprobación individual de mods Modrinth con projectId no capturados por SHA-1 (por lotes con Promise.allSettled)
    const modrinthModsToCheck = modsList.filter((m) => m.source === 'modrinth' && m.projectId && !updatesMap.has(m.fileName));
    const batchSize = 10;
    for (let i = 0; i < modrinthModsToCheck.length; i += batchSize) {
      const batch = modrinthModsToCheck.slice(i, i + batchSize);
      await Promise.allSettled(batch.map(async (m) => {
        try {
          const latest = await this._resolveModrinthFile(m.projectId, mcVersion, normalizedLoader, candidateChannel);
          if (latest && latest.downloadUrl) {
            const isDifferentFile = (latest.fileId && m.fileId && String(latest.fileId) !== String(m.fileId)) ||
                                    (latest.fileName && latest.fileName !== m.fileName);
            const isDifferentVer = latest.versionNumber && m.version && m.version !== 'custom' && latest.versionNumber !== m.version;

            if (isDifferentFile || isDifferentVer) {
              const curVer = m.version || this._extractVersionFromFileName(m.fileName);
              updatesMap.set(m.fileName, {
                currentFileName: m.fileName,
                currentFileId: m.fileId || '',
                currentVersion: curVer,
                name: m.displayName || m.name || this._cleanJarName(m.fileName),
                projectId: m.projectId,
                source: 'modrinth',
                latestFile: {
                  fileId: String(latest.fileId),
                  fileName: latest.fileName,
                  displayName: latest.displayName,
                  versionNumber: latest.versionNumber || this._extractVersionFromFileName(latest.fileName),
                  downloadUrl: latest.downloadUrl
                }
              });
              logger.info(`[Update Available Modrinth Version] "${m.name}": v${curVer} -> v${latest.versionNumber}`);
            }
          }
        } catch (_) {}
      }));
    }

    const updates = Array.from(updatesMap.values());
    logger.info(`[CheckUpdates] Finalizado. ${updates.length} actualizaciones disponibles.`);
    return { updates, count: updates.length };
  }

  async updateAllMods({ updates = [], instancePath = null, mcVersion = '1.21.1', loader = 'neoforge', channel = 'release', onProgress = null }) {
    const activeInstance = instancePath || this.configManager.getInstanceDirectory();
    if (!updates || updates.length === 0) {
      const scanRes = await this.checkForModUpdates(activeInstance, mcVersion, loader, channel);
      updates = scanRes.updates || [];
    }
    const results = [];
    let updatedCount = 0;

    logger.info(`[UpdateAll] Actualizando ${updates.length} mods en "${activeInstance}"...`);

    for (let i = 0; i < updates.length; i++) {
      const u = updates[i];
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: updates.length,
          name: u.name,
          percent: Math.round(((i + 1) / updates.length) * 100)
        });
      }

      try {
        const res = await this.installModVersion({
          projectId: u.projectId,
          source: u.source,
          fileId: u.latestFile.fileId,
          downloadUrl: u.latestFile.downloadUrl,
          fileName: u.latestFile.fileName,
          displayName: u.latestFile.displayName,
          versionNumber: u.latestFile.versionNumber,
          instancePath: activeInstance,
          mcVersion,
          loader,
          oldFileName: u.currentFileName
        });
        if (res.success) updatedCount++;
        results.push({ name: u.name, success: true });
      } catch (e) {
        logger.error(`Error al actualizar mod ${u.name}:`, e.message);
        results.push({ name: u.name, success: false, error: e.message });
      }
    }

    const allMods = this.scanAndSyncMods(activeInstance);
    return { success: true, updatedCount, results, allMods };
  }

  // =========================================================================
  // 3. OPTIMIZACIÓN INSTANTÁNEA & MODPACKS PÚBLICOS
  // =========================================================================

  async installPerformancePack({ mcVersion = '1.21.1', loader = 'neoforge', instancePath = null, includeShaders = false, onProgress = null } = {}) {
    logger.info(`⚡ [SHUBATECH] Instalando Pack de Optimización Instantánea para MC ${mcVersion} (${loader.toUpperCase()}) (Shaders: ${includeShaders ? 'SÍ' : 'NO'})...`);

    const activeInstance = instancePath || this.configManager.getInstanceDirectory();
    const normalizedLoader = (loader || 'neoforge').toLowerCase();

    // En 1.21.1 NeoForge y Fabric se usa Sodium directamente; en 1.20.1 Forge se usa Embeddium
    const mainRendererSlug = (normalizedLoader === 'fabric' || (mcVersion.startsWith('1.21') && normalizedLoader === 'neoforge')) ? 'sodium' : 'embeddium';

    // ModernFix excluido de 26.3 (incompatible con official runtime namespace en Fabric 0.20+)
    const isMc26_3 = mcVersion === '26.3' || String(mcVersion).startsWith('26.');
    const performanceSlugs = [
      mainRendererSlug,
      ...(normalizedLoader === 'fabric' ? ['fabric-api', 'lithium', ...(includeShaders ? ['iris'] : [])] : []),
      ...(normalizedLoader === 'forge' || normalizedLoader === 'neoforge' ? (includeShaders ? ['oculus'] : []) : []),
      'ferrite-core',
      ...(!isMc26_3 ? ['modernfix'] : []),
      'immediatelyfast',
      'entityculling',
      'clumps'
    ];

    const modsDir = path.join(activeInstance, 'mods');
    const existingJarNames = fs.existsSync(modsDir) ? fs.readdirSync(modsDir).map((f) => f.toLowerCase()) : [];

    // Purgar ModernFix si se ejecuta en 26.3
    if (isMc26_3 && fs.existsSync(modsDir)) {
      try {
        const mFiles = fs.readdirSync(modsDir);
        for (const f of mFiles) {
          if (/modernfix/i.test(f)) {
            try {
              fs.unlinkSync(path.join(modsDir, f));
              logger.info(`[ModManager] Purgado mod incompatible ${f} de instancia 26.3.`);
            } catch (_) {}
          }
        }
      } catch (_) {}
    }

    const installed = [];
    const errors = [];
    let currentStep = 0;

    for (const slug of performanceSlugs) {
      currentStep++;
      if (onProgress) {
        onProgress({
          step: currentStep,
          total: performanceSlugs.length,
          slug,
          message: `Instalando optimizador [${currentStep}/${performanceSlugs.length}]: ${slug}...`
        });
      }

      // Si el optimizador ya existe físicamente en /mods, evitar descarga duplicada
      const slugKey = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
      const alreadyInstalled = existingJarNames.some((f) => f.replace(/[^a-z0-9]/g, '').includes(slugKey));
      if (alreadyInstalled) {
        logger.info(`[ModManager] Optimizador "${slug}" ya presente en instancia. Omitiendo descarga duplicada.`);
        continue;
      }

      try {
        const record = await this.downloadMod({
          projectId: slug,
          source: 'modrinth',
          mcVersion,
          loader: normalizedLoader,
          instancePath: activeInstance
        });

        if (record) {
          installed.push(record);
        }
      } catch (err) {
        logger.warn(`No se pudo instalar automáticamente ${slug}: ${err.message}`);
        errors.push({ slug, error: err.message });
      }
    }

    const allMods = this.scanAndSyncMods(activeInstance);
    logger.info(`⚡ Pack de Optimización completado. ${installed.length} optimizadores instalados.`);

    return {
      success: installed.length > 0,
      installedCount: installed.length,
      installed,
      errors,
      allMods
    };
  }

  /**
   * Obtiene la ficha de metadatos del Modpack Oficial ShubaClient para el catálogo
   */
  getOfficialShubaClientModpackInfo() {
    const iconUrl = this._getBlueLogoBase64();

    return {
      id: 'shubaclient',
      projectId: 'shubaclient',
      slug: 'shubaclient',
      source: 'custom',
      contentType: 'modpacks',
      title: 'ShubaClient Oficial 26.3 (FPS Boost & Vulkan)',
      name: 'ShubaClient Oficial 26.3',
      author: 'SHUBATECH',
      summary: 'Cliente oficial ShubaClient: máxima optimización y tasa de FPS en Minecraft 26.3 con Fabric, Vulkan/Sodium, Iris Shaders y menú 3D.',
      description: 'El modpack oficial de ShubaCore pre-configurado para exprimir el máximo rendimiento en Minecraft 26.3. Incluye el motor gráfico Vulkan (Sodium/ShubaDium), compatibilidad nativa con shaders (Iris), reducción masiva de RAM (FerriteCore/ModernFix), física optimizada (Lithium) y la interfaz de usuario moderna ShubaClient UI en español.',
      iconUrl,
      downloads: 999999,
      websiteUrl: 'https://github.com/Landa6543/ShubaCore-Mods',
      dateModified: new Date().toISOString(),
      categories: ['optimization', 'shaders', 'interface'],
      gameVersions: ['26.3'],
      loaders: ['fabric'],
      clientSide: 'required',
      serverSide: 'unsupported',
      environment: 'client',
      isOfficial: true,
      latestVersion: '2.0.9'
    };
  }

  /**
   * Obtiene la ficha de detalles completa para el modal del Modpack Oficial ShubaClient
   */
  getOfficialShubaClientModpackDetails() {
    const logoB64 = this._getBlueLogoBase64();

    const descriptionHtml = `
      <div style="display: flex; flex-direction: column; gap: 16px; padding: 4px 0;">
        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 10px; padding: 18px; display: flex; align-items: center; gap: 18px;">
          <img src="${logoB64}" style="width: 64px; height: 64px; object-fit: contain; filter: drop-shadow(0 4px 14px rgba(16,185,129,0.45));" alt="Logo ShubaCore">
          <div>
            <h3 style="margin: 0 0 6px 0; color: #10b981; font-size: 17px; font-weight: 700;">ShubaClient Oficial 26.3 (Vulkan & FPS Boost)</h3>
            <p style="margin: 0; color: #d1d5db; font-size: 13px; line-height: 1.45;">Desarrollado y optimizado por <strong>SHUBATECH</strong>. Incluye optimización de vanguardia para exprimir más de 2000 FPS con Vulkan y compatibilidad completa con shaders Iris en Minecraft 26.3 Fabric.</p>
          </div>
        </div>

        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border); border-radius: 8px; padding: 16px;">
          <h4 style="margin: 0 0 12px 0; color: var(--text-primary); font-size: 14px; font-weight: 600;">⚡ Características de Rendimiento Integradas:</h4>
          <ul style="margin: 0; padding-left: 20px; color: var(--text-secondary); font-size: 13px; line-height: 1.8;">
            <li><strong>Motor Vulkan Nativo (ShubaDium / Sodium):</strong> Rendimiento superior a OpenGL estándar en cualquier GPU.</li>
            <li><strong>Soporte Completo de Shaders (Iris):</strong> Carga shaders modernos manteniendo tasas de refresco fluidas.</li>
            <li><strong>Reducción de Memoria RAM (FerriteCore & ModernFix):</strong> Estabilidad garantizada con un consumo acotado a 6 GB máximos.</li>
            <li><strong>Física y Entidades Suaves (Lithium & Entity Culling):</strong> Cero micro-tirones (stuttering) en granjas y multijugador.</li>
            <li><strong>Menú Panorámico 3D & Pausa Step-Back:</strong> Interfaz cinemática con renderizado en tiempo real.</li>
            <li><strong>ShubaClient UI:</strong> Menús rediseñados y controles listos para jugar.</li>
          </ul>
        </div>
      </div>
    `;

    const dependencies = [
      { projectId: 'ShubaDium (Motor Vulkan 26.3)', relationType: 'Requerido', iconUrl: logoB64 },
      { projectId: 'Iris Shaders (Soporte Shaders)', relationType: 'Requerido', iconUrl: 'https://cdn.modrinth.com/data/YL57xq9U/icon.png' },
      { projectId: 'Sodium Fabric (Renderizador Base)', relationType: 'Requerido', iconUrl: 'https://cdn.modrinth.com/data/AANobbMI/icon.png' },
      { projectId: 'Sodium Extra (Ajustes de Calidad y Partículas)', relationType: 'Requerido', iconUrl: 'https://cdn.modrinth.com/data/PtjYWJkn/icon.png' },
      { projectId: 'Sodium Shadowy Path Blocks (Sombreado)', relationType: 'Requerido', iconUrl: 'https://cdn.modrinth.com/data/V2Hh0m4p/icon.png' },
      { projectId: 'Lithium (Optimización de Física y Servidor)', relationType: 'Requerido', iconUrl: 'https://cdn.modrinth.com/data/gvQqBUqZ/icon.png' },
      { projectId: 'FerriteCore (Optimización de RAM)', relationType: 'Requerido', iconUrl: 'https://cdn.modrinth.com/data/uXXizFIs/icon.png' },
      { projectId: 'ModernFix (Arranque Rápido y Parches)', relationType: 'Requerido', iconUrl: 'https://cdn.modrinth.com/data/nmDcB62a/icon.png' },
      { projectId: 'ImmediatelyFast (Aceleración de UI / HUD)', relationType: 'Requerido', iconUrl: 'https://cdn.modrinth.com/data/5ZwdcRci/icon.png' },
      { projectId: 'Entity Culling (Ocultación de Entidades)', relationType: 'Requerido', iconUrl: 'https://cdn.modrinth.com/data/NNAgCjsB/icon.png' },
      { projectId: 'RSLS (Iluminación Rápida Dinámica)', relationType: 'Requerido', iconUrl: 'https://cdn.modrinth.com/data/O3gA132m/icon.png' },
      { projectId: 'Clumps (Agrupación de Experiencia)', relationType: 'Requerido', iconUrl: 'https://cdn.modrinth.com/data/Wnxd13zP/icon.png' },
      { projectId: 'ShubaClient UI (Interfaz Oficial SHUBATECH)', relationType: 'Requerido', iconUrl: logoB64 },
      { projectId: 'ShubaConfig (Gestor de Ajustes)', relationType: 'Requerido', iconUrl: logoB64 },
      { projectId: 'Fabric API (Librería Base 26.3)', relationType: 'Requerido', iconUrl: 'https://cdn.modrinth.com/data/P7dR8mSH/icon.png' },
      { projectId: 'Fabric Language Kotlin (Runtime Kotlin)', relationType: 'Requerido', iconUrl: 'https://cdn.modrinth.com/data/Ha28R6CL/icon.png' },
      { projectId: 'Compose Bundle (Motor de Interfaz Reactivo)', relationType: 'Requerido', iconUrl: logoB64 }
    ];

    const changelogs = [
      {
        versionNumber: '2.0.9 Oficial (26.3)',
        fileName: 'ShubaClient-26.3-v2.0.9.shubapack',
        releaseType: 'Release',
        releaseDate: new Date().toLocaleDateString(),
        changelog: 'Lanzamiento oficial de ShubaClient para Minecraft 26.3 Fabric. Incluye el motor de renderizado Vulkan, compatibilidad nativa con shaders vía Iris, menú panorámico 3D OneConfig, perfil de memoria optimizado a 6 GB de RAM y los 17 mods de rendimiento integrados.'
      }
    ];

    const files = [
      {
        fileId: 'shubaclient-263-release',
        fileName: 'ShubaClient-26.3-v2.0.9.shubapack',
        displayName: 'ShubaClient Oficial 26.3 (Fabric 0.20.1)',
        versionNumber: '2.0.9',
        releaseType: 'Release',
        releaseDate: new Date().toLocaleDateString(),
        gameVersions: ['26.3'],
        downloadUrl: 'local://shubaclient',
        sizeFormatted: '48.2 MB'
      }
    ];

    return {
      id: 'shubaclient',
      projectId: 'shubaclient',
      slug: 'shubaclient',
      title: 'ShubaClient Oficial 26.3 (FPS Boost & Vulkan)',
      name: 'ShubaClient Oficial 26.3',
      author: 'SHUBATECH',
      summary: 'Cliente oficial ShubaClient: máxima optimización y tasa de FPS en Minecraft 26.3 con Fabric, Vulkan/Sodium, Iris Shaders y menú 3D.',
      descriptionHtml,
      iconUrl: logoB64,
      downloads: 999999,
      source: 'custom',
      websiteUrl: 'https://github.com/Landa6543/ShubaCore-Mods',
      screenshots: [logoB64],
      gallery: [
        { url: logoB64, title: 'Logotipo Oficial ShubaCore / ShubaClient', description: 'Identidad visual oficial de SHUBATECH' }
      ],
      changelogs,
      dependencies,
      files
    };
  }

  /**
   * Instala el Modpack Oficial ShubaClient 26.3 en una nueva instancia o instancia objetivo
   */
  async installOfficialShubaClientModpack({ onProgress = null, targetName = 'ShubaClient' } = {}) {
    logger.info(`⚡ [Modpack] Instalando Modpack Oficial "${targetName}" (MC 26.3 Fabric)...`);
    if (onProgress) onProgress({ type: 'modpack_file', message: 'Creando instancia oficial ShubaClient 26.3...', percent: 15 });

    const { getProfileManager } = require('../profiles/ProfileManager');
    const profileManager = getProfileManager();
    const logoB64 = profileManager._getBlueLogoBase64();
    const blueBuf = profileManager._getBlueLogoBuffer();

    const createdProfile = profileManager.createProfile({
      name: targetName,
      mcVersion: '26.3',
      loader: 'Fabric',
      loaderVersion: '0.20.1',
      ramMin: '2G',
      ramMax: '6G',
      icon: logoB64,
      summary: 'Cliente oficial ShubaClient: máxima tasa de FPS en 26.3.'
    });

    profileManager.setActive(createdProfile.id);

    if (onProgress) onProgress({ type: 'modpack_file', message: 'Inyectando optimizadores y mods oficiales...', percent: 45 });

    const instancePath = createdProfile.instancePath;
    if (blueBuf) {
      try {
        fs.writeFileSync(path.join(instancePath, 'icon.png'), blueBuf);
      } catch (_) {}
    }
    profileManager._populateDefaultShubaClientMods(instancePath, onProgress);

    const allMods = this.scanAndSyncMods(instancePath);
    const updatedProfile = profileManager.getProfile(createdProfile.id);

    if (onProgress) onProgress({ type: 'modpack_file', message: `¡Modpack oficial "${targetName}" instalado con éxito! (${allMods.length} mods)`, percent: 100 });

    return {
      success: true,
      contentType: 'modpacks',
      name: updatedProfile ? updatedProfile.name : targetName,
      version: '2.0.9',
      mcVersion: '26.3',
      loader: 'Fabric',
      loaderVersion: '0.20.1',
      filesCount: allMods.length,
      totalFiles: allMods.length,
      instancePath,
      profile: updatedProfile || createdProfile,
      allMods
    };
  }

  async installModpackFile({ packPath, instancePath = null, createProfile = false, onProgress = null, iconUrl = null, profileManager = null }) {
    if (!fs.existsSync(packPath)) {
      throw new Error(`El archivo de modpack no existe: ${packPath}`);
    }

    const targetInstance = createProfile ? null : instancePath;
    logger.info(`Instalando modpack desde "${packPath}" (targetInstance: ${targetInstance || 'AUTO-CREATE'})...`);

    const zip = new AdmZip(packPath);
    const zipEntries = zip.getEntries();

    // 1. Modrinth (.mrpack)
    const modrinthIndexEntry = zipEntries.find((e) => e.entryName === 'modrinth.index.json');
    if (modrinthIndexEntry) {
      return await this._installModrinthMrpack(zip, modrinthIndexEntry, targetInstance, onProgress, packPath, iconUrl, profileManager);
    }

    // 2. CurseForge (.zip)
    const cfManifestEntry = zipEntries.find((e) => e.entryName === 'manifest.json');
    if (cfManifestEntry) {
      return await this._installCurseForgeZip(zip, cfManifestEntry, targetInstance, onProgress, packPath, iconUrl, profileManager);
    }

    throw new Error('El archivo comprimido no contiene un modrinth.index.json ni un manifest.json válido.');
  }

  async _installModrinthMrpack(zip, indexEntry, targetInstance, onProgress, packPath = null, iconUrl = null, profileManager = null) {
    logger.info('[Modpack:Modrinth] Procesando modrinth.index.json...');
    const indexJson = JSON.parse(indexEntry.getData().toString('utf8'));
    const files = indexJson.files || [];

    const packName = indexJson.name || (packPath ? path.basename(packPath, path.extname(packPath)) : 'Modrinth Modpack');
    const packVersion = indexJson.versionId || '1.0.0';
    const mcVersion = indexJson.dependencies?.minecraft || '1.21.1';
    let loader = 'NeoForge';
    let loaderVersion = '';

    if (indexJson.dependencies) {
      if (indexJson.dependencies['neoforge']) {
        loader = 'NeoForge';
        loaderVersion = indexJson.dependencies['neoforge'];
      } else if (indexJson.dependencies['forge']) {
        loader = 'Forge';
        loaderVersion = indexJson.dependencies['forge'];
      } else if (indexJson.dependencies['fabric-loader']) {
        loader = 'Fabric';
        loaderVersion = indexJson.dependencies['fabric-loader'];
      } else if (indexJson.dependencies['quilt-loader']) {
        loader = 'Quilt';
        loaderVersion = indexJson.dependencies['quilt-loader'];
      }
    }

    let instancePath = targetInstance;
    let createdProfile = null;

    if (!instancePath) {
      const pm = profileManager || this.profileManager || require('../profiles/ProfileManager').getProfileManager();
      createdProfile = pm.createProfile({
        name: packName,
        mcVersion,
        loader,
        loaderVersion,
        ramMin: '2G',
        ramMax: '8G'
      });
      instancePath = createdProfile.instancePath || pm.getInstancePath(createdProfile.id);
      pm.setActive(createdProfile.id);
      logger.info(`[Modpack:Modrinth] Creada nueva instancia para modpack: "${packName}" (${loader} ${mcVersion})`);
    }

    // Guardar y configurar icono oficial del modpack
    await this._saveModpackIcon({ zip, instancePath, createdProfile, iconUrl, modrinthIndex: indexJson });

    // Overrides (overrides/ y client-overrides/)
    const overridesPrefixes = ['overrides/', 'client-overrides/', 'client_overrides/'];
    zip.getEntries().forEach((entry) => {
      if (entry.isDirectory) return;
      const entryName = entry.entryName.replace(/\\/g, '/');
      for (const prefix of overridesPrefixes) {
        if (entryName.startsWith(prefix)) {
          const relativePath = entryName.substring(prefix.length);
          if (!relativePath) continue;
          const destPath = path.join(instancePath, relativePath);
          const destDir = path.dirname(destPath);
          if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
          fs.writeFileSync(destPath, entry.getData());
          break;
        }
      }
    });

    const validFiles = files.filter((f) => f && f.downloads && f.downloads[0]);
    let completed = 0;
    const lockData = this._readLockFile(instancePath);
    let lockModified = false;

    await this._runWithConcurrency(validFiles, 6, async (f) => {
      const downloadUrl = f.downloads[0];
      const targetPath = path.join(instancePath, f.path);
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      if (!fs.existsSync(targetPath) || fs.statSync(targetPath).size < 100) {
        let downloaded = false;
        let lastErr = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            await this._downloadStream(downloadUrl, targetPath);
            downloaded = true;
            break;
          } catch (dlErr) {
            lastErr = dlErr;
            logger.warn(`[Modpack:Modrinth] Intento ${attempt} fallido para ${path.basename(f.path)}: ${dlErr.message}`);
          }
        }
        if (!downloaded) {
          logger.error(`[Modpack:Modrinth] No se pudo descargar el archivo ${path.basename(f.path)} tras reintentos.`);
        }
      }

      completed++;
      const fileName = path.basename(f.path);
      if (onProgress) {
        onProgress({
          type: 'modpack_file',
          current: completed,
          total: validFiles.length,
          name: fileName,
          message: `Instalando Modpack: Descargando archivo ${completed} de ${validFiles.length}... (${fileName})`,
          percent: Math.round((completed / validFiles.length) * 100)
        });
      }

      if (f.path.startsWith('mods/')) {
        const cleanName = this._cleanJarName(fileName);
        lockData.mods[fileName] = {
          fileName,
          name: cleanName,
          displayName: cleanName,
          source: 'modrinth',
          projectId: '',
          fileId: '',
          downloadUrl,
          version: fileName,
          dateInstalled: new Date().toISOString(),
          enabled: true
        };
        lockModified = true;
      }
    });

    if (lockModified) {
      lockData.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this._getLockFilePath(instancePath), JSON.stringify(lockData, null, 2), 'utf8');
    }

    // Los archivos de modpacks curados por el autor no se purgan automáticamente para evitar eliminar mods intencionales
    const allMods = this.scanAndSyncMods(instancePath);
    return {
      success: true,
      name: packName,
      version: packVersion,
      mcVersion,
      loader,
      loaderVersion,
      filesCount: completed,
      totalFiles: files.length,
      instancePath,
      profile: createdProfile,
      allMods
    };
  }

  async _installCurseForgeZip(zip, manifestEntry, targetInstance, onProgress, packPath = null, iconUrl = null, profileManager = null) {
    logger.info('[Modpack:CurseForge] Procesando manifest.json...');
    const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
    const apiKey = this._getCurseForgeKey();

    const packName = manifest.name || (packPath ? path.basename(packPath, path.extname(packPath)) : 'CurseForge Modpack');
    const packVersion = manifest.version || '1.0.0';
    const mcVersion = (manifest.minecraft && manifest.minecraft.version) ? String(manifest.minecraft.version).trim() : '1.21.1';
    const loaderInfo = this._parseCurseForgeModLoader(manifest.minecraft?.modLoaders);

    let instancePath = targetInstance;
    let createdProfile = null;

    if (!instancePath) {
      const pm = profileManager || this.profileManager || require('../profiles/ProfileManager').getProfileManager();
      createdProfile = pm.createProfile({
        name: packName,
        mcVersion,
        loader: loaderInfo.loader,
        loaderVersion: loaderInfo.loaderVersion,
        ramMin: '2G',
        ramMax: '8G'
      });
      instancePath = createdProfile.instancePath || pm.getInstancePath(createdProfile.id);
      pm.setActive(createdProfile.id);
      logger.info(`[Modpack:CurseForge] Creada nueva instancia para modpack: "${packName}" (${loaderInfo.loader} ${mcVersion})`);
    }

    // Guardar y configurar icono oficial del modpack
    await this._saveModpackIcon({ zip, instancePath, createdProfile, iconUrl, cfManifest: manifest });

    // Paso B: Extraer overrides/ (o el directorio indicado en manifest.overrides) y client-overrides/
    const overridesDirName = (manifest.overrides || 'overrides').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const prefixes = [`${overridesDirName}/`, 'client-overrides/', 'client_overrides/'];

    zip.getEntries().forEach((entry) => {
      if (entry.isDirectory) return;
      const entryName = entry.entryName.replace(/\\/g, '/');

      for (const prefix of prefixes) {
        if (entryName.startsWith(prefix)) {
          const rel = entryName.substring(prefix.length);
          if (!rel) continue;
          const dest = path.join(instancePath, rel);
          const dir = path.dirname(dest);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(dest, entry.getData());
          break;
        }
      }
    });

    // Paso C: Filtrar y descargar mods de manifest.files
    const files = (manifest.files || []).filter((f) => f && f.fileID && f.required !== false);
    const modsDir = path.join(instancePath, 'mods');
    if (!fs.existsSync(modsDir)) fs.mkdirSync(modsDir, { recursive: true });

    logger.info(`[Modpack:CurseForge] Consultando metadatos para ${files.length} mods mediante /v1/mods/files batch...`);

    const fileIds = files.map((f) => parseInt(f.fileID, 10)).filter((n) => !isNaN(n));
    const fetchedFilesMap = new Map();

    for (let i = 0; i < fileIds.length; i += 100) {
      const chunk = fileIds.slice(i, i + 100);
      try {
        const cfRes = await fetch(`${CURSEFORGE_API_URL}/mods/files`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            Accept: 'application/json',
            'User-Agent': USER_AGENT
          },
          body: JSON.stringify({ fileIds: chunk })
        });

        if (cfRes.ok) {
          const cfJson = await cfRes.json();
          const items = cfJson.data || [];
          for (const item of items) {
            if (item && item.id) {
              fetchedFilesMap.set(item.id, item);
            }
          }
        } else {
          logger.warn(`[Modpack:CurseForge] Error en batch /mods/files (chunk ${i}): status ${cfRes.status}`);
        }
      } catch (err) {
        logger.warn(`[Modpack:CurseForge] Error en consulta batch /mods/files: ${err.message}`);
      }
    }

    const downloadTasks = [];
    for (const f of files) {
      let fileData = fetchedFilesMap.get(parseInt(f.fileID, 10));

      if (!fileData) {
        try {
          const singleRes = await fetch(`${CURSEFORGE_API_URL}/mods/${f.projectID}/files/${f.fileID}`, {
            headers: { 'x-api-key': apiKey, Accept: 'application/json', 'User-Agent': USER_AGENT }
          });
          if (singleRes.ok) {
            const singleJson = await singleRes.json();
            if (singleJson.data) {
              fileData = singleJson.data;
              fetchedFilesMap.set(fileData.id, fileData);
            }
          }
        } catch (_) {}
      }

      if (fileData) {
        let downloadUrl = fileData.downloadUrl;
        if (!downloadUrl && fileData.id && fileData.fileName) {
          downloadUrl = this._buildCurseForgeEdgeUrl(fileData.id, fileData.fileName);
        }

        const sha1Obj = (fileData.hashes || []).find((h) => h.algo === 1);
        const sha1 = sha1Obj ? sha1Obj.value : null;

        downloadTasks.push({
          projectID: f.projectID,
          fileID: f.fileID,
          fileData,
          downloadUrl,
          sha1
        });
      } else {
        logger.warn(`[Modpack:CurseForge] No se pudieron obtener metadatos para Mod ${f.projectID}/${f.fileID}.`);
      }
    }

    let completedCount = 0;
    const totalFiles = downloadTasks.length;
    const lockData = this._readLockFile(instancePath);
    let lockModified = false;

    await this._runWithConcurrency(downloadTasks, 6, async (task) => {
      const { fileData, downloadUrl, projectID, fileID, sha1 } = task;
      let targetDir = modsDir;
      const lowerName = fileData.fileName.toLowerCase();
      if (lowerName.endsWith('.zip')) {
        if (lowerName.includes('shader')) {
          targetDir = path.join(instancePath, 'shaderpacks');
        } else {
          targetDir = path.join(instancePath, 'resourcepacks');
        }
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
      }

      const targetPath = path.join(targetDir, fileData.fileName);
      if (!fs.existsSync(targetPath) || fs.statSync(targetPath).size < 100) {
        let downloaded = false;
        let lastErr = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            await this._downloadStream(downloadUrl, targetPath, null, {
              sha1,
              fileName: fileData.fileName,
              mcVersion,
              loader: loaderInfo.loader
            });
            downloaded = true;
            break;
          } catch (dlErr) {
            lastErr = dlErr;
            logger.warn(`[Modpack:CurseForge] Intento ${attempt} fallido para ${fileData.fileName}: ${dlErr.message}`);
          }
        }
        if (!downloaded) {
          logger.error(`[Modpack:CurseForge] No se pudo descargar ${fileData.fileName} tras reintentos.`);
        }
      }

      completedCount++;
      if (onProgress) {
        onProgress({
          type: 'cf_modpack_file',
          current: completedCount,
          total: totalFiles,
          name: fileData.fileName,
          message: `Instalando Modpack: Descargando mod ${completedCount} de ${totalFiles}... (${fileData.fileName})`,
          percent: Math.round((completedCount / totalFiles) * 100)
        });
      }

      const cleanName = this._cleanJarName(fileData.fileName);
      lockData.mods[fileData.fileName] = {
        fileName: fileData.fileName,
        name: cleanName,
        displayName: fileData.displayName || cleanName,
        source: 'curseforge',
        projectId: String(fileData.modId || projectID),
        fileId: String(fileData.id || fileID),
        downloadUrl,
        version: fileData.fileName,
        dateInstalled: new Date().toISOString(),
        enabled: true
      };
      lockModified = true;
    });

    if (lockModified) {
      lockData.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this._getLockFilePath(instancePath), JSON.stringify(lockData, null, 2), 'utf8');
    }

    // Los archivos de modpacks curados por el autor no se purgan automáticamente para evitar eliminar mods intencionales
    const allMods = this.scanAndSyncMods(instancePath);
    logger.info(`[Modpack:CurseForge] Instalación completa de "${packName}". ${completedCount} archivos instalados.`);

    return {
      success: true,
      name: packName,
      version: packVersion,
      mcVersion,
      loader: loaderInfo.loader,
      loaderVersion: loaderInfo.loaderVersion,
      filesCount: completedCount,
      totalFiles: files.length,
      instancePath,
      profile: createdProfile,
      allMods
    };
  }

  async _saveModpackIcon({ zip, instancePath, createdProfile, iconUrl = null, cfManifest = null, modrinthIndex = null }) {
    try {
      let iconSaved = false;
      const localIconPath = path.join(instancePath, 'icon.png');

      // 1. Buscar en el archivo comprimido (.zip / .mrpack / .shubapack)
      if (zip) {
        const iconEntry = zip.getEntries().find((e) => {
          if (e.isDirectory) return false;
          const lowName = e.entryName.toLowerCase().replace(/\\/g, '/');
          return (
            lowName === 'icon.png' ||
            lowName === 'pack.png' ||
            lowName === 'logo.png' ||
            lowName === 'instance.png' ||
            lowName === 'manifest-icon.png' ||
            lowName.endsWith('/icon.png') ||
            lowName.endsWith('/pack.png') ||
            lowName.endsWith('/logo.png') ||
            lowName.endsWith('/instance.png') ||
            lowName.endsWith('/manifest-icon.png') ||
            /(icon|pack|logo|instance)\.(png|jpg|jpeg|webp)$/i.test(path.basename(lowName))
          );
        });

        if (iconEntry) {
          fs.writeFileSync(localIconPath, iconEntry.getData());
          iconSaved = true;
          logger.info(`[Modpack] Icono oficial extraído del paquete a: ${localIconPath}`);
        }
      }

      // 1b. Si el manifiesto (.json) incluye icono embebido en base64 / data:image
      const manifestIcon = (cfManifest && (cfManifest.icon || cfManifest.iconBase64)) ||
                           (modrinthIndex && (modrinthIndex.icon || modrinthIndex.iconBase64));
      if (!iconSaved && manifestIcon && typeof manifestIcon === 'string') {
        try {
          const rawB64 = manifestIcon.includes(',') ? manifestIcon.split(',')[1] : manifestIcon;
          const iconBuf = Buffer.from(rawB64, 'base64');
          if (iconBuf && iconBuf.length > 50) {
            fs.writeFileSync(localIconPath, iconBuf);
            iconSaved = true;
            logger.info(`[Modpack] Icono oficial restaurado desde manifest a: ${localIconPath}`);
          }
        } catch (_) {}
      }

      // 2. Si no viene en el zip y hay una iconUrl válida, descargarla
      if (!iconSaved && iconUrl && typeof iconUrl === 'string' && iconUrl.startsWith('http')) {
        try {
          const res = await fetch(iconUrl);
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            fs.writeFileSync(localIconPath, buf);
            iconSaved = true;
            logger.info(`[Modpack] Icono oficial descargado desde ${iconUrl} a: ${localIconPath}`);
          }
        } catch (dErr) {
          logger.warn(`No se pudo descargar icono oficial de ${iconUrl}:`, dErr.message);
        }
      }

      // 3. Fallback CurseForge API: si viene un manifest.json con projectID
      if (!iconSaved && cfManifest && cfManifest.projectID) {
        try {
          const apiKey = this._getCurseForgeKey();
          const cfRes = await fetch(`${CURSEFORGE_API_URL}/mods/${cfManifest.projectID}`, {
            headers: { 'x-api-key': apiKey, Accept: 'application/json', 'User-Agent': USER_AGENT }
          });
          if (cfRes.ok) {
            const cfJson = await cfRes.json();
            const remoteUrl = cfJson.data?.logo?.thumbnailUrl || cfJson.data?.logo?.url;
            if (remoteUrl) {
              const imgRes = await fetch(remoteUrl);
              if (imgRes.ok) {
                const buf = Buffer.from(await imgRes.arrayBuffer());
                fs.writeFileSync(localIconPath, buf);
                iconSaved = true;
                logger.info(`[Modpack] Icono oficial de CurseForge obtenido para ProjectID ${cfManifest.projectID} a: ${localIconPath}`);
              }
            }
          }
        } catch (cfErr) {
          logger.debug(`[Modpack] Consulta fallback CurseForge icono omitida: ${cfErr.message}`);
        }
      }

      // 4. Fallback Modrinth API: si viene un modrinth.index.json
      if (!iconSaved && modrinthIndex && (modrinthIndex.project_id || modrinthIndex.name)) {
        try {
          const mrTarget = modrinthIndex.project_id || encodeURIComponent(modrinthIndex.name);
          const mrRes = await fetch(`https://api.modrinth.com/v2/project/${mrTarget}`, {
            headers: { 'User-Agent': USER_AGENT }
          });
          if (mrRes.ok) {
            const mrJson = await mrRes.json();
            if (mrJson.icon_url) {
              const imgRes = await fetch(mrJson.icon_url);
              if (imgRes.ok) {
                const buf = Buffer.from(await imgRes.arrayBuffer());
                fs.writeFileSync(localIconPath, buf);
                iconSaved = true;
                logger.info(`[Modpack] Icono oficial de Modrinth obtenido a: ${localIconPath}`);
              }
            }
          }
        } catch (mrErr) {
          logger.debug(`[Modpack] Consulta fallback Modrinth icono omitida: ${mrErr.message}`);
        }
      }

      // 5. Escribir metadatos en instance.json y actualizar perfil en ProfileManager
      let finalIcon = 'assets/logo.png';
      if (fs.existsSync(localIconPath)) {
        try {
          const b64 = fs.readFileSync(localIconPath).toString('base64');
          finalIcon = `data:image/png;base64,${b64}`;
        } catch (_) {}
      } else if (iconUrl && typeof iconUrl === 'string' && iconUrl.startsWith('data:image')) {
        finalIcon = iconUrl;
        try {
          const parts = iconUrl.split(',');
          if (parts[1]) fs.writeFileSync(localIconPath, Buffer.from(parts[1], 'base64'));
        } catch (_) {}
      } else {
        try {
          const { getProfileManager } = require('../profiles/ProfileManager');
          const pm = getProfileManager();
          const logoBuf = pm._getOfficialLogoBuffer();
          if (logoBuf) {
            fs.writeFileSync(localIconPath, logoBuf);
            finalIcon = pm._getOfficialLogoBase64();
          }
        } catch (_) {}
      }

      const instJsonFile = path.join(instancePath, 'instance.json');
      let instJson = {};
      if (fs.existsSync(instJsonFile)) {
        try { instJson = JSON.parse(fs.readFileSync(instJsonFile, 'utf8')); } catch (_) {}
      }
      instJson.icon = 'icon.png';
      if (iconUrl) instJson.iconUrl = iconUrl;
      fs.writeFileSync(instJsonFile, JSON.stringify(instJson, null, 2), 'utf8');

      if (createdProfile) {
        const { getProfileManager } = require('../profiles/ProfileManager');
        const profileManager = getProfileManager();
        createdProfile.icon = finalIcon;
        profileManager.updateProfile(createdProfile.id, { icon: finalIcon });
      }
    } catch (err) {
      logger.warn(`Aviso al guardar icono de modpack: ${err.message}`);
    }
  }

  // =========================================================================
  // DETECCIÓN Y PURGA AUTOMÁTICA DE MODS DUPLICADOS (CONSERVAR VERSIÓN MÁS NUEVA)
  // =========================================================================

  _extractVersionParts(verStr) {
    if (!verStr || typeof verStr !== 'string') return [];
    let clean = verStr.replace(/\.disabled$/i, '').replace(/\.jar$/i, '');
    if (/[a-z]/i.test(clean)) {
      clean = this._extractVersionFromFileName(clean);
    }
    const matches = clean.match(/\d+/g);
    return matches ? matches.map(Number) : [];
  }

  _compareModVersions(a, b) {
    // 1. fileId numérico (CurseForge / Modrinth)
    const fidA = parseInt(a.fileId || '0', 10);
    const fidB = parseInt(b.fileId || '0', 10);
    if (!isNaN(fidA) && !isNaN(fidB) && fidA > 0 && fidB > 0 && fidA !== fidB) {
      return fidB - fidA;
    }

    // 2. Comparación semántica de componentes numéricos de versión
    const getValidVer = (item) => {
      if (item.internalVersion && /\d/.test(item.internalVersion)) return item.internalVersion;
      if (item.versionNumber && /\d/.test(item.versionNumber) && item.versionNumber !== 'custom') return item.versionNumber;
      if (item.version && /\d/.test(item.version) && !item.version.endsWith('.jar') && item.version !== 'custom') return item.version;
      return item.fileName;
    };
    const rawVerA = getValidVer(a);
    const rawVerB = getValidVer(b);
    const partsA = this._extractVersionParts(rawVerA);
    const partsB = this._extractVersionParts(rawVerB);
    const maxLen = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < maxLen; i++) {
      const pA = partsA[i] || 0;
      const pB = partsB[i] || 0;
      if (pA !== pB) {
        return pB - pA;
      }
    }

    // 3. Fecha de publicación o fecha instalada
    const dateA = a.installedFileDate || a.dateInstalled || a.installedAt;
    const dateB = b.installedFileDate || b.dateInstalled || b.installedAt;
    if (dateA && dateB) {
      const tA = new Date(dateA).getTime();
      const tB = new Date(dateB).getTime();
      if (!isNaN(tA) && !isNaN(tB) && tA !== tB) {
        return tB - tA;
      }
    }

    // 4. Fecha de modificación en disco
    if (a.mtimeMs && b.mtimeMs && a.mtimeMs !== b.mtimeMs) {
      return b.mtimeMs - a.mtimeMs;
    }

    // 5. Tamaño de archivo como fallback
    return (b.size || 0) - (a.size || 0);
  }

  async purgeDuplicateMods(instancePath = null) {
    const activeInstance = instancePath || this.configManager.getInstanceDirectory();
    const modsDir = path.join(activeInstance, 'mods');
    if (!fs.existsSync(modsDir)) {
      return { success: true, purgedCount: 0, removedFiles: [], remainingCount: 0 };
    }

    this.scanAndSyncMods(activeInstance);
    const lockData = this._readLockFile(activeInstance);
    const diskFiles = fs.readdirSync(modsDir).filter((f) => f.endsWith('.jar') || f.endsWith('.jar.disabled'));

    if (diskFiles.length <= 1) {
      return { success: true, purgedCount: 0, removedFiles: [], remainingCount: diskFiles.length };
    }

    logger.info(`[PurgeDuplicates] Analizando ${diskFiles.length} archivos .jar en "${modsDir}" en busca de duplicados...`);

    // Recopilar información de cada archivo en disco
    const fileEntries = [];
    for (const f of diskFiles) {
      const filePath = path.join(modsDir, f);
      let stats = null;
      try {
        stats = fs.statSync(filePath);
      } catch (_) {
        continue;
      }

      const lockEntry = lockData.mods[f] || lockData.mods[f.replace(/\.disabled$/i, '')] || {};
      const jarMeta = this._extractJarMetadata(filePath);

      const pid = lockEntry.projectId || lockEntry.projectID || lockEntry.modId || null;
      const fid = lockEntry.fileId || lockEntry.fileID || null;
      const intModId = (jarMeta && jarMeta.modId) ? jarMeta.modId.toLowerCase().trim() : null;
      const intVersion = jarMeta?.version || null;
      const baseClean = this._cleanJarName(f).toLowerCase().replace(/[^a-z0-9]/g, '');

      fileEntries.push({
        fileName: f,
        filePath,
        size: stats.size,
        mtimeMs: stats.mtimeMs,
        projectId: pid ? String(pid).toLowerCase() : null,
        fileId: fid ? String(fid) : null,
        internalModId: intModId,
        internalVersion: intVersion,
        version: lockEntry.version || lockEntry.versionNumber || null,
        baseClean: baseClean.length >= 3 ? baseClean : null,
        installedFileDate: lockEntry.installedFileDate,
        dateInstalled: lockEntry.dateInstalled,
        installedAt: lockEntry.installedAt
      });
    }

    // Agrupar archivos que representen inequívocamente el mismo mod
    // Solo se agrupan si comparten el MISMO internalModId no nulo, o el MISMO projectId no nulo.
    // Si los modId o projectIds difieren, NUNCA se agrupan (evita borrar mods distintos de modpacks).
    const groups = [];
    for (const entry of fileEntries) {
      let matchedGroup = null;
      for (const g of groups) {
        const isMatch = g.some((other) => {
          // Si ambos tienen internalModId y son distintos -> mods diferentes
          if (entry.internalModId && other.internalModId && entry.internalModId !== other.internalModId) {
            return false;
          }
          // Si ambos tienen projectId y son distintos -> mods diferentes
          if (entry.projectId && other.projectId && entry.projectId !== other.projectId) {
            return false;
          }
          // Coincidencia segura por modId interno verificado
          if (entry.internalModId && other.internalModId && entry.internalModId === other.internalModId) {
            return true;
          }
          // Coincidencia segura por projectId de Modrinth o CurseForge
          if (entry.projectId && other.projectId && entry.projectId === other.projectId) {
            return true;
          }
          // Fallback a baseClean idéntico SOLO si ninguno tiene modId ni projectId definidos y baseClean es robusto (>= 6 caracteres)
          if (!entry.internalModId && !other.internalModId && !entry.projectId && !other.projectId) {
            return Boolean(entry.baseClean && other.baseClean && entry.baseClean === other.baseClean && entry.baseClean.length >= 6);
          }
          return false;
        });

        if (isMatch) {
          matchedGroup = g;
          break;
        }
      }

      if (matchedGroup) {
        matchedGroup.push(entry);
      } else {
        groups.push([entry]);
      }
    }

    let purgedCount = 0;
    const removedFiles = [];
    let lockModified = false;

    for (const group of groups) {
      if (group.length <= 1) continue;

      // Ordenar: el más nuevo primero (índice 0 se conserva)
      group.sort((a, b) => this._compareModVersions(a, b));
      const winner = group[0];
      const duplicatesToRemove = group.slice(1);

      for (const dup of duplicatesToRemove) {
        try {
          if (fs.existsSync(dup.filePath)) {
            fs.unlinkSync(dup.filePath);
          }
          const siblingPath = dup.filePath.endsWith('.disabled')
            ? dup.filePath.replace(/\.disabled$/i, '')
            : `${dup.filePath}.disabled`;
          if (fs.existsSync(siblingPath)) {
            fs.unlinkSync(siblingPath);
          }

          delete lockData.mods[dup.fileName];
          delete lockData.mods[dup.fileName.replace(/\.disabled$/i, '')];
          lockModified = true;

          removedFiles.push(dup.fileName);
          purgedCount++;
          logger.info(`[PurgeDuplicates] Eliminado mod duplicado más antiguo: "${dup.fileName}" (Conservado: "${winner.fileName}")`);
        } catch (err) {
          logger.warn(`[PurgeDuplicates] Error al eliminar "${dup.fileName}": ${err.message}`);
        }
      }
    }

    if (lockModified) {
      lockData.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this._getLockFilePath(activeInstance), JSON.stringify(lockData, null, 2), 'utf8');
      this.scanAndSyncMods(activeInstance);
    }

    logger.info(`[PurgeDuplicates] Finalizado. ${purgedCount} archivos antiguos duplicados purgados.`);
    return {
      success: true,
      purgedCount,
      removedFiles,
      remainingCount: diskFiles.length - purgedCount
    };
  }
}

let modManagerInstance = null;
function getModManager() {
  if (!modManagerInstance) {
    modManagerInstance = new ModManager();
  }
  return modManagerInstance;
}

module.exports = {
  ModManager,
  getModManager,
  DEFAULT_CF_API_KEY,
  computeCurseForgeFingerprint: (buffer) => getModManager().computeCurseForgeFingerprint(buffer)
};
