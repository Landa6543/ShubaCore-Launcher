/**
 * ShubaCore - Live News & Announcements Feed Manager (Bloque ShubaCore Pro)
 * Developed by SHUBATECH
 *
 * Fetches real-time announcements, changelogs, and community alerts
 * directly from GitHub repositories (news.json or GitHub API).
 */

const fs = require('fs');
const path = require('path');
const { defaultLogger: logger } = require('../utils/logger');
const { getConfigManager } = require('../config/ConfigManager');

const NEWS_SOURCES = [
  'https://raw.githubusercontent.com/Landa6543/ShubaCore-Launcher/main/news.json',
  'https://raw.githubusercontent.com/Landa6543/ShubaCore-Mods/main/news.json'
];

const DEFAULT_ANNOUNCEMENTS = [
  {
    id: 'shuba-124-release',
    tag: 'LANZAMIENTO',
    tag_en: 'RELEASE',
    badgeClass: 'badge-primary',
    title: '¡ShubaCore Pro v1.2.4 ya está disponible!',
    title_en: 'ShubaCore Pro v1.2.4 is now available!',
    date: '26 Nov 2026',
    date_en: 'Nov 26, 2026',
    author: 'SHUBATECH Core Team',
    summary: 'Actualización v1.2.4: Botones de Backup (Snapshots) visibles en el gestor de mods, auto-backup completo antes de actualizar, skin 3D en Discord RPC, Crash Doctor mejorado y soporte bilingüe completo.',
    summary_en: 'Update v1.2.4: Visible Backup (Snapshots) buttons in the mod manager, automatic full backup before updating mods, 3D player skin in Discord RPC, improved Crash Doctor, and full bilingual support.',
    changelog: [
      'Botones directos de Backup (Snapshots) en la barra de mods, cabecera de instancia y pestaña de Mundos',
      'Auto-backup preventivo completo (mods, configs, options.txt y mundos) antes de actualizar mods en lote',
      'Skin 3D del jugador en Discord Rich Presence y diagnóstico profundo de Mixins en Crash Doctor',
      'Medallas evolutivas estilo Discord (ShubaBadges) y creación de instancias en Vanilla por defecto'
    ],
    changelog_en: [
      'Direct Backup (Snapshots) buttons in the mods toolbar, instance header, and Worlds tab',
      'Preventive full auto-backup (mods, configs, options.txt, and worlds) before batch-updating mods',
      '3D player skin in Discord Rich Presence and deep Mixin diagnostics in Crash Doctor',
      'Discord-style progressive badges (ShubaBadges) and Vanilla selected by default on new instances'
    ],
    link: 'https://github.com/Landa6543/ShubaCore-Launcher/releases/tag/v1.2.4'
  },
  {
    id: 'shuba-mods-catalog',
    tag: 'CATÁLOGO',
    tag_en: 'CATALOG',
    badgeClass: 'badge-success',
    title: 'Sincronizador y Mods Custom en GitHub Activos',
    title_en: 'GitHub Custom Mods & Sync Active',
    date: '26 Nov 2026',
    date_en: 'Nov 26, 2026',
    author: 'SHUBATECH',
    summary: 'Explora, instala y sube mods privados o modpacks directamente desde Modrinth, CurseForge y Landa6543/ShubaCore-Mods con extracción automática de iconos y detección de actualizaciones.',
    summary_en: 'Browse, install, and upload private mods or modpacks directly from Modrinth, CurseForge, and Landa6543/ShubaCore-Mods with automatic icon extraction and update detection.',
    changelog: [
      'Catálogo unificado de Modrinth, CurseForge y repositorio privado ShubaCore-Mods',
      'Detección de actualizaciones y respaldo automático previo con 1 clic',
      'Tabla optimizada con recorte inteligente de autor y descripción'
    ],
    changelog_en: [
      'Unified catalog across Modrinth, CurseForge, and private ShubaCore-Mods repository',
      '1-click update detection with automatic preventive backup',
      'Optimized mods table with clean author and description truncation'
    ],
    link: 'https://github.com/Landa6543/ShubaCore-Mods'
  }
];

class NewsManager {
  constructor() {
    this.configManager = getConfigManager();
    const rootPath = (typeof this.configManager?.getRootPath === 'function' ? this.configManager.getRootPath() : this.configManager?.configDir) || path.join(process.cwd(), '.shubacore-data');
    this.cacheDir = path.join(rootPath, 'cache');
    this.cacheFile = path.join(this.cacheDir, 'news-feed.json');
    this.cacheTtlMs = 10 * 60 * 1000; // 10 minutos
    this.cachedNews = null;
    this.lastFetched = 0;

    if (!fs.existsSync(this.cacheDir)) {
      try { fs.mkdirSync(this.cacheDir, { recursive: true }); } catch (_) {}
    }
  }

  /**
   * Obtiene la lista de noticias y anuncios en vivo
   */
  async fetchNews(force = false) {
    const now = Date.now();
    if (!force && this.cachedNews && (now - this.lastFetched < this.cacheTtlMs)) {
      return this.cachedNews;
    }

    // Intentar leer caché en disco
    if (!force && fs.existsSync(this.cacheFile)) {
      try {
        const diskCache = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
        if (diskCache.timestamp && (now - diskCache.timestamp < this.cacheTtlMs) && Array.isArray(diskCache.items)) {
          this.cachedNews = diskCache.items;
          this.lastFetched = diskCache.timestamp;
          return this.cachedNews;
        }
      } catch (_) {}
    }

    // Intentar consultar fuentes remotas
    for (const url of NEWS_SOURCES) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'SHUBATECH-ShubaCore-Launcher/1.1.0' },
          cache: 'no-cache'
        });

        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : (data.news || data.announcements || []);
          if (items.length > 0) {
            this.cachedNews = items;
            this.lastFetched = now;
            this._saveDiskCache(items);
            logger.info(`[NewsManager] ${items.length} anuncios cargados desde: ${url}`);
            return items;
          }
        }
      } catch (err) {
        logger.debug(`[NewsManager] No se pudo leer noticias desde ${url}: ${err.message}`);
      }
    }

    // Fallback: usar anuncios por defecto
    this.cachedNews = DEFAULT_ANNOUNCEMENTS;
    this.lastFetched = now;
    this._saveDiskCache(DEFAULT_ANNOUNCEMENTS);
    return DEFAULT_ANNOUNCEMENTS;
  }

  _saveDiskCache(items) {
    try {
      fs.writeFileSync(
        this.cacheFile,
        JSON.stringify({ timestamp: Date.now(), items }, null, 2),
        'utf8'
      );
    } catch (_) {}
  }
}

let newsManagerInstance = null;
function getNewsManager() {
  if (!newsManagerInstance) {
    newsManagerInstance = new NewsManager();
  }
  return newsManagerInstance;
}

module.exports = {
  NewsManager,
  getNewsManager,
  DEFAULT_ANNOUNCEMENTS
};
