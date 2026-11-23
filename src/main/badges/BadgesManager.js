/**
 * ShubaCore - Badges & Milestones Manager
 * Developed by SHUBATECH
 * Sistema avanzado de medallas, logros y progresión con hitos reales (5h, 50h, 500h, mods, etc.)
 */

const fs = require('fs');
const path = require('path');
const { defaultLogger: logger } = require('../utils/logger');
const { getConfigManager } = require('../config/ConfigManager');

const BADGE_DEFINITIONS = [
  // 1. HORAS DE JUEGO (Playtime)
  {
    id: 'playtime_5h',
    category: 'playtime',
    tier: 'bronze',
    title: 'Iniciación Shuba',
    description: 'Juega un total acumulado de 5 horas a Minecraft.',
    icon: '🥉',
    targetHours: 5
  },
  {
    id: 'playtime_50h',
    category: 'playtime',
    tier: 'silver',
    title: 'Explorador Veterano',
    description: 'Supera 50 horas de juego en el launcher.',
    icon: '🥈',
    targetHours: 50
  },
  {
    id: 'playtime_100h',
    category: 'playtime',
    tier: 'gold',
    title: 'Maestro del Bloque',
    description: 'Alcanza 100 horas construyendo y sobreviviendo.',
    icon: '🥇',
    targetHours: 100
  },
  {
    id: 'playtime_500h',
    category: 'playtime',
    tier: 'diamond',
    title: 'Leyenda Viviente (500h)',
    description: 'Un auténtico titán de Minecraft: más de 500 horas de juego registradas.',
    icon: '💎',
    targetHours: 500
  },

  // 2. MODS E INSTANCIAS (Modder)
  {
    id: 'mods_25',
    category: 'modder',
    tier: 'bronze',
    title: 'Pionero Modder',
    description: 'Instala y disfruta de 25 o más mods en una misma instancia.',
    icon: '📦',
    targetMods: 25
  },
  {
    id: 'mods_75',
    category: 'modder',
    tier: 'silver',
    title: 'Ingeniero de Modpacks',
    description: 'Ejecuta una instancia armada con más de 75 mods.',
    icon: '⚙️',
    targetMods: 75
  },
  {
    id: 'mods_150',
    category: 'modder',
    tier: 'diamond',
    title: 'Sobrecarga Titán (150+ Mods)',
    description: 'Carga un modpack masivo de más de 150 mods activos sin crashear.',
    icon: '🚀',
    targetMods: 150
  },

  // 3. COMUNIDAD Y SOCIAL (Social)
  {
    id: 'shubahost_host',
    category: 'social',
    tier: 'silver',
    title: 'Anfitrión ShubaHost',
    description: 'Hostea tu propio servidor multijugador con ShubaHost.',
    icon: '🌐'
  },
  {
    id: 'share_code',
    category: 'social',
    tier: 'bronze',
    title: 'Espíritu Cooperativo',
    description: 'Comparte o descarga un perfil mediante un código corto ShubaCore.',
    icon: '🤝'
  },
  {
    id: 'social_friends',
    category: 'social',
    tier: 'gold',
    title: 'Círculo de Amigos',
    description: 'Agrega a 3 o más amigos a tu red social en ShubaCore.',
    icon: '👥'
  },

  // 4. SEGURIDAD Y HERRAMIENTAS (Tech)
  {
    id: 'crash_doctor_fix',
    category: 'tech',
    tier: 'silver',
    title: 'Cirujano de Mods',
    description: 'Diagnostica y soluciona un conflicto de mods con el Crash Doctor.',
    icon: '🩺'
  },
  {
    id: 'snapshot_created',
    category: 'tech',
    tier: 'bronze',
    title: 'Viajero en el Tiempo',
    description: 'Crea un Punto de Restauración (Snapshot) para blindar tu instancia.',
    icon: '📸'
  },
  {
    id: 'radio_listener',
    category: 'fun',
    tier: 'bronze',
    title: 'Sinfonía Shuba',
    description: 'Disfruta de la Shuba Radio mientras configuras tu launcher.',
    icon: '📻'
  }
];

class BadgesManager {
  constructor() {
    this.configManager = getConfigManager();
  }

  _getUnlockedBadges() {
    try {
      const allCfg = this.configManager.getAll();
      return Array.isArray(allCfg.unlockedBadges) ? allCfg.unlockedBadges : [];
    } catch (_) {
      return [];
    }
  }

  _saveUnlockedBadges(badges) {
    try {
      this.configManager.set('unlockedBadges', badges);
      return true;
    } catch (err) {
      logger.error('[BadgesManager] Error guardando medallas:', err);
      return false;
    }
  }

  /**
   * Obtiene la lista completa de medallas con su estado y porcentaje de progreso
   */
  getBadgesWithProgress(playTimeSeconds = 0, currentModsCount = 0) {
    const unlockedList = this._getUnlockedBadges();
    const currentHours = Math.max(0, playTimeSeconds / 3600);

    return BADGE_DEFINITIONS.map(def => {
      const isAlreadyUnlocked = unlockedList.some(b => b.id === def.id);
      let progressPct = 0;
      let progressText = '';

      if (def.category === 'playtime' && def.targetHours) {
        progressPct = Math.min(100, Math.round((currentHours / def.targetHours) * 100));
        progressText = `${currentHours.toFixed(1)} / ${def.targetHours} horas`;
      } else if (def.category === 'modder' && def.targetMods) {
        progressPct = Math.min(100, Math.round((currentModsCount / def.targetMods) * 100));
        progressText = `${currentModsCount} / ${def.targetMods} mods`;
      } else {
        progressPct = isAlreadyUnlocked ? 100 : 0;
        progressText = isAlreadyUnlocked ? 'Completado' : 'Pendiente';
      }

      // Si el objetivo se cumple en tiempo real, marcar como desbloqueado
      const autoUnlock = !isAlreadyUnlocked && progressPct >= 100;
      if (autoUnlock) {
        this.unlockBadge(def.id);
      }

      const unlockedEntry = unlockedList.find(b => b.id === def.id);

      return {
        id: def.id,
        category: def.category,
        tier: def.tier,
        title: def.title,
        description: def.description,
        icon: def.icon,
        unlocked: isAlreadyUnlocked || autoUnlock,
        unlockedAt: unlockedEntry?.unlockedAt || (autoUnlock ? new Date().toISOString() : null),
        progressPct: isAlreadyUnlocked ? 100 : progressPct,
        progressText: isAlreadyUnlocked ? 'Completado' : progressText
      };
    });
  }

  /**
   * Desbloquea una medalla si no estaba desbloqueada
   */
  unlockBadge(badgeId) {
    const unlockedList = this._getUnlockedBadges();
    if (unlockedList.some(b => b.id === badgeId)) {
      return { success: true, alreadyUnlocked: true };
    }

    const def = BADGE_DEFINITIONS.find(b => b.id === badgeId);
    if (!def) return { success: false, error: 'Medalla inexistente' };

    const newEntry = {
      id: def.id,
      title: def.title,
      unlockedAt: new Date().toISOString()
    };
    unlockedList.push(newEntry);
    this._saveUnlockedBadges(unlockedList);

    logger.info(`[BadgesManager] 🏆 ¡LOGRO DESBLOQUEADO!: "${def.title}" (${def.icon})`);
    return { success: true, badge: def, isNew: true };
  }
}

let badgesManagerInstance = null;
function getBadgesManager() {
  if (!badgesManagerInstance) {
    badgesManagerInstance = new BadgesManager();
  }
  return badgesManagerInstance;
}

module.exports = {
  BadgesManager,
  getBadgesManager,
  BADGE_DEFINITIONS
};
