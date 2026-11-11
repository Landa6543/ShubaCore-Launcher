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
    id: 'shuba-110-release',
    tag: 'LANZAMIENTO',
    badgeClass: 'badge-primary',
    title: '¡ShubaCore Pro v1.1.0 ya está disponible!',
    date: '11 Nov 2026',
    author: 'SHUBATECH Core Team',
    summary: 'Actualización masiva: Compartir e importar modpacks por código corto (ej. SHUBA-9F2A), Auto-Optimizador de Hardware, Visor 3D de Skins y Servidores Dedicados en 1 clic.',
    link: 'https://github.com/Landa6543/ShubaCore-Launcher'
  },
  {
    id: 'shuba-mods-catalog',
    tag: 'CATÁLOGO',
    badgeClass: 'badge-success',
    title: 'Sincronizador y Mods Custom en GitHub Activos',
    date: '11 Nov 2026',
    author: 'SHUBATECH',
    summary: 'Puedes explorar y subir mods privados directamente a Landa6543/ShubaCore-Mods con extracción automática de iconos e instalación instantánea.',
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
