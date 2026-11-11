/**
 * ShubaCore - Microsoft Device Code Flow & Xbox Live Authentication
 * Developed by SHUBATECH
 * Pure HTTP implementation (No WebViews, No msmc native C++ issues)
 */

const { defaultLogger: logger } = require('../utils/logger');

// Client ID público compatible con Xbox Live y Minecraft Java Edition (estándar Prism Launcher / ShubaCore)
const MS_CLIENT_ID = '499c8d36-be2a-4231-9ebd-ef291b7bb64c';
const MS_DEVICE_CODE_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode';
const MS_TOKEN_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
const XBL_AUTH_URL = 'https://user.auth.xboxlive.com/user/authenticate';
const XSTS_AUTH_URL = 'https://xsts.auth.xboxlive.com/xsts/authorize';
const MC_LOGIN_URL = 'https://api.minecraftservices.com/authentication/login_with_xbox';
const MC_PROFILE_URL = 'https://api.minecraftservices.com/minecraft/profile';

class MicrosoftDeviceAuth {
  constructor() {
    this.clientId = MS_CLIENT_ID;
    this.currentPollAbort = null;
  }

  /**
   * 1. Solicita un nuevo código de dispositivo a Microsoft OAuth2
   */
  async requestDeviceCode() {
    logger.info('[MS Auth] Solicitando código de dispositivo a Microsoft...');
    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: 'XboxLive.signin offline_access'
    });

    const res = await fetch(MS_DEVICE_CODE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error(`[MS Auth] Error al solicitar device code (${res.status}):`, errText);
      throw new Error(`Fallo de conexión con Microsoft: HTTP ${res.status}`);
    }

    const data = await res.json();
    logger.info(`[MS Auth] Código de usuario recibido: ${data.user_code} (URI: ${data.verification_uri})`);

    return {
      userCode: data.user_code,
      deviceCode: data.device_code,
      verificationUri: data.verification_uri || 'https://www.microsoft.com/link',
      expiresIn: data.expires_in || 900,
      interval: data.interval || 5
    };
  }

  /**
   * Cancela cualquier proceso de polling en curso
   */
  cancelPoll() {
    if (this.currentPollAbort) {
      logger.info('[MS Auth] Cancelando espera de autenticación...');
      this.currentPollAbort.abort();
      this.currentPollAbort = null;
    }
  }

  /**
   * 2. Hace polling al token endpoint hasta que el usuario complete el inicio en el navegador
   */
  async pollDeviceToken(deviceCode, pollInterval = 5, onStatusChange = null) {
    this.cancelPoll();
    this.currentPollAbort = new AbortController();
    const signal = this.currentPollAbort.signal;

    let interval = pollInterval;
    const startTime = Date.now();
    const maxWaitMs = 15 * 60 * 1000; // 15 minutos

    logger.info(`[MS Auth] Iniciando polling cada ${interval}s...`);

    while (Date.now() - startTime < maxWaitMs) {
      if (signal.aborted) {
        throw new Error('Autenticación cancelada por el usuario.');
      }

      await new Promise((resolve) => setTimeout(resolve, interval * 1000));

      if (signal.aborted) {
        throw new Error('Autenticación cancelada por el usuario.');
      }

      const params = new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        client_id: this.clientId,
        device_code: deviceCode
      });

      let tokenRes;
      try {
        tokenRes = await fetch(MS_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
          signal
        });
      } catch (err) {
        if (err.name === 'AbortError' || signal.aborted) {
          throw new Error('Autenticación cancelada por el usuario.');
        }
        logger.warn('[MS Auth] Error temporal de red en polling:', err.message);
        continue;
      }

      const tokenData = await tokenRes.json();

      if (tokenData.access_token) {
        logger.info('[MS Auth] ¡Autorización confirmada por el usuario en el navegador!');
        this.currentPollAbort = null;
        return {
          msAccessToken: tokenData.access_token,
          msRefreshToken: tokenData.refresh_token,
          expiresIn: tokenData.expires_in
        };
      }

      if (tokenData.error) {
        if (tokenData.error === 'authorization_pending') {
          if (onStatusChange) onStatusChange('waiting');
          continue;
        } else if (tokenData.error === 'slow_down') {
          interval += 5;
          logger.debug(`[MS Auth] Microsoft solicitó slow_down. Nuevo intervalo: ${interval}s`);
          continue;
        } else if (tokenData.error === 'expired_token') {
          throw new Error('El código ha expirado. Por favor solicita uno nuevo.');
        } else {
          throw new Error(tokenData.error_description || tokenData.error || 'Error en la autorización.');
        }
      }
    }

    throw new Error('El tiempo de espera para iniciar sesión ha expirado.');
  }

  /**
   * 3. Intercambia el access_token de Microsoft por tokens de Xbox Live, XSTS y Minecraft
   */
  async exchangeForMinecraft(msAccessToken, cachedSession = null) {
    logger.info('[MS Auth] Paso 1: Autenticando con Xbox Live (XBL)...');
    const xblRes = await fetch(XBL_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        Properties: {
          AuthMethod: 'RPS',
          SiteName: 'user.auth.xboxlive.com',
          RpsTicket: `d=${msAccessToken}`
        },
        RelyingParty: 'http://auth.xboxlive.com',
        TokenType: 'JWT'
      })
    });

    if (!xblRes.ok) {
      const xblErr = await xblRes.text();
      logger.error('[MS Auth] Error en Xbox Live authenticate:', xblErr);
      throw new Error(`Fallo en autenticación con Xbox Live (${xblRes.status}).`);
    }

    const xblData = await xblRes.json();
    const xblToken = xblData.Token;
    const uhs = xblData.DisplayClaims?.xui?.[0]?.uhs;

    if (!xblToken || !uhs) {
      throw new Error('Respuesta inválida de Xbox Live (falta Token o UHS).');
    }

    logger.info(`[MS Auth] Paso 2: Solicitando autorización XSTS para Minecraft (UHS: ${uhs})...`);
    const xstsRes = await fetch(XSTS_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        Properties: {
          SandboxId: 'RETAIL',
          UserTokens: [xblToken]
        },
        RelyingParty: 'rp://api.minecraftservices.com/',
        TokenType: 'JWT'
      })
    });

    const xstsData = await xstsRes.json();

    if (!xstsRes.ok || xstsData.XErr) {
      const errCode = xstsData.XErr;
      if (errCode === 2148916233) {
        throw new Error('Esta cuenta de Microsoft no tiene un perfil de Xbox asociado. Visita xbox.com para configurarlo.');
      } else if (errCode === 2148916238) {
        throw new Error('Esta cuenta de Microsoft pertenece a un menor de edad y debe ser agregada a un Grupo Familiar por un adulto.');
      } else {
        throw new Error(`Error de autorización en Xbox XSTS: Código ${errCode || xstsRes.status}`);
      }
    }

    const xstsToken = xstsData.Token;
    if (!xstsToken) {
      throw new Error('Respuesta inválida de XSTS (falta Token).');
    }

    logger.info('[MS Auth] Paso 3: Conectando con Minecraft Services (login_with_xbox)...');
    const mcLoginRes = await fetch(MC_LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        identityToken: `XBL3.0 x=${uhs};${xstsToken}`
      })
    });

    if (!mcLoginRes.ok) {
      const mcErr = await mcLoginRes.text();
      const isRateLimited = mcLoginRes.status === 429 || mcErr.includes('TOO_MANY_REQUESTS');
      if (isRateLimited) {
        logger.warn('[MS Auth] Minecraft Services reportó TOO_MANY_REQUESTS (429) en login_with_xbox.');
        if (cachedSession && (cachedSession.mcAccessToken || cachedSession.access_token)) {
          const existingToken = cachedSession.mcAccessToken || cachedSession.access_token;
          const username = cachedSession.username || cachedSession.name || 'Jugador';
          const uuid = cachedSession.uuid || '';
          const rawUuid = cachedSession.rawUuid || (uuid ? uuid.replace(/-/g, '') : '');
          logger.info(`[MS Auth] Reutilizando sesión y tokens existentes en caché para "${username}".`);
          return {
            name: username,
            uuid,
            rawUuid,
            skinUrl: cachedSession.skinUrl || `https://mc-heads.net/skin/${encodeURIComponent(username)}`,
            skinVariant: cachedSession.skinVariant || 'CLASSIC',
            mcAccessToken: existingToken,
            mcExpiresIn: 86400,
            rateLimited: true
          };
        }
        throw new Error('Servidores de autenticación de Minecraft temporalmente ocupados (TOO_MANY_REQUESTS). Por favor espera un momento.');
      }
      logger.error('[MS Auth] Error en login_with_xbox:', mcErr);
      throw new Error(`Fallo al autenticar en servicios de Minecraft (${mcLoginRes.status}).`);
    }

    const mcLoginData = await mcLoginRes.json();
    const mcAccessToken = mcLoginData.access_token;
    if (!mcAccessToken) {
      throw new Error('No se recibió access_token de Minecraft.');
    }

    logger.info('[MS Auth] Paso 4: Obteniendo perfil oficial y skins de Minecraft...');
    const profileRes = await fetch(MC_PROFILE_URL, {
      headers: {
        'Authorization': `Bearer ${mcAccessToken}`
      }
    });

    if (profileRes.status === 404) {
      throw new Error('Esta cuenta de Microsoft no posee una copia de Minecraft Java Edition.');
    }

    if (!profileRes.ok) {
      if (profileRes.status === 429 && cachedSession && (cachedSession.username || cachedSession.name)) {
        const username = cachedSession.username || cachedSession.name;
        logger.warn(`[MS Auth] Consulta de perfil 429 TOO_MANY_REQUESTS. Reutilizando perfil en caché para "${username}".`);
        return {
          name: username,
          uuid: cachedSession.uuid || '',
          rawUuid: cachedSession.rawUuid || (cachedSession.uuid ? cachedSession.uuid.replace(/-/g, '') : ''),
          skinUrl: cachedSession.skinUrl || `https://mc-heads.net/skin/${encodeURIComponent(username)}`,
          skinVariant: cachedSession.skinVariant || 'CLASSIC',
          mcAccessToken,
          mcExpiresIn: mcLoginData.expires_in || 86400,
          rateLimited: true
        };
      }
      throw new Error(`Fallo al consultar perfil de Minecraft (${profileRes.status}).`);
    }

    const profileData = await profileRes.json();
    const rawUuid = profileData.id || '';
    const formattedUuid = this.formatUuid(rawUuid);
    const activeSkin = profileData.skins?.find((s) => s.state === 'ACTIVE') || profileData.skins?.[0] || null;
    const skinUrl = activeSkin?.url || `https://mc-heads.net/skin/${profileData.name}`;

    logger.info(`[MS Auth] ¡Sesión oficial completada para "${profileData.name}" (${formattedUuid})!`);

    return {
      name: profileData.name,
      uuid: formattedUuid,
      rawUuid,
      skinUrl,
      skinVariant: activeSkin?.variant || 'CLASSIC',
      mcAccessToken,
      mcExpiresIn: mcLoginData.expires_in || 86400
    };
  }

  /**
   * 4. Renueva la sesión con el refresh_token de Microsoft
   */
  async refreshSession(refreshToken, cachedSession = null) {
    logger.info('[MS Auth] Renovando sesión oficial con refresh_token...');
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      refresh_token: refreshToken,
      scope: 'XboxLive.signin offline_access'
    });

    const res = await fetch(MS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!res.ok) {
      throw new Error('La sesión de Microsoft expiró. Por favor vuelve a vincular tu cuenta.');
    }

    const tokenData = await res.json();
    const mcData = await this.exchangeForMinecraft(tokenData.access_token, cachedSession);

    return {
      ...mcData,
      msAccessToken: tokenData.access_token,
      msRefreshToken: tokenData.refresh_token || refreshToken
    };
  }

  formatUuid(uuid) {
    if (!uuid || typeof uuid !== 'string') return uuid;
    const clean = uuid.replace(/-/g, '');
    if (clean.length !== 32) return uuid;
    return `${clean.substring(0, 8)}-${clean.substring(8, 12)}-${clean.substring(12, 16)}-${clean.substring(16, 20)}-${clean.substring(20, 32)}`;
  }
}

let instance = null;
function getMicrosoftDeviceAuth() {
  if (!instance) {
    instance = new MicrosoftDeviceAuth();
  }
  return instance;
}

module.exports = {
  MicrosoftDeviceAuth,
  getMicrosoftDeviceAuth
};
