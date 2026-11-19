/**
 * ShubaCore - Offline Authentication Module
 * Developed by SHUBATECH
 * Implements standard Minecraft offline UUID generation via MD5 (v3 UUID)
 */

const crypto = require('crypto');

/**
 * Genera el UUID offline idéntico a la implementación oficial de Java Minecraft:
 * UUID.nameUUIDFromBytes(("OfflinePlayer:" + username).getBytes(StandardCharsets.UTF_8))
 *
 * @param {string} username - Nombre de usuario en texto plano
 * @returns {string} UUID formateado en formato canónico 8-4-4-4-12
 */
function generateOfflineUUID(username) {
  if (typeof username !== 'string') {
    throw new TypeError('El nombre de usuario debe ser una cadena de texto.');
  }

  // Generamos el hash MD5 con prefijo OfflinePlayer:
  const hash = crypto.createHash('md5').update('OfflinePlayer:' + username, 'utf8').digest();

  // Ajustamos la versión a UUID v3 (name-based MD5)
  // byte 6: clear version & set version to 3 (0x30)
  hash[6] = (hash[6] & 0x0f) | 0x30;

  // Ajustamos la variante a IETF (Leach-Salz)
  // byte 8: clear variant & set variant bits to 10xx (0x80)
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const hex = hash.toString('hex');
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32)
  ].join('-');
}

/**
 * Crea un objeto de autenticación offline totalmente compatible con MCLC
 *
 * @param {string} rawUsername - Nombre del jugador
 * @returns {Object} Objeto de usuario y credenciales MCLC
 */
function createOfflineProfile(rawUsername) {
  if (!rawUsername || typeof rawUsername !== 'string') {
    throw new Error('Debes ingresar un nombre de usuario válido.');
  }

  const username = rawUsername.trim();

  // Validación estándar de nombres de Minecraft (3-16 caracteres alfanuméricos y _)
  const usernameRegex = /^[a-zA-Z0-9_]{3,16}$/;
  if (!usernameRegex.test(username)) {
    throw new Error('El nombre de usuario debe tener entre 3 y 16 caracteres y solo contener letras, números y guiones bajos (_).');
  }

  const uuid = generateOfflineUUID(username);
  const cleanUuid = uuid.replace(/-/g, '');

  const mclcAuth = {
    access_token: `offline_token_${cleanUuid}`,
    client_token: cleanUuid,
    uuid: uuid,
    name: username,
    user_properties: '{}',
    meta: {
      type: 'offline',
      demo: false
    }
  };

  return {
    name: username,
    uuid: uuid,
    type: 'offline',
    skinUrl: `https://mc-heads.net/avatar/${uuid}/100`,
    mclcAuth: mclcAuth,
    createdAt: new Date().toISOString()
  };
}

/**
 * Calcula el hashCode canónico de 32 bits de un UUID en Java
 */
function getJavaHashCode(hex) {
  const clean = hex.replace(/-/g, '');
  const most = BigInt('0x' + clean.substring(0, 16));
  const least = BigInt('0x' + clean.substring(16, 32));
  const xored = most ^ least;
  return Number(BigInt.asIntN(32, (xored >> 32n) ^ xored));
}

/**
 * Genera el UUID offline adaptado al modelo 3D deseado (delgado o clásico).
 * 
 * En Minecraft 26.3+:
 * DefaultPlayerSkin usa: Math.floorMod(uuid.hashCode(), 18)
 * - Índices 0 a 8: SLIM (Brazos de 3px)
 * - Índices 9 a 17: WIDE (Brazos de 4px)
 * 
 * En Minecraft 1.8 a 1.20:
 * DefaultPlayerSkin usa: (uuid.hashCode() & 1)
 * - Impar (1): SLIM (Alex, Brazos de 3px)
 * - Par (0): WIDE (Steve, Brazos de 4px)
 *
 * Esta función ajusta los últimos bits del UUID para garantizar que TANTO
 * en Minecraft 26.3+ como en versiones anteriores, el motor de Minecraft cargue
 * exactamente la geometría 3D solicitada (evitando huecos transparentes en brazos).
 *
 * @param {string} username - Nombre del jugador
 * @param {string} [model] - 'slim' para brazos de 3px, 'classic' para brazos de 4px
 * @returns {string} UUID formateado en formato canónico 8-4-4-4-12
 */
function generateOfflineUUIDForModel(username, model = 'classic') {
  if (typeof username !== 'string') {
    throw new TypeError('El nombre de usuario debe ser una cadena de texto.');
  }

  const baseHash = crypto.createHash('md5').update('OfflinePlayer:' + username, 'utf8').digest();
  baseHash[6] = (baseHash[6] & 0x0f) | 0x30; // UUID v3 (name-based MD5)
  baseHash[8] = (baseHash[8] & 0x3f) | 0x80; // Variante IETF (Leach-Salz)

  if (!model) {
    const hex = baseHash.toString('hex');
    return [
      hex.substring(0, 8),
      hex.substring(8, 12),
      hex.substring(12, 16),
      hex.substring(16, 20),
      hex.substring(20, 32)
    ].join('-');
  }

  const wantsSlim = String(model).toLowerCase() === 'slim';
  const buf = Buffer.from(baseHash);

  for (let tweak = 0; tweak < 256; tweak++) {
    buf[15] = baseHash[15] ^ tweak;
    const hex = buf.toString('hex');
    const jHash = getJavaHashCode(hex);
    const mod18 = ((jHash % 18) + 18) % 18;
    const isOdd = ((jHash & 1) !== 0);

    if (wantsSlim && mod18 < 9 && isOdd) {
      return [
        hex.substring(0, 8),
        hex.substring(8, 12),
        hex.substring(12, 16),
        hex.substring(16, 20),
        hex.substring(20, 32)
      ].join('-');
    } else if (!wantsSlim && mod18 >= 9 && !isOdd) {
      return [
        hex.substring(0, 8),
        hex.substring(8, 12),
        hex.substring(12, 16),
        hex.substring(16, 20),
        hex.substring(20, 32)
      ].join('-');
    }
  }

  // Fallback estándar si no hubiese tweak
  const hex = baseHash.toString('hex');
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32)
  ].join('-');
}

module.exports = {
  generateOfflineUUID,
  generateOfflineUUIDForModel,
  createOfflineProfile
};
