/**
 * ShubaCore - Badges & Milestones Manager
 * Developed by SHUBATECH
 * Sistema avanzado de medallas, logros y progresión con hitos reales (5h, 50h, 500h, mods, etc.)
 */

const fs = require('fs');
const path = require('path');
const { defaultLogger: logger } = require('../utils/logger');
const { getConfigManager } = require('../config/ConfigManager');

function isOwnerUser(username) {
  if (!username) return false;
  const u = String(username).toLowerCase().trim();
  return u === 'landeralo' || u === 'landaalo' || u === 'shubacore' || u === 'shubacorp' || u === 'chubacorp' ||
         u.includes('landeralo') || u.includes('landaalo') || u.includes('shubacore') || u.includes('chubacorp') || u.includes('shubacorp');
}

// 1. ETAPAS DE ANTIGÜEDAD (Estilo Discord - Árbol / Naturaleza)
const SENIORITY_STAGES = [
  { level: 1, name: 'Semilla', req: 1, reqLabel: '1 año', icon: '1' },
  { level: 2, name: 'Brote', req: 30, reqLabel: '2 años', icon: '2' },
  { level: 3, name: 'Retoño', req: 60, reqLabel: '3 años', icon: '3' },
  { level: 4, name: 'Cogollo', req: 90, reqLabel: '4 años', icon: '4' },
  { level: 5, name: 'Flor', req: 180, reqLabel: '5 años', icon: '5' },
  { level: 6, name: 'Roble', req: 365, reqLabel: '6 años', icon: '6' },
  { level: 7, name: 'Secuoya', req: 730, reqLabel: '7 años', icon: '7' },
  { level: 8, name: 'Pino', req: 1095, reqLabel: '8 años', icon: '8' },
  { level: 9, name: 'Estromatolito', req: 1460, reqLabel: '9 años', icon: '9' },
  { level: 10, name: 'Primordial', req: 1825, reqLabel: 'Más de 10 años', icon: '⭐' }
];

// 2. ETAPAS DE HORAS DE JUEGO (Estilo Discord - Espadas)
const PLAYTIME_STAGES = [
  { level: 1, name: 'Casual', req: 1, reqLabel: '1 hora', icon: '🗡️' },
  { level: 2, name: 'Recreativo', req: 5, reqLabel: '5 horas', icon: '🗡️' },
  { level: 3, name: 'Dedicado', req: 20, reqLabel: '20 horas', icon: '🗡️' },
  { level: 4, name: 'Comprometido', req: 75, reqLabel: '75 horas', icon: '🗡️' },
  { level: 5, name: 'Serio', req: 150, reqLabel: '150 horas', icon: '🗡️' },
  { level: 6, name: 'Entregado', req: 300, reqLabel: '300 horas', icon: '🗡️' },
  { level: 7, name: 'Experimentado', req: 500, reqLabel: '500 horas', icon: '🗡️' },
  { level: 8, name: 'Férreo', req: 1000, reqLabel: '1.000 horas', icon: '🗡️' },
  { level: 9, name: 'Inquebrantable', req: 2000, reqLabel: '2.000 horas', icon: '🗡️' },
  { level: 10, name: 'Eterno', req: 5000, reqLabel: 'Más de 5.000 horas', icon: '🗡️' }
];

// 3. ETAPAS DE MODPACKS JUGADOS (Estilo Discord - Cajas/Paquetes de Mods)
const MODPACKS_STAGES = [
  { level: 1, name: 'Curioso', req: 1, reqLabel: '1 modpack', icon: '📦' },
  { level: 2, name: 'Aprendiz', req: 3, reqLabel: '3 modpacks', icon: '📦' },
  { level: 3, name: 'Aventurero', req: 5, reqLabel: '5 modpacks', icon: '📦' },
  { level: 4, name: 'Entusiasta', req: 10, reqLabel: '10 modpacks', icon: '📦' },
  { level: 5, name: 'Coleccionista', req: 20, reqLabel: '20 modpacks', icon: '📦' },
  { level: 6, name: 'Experto', req: 35, reqLabel: '35 modpacks', icon: '📦' },
  { level: 7, name: 'Maestro de Packs', req: 50, reqLabel: '50 modpacks', icon: '📦' },
  { level: 8, name: 'Sabio Multiverso', req: 75, reqLabel: '75 modpacks', icon: '📦' },
  { level: 9, name: 'Arquitecto Dimensional', req: 100, reqLabel: '100 modpacks', icon: '📦' },
  { level: 10, name: 'Divinidad Modder', req: 150, reqLabel: 'Más de 150 modpacks', icon: '📦' }
];

const BADGE_DEFINITIONS = [
  // 0. EXCLUSIVO DUEÑO Y CREADOR (ShubaCore Network)
  {
    id: 'badge_owner_creator',
    category: 'prestige',
    tier: 'diamond',
    title: '👑 Creador & Dueño Supremo',
    description: 'Fundador y arquitecto maestro de ShubaCore y la red ShubaCore Network.',
    icon: '👑'
  },

  // 1. INSIGNIAS EVOLUTIVAS ESTILO DISCORD
  {
    id: 'badge_evolution_tree',
    category: 'evolution',
    tier: 'evolution',
    title: 'Árbol de Antigüedad',
    description: 'Mantén tu cuenta de ShubaCore activa para subir de nivel esta insignia. El tiempo en la plataforma hará el resto.',
    icon: '🌱',
    isEvolving: true,
    evolutionType: 'seniority'
  },
  {
    id: 'badge_evolution_playtime',
    category: 'evolution',
    tier: 'evolution',
    title: 'Rango de Batalla (Horas)',
    description: 'Juega más horas a Minecraft en ShubaCore para subir de nivel esta insignia y evolucionar tu espada.',
    icon: '🗡️',
    isEvolving: true,
    evolutionType: 'playtime'
  },
  {
    id: 'badge_evolution_modpacks',
    category: 'evolution',
    tier: 'evolution',
    title: 'Odisea de Modpacks',
    description: 'Juega o crea distintos modpacks en ShubaCore (Custom, CurseForge, Modrinth o ShubaClient) para subir de nivel esta insignia.',
    icon: '📦',
    isEvolving: true,
    evolutionType: 'modpacks'
  },

  // 1.5. PRESTIGIO & ESPECIALES
  {
    id: 'early_pioneer',
    category: 'prestige',
    tier: 'diamond',
    title: 'Pionero Fundador',
    description: 'Miembro de la era fundadora de ShubaCore antes del lanzamiento masivo.',
    icon: '👑'
  },
  {
    id: 'night_owl',
    category: 'fun',
    tier: 'bronze',
    title: 'Búho Nocturno',
    description: 'Disfruta de sesiones de juego de madrugada entre medianoche y las 5:00 AM.',
    icon: '🦉'
  },
  {
    id: 'streak_flame',
    category: 'social',
    tier: 'gold',
    title: 'Llama Ardiente',
    description: 'Racha de días activos jugando y conectando con amigos.',
    icon: '🔥'
  },

  // 1.8. HITOS DE HORAS DE JUEGO (Playtime Milestones)
  {
    id: 'playtime_5h',
    category: 'playtime',
    tier: 'bronze',
    title: 'Iniciación Shuba (5h)',
    description: 'Juega un total acumulado de 5 horas a Minecraft en ShubaCore.',
    icon: '🥉',
    targetHours: 5
  },
  {
    id: 'playtime_50h',
    category: 'playtime',
    tier: 'silver',
    title: 'Explorador Veterano (50h)',
    description: 'Supera 50 horas de juego en el launcher.',
    icon: '🥈',
    targetHours: 50
  },
  {
    id: 'playtime_100h',
    category: 'playtime',
    tier: 'gold',
    title: 'Maestro del Bloque (100h)',
    description: 'Alcanza 100 horas construyendo y sobreviviendo en el launcher.',
    icon: '🥇',
    targetHours: 100
  },
  {
    id: 'playtime_500h',
    category: 'playtime',
    tier: 'diamond',
    title: 'Leyenda Viviente (500h)',
    description: 'Acumula más de 500 horas dedicadas a tus mundos y servidores.',
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
  getBadgesWithProgress(playTimeSeconds = 0, currentModsCount = 0, context = {}) {
    const isOwner = Boolean(context.isOwner || isOwnerUser(context.username));
    let unlockedList = this._getUnlockedBadges();
    const currentHours = Math.max(0, playTimeSeconds / 3600);
    const modpacksCount = Math.max(1, Number(context.modpacksCount) || 1);

    return BADGE_DEFINITIONS.map(def => {
      // 0. INSIGNIA EXCLUSIVA DUEÑO & CREADOR
      if (def.id === 'badge_owner_creator') {
        return {
          id: def.id,
          category: def.category,
          tier: def.tier,
          title: def.title,
          description: def.description,
          icon: def.icon,
          unlocked: isOwner,
          unlockedAt: isOwner ? '2026-01-01T00:00:00.000Z' : null,
          progressPct: isOwner ? 100 : 0,
          progressText: isOwner ? 'Dueño Oficial ShubaCore' : 'Exclusivo del Creador'
        };
      }

      // 1. INSIGNIA EVOLUTIVA DE ANTIGÜEDAD (Semilla -> Brote -> Árbol)
      if (def.id === 'badge_evolution_tree') {
        let createdDate = new Date('2026-01-01');
        if (context.createdAt) {
          const parsed = new Date(context.createdAt);
          if (!isNaN(parsed.getTime())) createdDate = parsed;
        }
        const daysOld = Math.max(1, Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));
        
        let currentIdx = 0;
        for (let i = SENIORITY_STAGES.length - 1; i >= 0; i--) {
          if (daysOld >= SENIORITY_STAGES[i].req) {
            currentIdx = i;
            break;
          }
        }
        if (isOwner) currentIdx = SENIORITY_STAGES.length - 1;

        const currentStage = SENIORITY_STAGES[currentIdx];
        const nextStage = currentIdx + 1 < SENIORITY_STAGES.length ? SENIORITY_STAGES[currentIdx + 1] : null;
        const missingDays = nextStage ? Math.max(1, nextStage.req - daysOld) : 0;
        const missingText = isOwner ? '¡Nivel Máximo Alcanzado!' : (nextStage ? `${missingDays} días más` : '¡Nivel Máximo Alcanzado!');

        const prevReq = currentStage.req;
        const nextReq = nextStage ? nextStage.req : prevReq;
        const progressPct = isOwner ? 100 : (nextStage ? Math.min(100, Math.max(5, Math.round(((daysOld - prevReq) / (nextReq - prevReq)) * 100))) : 100);

        const stages = SENIORITY_STAGES.map((s, idx) => ({
          level: s.level,
          name: s.name,
          reqLabel: s.reqLabel,
          icon: s.icon,
          unlocked: isOwner || currentIdx >= idx,
          isCurrent: isOwner ? (idx === SENIORITY_STAGES.length - 1) : (currentIdx === idx)
        }));

        const safeIso = !isNaN(createdDate.getTime()) ? createdDate.toISOString() : '2026-01-01T00:00:00.000Z';

        return {
          id: def.id,
          category: def.category,
          tier: 'evolution',
          title: `Antigüedad: ${currentStage.name}`,
          description: def.description,
          icon: currentStage.icon,
          unlocked: true,
          unlockedAt: safeIso,
          progressPct,
          progressText: isOwner ? 'Primordial (Dueño ShubaCore)' : `${daysOld} días (${currentStage.name})`,
          isEvolving: true,
          evolutionType: 'seniority',
          currentStage,
          nextStage,
          missingText,
          stages
        };
      }

      // 2. INSIGNIA EVOLUTIVA DE HORAS DE JUEGO (Espadas)
      if (def.id === 'badge_evolution_playtime') {
        let currentIdx = 0;
        for (let i = PLAYTIME_STAGES.length - 1; i >= 0; i--) {
          if (currentHours >= PLAYTIME_STAGES[i].req) {
            currentIdx = i;
            break;
          }
        }
        if (isOwner) currentIdx = PLAYTIME_STAGES.length - 1;

        const currentStage = PLAYTIME_STAGES[currentIdx];
        const nextStage = currentIdx + 1 < PLAYTIME_STAGES.length ? PLAYTIME_STAGES[currentIdx + 1] : null;
        const missingHours = nextStage ? Math.max(1, Math.ceil(nextStage.req - currentHours)) : 0;
        const missingText = isOwner ? '¡Nivel Máximo Alcanzado!' : (nextStage ? `Hacen falta ${missingHours} horas más de juego` : '¡Nivel Máximo Alcanzado!');

        const prevReq = currentStage.req;
        const nextReq = nextStage ? nextStage.req : prevReq;
        const progressPct = isOwner ? 100 : (nextStage ? Math.min(100, Math.max(5, Math.round(((currentHours - prevReq) / (nextReq - prevReq)) * 100))) : 100);

        const stages = PLAYTIME_STAGES.map((s, idx) => ({
          level: s.level,
          name: s.name,
          reqLabel: s.reqLabel,
          icon: s.icon,
          unlocked: isOwner || currentIdx >= idx,
          isCurrent: isOwner ? (idx === PLAYTIME_STAGES.length - 1) : (currentIdx === idx)
        }));

        return {
          id: def.id,
          category: def.category,
          tier: 'evolution',
          title: `Rango: ${currentStage.name}`,
          description: def.description,
          icon: currentStage.icon,
          unlocked: true,
          unlockedAt: '2026-01-01T00:00:00.000Z',
          progressPct,
          progressText: isOwner ? 'Eterno (Dueño ShubaCore)' : `${currentHours.toFixed(1)} hrs (${currentStage.name})`,
          isEvolving: true,
          evolutionType: 'playtime',
          currentStage,
          nextStage,
          missingText,
          stages
        };
      }

      // 3. INSIGNIA EVOLUTIVA DE MODPACKS JUGADOS (Cajas de Modpacks)
      if (def.id === 'badge_evolution_modpacks') {
        let currentIdx = 0;
        for (let i = MODPACKS_STAGES.length - 1; i >= 0; i--) {
          if (modpacksCount >= MODPACKS_STAGES[i].req) {
            currentIdx = i;
            break;
          }
        }
        if (isOwner) currentIdx = MODPACKS_STAGES.length - 1;

        const currentStage = MODPACKS_STAGES[currentIdx];
        const nextStage = currentIdx + 1 < MODPACKS_STAGES.length ? MODPACKS_STAGES[currentIdx + 1] : null;
        const missingPacks = nextStage ? Math.max(1, nextStage.req - modpacksCount) : 0;
        const missingText = isOwner ? '¡Nivel Máximo Alcanzado!' : (nextStage ? `Hacen falta ${missingPacks} modpacks más` : '¡Nivel Máximo Alcanzado!');

        const prevReq = currentStage.req;
        const nextReq = nextStage ? nextStage.req : prevReq;
        const progressPct = isOwner ? 100 : (nextStage ? Math.min(100, Math.max(5, Math.round(((modpacksCount - prevReq) / (nextReq - prevReq)) * 100))) : 100);

        const stages = MODPACKS_STAGES.map((s, idx) => ({
          level: s.level,
          name: s.name,
          reqLabel: s.reqLabel,
          icon: s.icon,
          unlocked: isOwner || currentIdx >= idx,
          isCurrent: isOwner ? (idx === MODPACKS_STAGES.length - 1) : (currentIdx === idx)
        }));

        return {
          id: def.id,
          category: def.category,
          tier: 'evolution',
          title: `Modpacks: ${currentStage.name}`,
          description: def.description,
          icon: currentStage.icon,
          unlocked: true,
          unlockedAt: '2026-01-01T00:00:00.000Z',
          progressPct,
          progressText: isOwner ? 'Divinidad Modder (Dueño ShubaCore)' : `${modpacksCount} modpacks (${currentStage.name})`,
          isEvolving: true,
          evolutionType: 'modpacks',
          currentStage,
          nextStage,
          missingText,
          stages
        };
      }

      // 4. INSIGNIA PIONERO FUNDADOR
      if (def.id === 'early_pioneer') {
        return {
          id: def.id,
          category: def.category,
          tier: def.tier,
          title: def.title,
          description: def.description,
          icon: def.icon,
          unlocked: true,
          unlockedAt: '2026-01-01T00:00:00.000Z',
          progressPct: 100,
          progressText: 'Pionero Alfa ShubaCore'
        };
      }

      // 5. INSIGNIA BÚHO NOCTURNO (Medianoche a 5 AM)
      if (def.id === 'night_owl') {
        const hour = new Date().getHours();
        if (hour >= 0 && hour <= 5) {
          this.unlockBadge('night_owl');
        }
      }

      // Si es el Dueño, desbloquear absolutamente todas las medallas
      if (isOwner) {
        return {
          id: def.id,
          category: def.category,
          tier: def.tier,
          title: def.title,
          description: def.description,
          icon: def.icon,
          unlocked: true,
          unlockedAt: '2026-01-01T00:00:00.000Z',
          progressPct: 100,
          progressText: 'Completado (Dueño ShubaCore)'
        };
      }

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
   * Obtiene la lista de IDs de medallas equipadas para el perfil
   */
  getEquippedBadges() {
    try {
      const allCfg = this.configManager.getAll();
      if (Array.isArray(allCfg.equippedBadges) && allCfg.equippedBadges.length > 0) {
        return allCfg.equippedBadges;
      }
      return ['badge_owner_creator', 'badge_evolution_tree', 'badge_evolution_playtime', 'badge_evolution_modpacks', 'early_pioneer'];
    } catch (_) {
      return ['badge_owner_creator', 'badge_evolution_tree', 'badge_evolution_playtime'];
    }
  }

  /**
   * Guarda las insignias equipadas (máximo 5)
   */
  setEquippedBadges(badgeIds) {
    try {
      if (!Array.isArray(badgeIds)) return { success: false, error: 'Lista inválida' };
      const limited = badgeIds.slice(0, 5);
      this.configManager.set('equippedBadges', limited);
      logger.info(`[BadgesManager] Insignias equipadas: ${limited.join(', ')}`);
      return { success: true, equippedBadges: limited };
    } catch (err) {
      logger.error('[BadgesManager] Error guardando insignias equipadas:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Alterna equipar/desequipar una insignia
   */
  toggleEquipBadge(badgeId) {
    let equipped = this.getEquippedBadges();
    if (equipped.includes(badgeId)) {
      equipped = equipped.filter(id => id !== badgeId);
    } else {
      if (equipped.length >= 5) {
        return { success: false, error: 'Máximo 5 insignias equipadas simultáneamente.', equippedBadges: equipped };
      }
      equipped.push(badgeId);
    }
    return this.setEquippedBadges(equipped);
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
