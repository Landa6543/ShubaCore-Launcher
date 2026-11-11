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
  shaders: 6552
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
    category = 'all'
  } = {}) {
    const isPopular = !query || query.trim() === '';
    const safeType = (contentType || 'mods').toLowerCase();
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safePageSize = Math.max(1, parseInt(pageSize, 10) || 20);
    const offset = (safePage - 1) * safePageSize;

    logger.info(`Búsqueda de catálogo [${source.toUpperCase()}] Tipo: ${safeType} (Pág. ${safePage}, Tamaño: ${safePageSize}, Orden: ${sortBy}, Cat: ${category}) ${isPopular ? '(Populares)' : `"${query}"`} (MC ${mcVersion}, Loader: ${loader})`);

    const normalizedLoader = (loader || 'neoforge').toLowerCase();
    const shouldSearchModrinth = source === 'both' || source === 'modrinth';
    const shouldSearchCurseForge = source === 'both' || source === 'curseforge';

    const tasks = [];
    if (shouldSearchModrinth) {
      tasks.push(this._searchModrinthContent(query, mcVersion, normalizedLoader, safeType, safePageSize, offset, sortBy, category));
    }
    if (shouldSearchCurseForge) {
      tasks.push(this._searchCurseForgeContent(query, mcVersion, normalizedLoader, safeType, safePageSize, offset, sortBy, category));
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
    const pagedResults = source === 'both' ? allItems.slice(0, safePageSize) : allItems;
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
  async _searchCurseForgeContent(query, mcVersion, loader, contentType, limit, offset, sortBy = 'popular', category = 'all') {
    const apiKey = this._getCurseForgeKey();
    const classId = CF_CLASS_IDS[contentType] || CF_CLASS_IDS.mods;

    try {
      const cfLoader = CF_LOADER_TYPES[loader] !== undefined ? CF_LOADER_TYPES[loader] : CF_LOADER_TYPES.any;
      const url = new URL(`${CURSEFORGE_API_URL}/mods/search`);
      url.searchParams.append('gameId', String(CF_GAME_ID)); // 432
      url.searchParams.append('classId', String(classId));

      if (query && query.trim() !== '') {
        url.searchParams.append('searchFilter', query.trim());
      }
      if (mcVersion) {
        url.searchParams.append('gameVersion', mcVersion);
      }
      // Para Texturas (resourcepacks) y Shaders NO enviar modLoaderType
      if ((contentType === 'mods' || contentType === 'modpacks') && cfLoader > 0) {
        url.searchParams.append('modLoaderType', String(cfLoader));
      }

      // Filtro de categoría temática si aplica
      if (category && category !== 'all' && CF_CATEGORY_IDS[category]) {
        url.searchParams.append('categoryId', String(CF_CATEGORY_IDS[category]));
      }

      // Ordenamiento
      if (sortBy === 'name') {
        url.searchParams.append('sortField', '4'); // Name
        url.searchParams.append('sortOrder', 'asc');
      } else if (sortBy === 'updated') {
        url.searchParams.append('sortField', '3'); // LastUpdated
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
        }
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

      const mapped = mods.map((mod) => ({
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
        categories: (mod.categories || []).map((c) => c.name)
      }));

      return { items: mapped, totalCount };
    } catch (err) {
      logger.error('[CurseForge Exception]:', err.message);
      return { items: [], totalCount: 0 };
    }
  }

  /**
   * Búsqueda específica en Modrinth API para cualquier categoría
   */
  async _searchModrinthContent(query, mcVersion, loader, contentType, limit, offset, sortBy = 'popular', category = 'all') {
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
        headers: { 'User-Agent': USER_AGENT }
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

      const mapped = hits.map((hit) => ({
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
        categories: hit.categories || []
      }));

      return { items: mapped, totalCount };
    } catch (err) {
      logger.error('[Modrinth Exception]:', err.message);
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
        onProgress
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

    // Fallback sin filtros si no se encontró con versión o loader específico
    if (files.length === 0) {
      res = await fetch(`${CURSEFORGE_API_URL}/mods/${projectId}/files`, {
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

    if (files.length === 0) return null;

    const file = files[0];

    // Dependencias obligatorias en CurseForge: relationType === 3 (RequiredDependency)
    const requiredDependencies = (file.dependencies || [])
      .filter((dep) => dep.relationType === 3 && dep.modId)
      .map((dep) => String(dep.modId));

    let downloadUrl = file.downloadUrl;
    if (!downloadUrl && file.id && file.fileName) {
      downloadUrl = this._buildCurseForgeEdgeUrl(file.id, file.fileName);
    }

    return {
      fileName: file.fileName,
      displayName: file.displayName || file.fileName,
      fileId: String(file.id),
      downloadUrl: downloadUrl,
      versionNumber: file.gameVersions ? file.gameVersions.join(', ') : '',
      requiredDependencies
    };
  }

  async _downloadStream(url, destPath, onProgress = null) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${url}`);

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
        return JSON.parse(raw);
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
      const entries = zip.getEntries();

      let meta = {
        name: null,
        modId: null,
        version: null,
        author: null,
        description: null,
        iconBase64: null
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

        if (nameMatch) meta.name = nameMatch[1];
        if (modIdMatch) meta.modId = modIdMatch[1];
        if (verMatch && verMatch[1] !== '${file.jarVersion}') meta.version = verMatch[1];
        if (authorMatch) meta.author = authorMatch[1];
        if (logoMatch) logoFileName = logoMatch[1];
        if (descMatch) meta.description = (descMatch[1] || descMatch[2] || '').trim();
      } else if (fabricEntry) {
        try {
          const json = JSON.parse(fabricEntry.getData().toString('utf8'));
          meta.name = json.name;
          meta.modId = json.id;
          meta.version = json.version;
          meta.description = json.description;
          if (Array.isArray(json.authors)) {
            meta.author = json.authors.map((a) => (typeof a === 'string' ? a : (a.name || ''))).filter(Boolean).join(', ');
          } else if (typeof json.authors === 'string') {
            meta.author = json.authors;
          }
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

      let iconEntry = null;
      if (logoFileName) {
        const cleanLogo = logoFileName.replace(/^[/\\]+/, '');
        iconEntry = zip.getEntry(cleanLogo) ||
                    zip.getEntry(logoFileName) ||
                    (meta.modId ? zip.getEntry('assets/' + meta.modId + '/' + cleanLogo) : null);
        if (!iconEntry) {
          iconEntry = entries.find((e) => e.entryName.toLowerCase().endsWith(cleanLogo.toLowerCase()) && !e.isDirectory);
        }
      }

      if (!iconEntry) {
        const commonNames = ['logo.png', 'icon.png', 'pack.png'];
        for (const cn of commonNames) {
          iconEntry = zip.getEntry(cn);
          if (iconEntry) break;
          if (meta.modId) {
            iconEntry = zip.getEntry('assets/' + meta.modId + '/' + cn) ||
                        zip.getEntry('assets/' + meta.modId + '/textures/gui/' + cn);
            if (iconEntry) break;
          }
        }
        if (!iconEntry) {
          iconEntry = entries.find((e) => {
            const l = e.entryName.toLowerCase();
            return l.endsWith('.png') && (l.includes('icon') || l.includes('logo')) && !e.isDirectory;
          });
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
    const filesOnDisk = fs.readdirSync(modsDir);
    const validFiles = new Set(filesOnDisk.filter((f) => f.endsWith('.jar') || f.endsWith('.jar.disabled')));

    // 1. Detectar archivos introducidos manualmente o ya existentes (source: "custom", etc.)
    validFiles.forEach((file) => {
      const isEnabled = !file.endsWith('.disabled');
      const baseName = file.replace(/\.disabled$/i, '');
      const filePath = path.join(modsDir, file);

      let sizeFormatted = '';
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          const bytes = stats.size;
          if (bytes >= 1024 * 1024) {
            sizeFormatted = (bytes / (1024 * 1024)).toFixed(1) + ' MB';
          } else if (bytes >= 1024) {
            sizeFormatted = (bytes / 1024).toFixed(0) + ' KB';
          } else {
            sizeFormatted = bytes + ' B';
          }
        }
      } catch (e) {}

      const existingKey = Object.keys(lockData.mods).find(
        (k) => k === file || k === baseName || `${k}.disabled` === file
      );

      const cleanTitle = this._cleanJarName(file);

      if (!existingKey) {
        logger.info(`[Auto-Detect] Mod manual detectado en /mods: ${file}. Analizando metadatos internos del .jar...`);
        const jarMeta = this._extractJarMetadata(filePath);
        const resolvedTitle = (jarMeta && jarMeta.name) ? jarMeta.name : cleanTitle;
        const resolvedAuthor = (jarMeta && jarMeta.author) ? jarMeta.author : null;
        const resolvedVersion = (jarMeta && jarMeta.version) ? jarMeta.version : 'custom';
        const resolvedSummary = (jarMeta && jarMeta.description) ? jarMeta.description : null;
        const resolvedIcon = (jarMeta && jarMeta.iconBase64) ? jarMeta.iconBase64 : null;

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
          summary: resolvedSummary
        };
      } else {
        const modEntry = lockData.mods[existingKey];
        if (existingKey !== file) {
          delete lockData.mods[existingKey];
          modEntry.fileName = file;
          lockData.mods[file] = modEntry;
        }
        modEntry.enabled = isEnabled;
        modEntry.sizeFormatted = sizeFormatted || modEntry.sizeFormatted || '';

        // Corregir valores nulos, vacíos o "undefined"
        if (!modEntry.displayName || modEntry.displayName === 'undefined' || modEntry.displayName.trim() === '') {
          modEntry.displayName = cleanTitle;
        }
        if (!modEntry.name || modEntry.name === 'undefined' || modEntry.name.trim() === '') {
          modEntry.name = modEntry.displayName || cleanTitle;
        }
        if (!modEntry.source || modEntry.source === 'undefined' || modEntry.source.trim() === '') {
          modEntry.source = 'custom';
        }

        // Si le falta icono o autor, intentar extraerlo localmente del .jar
        if (!modEntry.iconUrl || !modEntry.author) {
          const jarMeta = this._extractJarMetadata(filePath);
          if (jarMeta) {
            if (jarMeta.iconBase64 && !modEntry.iconUrl) modEntry.iconUrl = jarMeta.iconBase64;
            if (jarMeta.author && !modEntry.author) modEntry.author = jarMeta.author;
            if (jarMeta.description && !modEntry.summary) modEntry.summary = jarMeta.description;
            if (jarMeta.name && (!modEntry.displayName || modEntry.displayName === 'undefined' || modEntry.displayName === cleanTitle)) {
              modEntry.displayName = jarMeta.name;
              modEntry.name = jarMeta.name;
            }
            if (jarMeta.version && (!modEntry.versionNumber || modEntry.versionNumber === 'custom')) {
              modEntry.versionNumber = jarMeta.version;
              modEntry.version = jarMeta.version;
            }
          }
        }
      }
    });

    // 2. Limpiar del lockfile los mods eliminados físicamente
    Object.keys(lockData.mods).forEach((key) => {
      if (!validFiles.has(key) && !validFiles.has(`${key}.disabled`)) {
        logger.debug(`Mod ${key} eliminado del disco. Removiendo de mods-lock.json.`);
        delete lockData.mods[key];
      }
    });

    lockData.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this._getLockFilePath(activeInstance), JSON.stringify(lockData, null, 2), 'utf8');

    return Object.values(lockData.mods).map((m) => {
      const clean = this._cleanJarName(m.fileName);
      const displayName = (m.displayName && m.displayName !== 'undefined') ? m.displayName : clean;
      const name = (m.name && m.name !== 'undefined') ? m.name : displayName;
      const source = (m.source && m.source !== 'undefined') ? m.source : 'custom';
      return {
        ...m,
        name,
        displayName,
        source,
        projectId: m.projectId || null,
        fileId: m.fileId || null,
        versionNumber: m.versionNumber || m.version || '',
        sizeFormatted: m.sizeFormatted || ''
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
    const possiblePaths = [path.join(modsDir, cleanBase), path.join(modsDir, `${cleanBase}.disabled`)];

    possiblePaths.forEach((p) => {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
        logger.info(`Archivo de mod eliminado: ${p}`);
      }
    });

    return this.scanAndSyncMods(activeInstance);
  }

  // =========================================================================
  // DETALLES DEL MOD Y SELECTOR DE VERSIONES (MODAL ESTILO CURSEFORGE/MODRINTH)
  // =========================================================================

  async getProjectDetails({ projectId, source = 'modrinth', mcVersion = '1.21.1', loader = 'neoforge' }) {
    logger.info(`[ProjectDetails] Consultando detalles para ${projectId} (${source}) en MC ${mcVersion} (${loader})...`);

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
      let filesUrl = `${CURSEFORGE_API_URL}/mods/${projectId}/files?pageSize=50`;
      if (mcVersion) filesUrl += `&gameVersion=${encodeURIComponent(mcVersion)}`;
      if (cfLoader > 0) filesUrl += `&modLoaderType=${cfLoader}`;

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
          sizeFormatted
        };
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
        files
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
        files
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
    const modEntries = Object.entries(lockData.mods || {});

    // Identificar mods que necesitan icono o autor
    const missing = modEntries.filter(([fileName, mod]) => {
      return !mod.iconUrl || !mod.author;
    });

    if (missing.length === 0) {
      return { success: true, updatedCount: 0 };
    }

    logger.info(`[ModIcons] Resolviendo metadatos e iconos para ${missing.length} mods instalados...`);
    let updatedCount = 0;

    // 1. Modrinth & Custom files con SHA1 hash lookup
    const sha1ToModFiles = new Map();
    for (const [fileName, mod] of missing) {
      const diskPath = path.join(modsDir, fileName);
      const disabledPath = path.join(modsDir, `${fileName}.disabled`);
      const targetPath = fs.existsSync(diskPath) ? diskPath : (fs.existsSync(disabledPath) ? disabledPath : null);

      if (targetPath) {
        try {
          const fileBuf = fs.readFileSync(targetPath);
          const sha1 = crypto.createHash('sha1').update(fileBuf).digest('hex');
          sha1ToModFiles.set(sha1, fileName);
        } catch (e) {
          logger.debug(`No se pudo hashear ${fileName}: ${e.message}`);
        }
      }
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
    const modsList = Object.values(lockData.mods || {});

    logger.info(`[CheckUpdates] Buscando actualizaciones (canal: ${candidateChannel}) para ${modsList.length} mods en MC ${mcVersion} (${loader})...`);

    // 2. Calcular SHA1 y CurseForge Fingerprint (MurmurHash2 32-bit normalizado) de cada archivo .jar físico en disco
    const sha1ToMod = new Map();
    const fpToMod = new Map();
    const cfFingerprints = [];
    const modrinthSha1s = [];

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
          const buf = fs.readFileSync(foundPath);
          const sha1 = crypto.createHash('sha1').update(buf).digest('hex');
          const fp = this.computeCurseForgeFingerprint(buf);
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

    // 7. PASO 5: Comprobación individual de mods Modrinth con projectId no capturados por SHA-1
    const modrinthModsToCheck = modsList.filter((m) => m.source === 'modrinth' && m.projectId && !updatesMap.has(m.fileName));
    for (const m of modrinthModsToCheck.slice(0, 30)) {
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

  async installPerformancePack({ mcVersion = '1.21.1', loader = 'neoforge', instancePath = null, onProgress = null } = {}) {
    logger.info(`⚡ [SHUBATECH] Instalando Pack de Optimización Instantánea para MC ${mcVersion} (${loader.toUpperCase()})...`);

    const activeInstance = instancePath || this.configManager.getInstanceDirectory();
    const normalizedLoader = (loader || 'neoforge').toLowerCase();

    // En 1.21.1 NeoForge se usa Sodium directamente; en 1.20.1 Forge se usa Embeddium
    const mainRendererSlug = (mcVersion.startsWith('1.21') && normalizedLoader === 'neoforge') ? 'sodium' : 'embeddium';

    const performanceSlugs = [
      mainRendererSlug,
      'ferrite-core',
      'modernfix',
      'immediatelyfast',
      'entityculling',
      'clumps'
    ];

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

  async installModpackFile({ packPath, instancePath = null, createProfile = false, onProgress = null }) {
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
      return await this._installModrinthMrpack(zip, modrinthIndexEntry, targetInstance, onProgress, packPath);
    }

    // 2. CurseForge (.zip)
    const cfManifestEntry = zipEntries.find((e) => e.entryName === 'manifest.json');
    if (cfManifestEntry) {
      return await this._installCurseForgeZip(zip, cfManifestEntry, targetInstance, onProgress, packPath);
    }

    throw new Error('El archivo comprimido no contiene un modrinth.index.json ni un manifest.json válido.');
  }

  async _installModrinthMrpack(zip, indexEntry, targetInstance, onProgress, packPath = null) {
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
      const { getProfileManager } = require('../profiles/ProfileManager');
      const profileManager = getProfileManager();
      createdProfile = profileManager.createProfile({
        name: packName,
        mcVersion,
        loader,
        loaderVersion,
        ramMin: '2G',
        ramMax: '8G'
      });
      instancePath = createdProfile.instancePath;
      profileManager.setActive(createdProfile.id);
      logger.info(`[Modpack:Modrinth] Creada nueva instancia para modpack: "${packName}" (${loader} ${mcVersion})`);
    }

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

      await this._downloadStream(downloadUrl, targetPath);

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

    this.purgeDuplicateMods(instancePath);
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

  async _installCurseForgeZip(zip, manifestEntry, targetInstance, onProgress, packPath = null) {
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
      const { getProfileManager } = require('../profiles/ProfileManager');
      const profileManager = getProfileManager();
      createdProfile = profileManager.createProfile({
        name: packName,
        mcVersion,
        loader: loaderInfo.loader,
        loaderVersion: loaderInfo.loaderVersion,
        ramMin: '2G',
        ramMax: '8G'
      });
      instancePath = createdProfile.instancePath;
      profileManager.setActive(createdProfile.id);
      logger.info(`[Modpack:CurseForge] Creada nueva instancia para modpack: "${packName}" (${loaderInfo.loader} ${mcVersion})`);
    }

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

        if (downloadUrl) {
          downloadTasks.push({
            projectID: f.projectID,
            fileID: f.fileID,
            fileData,
            downloadUrl
          });
        } else {
          logger.warn(`[Modpack:CurseForge] Mod ${f.projectID}/${f.fileID} (${fileData.fileName}) sin URL de descarga disponible.`);
        }
      } else {
        logger.warn(`[Modpack:CurseForge] No se pudieron obtener metadatos para Mod ${f.projectID}/${f.fileID}.`);
      }
    }

    let completedCount = 0;
    const totalFiles = downloadTasks.length;
    const lockData = this._readLockFile(instancePath);
    let lockModified = false;

    await this._runWithConcurrency(downloadTasks, 6, async (task) => {
      const { fileData, downloadUrl, projectID, fileID } = task;
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
      await this._downloadStream(downloadUrl, targetPath);

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

    this.purgeDuplicateMods(instancePath);
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

    // Agrupar archivos que representen el mismo mod
    // Dos archivos pertenecen al mismo grupo si comparten projectId (no nulo), internalModId (no nulo) o baseClean (no nulo)
    const groups = [];
    for (const entry of fileEntries) {
      let matchedGroup = null;
      for (const g of groups) {
        const sharesProject = entry.projectId && g.some((x) => x.projectId && x.projectId === entry.projectId);
        const sharesModId = entry.internalModId && g.some((x) => x.internalModId && x.internalModId === entry.internalModId);
        const sharesBase = entry.baseClean && g.some((x) => x.baseClean && x.baseClean === entry.baseClean);

        if (sharesProject || sharesModId || sharesBase) {
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
