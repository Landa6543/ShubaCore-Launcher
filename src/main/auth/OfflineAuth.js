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

module.exports = {
  generateOfflineUUID,
  createOfflineProfile
};
