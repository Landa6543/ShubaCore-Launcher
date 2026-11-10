/**
 * ShubaCore - Native 100% Vanilla Skin Manager
 * Developed by SHUBATECH
 *
 * REGLA DE ORO: Cero dependencias de mods (Sin CustomSkinLoader).
 * Funciona de manera 100% nativa en Vanilla puro y cualquier Modloader:
 * 1. Clonador de Skins Premium conectando directamente a la API oficial de Mojang
 * 2. Asignación de skins desde archivo .PNG local (64x64 / 64x32)
 * 3. Mecanismo 1: Passthrough de UUID oficial de Mojang en modo offline
 * 4. Mecanismo 2: Inyección de Resource Pack nativo "ShubaSkinOverride" que reemplaza
 *    todas las skins base por defecto de Minecraft Vanilla (wide, slim y legacy entity)
 *    y activación automática en options.txt
 */

const fs = require('fs');
const path = require('path');
const { getConfigManager } = require('../config/ConfigManager');
const { defaultLogger: logger } = require('../utils/logger');

// Nombres de skins base de jugadores en Minecraft 1.20+ / 1.21+
const DEFAULT_PLAYER_SKIN_NAMES = [
  'steve.png',
  'alex.png',
  'ari.png',
  'efe.png',
  'kai.png',
  'makena.png',
  'noor.png',
  'sunny.png',
  'zuri.png'
];

class SkinManager {
  constructor(options = {}) {
    this.configManager = options.configManager || getConfigManager();
    this.sharedRoot = options.customSharedRoot || this.configManager.getInstanceDirectory();
    this.skinsDir = path.join(this.sharedRoot, 'skins');
    this.currentSkinPath = path.join(this.skinsDir, 'current_skin.png');

    if (!fs.existsSync(this.skinsDir)) {
      fs.mkdirSync(this.skinsDir, { recursive: true });
    }
  }

  /**
   * Ruta al archivo .png de skin almacenado para un nombre de usuario
   */
  getSkinPath(username) {
    const cleanUser = String(username || 'steve').trim().toLowerCase();
    return path.join(this.skinsDir, `${cleanUser}.png`);
  }

  /**
   * Valida cabecera mágica de archivo PNG (89 50 4E 47 0D 0A 1A 0A)
   */
  _isValidPng(buffer) {
    if (!buffer || buffer.length < 8) return false;
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  /**
   * Formatea un UUID de 32 caracteres hexadecimales al formato canónico 8-4-4-4-12
   */
  _formatUuid(uuid) {
    if (!uuid || typeof uuid !== 'string') return uuid;
    const clean = uuid.replace(/-/g, '');
    if (clean.length !== 32) return uuid;
    return `${clean.substring(0, 8)}-${clean.substring(8, 12)}-${clean.substring(12, 16)}-${clean.substring(16, 20)}-${clean.substring(20)}`;
  }

  /**
   * Determina el pack_format para pack.mcmeta según la versión de Minecraft
   */
  _getPackFormat(mcVersion = '1.21.1') {
    const ver = String(mcVersion || '1.21.1').trim();
    if (ver.startsWith('1.21.4')) return 46;
    if (ver.startsWith('1.21.2') || ver.startsWith('1.21.3')) return 42;
    if (ver.startsWith('1.21')) return 34;
    if (ver.startsWith('1.20.5') || ver.startsWith('1.20.6')) return 32;
    if (ver.startsWith('1.20.3') || ver.startsWith('1.20.4')) return 22;
    if (ver.startsWith('1.20.2')) return 18;
    if (ver.startsWith('1.20')) return 15;
    if (ver.startsWith('1.19.4')) return 13;
    if (ver.startsWith('1.19.3')) return 12;
    if (ver.startsWith('1.19')) return 9;
    if (ver.startsWith('1.18')) return 8;
    if (ver.startsWith('1.17')) return 7;
    if (ver.startsWith('1.16')) return 6;
    if (ver.startsWith('1.15')) return 5;
    if (ver.startsWith('1.13') || ver.startsWith('1.14')) return 4;
    if (ver.startsWith('1.11') || ver.startsWith('1.12')) return 3;
    if (ver.startsWith('1.9') || ver.startsWith('1.10')) return 2;
    if (ver.startsWith('1.8')) return 1;
    return 34;
  }

  /**
   * REQUISITO 1: Consulta oficial directa a la API de Mojang en 2 pasos
   * a) GET https://api.mojang.com/users/profiles/minecraft/<username> -> id, name
   * b) GET https://sessionserver.mojang.com/session/minecraft/profile/<id> -> decodifica base64, extrae textures.SKIN.url y model
   */
  async fetchMojangSkin(username) {
    const cleanUser = String(username || '').trim();
    if (!cleanUser) {
      throw new Error('El nombre de usuario de Mojang no puede estar vacío.');
    }

    logger.info(`[SkinManager] Consultando API oficial de Mojang para el jugador: "${cleanUser}"...`);

    // Paso 1: Perfil de usuario (UUID oficial)
    const userRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(cleanUser)}`, {
      headers: { 'User-Agent': 'SHUBATECH/ShubaCore/1.0.0' }
    });

    if (userRes.status === 404 || userRes.status === 204) {
      throw new Error(`La cuenta premium "${cleanUser}" no existe en los servidores de Mojang.`);
    }

    if (!userRes.ok) {
      throw new Error(`Error en el servidor de Mojang al buscar "${cleanUser}": código ${userRes.status}`);
    }

    const userData = await userRes.json();
    if (!userData || !userData.id) {
      throw new Error(`No se pudo obtener el identificador oficial de "${cleanUser}".`);
    }

    const officialUuidRaw = userData.id;
    const officialName = userData.name || cleanUser;
    const formattedUuid = this._formatUuid(officialUuidRaw);

    // Paso 2: Perfil de sesión con texturas
    logger.info(`[SkinManager] Obteniendo texturas de sesión para UUID: ${officialUuidRaw} (${officialName})...`);
    const sessionRes = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${officialUuidRaw}`, {
      headers: { 'User-Agent': 'SHUBATECH/ShubaCore/1.0.0' }
    });

    if (!sessionRes.ok) {
      throw new Error(`Error al obtener texturas de sesión de Mojang para "${officialName}": código ${sessionRes.status}`);
    }

    const sessionData = await sessionRes.json();
    const texturesProp = sessionData.properties?.find((p) => p.name === 'textures');

    if (!texturesProp || !texturesProp.value) {
      throw new Error(`La cuenta "${officialName}" no tiene texturas de skin registradas en Mojang.`);
    }

    let decoded = null;
    try {
      decoded = JSON.parse(Buffer.from(texturesProp.value, 'base64').toString('utf8'));
    } catch (parseErr) {
      throw new Error(`Fallo al decodificar texturas de Mojang: ${parseErr.message}`);
    }

    const skinUrl = decoded.textures?.SKIN?.url;
    if (!skinUrl) {
      throw new Error(`La cuenta "${officialName}" no tiene una skin personalizada asignada.`);
    }

    const rawModel = decoded.textures?.SKIN?.metadata?.model;
    const skinModel = rawModel === 'slim' ? 'slim' : 'classic';

    logger.info(`[SkinManager] Descargando skin oficial desde textures.minecraft.net (${skinModel})...`);
    const secureSkinUrl = skinUrl.replace(/^http:/, 'https:');
    const imgRes = await fetch(secureSkinUrl, {
      headers: { 'User-Agent': 'SHUBATECH/ShubaCore/1.0.0' }
    });

    if (!imgRes.ok) {
      throw new Error(`Error al descargar archivo de skin desde ${secureSkinUrl}: código ${imgRes.status}`);
    }

    const pngBuffer = Buffer.from(await imgRes.arrayBuffer());
    if (!this._isValidPng(pngBuffer)) {
      throw new Error('El archivo descargado desde los servidores de Mojang no es un PNG válido.');
    }

    const dataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`;

    return {
      success: true,
      officialUuidRaw,
      formattedUuid,
      officialName,
      skinUrl: secureSkinUrl,
      skinModel,
      pngBuffer,
      dataUrl
    };
  }

  /**
   * REQUISITO 1: Clona la skin de un jugador Premium y la guarda localmente
   */
  async setSkinFromMojang(offlineUsername, mojangUsername) {
    const cleanOffline = (offlineUsername || '').trim();
    if (!cleanOffline) throw new Error('El nombre de usuario offline es obligatorio.');

    const mojangInfo = await this.fetchMojangSkin(mojangUsername);

    // Guardar en current_skin.png y en <username>.png
    fs.writeFileSync(this.currentSkinPath, mojangInfo.pngBuffer);
    const userPath = this.getSkinPath(cleanOffline);
    fs.writeFileSync(userPath, mojangInfo.pngBuffer);

    // Persistir metadatos en config.json
    const skinConfig = {
      skinSource: 'premium_clone',
      clonedUuid: mojangInfo.formattedUuid,
      skinModel: mojangInfo.skinModel,
      originalUsername: mojangInfo.officialName,
      updatedAt: new Date().toISOString()
    };
    this.configManager.set('skin', skinConfig);

    logger.info(`[SkinManager] Skin de "${mojangInfo.officialName}" clonada con éxito para "${cleanOffline}". UUID Oficial: ${mojangInfo.formattedUuid}`);

    return {
      success: true,
      username: cleanOffline,
      source: mojangInfo.officialName,
      skinSource: 'premium_clone',
      clonedUuid: mojangInfo.formattedUuid,
      skinModel: mojangInfo.skinModel,
      path: this.currentSkinPath,
      dataUrl: mojangInfo.dataUrl
    };
  }

  /**
   * Asigna una skin desde un archivo PNG local del PC
   */
  async setSkinFromFile(offlineUsername, sourceFilePath) {
    const cleanOffline = (offlineUsername || '').trim();
    if (!cleanOffline) throw new Error('El nombre de usuario offline es obligatorio.');
    if (!fs.existsSync(sourceFilePath)) {
      throw new Error(`El archivo de skin no existe: ${sourceFilePath}`);
    }

    const buf = fs.readFileSync(sourceFilePath);
    if (!this._isValidPng(buf)) {
      throw new Error('El archivo seleccionado no es una imagen PNG válida.');
    }

    fs.writeFileSync(this.currentSkinPath, buf);
    const userPath = this.getSkinPath(cleanOffline);
    fs.writeFileSync(userPath, buf);

    const skinConfig = {
      skinSource: 'local_file',
      clonedUuid: null,
      skinModel: 'classic',
      originalUsername: cleanOffline,
      updatedAt: new Date().toISOString()
    };
    this.configManager.set('skin', skinConfig);

    logger.info(`[SkinManager] Skin local guardada con éxito para "${cleanOffline}" en: ${this.currentSkinPath}`);

    return {
      success: true,
      username: cleanOffline,
      skinSource: 'local_file',
      skinModel: 'classic',
      clonedUuid: null,
      path: this.currentSkinPath,
      dataUrl: `data:image/png;base64,${buf.toString('base64')}`
    };
  }

  /**
   * Obtiene la información de la skin actual
   */
  getSkin(username) {
    let targetPath = null;
    if (fs.existsSync(this.currentSkinPath)) {
      targetPath = this.currentSkinPath;
    } else if (username && fs.existsSync(this.getSkinPath(username))) {
      targetPath = this.getSkinPath(username);
    }

    if (!targetPath) {
      return { exists: false, username };
    }

    try {
      const buffer = fs.readFileSync(targetPath);
      const skinConfig = this.configManager.get('skin') || {};
      return {
        exists: true,
        username,
        path: targetPath,
        dataUrl: `data:image/png;base64,${buffer.toString('base64')}`,
        size: buffer.length,
        config: skinConfig,
        clonedUuid: skinConfig.clonedUuid || null,
        skinSource: skinConfig.skinSource || 'local_file',
        skinModel: skinConfig.skinModel || 'classic'
      };
    } catch (err) {
      logger.error(`Error al leer skin de ${username}:`, err.message);
      return { exists: false, username, error: err.message };
    }
  }

  /**
   * Obtiene la información básica de la skin activa para LaunchManager
   */
  getCurrentSkinInfo(username) {
    const skinConfig = this.configManager.get('skin') || {};
    let skinPath = null;

    if (fs.existsSync(this.currentSkinPath)) {
      skinPath = this.currentSkinPath;
    } else if (username && fs.existsSync(this.getSkinPath(username))) {
      skinPath = this.getSkinPath(username);
    }

    return {
      exists: Boolean(skinPath && fs.existsSync(skinPath)),
      skinPath,
      skinSource: skinConfig.skinSource || (skinPath ? 'local_file' : null),
      clonedUuid: skinConfig.clonedUuid || null,
      skinModel: skinConfig.skinModel || 'classic',
      originalUsername: skinConfig.originalUsername || username
    };
  }

  /**
   * Elimina la skin configurada
   */
  removeSkin(username) {
    let deleted = false;
    if (fs.existsSync(this.currentSkinPath)) {
      fs.unlinkSync(this.currentSkinPath);
      deleted = true;
    }
    const userPath = this.getSkinPath(username);
    if (fs.existsSync(userPath)) {
      fs.unlinkSync(userPath);
      deleted = true;
    }
    this.configManager.set('skin', null);
    logger.info(`[SkinManager] Skin de "${username}" eliminada.`);
    return deleted;
  }

  /**
   * REQUISITO 2: Inyección de Resource Pack Nativo "ShubaSkinOverride" (100% Vanilla sin mods)
   *
   * Crea <instanceDir>/resourcepacks/ShubaSkinOverride/:
   * 1. pack.mcmeta con pack_format compatible y supported_formats [1, 99]
   * 2. Reemplaza todas las 9 skins base por defecto de Minecraft 1.21.1:
   *    - assets/minecraft/textures/entity/player/wide/
   *    - assets/minecraft/textures/entity/player/slim/
   *    - assets/minecraft/textures/entity/ (steve.png y alex.png para versiones previas)
   * 3. Actualiza o crea <instanceDir>/options.txt asegurando que "file/ShubaSkinOverride"
   *    esté en resourcePacks:[...] para que Minecraft lo cargue activado automáticamente.
   */
  async injectSkinResourcePack({ instancePath, username = 'steve', mcVersion = '1.21.1' }) {
    if (!instancePath || !fs.existsSync(instancePath)) {
      return { applied: false, reason: 'invalid_instance_path' };
    }

    // Buscar archivo .png de la skin (current_skin.png o <username>.png)
    let skinSourcePath = null;
    if (fs.existsSync(this.currentSkinPath)) {
      skinSourcePath = this.currentSkinPath;
    } else {
      const userSkin = this.getSkinPath(username);
      if (fs.existsSync(userSkin)) {
        skinSourcePath = userSkin;
      }
    }

    if (!skinSourcePath) {
      logger.info(`[SkinManager] No hay skin personalizada para inyectar en "${instancePath}".`);
      return { applied: false, reason: 'no_skin_found' };
    }

    const skinBuffer = fs.readFileSync(skinSourcePath);

    // 1. Directorio del Resource Pack
    const packDir = path.join(instancePath, 'resourcepacks', 'ShubaSkinOverride');
    if (!fs.existsSync(packDir)) {
      fs.mkdirSync(packDir, { recursive: true });
    }

    // 2. pack.mcmeta nativo universal (1.18 hasta 26.3+)
    const packFormat = 34;
    const mcmeta = {
      pack: {
        pack_format: packFormat,
        supported_formats: {
          min_inclusive: 1,
          max_inclusive: 999
        },
        min_format: 1,
        max_format: 999,
        description: 'ShubaCore Native Skin System'
      }
    };
    fs.writeFileSync(path.join(packDir, 'pack.mcmeta'), JSON.stringify(mcmeta, null, 2), 'utf8');

    // 3. Crear carpetas de destino de texturas
    const wideDir = path.join(packDir, 'assets', 'minecraft', 'textures', 'entity', 'player', 'wide');
    const slimDir = path.join(packDir, 'assets', 'minecraft', 'textures', 'entity', 'player', 'slim');
    const legacyDir = path.join(packDir, 'assets', 'minecraft', 'textures', 'entity');

    fs.mkdirSync(wideDir, { recursive: true });
    fs.mkdirSync(slimDir, { recursive: true });

    // Copiar a todas las 9 skins por defecto en wide y slim
    for (const skinFileName of DEFAULT_PLAYER_SKIN_NAMES) {
      fs.writeFileSync(path.join(wideDir, skinFileName), skinBuffer);
      fs.writeFileSync(path.join(slimDir, skinFileName), skinBuffer);
    }

    // Copiar para versiones legacy (1.8 a 1.19.2)
    fs.writeFileSync(path.join(legacyDir, 'steve.png'), skinBuffer);
    fs.writeFileSync(path.join(legacyDir, 'alex.png'), skinBuffer);

    // 4. Actualizar options.txt para activar automáticamente el Resource Pack
    const optionsPath = path.join(instancePath, 'options.txt');
    this._enablePackInOptionsTxt(optionsPath, 'file/ShubaSkinOverride');

    logger.info(`⚡ [SkinManager] Resource pack nativo ShubaSkinOverride generado exitosamente en: ${packDir}`);
    return {
      applied: true,
      packDir,
      packFormat,
      skinPath: skinSourcePath
    };
  }

  /**
   * Asegura que el resource pack figure en resourcePacks e incompatibleResourcePacks de options.txt
   */
  _enablePackInOptionsTxt(optionsPath, packEntry = 'file/ShubaSkinOverride') {
    try {
      if (!fs.existsSync(optionsPath)) {
        fs.writeFileSync(
          optionsPath,
          `resourcePacks:["vanilla","${packEntry}"]\nincompatibleResourcePacks:["${packEntry}"]\n`,
          'utf8'
        );
        return;
      }

      const content = fs.readFileSync(optionsPath, 'utf8');
      const lines = content.split(/\r?\n/);
      let foundResourcePacks = false;
      let foundIncompatible = false;

      const newLines = lines.map((line) => {
        if (line.startsWith('resourcePacks:')) {
          foundResourcePacks = true;
          const rawVal = line.substring('resourcePacks:'.length).trim();
          let list = [];
          try {
            list = JSON.parse(rawVal);
          } catch (_) {
            list = rawVal.replace(/[\[\]"']/g, '').split(',').map((s) => s.trim()).filter(Boolean);
          }
          if (!Array.isArray(list)) list = [];
          if (!list.includes(packEntry)) {
            list.push(packEntry);
          }
          return `resourcePacks:${JSON.stringify(list)}`;
        }
        if (line.startsWith('incompatibleResourcePacks:')) {
          foundIncompatible = true;
          const rawVal = line.substring('incompatibleResourcePacks:'.length).trim();
          let list = [];
          try {
            list = JSON.parse(rawVal);
          } catch (_) {
            list = rawVal.replace(/[\[\]"']/g, '').split(',').map((s) => s.trim()).filter(Boolean);
          }
          if (!Array.isArray(list)) list = [];
          if (!list.includes(packEntry)) {
            list.push(packEntry);
          }
          return `incompatibleResourcePacks:${JSON.stringify(list)}`;
        }
        return line;
      });

      if (!foundResourcePacks) {
        newLines.push(`resourcePacks:["vanilla","${packEntry}"]`);
      }
      if (!foundIncompatible) {
        newLines.push(`incompatibleResourcePacks:["${packEntry}"]`);
      }

      fs.writeFileSync(optionsPath, newLines.join('\n'), 'utf8');
    } catch (err) {
      logger.warn(`No se pudo actualizar options.txt: ${err.message}`);
    }
  }

  /**
   * Alias retrocompatible con cualquier llamada existente
   */
  async applySkinToInstance(optionsOrPath, maybeUsername) {
    let instancePath, username, mcVersion;
    if (typeof optionsOrPath === 'string') {
      instancePath = optionsOrPath;
      username = maybeUsername;
    } else if (optionsOrPath && typeof optionsOrPath === 'object') {
      ({ username, instancePath, mcVersion = '1.21.1' } = optionsOrPath);
    }
    return this.injectSkinResourcePack({ instancePath, username, mcVersion });
  }
}

let skinManagerInstance = null;
function getSkinManager(options = {}) {
  if (!skinManagerInstance) {
    skinManagerInstance = new SkinManager(options);
  }
  return skinManagerInstance;
}

module.exports = {
  SkinManager,
  getSkinManager,
  DEFAULT_PLAYER_SKIN_NAMES
};
