/**
 * ShubaCore - Controller Mapping Manager
 * Developed by SHUBATECH
 *
 * Manages button mappings, action bindings, and controller-map.json persistence
 * for the native GLFW Controller Java Agent without any mods in mods/.
 */

const fs = require('fs');
const path = require('path');
const { defaultLogger: logger } = require('../utils/logger');

const CONTROLLER_MAP_VERSION = '1.1.0';

const AVAILABLE_ACTIONS = [
  { id: 'jump', label: 'Saltar', key: 'Space', desc: 'Espacio (Salto del jugador)' },
  { id: 'attack', label: 'Atacar / Romper', key: 'Mouse1', desc: 'Clic Izquierdo (Golpe/Minería)' },
  { id: 'use', label: 'Usar / Poner Bloque', key: 'Mouse2', desc: 'Clic Derecho (Colocar/Interactuar)' },
  { id: 'inventory', label: 'Inventario', key: 'E', desc: 'Tecla E (Abrir/Cerrar inventario)' },
  { id: 'sneak', label: 'Agacharse', key: 'Shift', desc: 'Shift (Sneak/Sigilo)' },
  { id: 'sprint', label: 'Correr', key: 'Control', desc: 'Ctrl (Sprint/Carrera)' },
  { id: 'drop', label: 'Soltar Ítem', key: 'Q', desc: 'Tecla Q (Tirar objeto en mano)' },
  { id: 'pause', label: 'Menú / Pausa', key: 'Escape', desc: 'Escape (Menú de pausa/Atrás)' },
  { id: 'f5', label: 'Cambiar Perspectiva (F5)', key: 'F5', desc: 'Tecla F5 (1ra/3ra persona)' },
  { id: 'chat', label: 'Abrir Chat (T)', key: 'T', desc: 'Tecla T (Abrir cuadro de chat)' },
  { id: 'swap_hand', label: 'Cambiar de Mano (F)', key: 'F', desc: 'Tecla F (Mano secundaria)' },
  { id: 'prev_item', label: 'Hotbar Izquierda', key: 'WheelUp', desc: 'Slot anterior de la barra' },
  { id: 'next_item', label: 'Hotbar Derecha', key: 'WheelDown', desc: 'Slot siguiente de la barra' },
  { id: 'player_list', label: 'Lista Jugadores (Tab)', key: 'Tab', desc: 'Tab (Ver lista de jugadores)' },
  { id: 'f3', label: 'Pantalla Debug (F3)', key: 'F3', desc: 'Tecla F3 (Coordenadas y F3)' },
  { id: 'advancements', label: 'Logros (L)', key: 'L', desc: 'Tecla L (Ventana de avances)' },
  { id: 'zoom', label: 'Zoom Óptico (C)', key: 'C', desc: 'Tecla C (Zoom)' },
  { id: 'none', label: 'Sin Asignar', key: '', desc: 'Desactivado para este botón' }
];

const DEFAULT_BUTTON_MAP = {
  '0': { name: 'A', label: 'Botón A (Verde)', action: 'jump', key: 'Space' },
  '1': { name: 'B', label: 'Botón B (Rojo)', action: 'drop', key: 'Q' },
  '2': { name: 'X', label: 'Botón X (Azul)', action: 'swap_hand', key: 'F' },
  '3': { name: 'Y', label: 'Botón Y (Amarillo)', action: 'inventory', key: 'E' },
  '4': { name: 'LB', label: 'Bumper Izquierdo (LB)', action: 'prev_item', key: 'WheelUp' },
  '5': { name: 'RB', label: 'Bumper Derecho (RB)', action: 'next_item', key: 'WheelDown' },
  '6': { name: 'LT', label: 'Gatillo Izquierdo (LT)', action: 'use', key: 'Mouse2' },
  '7': { name: 'RT', label: 'Gatillo Derecho (RT)', action: 'attack', key: 'Mouse1' },
  '8': { name: 'Select', label: 'Botón View (⧉) / Select', action: 'player_list', key: 'Tab' },
  '9': { name: 'Start', label: 'Botón Menu (≡) / Start', action: 'pause', key: 'Escape' },
  '10': { name: 'LS', label: 'Click Stick Izq (LS/L3) Correr', action: 'sprint', key: 'Control' },
  '11': { name: 'RS', label: 'Click Stick Der (RS/R3) Agacharse', action: 'sneak', key: 'Shift' },
  '12': { name: 'DPad_Up', label: 'D-Pad Arriba (Chat)', action: 'chat', key: 'T' },
  '13': { name: 'DPad_Down', label: 'D-Pad Abajo (Perspectiva F5)', action: 'f5', key: 'F5' },
  '14': { name: 'DPad_Left', label: 'D-Pad Izquierda (Info F3)', action: 'f3', key: 'F3' },
  '15': { name: 'DPad_Right', label: 'D-Pad Derecha (Logros L)', action: 'advancements', key: 'L' }
};

class ControllerMapManager {
  /**
   * Obtiene la lista de acciones asignables
   */
  getAvailableActions() {
    return AVAILABLE_ACTIONS;
  }

  /**
   * Obtiene la plantilla de mapeo por defecto (Xbox / Bedrock Standard)
   */
  getDefaultMapping() {
    return {
      version: CONTROLLER_MAP_VERSION,
      preset: 'Xbox / Bedrock Standard',
      updatedAt: new Date().toISOString(),
      deadzone: 0.15,
      sensitivityX: 1.0,
      sensitivityY: 1.0,
      invertY: false,
      buttons: JSON.parse(JSON.stringify(DEFAULT_BUTTON_MAP))
    };
  }

  /**
   * Obtiene la ruta del archivo controller-map.json para una instancia dada
   */
  getMapFilePath(instanceDir) {
    if (!instanceDir || typeof instanceDir !== 'string') return null;
    return path.join(instanceDir, 'controller-map.json');
  }

  /**
   * Lee el mapeo configurado en una instancia. Si no existe, devuelve el por defecto
   * y opcionalmente lo crea.
   */
  getMapping(instanceDir, autoCreate = true) {
    if (!instanceDir || typeof instanceDir !== 'string') {
      return this.getDefaultMapping();
    }

    const mapPath = this.getMapFilePath(instanceDir);
    if (fs.existsSync(mapPath)) {
      try {
        const raw = fs.readFileSync(mapPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.buttons === 'object') {
          // Asegurar que contenga todos los botones del mapping por defecto si falta alguno
          const def = this.getDefaultMapping();
          parsed.buttons = { ...def.buttons, ...parsed.buttons };
          return parsed;
        }
      } catch (err) {
        logger.warn(`[ControllerMapManager] Error leyendo ${mapPath}, restaurando mapa por defecto: ${err.message}`);
      }
    }

    const defaultMap = this.getDefaultMapping();
    if (autoCreate) {
      try {
        if (!fs.existsSync(instanceDir)) {
          fs.mkdirSync(instanceDir, { recursive: true });
        }
        fs.writeFileSync(mapPath, JSON.stringify(defaultMap, null, 2), 'utf8');
        logger.info(`[ControllerMapManager] Creado controller-map.json por defecto en: ${mapPath}`);
      } catch (writeErr) {
        logger.warn(`[ControllerMapManager] No se pudo escribir controller-map.json inicial: ${writeErr.message}`);
      }
    }
    return defaultMap;
  }

  /**
   * Guarda un mapeo de controles en el archivo controller-map.json de la instancia
   */
  saveMapping(instanceDir, mappingData) {
    if (!instanceDir || typeof instanceDir !== 'string') {
      throw new Error('Directorio de instancia inválido para guardar controller-map.json');
    }

    const mapPath = this.getMapFilePath(instanceDir);
    if (!fs.existsSync(instanceDir)) {
      fs.mkdirSync(instanceDir, { recursive: true });
    }

    const current = this.getMapping(instanceDir, false);
    const toSave = {
      version: CONTROLLER_MAP_VERSION,
      preset: mappingData?.preset || current.preset || 'Personalizado',
      updatedAt: new Date().toISOString(),
      deadzone: typeof mappingData?.deadzone === 'number' ? mappingData.deadzone : current.deadzone,
      sensitivityX: typeof mappingData?.sensitivityX === 'number' ? mappingData.sensitivityX : current.sensitivityX,
      sensitivityY: typeof mappingData?.sensitivityY === 'number' ? mappingData.sensitivityY : current.sensitivityY,
      invertY: typeof mappingData?.invertY === 'boolean' ? mappingData.invertY : current.invertY,
      buttons: mappingData?.buttons || current.buttons || DEFAULT_BUTTON_MAP
    };

    fs.writeFileSync(mapPath, JSON.stringify(toSave, null, 2), 'utf8');
    logger.info(`[ControllerMapManager] ✅ controller-map.json guardado exitosamente en: ${mapPath}`);
    return toSave;
  }

  /**
   * Restablece el mapeo de la instancia al predeterminado
   */
  resetToDefault(instanceDir) {
    const def = this.getDefaultMapping();
    return this.saveMapping(instanceDir, def);
  }

  /**
   * Asegura que el archivo controller-map.json exista en la instancia antes de lanzar el juego
   */
  ensureMappingFile(instanceDir) {
    return this.getMapping(instanceDir, true);
  }
}

let controllerMapInstance = null;
function getControllerMapManager() {
  if (!controllerMapInstance) {
    controllerMapInstance = new ControllerMapManager();
  }
  return controllerMapInstance;
}

module.exports = {
  ControllerMapManager,
  getControllerMapManager,
  AVAILABLE_ACTIONS,
  DEFAULT_BUTTON_MAP
};
