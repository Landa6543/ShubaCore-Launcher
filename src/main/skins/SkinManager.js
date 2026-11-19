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
    this._mojangProfileCache = new Map();
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
    if (ver.startsWith('26.') || ver.includes('26.3')) return 97;
    if (ver.startsWith('25w') || ver.startsWith('25.')) return 60;
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

    const cacheKey = cleanUser.toLowerCase();
    if (this._mojangProfileCache && this._mojangProfileCache.has(cacheKey)) {
      const cached = this._mojangProfileCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) {
        return cached.data;
      }
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

    // Capa oficial de la cuenta (null si no tiene). Nunca se inventa una capa.
    const rawCapeUrl = decoded.textures?.CAPE?.url || null;
    const capeUrl = rawCapeUrl ? rawCapeUrl.replace(/^http:/, 'https:') : null;

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

    const result = {
      success: true,
      officialUuidRaw,
      formattedUuid,
      officialName,
      skinUrl: secureSkinUrl,
      skinModel,
      capeUrl,
      pngBuffer,
      dataUrl
    };

    if (this._mojangProfileCache) {
      this._mojangProfileCache.set(cacheKey, { data: result, timestamp: Date.now() });
    }

    return result;
  }

  /**
   * Descarga una textura PNG desde el proceso principal y la devuelve como data URL
   * (el renderer no puede cargar textures.minecraft.net directo por CORS).
   */
  async fetchTextureAsDataUrl(url) {
    const clean = String(url || '').trim();
    if (!clean) return null;
    if (clean.startsWith('data:image')) return clean;
    try {
      const res = await fetch(clean.replace(/^http:/, 'https:'), { headers: { 'User-Agent': 'SHUBATECH/ShubaCore/1.0.0' } });
      if (!res.ok) {
        logger.warn(`[SkinManager] Textura no disponible (${res.status}): ${clean}`);
        return null;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (!this._isValidPng(buf)) return null;
      return `data:image/png;base64,${buf.toString('base64')}`;
    } catch (err) {
      logger.warn(`[SkinManager] Error descargando textura: ${err.message}`);
      return null;
    }
  }

  /**
   * Perfil COMPLETO de la cuenta premium: skin activa + TODAS las capas que posee.
   * Usa api.minecraftservices.com con el token de Minecraft (el perfil público solo
   * expone la capa equipada, y a veces ninguna). Si el token falla, cae al perfil público.
   */
  async getAccountProfile(username, mcAccessToken) {
    const out = { success: false, skin: null, capes: [], source: null, error: null };

    if (mcAccessToken && !String(mcAccessToken).startsWith('offline_')) {
      try {
        const res = await fetch('https://api.minecraftservices.com/minecraft/profile', {
          headers: { Authorization: `Bearer ${mcAccessToken}`, 'User-Agent': 'SHUBATECH/ShubaCore/1.0.0' }
        });
        if (res.ok) {
          const prof = await res.json();
          const activeSkin = (prof.skins || []).find((s) => s.state === 'ACTIVE') || (prof.skins || [])[0];
          if (activeSkin && activeSkin.url) {
            const dataUrl = await this.fetchTextureAsDataUrl(activeSkin.url);
            out.skin = { dataUrl, model: String(activeSkin.variant).toUpperCase() === 'SLIM' ? 'slim' : 'classic' };
          }
          const capes = await Promise.all((prof.capes || []).map(async (c) => ({
            id: c.id,
            alias: c.alias || 'Capa',
            active: c.state === 'ACTIVE',
            dataUrl: await this.fetchTextureAsDataUrl(c.url)
          })));
          out.capes = capes.filter((c) => c.dataUrl);
          out.success = true;
          out.source = 'minecraftservices';
          logger.info(`[SkinManager] Perfil premium: ${out.capes.length} capa(s) y skin ${out.skin ? out.skin.model : 'sin skin'}.`);
          return out;
        }
        logger.warn(`[SkinManager] minecraftservices respondió ${res.status}; usando perfil público.`);
      } catch (err) {
        logger.warn(`[SkinManager] Error consultando minecraftservices: ${err.message}`);
      }
    }

    try {
      const info = await this.fetchMojangSkin(username);
      out.skin = { dataUrl: info.dataUrl, model: info.skinModel };
      if (info.capeUrl) {
        const dataUrl = await this.fetchTextureAsDataUrl(info.capeUrl);
        if (dataUrl) out.capes.push({ id: 'public-active', alias: 'Capa equipada', active: true, dataUrl });
      }
      out.success = true;
      out.source = 'public';
    } catch (err) {
      out.error = err.message;
    }
    return out;
  }

  /**
   * Lee un asset PNG de algún client.jar instalado en versions/ (se cachea la lista de jars).
   */
  _readJarAsset(candidatePaths) {
    let AdmZip;
    try { AdmZip = require('adm-zip'); } catch (_) { return null; }

    if (!this._jarList) {
      this._jarList = [];
      const walk = (dir, depth = 0) => {
        if (depth > 3) return;
        let entries = [];
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
        for (const e of entries) {
          const full = path.join(dir, e.name);
          if (e.isDirectory()) walk(full, depth + 1);
          else if (e.isFile() && e.name.toLowerCase().endsWith('.jar')) this._jarList.push(full);
        }
      };
      const roots = new Set([
        this.sharedRoot,
        path.join(process.env.APPDATA || '', '.shubacore'),
        path.join(process.env.APPDATA || '', '.minecraft'),
        path.resolve(this.sharedRoot, '..')
      ]);
      for (const r of roots) walk(path.join(r, 'versions'));
      logger.info(`[SkinManager] Jars encontrados para assets: ${this._jarList.length} (raíz: ${this.sharedRoot})`);
      if (this._jarList.length === 0) this._jarList = null;
    }
    if (!this._jarList) return null;

    for (const jarPath of this._jarList) {
      try {
        const zip = new AdmZip(jarPath);
        for (const p of candidatePaths) {
          const entry = zip.getEntry(p);
          if (!entry) continue;
          const buf = entry.getData();
          if (this._isValidPng(buf)) return buf;
        }
      } catch (_) {}
    }
    return null;
  }

  /**
   * Textura vanilla de élitros. La ruta cambió en 1.21.2+ (equipment/wings), se prueban ambas.
   * Incluye fallback base64 oficial de Mojang si aún no se ha descargado ningún jar de versiones.
   */
  getVanillaElytraTexture() {
    if (this._elytraDataUrlCache) return this._elytraDataUrlCache;
    const buf = this._readJarAsset([
      'assets/minecraft/textures/entity/equipment/wings/elytra.png',
      'assets/minecraft/textures/entity/elytra.png'
    ]);
    if (!buf) {
      logger.info('[SkinManager] Utilizando textura oficial de élitros integrada por defecto.');
      this._elytraDataUrlCache = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAABCklEQVRo3u2YsQoCMRBE820WFiKIjVyhWAgKgliJdmcpNoKljZ8aGWFlCIGDnCK72YHhNOBx82Yj4UL4o4bTRRS3t2fWwboEQKhdAmIwbiJPhqxVBSAHoYop6QJgfhK6AJifAv4PSCFM5tu3qwEgn0ez1Sc8vNyf7UJAWAaA72KEb9YH+wA4MBtrAACbBSBB+crNw5vTVQeA4+URSyFI0xycAag4IpcCSEOn7e/auw4ApQ+Zax1rCK8KQOkEpG2nxnrpvVVMgATnxlOb3gIMgUHw+JveAgIg1z7uKTY9AQiI38tV5Zuivg8pQbl1VQD6nthy7avaAt84suaar+ZlqcvlcrlcLpfrx3oB++zXhEHDmtAAAAAASUVORK5CYII=';
      return this._elytraDataUrlCache;
    }
    this._elytraDataUrlCache = `data:image/png;base64,${buf.toString('base64')}`;
    return this._elytraDataUrlCache;
  }

  /**
   * Las 9 skins por defecto OFICIALES, extraídas del client.jar (no de URLs externas).
   * Cada una se guarda también como archivo para poder aplicarla como skin local.
   */
  getDefaultSkins() {
    if (this._defaultSkinsCache) return this._defaultSkinsCache;
    const defs = [
      { name: 'Steve', file: 'steve', model: 'classic' },
      { name: 'Alex', file: 'alex', model: 'slim' },
      { name: 'Ari', file: 'ari', model: 'classic' },
      { name: 'Efe', file: 'efe', model: 'slim' },
      { name: 'Kai', file: 'kai', model: 'classic' },
      { name: 'Makena', file: 'makena', model: 'slim' },
      { name: 'Noor', file: 'noor', model: 'slim' },
      { name: 'Sunny', file: 'sunny', model: 'classic' },
      { name: 'Zuri', file: 'zuri', model: 'classic' }
    ];
    const outDir = path.join(this.skinsDir, 'defaults');
    try { fs.mkdirSync(outDir, { recursive: true }); } catch (_) {}

    const result = [];
    for (const d of defs) {
      const folder = d.model === 'slim' ? 'slim' : 'wide';
      const buf = this._readJarAsset([
        `assets/minecraft/textures/entity/player/${folder}/${d.file}.png`,
        `assets/minecraft/textures/entity/${d.file}.png`
      ]);
      if (!buf) continue;
      const filePath = path.join(outDir, `${d.file}.png`);
      try { fs.writeFileSync(filePath, buf); } catch (_) {}
      result.push({ name: d.name, model: d.model, filePath, dataUrl: `data:image/png;base64,${buf.toString('base64')}` });
    }
    if (result.length === 0) {
      logger.warn('[SkinManager] No se pudieron extraer skins por defecto de ningún jar.');
      return [];
    }
    this._defaultSkinsCache = result;
    return result;
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
      capeUrl: mojangInfo.capeUrl,
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
      capeUrl: mojangInfo.capeUrl,
      path: this.currentSkinPath,
      dataUrl: mojangInfo.dataUrl
    };
  }

  /**
   * Asigna una skin desde un archivo PNG local del PC o DataURL en base64
   */
  async setSkinFromFile(offlineUsername, sourceFilePathOrDataUrl, skinModel = null) {
    const cleanOffline = (offlineUsername || '').trim();
    if (!cleanOffline) throw new Error('El nombre de usuario es obligatorio.');

    let buf = null;
    if (Buffer.isBuffer(sourceFilePathOrDataUrl)) {
      buf = sourceFilePathOrDataUrl;
    } else if (typeof sourceFilePathOrDataUrl === 'string' && sourceFilePathOrDataUrl.startsWith('data:image')) {
      const parts = sourceFilePathOrDataUrl.split(',');
      if (parts.length > 1) {
        buf = Buffer.from(parts[1], 'base64');
      }
    } else if (typeof sourceFilePathOrDataUrl === 'string' && /^https?:\/\//i.test(sourceFilePathOrDataUrl)) {
      try {
        const response = await fetch(sourceFilePathOrDataUrl);
        if (response.ok) {
          const ab = await response.arrayBuffer();
          buf = Buffer.from(ab);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (fetchErr) {
        throw new Error(`No se pudo descargar la skin desde la URL: ${fetchErr.message}`);
      }
    } else if (typeof sourceFilePathOrDataUrl === 'string') {
      let resolvedPath = sourceFilePathOrDataUrl;
      if (resolvedPath.startsWith('file:///')) {
        resolvedPath = decodeURIComponent(resolvedPath.replace(/^file:\/\/\/?/, ''));
        if (process.platform === 'win32') {
          if (/^\/[a-zA-Z]:/.test(resolvedPath)) {
            resolvedPath = resolvedPath.slice(1);
          }
          resolvedPath = resolvedPath.replace(/\//g, '\\');
        }
      }
      if (fs.existsSync(resolvedPath)) {
        buf = fs.readFileSync(resolvedPath);
      } else {
        throw new Error(`El archivo de skin no existe o formato inválido: ${sourceFilePathOrDataUrl}`);
      }
    } else {
      throw new Error(`El archivo de skin no existe o formato inválido: ${sourceFilePathOrDataUrl}`);
    }

    if (!buf || !this._isValidPng(buf)) {
      throw new Error('El archivo seleccionado no es una imagen PNG válida.');
    }

    fs.writeFileSync(this.currentSkinPath, buf);
    const userPath = this.getSkinPath(cleanOffline);
    fs.writeFileSync(userPath, buf);

    const prevConfig = this.configManager.get('skin') || {};
    const resolvedModel = (skinModel === 'slim' || (!skinModel && prevConfig.skinModel === 'slim')) ? 'slim' : 'classic';

    const skinConfig = {
      skinSource: 'local_file',
      clonedUuid: null,
      skinModel: resolvedModel,
      originalUsername: cleanOffline,
      updatedAt: new Date().toISOString()
    };
    this.configManager.set('skin', skinConfig);

    logger.info(`[SkinManager] Skin local guardada con éxito para "${cleanOffline}" (${resolvedModel}) en: ${this.currentSkinPath}`);

    return {
      success: true,
      username: cleanOffline,
      skinSource: 'local_file',
      skinModel: resolvedModel,
      clonedUuid: null,
      path: this.currentSkinPath,
      dataUrl: `data:image/png;base64,${buf.toString('base64')}`
    };
  }

  /**
   * Persiste la variante de modelo (slim o classic) en la configuración
   */
  setSkinModel(skinModel) {
    const model = String(skinModel).toLowerCase() === 'slim' ? 'slim' : 'classic';
    const skinConfig = this.configManager.get('skin') || {};
    skinConfig.skinModel = model;
    skinConfig.updatedAt = new Date().toISOString();
    this.configManager.set('skin', skinConfig);
    logger.info(`[SkinManager] Variante de skin actualizada a: "${model}"`);
    return { success: true, skinModel: model };
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
   * Sube una skin a los servidores oficiales de Mojang para una cuenta Premium
   */
  async uploadSkinToMojang(mcAccessToken, skinBufferOrPath, variant = 'classic') {
    if (!mcAccessToken) {
      throw new Error('Se requiere un token de acceso de Minecraft válido para subir la skin a Mojang.');
    }

    const varModel = String(variant).toLowerCase() === 'slim' ? 'slim' : 'classic';

    try {
      let buffer = null;
      if (Buffer.isBuffer(skinBufferOrPath)) {
        buffer = skinBufferOrPath;
      } else if (typeof skinBufferOrPath === 'string') {
        if (skinBufferOrPath.startsWith('data:image')) {
          const base64Data = skinBufferOrPath.split(',')[1];
          buffer = Buffer.from(base64Data, 'base64');
        } else if (fs.existsSync(skinBufferOrPath)) {
          buffer = fs.readFileSync(skinBufferOrPath);
        }
      }

      if (!buffer) {
        throw new Error('No se pudo obtener el buffer de la skin para subir a Mojang.');
      }

      const formData = new FormData();
      formData.append('variant', varModel);
      const blob = new Blob([buffer], { type: 'image/png' });
      formData.append('file', blob, 'skin.png');

      logger.info(`[SkinManager] Subiendo skin oficial a Mojang (${varModel})...`);
      const res = await fetch('https://api.minecraftservices.com/minecraft/profile/skins', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mcAccessToken}`
        },
        body: formData
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        logger.warn(`[SkinManager] Mojang respondió código ${res.status}: ${errText}`);
        return { success: false, status: res.status, error: errText };
      }

      const json = await res.json().catch(() => ({}));
      logger.info('[SkinManager] ¡Skin actualizada con éxito en los servidores oficiales de Mojang!');
      return { success: true, ...json };
    } catch (err) {
      logger.error('[SkinManager] Error al subir skin a Mojang:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Sincroniza la capa activa en los servidores de Mojang para que se vea dentro del juego
   */
  async setActiveCape(mcAccessToken, capeId) {
    if (!mcAccessToken) return { success: false, error: 'Token no disponible' };
    try {
      if (!capeId || capeId === 'none') {
        const res = await fetch('https://api.minecraftservices.com/minecraft/profile/capes/active', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${mcAccessToken}` }
        });
        logger.info(`[SkinManager] Capa desequipada en Mojang: status ${res.status}`);
        return { success: res.ok };
      } else {
        const res = await fetch('https://api.minecraftservices.com/minecraft/profile/capes/active', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${mcAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ capeId })
        });
        logger.info(`[SkinManager] Capa ${capeId} equipada en Mojang: status ${res.status}`);
        return { success: res.ok };
      }
    } catch (err) {
      logger.warn(`[SkinManager] Error al sincronizar capa con Mojang: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Inyecta el Resource Pack nativo ShubaSkinOverride en la instancia de Minecraft.
   * Reemplaza las 9 texturas de jugador por defecto (wide y slim) y texturas legacy
   * y asegura su activación automática en options.txt sin requerir ningún mod.
   */
  async injectSkinResourcePack({ instancePath, username = 'steve', mcVersion = '1.21.1' }) {
    if (!instancePath || !fs.existsSync(instancePath)) {
      return { applied: false, reason: 'invalid_instance_path' };
    }

    // Buscar archivo .png de la skin (específico del usuario o current_skin.png)
    let skinSourcePath = null;
    if (username) {
      const userSkin = this.getSkinPath(username);
      if (fs.existsSync(userSkin)) {
        skinSourcePath = userSkin;
      }
    }
    if (!skinSourcePath && fs.existsSync(this.currentSkinPath)) {
      skinSourcePath = this.currentSkinPath;
    }

    if (!skinSourcePath) {
      logger.info(`[SkinManager] No hay skin personalizada para inyectar en "${instancePath}".`);
      return { applied: false, reason: 'no_skin_found' };
    }

    let skinBuffer = null;
    try {
      skinBuffer = fs.readFileSync(skinSourcePath);
    } catch (readErr) {
      logger.warn(`[SkinManager] Error al leer buffer de skin (${skinSourcePath}): ${readErr.message}`);
      return { applied: false, reason: 'read_error' };
    }

    if (!this._isValidPng(skinBuffer)) {
      logger.warn(`[SkinManager] El archivo de skin no es un PNG válido: ${skinSourcePath}`);
      return { applied: false, reason: 'invalid_png' };
    }

    // 1. Directorio del Resource Pack
    const packDir = path.join(instancePath, 'resourcepacks', 'ShubaSkinOverride');
    if (!fs.existsSync(packDir)) {
      fs.mkdirSync(packDir, { recursive: true });
    }

    // 2. pack.mcmeta nativo universal (1.8 hasta 26.3+)
    // En MC 26.3+ (pack_format >= 65), supported_formats está OBSOLETO y Mojang exige
    // estrictamente min_format y max_format. Para versiones anteriores (15 a 64) se usa supported_formats.
    const packFormat = this._getPackFormat(mcVersion);
    const mcmeta = {
      pack: {
        pack_format: packFormat,
        description: 'ShubaCore Native Skin System'
      }
    };

    if (packFormat >= 65) {
      mcmeta.pack.min_format = packFormat;
      mcmeta.pack.max_format = 999;
    } else if (packFormat >= 15) {
      mcmeta.pack.supported_formats = [packFormat, 64];
    }

    fs.writeFileSync(path.join(packDir, 'pack.mcmeta'), JSON.stringify(mcmeta, null, 2), 'utf8');

    // 2.1 pack.png icono estándar para validación completa del ResourceManager de Minecraft
    const packPngPath = path.join(packDir, 'pack.png');
    if (!fs.existsSync(packPngPath)) {
      const minimalPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAEUlEQVR42mNk+M+ABzCOqh5oAQAZ7AEF5r0rRAAAAABJRU5ErkJggg==', 'base64');
      try { fs.writeFileSync(packPngPath, minimalPng); } catch (_) {}
    }

    // 3. Crear carpetas de destino de texturas
    const wideDir = path.join(packDir, 'assets', 'minecraft', 'textures', 'entity', 'player', 'wide');
    const slimDir = path.join(packDir, 'assets', 'minecraft', 'textures', 'entity', 'player', 'slim');
    const playerDir = path.join(packDir, 'assets', 'minecraft', 'textures', 'entity', 'player');
    const legacyDir = path.join(packDir, 'assets', 'minecraft', 'textures', 'entity');

    fs.mkdirSync(wideDir, { recursive: true });
    fs.mkdirSync(slimDir, { recursive: true });
    fs.mkdirSync(playerDir, { recursive: true });
    fs.mkdirSync(legacyDir, { recursive: true });

    // Copiar a todas las 9 skins por defecto en wide, slim, raíz de player y legacy entity
    for (const skinFileName of DEFAULT_PLAYER_SKIN_NAMES) {
      fs.writeFileSync(path.join(wideDir, skinFileName), skinBuffer);
      fs.writeFileSync(path.join(slimDir, skinFileName), skinBuffer);
      fs.writeFileSync(path.join(playerDir, skinFileName), skinBuffer);
      fs.writeFileSync(path.join(legacyDir, skinFileName), skinBuffer);
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
   * Asegura que el resource pack figure en resourcePacks de options.txt preservando 'vanilla' como base
   */
  _enablePackInOptionsTxt(optionsPath, packEntry = 'file/ShubaSkinOverride') {
    try {
      if (!fs.existsSync(optionsPath)) {
        fs.writeFileSync(
          optionsPath,
          `resourcePacks:["vanilla","${packEntry}"]\n`,
          'utf8'
        );
        return;
      }

      const content = fs.readFileSync(optionsPath, 'utf8');
      const lines = content.split(/\r?\n/);
      let foundResourcePacks = false;

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
          // Filtrar duplicados y asegurar 'vanilla' al inicio siempre
          list = list.filter((p) => p !== 'vanilla' && p !== packEntry && p !== 'ShubaSkinOverride');
          list.unshift('vanilla');
          list.push(packEntry);
          return `resourcePacks:${JSON.stringify(list)}`;
        }
        if (line.startsWith('incompatibleResourcePacks:')) {
          const rawVal = line.substring('incompatibleResourcePacks:'.length).trim();
          let list = [];
          try {
            list = JSON.parse(rawVal);
          } catch (_) {
            list = rawVal.replace(/[\[\]"']/g, '').split(',').map((s) => s.trim()).filter(Boolean);
          }
          if (Array.isArray(list)) {
            list = list.filter((p) => p !== packEntry && p !== 'ShubaSkinOverride');
            return `incompatibleResourcePacks:${JSON.stringify(list)}`;
          }
          return line;
        }
        return line;
      });

      if (!foundResourcePacks) {
        newLines.push(`resourcePacks:["vanilla","${packEntry}"]`);
      }

      fs.writeFileSync(optionsPath, newLines.join('\n') + '\n', 'utf8');
    } catch (err) {
      logger.warn(`[SkinManager] No se pudo actualizar options.txt: ${err.message}`);
    }
  }

  /**
   * Elimina un resource pack de resourcePacks e incompatibleResourcePacks de options.txt
   */
  _purgePackFromOptionsTxt(optionsPath, packEntry = 'file/ShubaSkinOverride') {
    try {
      if (!fs.existsSync(optionsPath)) return;
      const content = fs.readFileSync(optionsPath, 'utf8');
      if (!content.includes(packEntry) && !content.includes('ShubaSkinOverride')) return;

      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('resourcePacks:') || lines[i].startsWith('incompatibleResourcePacks:')) {
          const colonIdx = lines[i].indexOf(':');
          const key = lines[i].slice(0, colonIdx);
          const rawVal = lines[i].slice(colonIdx + 1).trim();
          try {
            if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
              const list = JSON.parse(rawVal);
              const filtered = list.filter((p) => p !== packEntry && p !== 'ShubaSkinOverride');
              lines[i] = `${key}:${JSON.stringify(filtered)}`;
            }
          } catch (_) {}
        }
      }
      fs.writeFileSync(optionsPath, lines.join('\n') + '\n', 'utf8');
    } catch (_) {}
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
