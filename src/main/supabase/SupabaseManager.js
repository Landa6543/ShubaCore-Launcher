/**
 * ShubaCore - Supabase Cloud Manager (Cuentas, Amigos, Presencia & ShubaHost)
 * Developed by SHUBATECH
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { defaultLogger: logger } = require('../utils/logger');

class SupabaseManager {
  constructor() {
    this.client = null;
    this.url = null;
    this.anonKey = null;
    this._initCredentials();
  }

  _initCredentials() {
    // 1. Leer de variables de entorno
    let url = process.env.SUPABASE_URL;
    let key = process.env.SUPABASE_ANON_KEY;

    // 2. Fallback a .env en raíz del proyecto
    if (!url || !key) {
      try {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf8');
          const urlMatch = envContent.match(/SUPABASE_URL\s*=\s*([^\r\n#]+)/);
          const keyMatch = envContent.match(/SUPABASE_ANON_KEY\s*=\s*([^\r\n#]+)/);
          if (urlMatch && urlMatch[1]) url = urlMatch[1].trim();
          if (keyMatch && keyMatch[1]) key = keyMatch[1].trim();
        }
      } catch (_) {}
    }

    // 3. Fallback a valores por defecto del proyecto ShubaCore-Network
    this.url = url || 'https://qpxmucdzmovkurqucoac.supabase.co';
    this.anonKey = key || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFweG11Y2R6bW92a3VycXVjb2FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ3MTgxOTgsImV4cCI6MjExMDI5NDE5OH0.WbvGorkCJvk34hLDCjKjwdTJEog7oCXqAWs5GTMQSck';

    try {
      this.client = createClient(this.url, this.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: true
        }
      });

      this.client.auth.onAuthStateChange((event, session) => {
        if (session && session.user && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN')) {
          try {
            const sessionPath = this._getSessionFilePath();
            if (fs.existsSync(sessionPath)) {
              const raw = fs.readFileSync(sessionPath, 'utf8');
              const parsed = JSON.parse(raw);
              if (parsed?.shubacoreAccount && parsed.shubacoreAccount.id === session.user.id) {
                parsed.shubacoreAccount.tokens = {
                  access_token: session.access_token,
                  refresh_token: session.refresh_token,
                  expires_at: session.expires_at
                };
                fs.writeFileSync(sessionPath, JSON.stringify(parsed, null, 2), 'utf8');
              }
            }
          } catch (_) {}
        }
      });

      logger.info(`[Supabase] Conectado exitosamente a: ${this.url}`);
    } catch (err) {
      logger.error('[Supabase] Error al inicializar cliente:', err);
    }
  }

  _getSessionFilePath() {
    if (process.env.SHUBACORE_SESSION_FILE) {
      return process.env.SHUBACORE_SESSION_FILE;
    }
    const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library', 'Application Support') : path.join(process.env.HOME, '.config'));
    return path.join(appData, '.shubacore', 'auth-session.json');
  }

  _toVirtualEmail(username) {
    const clean = String(username || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${clean || 'user'}@shubacore.com`;
  }

  /**
   * Registro simple: Solo Usuario y Contraseña (sin correo real)
   */
  async register(username, password) {
    if (!this.client) return { success: false, error: 'Cliente Supabase no configurado' };
    const rawUser = String(username || '').trim();
    if (!rawUser || rawUser.length < 3) {
      return { success: false, error: 'El nombre de usuario debe tener al menos 3 caracteres.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    }

    const cleanUser = rawUser.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const email = this._toVirtualEmail(cleanUser);

    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: cleanUser,
            display_name: rawUser
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          return { success: false, error: `El usuario "${rawUser}" ya existe. Elige otro nombre.` };
        }
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'No se pudo crear el usuario.' };
      }

      // Crear entrada en public.profiles
      const { error: profErr } = await this.client
        .from('profiles')
        .upsert({
          id: data.user.id,
          username: cleanUser,
          display_name: rawUser,
          account_type: 'shubacore',
          status: 'online',
          last_seen: new Date().toISOString()
        });

      if (profErr) {
        logger.warn('[Supabase] Aviso al crear perfil público:', profErr.message);
      }

      logger.info(`[Supabase] Usuario registrado con éxito: ${rawUser} (${data.user.id})`);
      return {
        success: true,
        user: {
          id: data.user.id,
          username: cleanUser,
          displayName: rawUser,
          accountType: 'shubacore',
          offlineUsername: rawUser,
          offlineUuid: null,
          tokens: data.session ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at
          } : null
        },
        session: data.session
      };
    } catch (err) {
      logger.error('[Supabase] Error en registro:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Inicio de sesión simple: Usuario y Contraseña
   */
  async login(username, password) {
    if (!this.client) return { success: false, error: 'Cliente Supabase no configurado' };
    const rawUser = String(username || '').trim();
    const cleanUser = rawUser.toLowerCase().replace(/[^a-z0-9_]/g, '');
    const email = this._toVirtualEmail(cleanUser);

    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: 'Usuario o contraseña incorrectos.' };
      }

      // Obtener datos del perfil público
      const { data: profile } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      // Actualizar estado a online
      await this.client
        .from('profiles')
        .update({ status: 'online', last_seen: new Date().toISOString() })
        .eq('id', data.user.id);

      return {
        success: true,
        user: {
          id: data.user.id,
          username: profile?.username || cleanUser,
          displayName: profile?.display_name || rawUser,
          accountType: profile?.account_type || 'shubacore',
          offlineUsername: profile?.offline_username || profile?.display_name || rawUser,
          offlineUuid: profile?.offline_uuid || null,
          skinUrl: profile?.skin_url || null,
          skinModel: profile?.skin_model || 'classic',
          msGamertag: profile?.ms_gamertag || null,
          msUuid: profile?.ms_uuid || null,
          tokens: data.session ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at
          } : null
        },
        session: data.session
      };
    } catch (err) {
      logger.error('[Supabase] Error en login:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Vincula una cuenta de Microsoft Premium al perfil de ShubaCore
   */
  async linkMicrosoft(userId, msAccount) {
    if (!this.client || !userId || !msAccount) return { success: false };
    try {
      const { error } = await this.client
        .from('profiles')
        .update({
          ms_gamertag: msAccount.name || msAccount.username,
          ms_uuid: msAccount.uuid,
          account_type: 'premium',
          last_seen: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      logger.info(`[Supabase] Microsoft vinculado a cuenta ShubaCore (${userId}): ${msAccount.name}`);
      return { success: true };
    } catch (err) {
      logger.error('[Supabase] Error al vincular Microsoft:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Desvincula Microsoft del perfil de ShubaCore
   */
  async unlinkMicrosoft(userId) {
    if (!this.client || !userId) return { success: false };
    try {
      const { error } = await this.client
        .from('profiles')
        .update({
          ms_gamertag: null,
          ms_uuid: null,
          account_type: 'shubacore',
          last_seen: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      logger.info(`[Supabase] Microsoft desvinculado de cuenta ShubaCore (${userId})`);
      return { success: true };
    } catch (err) {
      logger.error('[Supabase] Error al desvincular Microsoft:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Vincula una identidad de jugador No-Premium (Offline Nickname) al perfil de ShubaCore
   */
  async linkOffline(userId, offlineUsername) {
    if (!this.client || !userId) return { success: false, error: 'Usuario no identificado' };
    const clean = String(offlineUsername || '').trim();
    if (!clean || clean.length < 2) return { success: false, error: 'El nombre debe tener al menos 2 caracteres.' };

    const { generateOfflineUUID } = require('../auth/OfflineAuth');
    const offlineUuid = generateOfflineUUID(clean);

    try {
      const { error } = await this.client
        .from('profiles')
        .update({
          offline_username: clean,
          offline_uuid: offlineUuid,
          last_seen: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      logger.info(`[Supabase] Cuenta Offline vinculada a perfil (${userId}): ${clean} (${offlineUuid})`);
      return { success: true, offlineUsername: clean, offlineUuid };
    } catch (err) {
      logger.error('[Supabase] Error al vincular cuenta offline:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Actualiza el estado de presencia (En línea, Jugando, Offline)
   */
  async updatePresence(userId, status, currentGame = null) {
    if (!this.client || !userId) return;
    await this.ensureSession(userId);
    try {
      await this.client
        .from('profiles')
        .update({
          status: status || 'online',
          current_game: currentGame || {},
          last_seen: new Date().toISOString()
        })
        .eq('id', userId);
    } catch (_) {}
  }

  /**
   * Cierra la sesión activa en el cliente Supabase
   */
  async logout() {
    if (!this.client) return;
    try {
      await this.client.auth.signOut({ scope: 'local' });
      logger.info('[Supabase] Sesión local de Supabase cerrada correctamente.');
    } catch (err) {
      logger.warn('[Supabase] Aviso al cerrar sesión en Supabase:', err.message);
    }
  }

  /**
   * Asegura que el cliente Supabase tenga la sesión restaurada y asociada estrictamente al usuario esperado
   */
  async ensureSession(expectedUserId = null) {
    if (!this.client) return false;
    try {
      const { data: current } = await this.client.auth.getSession();
      const currentSessionUserId = current?.session?.user?.id;

      // Si se especificó un usuario requerido y ya coincide con la sesión en memoria
      if (expectedUserId && currentSessionUserId === expectedUserId && current?.session?.access_token) {
        return true;
      }

      // Obtener la cuenta y tokens guardados en auth-session.json
      const sessionPath = this._getSessionFilePath();
      let savedUser = null;
      let tokens = null;

      if (fs.existsSync(sessionPath)) {
        try {
          const raw = fs.readFileSync(sessionPath, 'utf8');
          const parsed = JSON.parse(raw);
          savedUser = parsed?.shubacoreAccount || null;
          tokens = savedUser?.tokens || null;
        } catch (_) {}
      }

      const targetId = expectedUserId || savedUser?.id;

      // Si no hay ningún usuario objetivo ni guardado, cerrar cualquier sesión residual en memoria
      if (!targetId) {
        if (current?.session) {
          await this.client.auth.signOut({ scope: 'local' }).catch(() => {});
        }
        return false;
      }

      // Si la sesión en memoria ya coincide con el targetId
      if (currentSessionUserId === targetId && current?.session?.access_token) {
        return true;
      }

      // Si tenemos tokens guardados para el targetId, restaurar sesión explícita
      if (savedUser && savedUser.id === targetId && tokens?.access_token && tokens?.refresh_token) {
        const { data, error } = await this.client.auth.setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token
        });
        if (!error && data?.session) {
          return true;
        }
        if (error) {
          logger.warn('[Supabase] Error al restaurar tokens de sesión:', error.message);
        }
      }

      // Si la sesión en memoria pertenece a otro usuario y no pudimos autenticar al targetId, limpiar localmente
      if (currentSessionUserId && currentSessionUserId !== targetId) {
        await this.client.auth.signOut({ scope: 'local' }).catch(() => {});
      }
    } catch (err) {
      logger.warn('[Supabase] Error en ensureSession:', err?.message);
    }
    return false;
  }

  /**
   * Buscar usuarios por nombre en la red ShubaCore
   */
  async searchUsers(query, excludeUserId = null) {
    if (!this.client) return [];
    const cleanQuery = String(query || '').trim().toLowerCase();
    if (!cleanQuery || cleanQuery.length < 2) return [];

    try {
      let req = this.client
        .from('profiles')
        .select('id, username, display_name, account_type, ms_gamertag, skin_url, status, last_seen')
        .or(`username.ilike.%${cleanQuery}%,display_name.ilike.%${cleanQuery}%`)
        .limit(10);

      if (excludeUserId) {
        req = req.neq('id', excludeUserId);
      }

      const { data, error } = await req;
      if (error) {
        logger.warn('[Supabase] Error en búsqueda de usuarios:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      logger.error('[Supabase] Excepción en searchUsers:', err);
      return [];
    }
  }

  /**
   * Enviar solicitud de amistad a un usuario por nombre de usuario
   */
  async sendFriendRequest(currentUserId, targetUsername) {
    if (!this.client || !currentUserId) return { success: false, error: 'No has iniciado sesión.' };
    const cleanTarget = String(targetUsername || '').trim().toLowerCase().replace(/^@/, '');
    if (!cleanTarget) return { success: false, error: 'Ingresa un nombre de usuario válido.' };

    const sessionOk = await this.ensureSession(currentUserId);
    if (!sessionOk) {
      return { success: false, error: 'Tu sesión en ShubaCore no está activa o ha expirado. Por favor vuelve a iniciar sesión en el Gestor de Cuentas.' };
    }

    try {
      // 1. Localizar perfil destino
      const { data: targetProfile, error: targetErr } = await this.client
        .from('profiles')
        .select('id, username, display_name, account_type, skin_url')
        .eq('username', cleanTarget)
        .single();

      if (targetErr || !targetProfile) {
        return { success: false, error: `El usuario "${cleanTarget}" no fue encontrado en ShubaCore.` };
      }

      if (targetProfile.id === currentUserId) {
        return { success: false, error: 'No puedes enviarte una solicitud de amistad a ti mismo.' };
      }

      // 2. Verificar relación previa
      const { data: existing, error: existErr } = await this.client
        .from('friendships')
        .select('*')
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${targetProfile.id}),and(user_id.eq.${targetProfile.id},friend_id.eq.${currentUserId})`);

      if (existing && existing.length > 0) {
        const relation = existing[0];
        if (relation.status === 'accepted') {
          return { success: false, error: `Ya eres amigo de @${targetProfile.display_name || targetProfile.username}.` };
        }
        if (relation.status === 'pending') {
          if (relation.user_id === currentUserId) {
            return { success: false, error: 'Ya enviaste una solicitud a este jugador. Espera a que la acepte.' };
          } else {
            // El otro usuario ya le había enviado una solicitud -> Aceptar automáticamente
            await this.client
              .from('friendships')
              .update({ status: 'accepted', updated_at: new Date().toISOString() })
              .eq('id', relation.id);
            return { success: true, autoAccepted: true, target: targetProfile };
          }
        }
      }

      // 3. Crear solicitud
      const { data: newFriendship, error: insertErr } = await this.client
        .from('friendships')
        .insert({
          user_id: currentUserId,
          friend_id: targetProfile.id,
          status: 'pending'
        })
        .select()
        .single();

      if (insertErr) {
        return { success: false, error: insertErr.message };
      }

      logger.info(`[Supabase] Solicitud de amistad enviada: ${currentUserId} -> ${targetProfile.username}`);
      return { success: true, target: targetProfile, friendshipId: newFriendship.id };
    } catch (err) {
      logger.error('[Supabase] Error al enviar solicitud:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Obtener lista de amigos aceptados con perfil y estado en tiempo real
   */
  async getFriends(currentUserId) {
    if (!this.client || !currentUserId) return [];
    const sessionOk = await this.ensureSession(currentUserId);
    if (!sessionOk) return [];

    try {
      const { data: friendships, error } = await this.client
        .from('friendships')
        .select('id, user_id, friend_id, status, created_at, updated_at, sender:profiles!friendships_user_id_fkey(id, username, display_name, account_type, ms_gamertag, skin_url, status, current_game, last_seen), receiver:profiles!friendships_friend_id_fkey(id, username, display_name, account_type, ms_gamertag, skin_url, status, current_game, last_seen)')
        .eq('status', 'accepted')
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);

      if (error) {
        logger.warn('[Supabase] Error al obtener amigos:', error.message);
        return [];
      }

      const friends = (friendships || []).map(f => {
        const isSender = f.user_id === currentUserId;
        const profile = isSender ? f.receiver : f.sender;
        return {
          friendshipId: f.id,
          friendId: profile?.id,
          username: profile?.username,
          displayName: profile?.display_name || profile?.username,
          accountType: profile?.account_type,
          msGamertag: profile?.ms_gamertag,
          skinUrl: profile?.skin_url,
          status: profile?.status || 'offline',
          currentGame: profile?.current_game || null,
          lastSeen: profile?.last_seen,
          since: f.created_at
        };
      });

      return friends;
    } catch (err) {
      logger.error('[Supabase] Excepción en getFriends:', err);
      return [];
    }
  }

  /**
   * Obtener solicitudes de amistad pendientes (entrantes y salientes)
   */
  async getPendingRequests(currentUserId) {
    if (!this.client || !currentUserId) return { incoming: [], outgoing: [] };
    const sessionOk = await this.ensureSession(currentUserId);
    if (!sessionOk) return { incoming: [], outgoing: [] };

    try {
      // Entrantes: friend_id = currentUserId
      const { data: incomingRows, error: incErr } = await this.client
        .from('friendships')
        .select('id, user_id, status, created_at, sender:profiles!friendships_user_id_fkey(id, username, display_name, account_type, skin_url)')
        .eq('friend_id', currentUserId)
        .eq('status', 'pending');

      // Salientes: user_id = currentUserId
      const { data: outgoingRows, error: outErr } = await this.client
        .from('friendships')
        .select('id, friend_id, status, created_at, receiver:profiles!friendships_friend_id_fkey(id, username, display_name, account_type, skin_url)')
        .eq('user_id', currentUserId)
        .eq('status', 'pending');

      const incoming = (incomingRows || []).map(r => ({
        id: r.id,
        createdAt: r.created_at,
        sender: {
          id: r.sender?.id,
          username: r.sender?.username,
          displayName: r.sender?.display_name || r.sender?.username,
          skinUrl: r.sender?.skin_url,
          accountType: r.sender?.account_type
        }
      }));

      const outgoing = (outgoingRows || []).map(r => ({
        id: r.id,
        createdAt: r.created_at,
        target: {
          id: r.receiver?.id,
          username: r.receiver?.username,
          displayName: r.receiver?.display_name || r.receiver?.username,
          skinUrl: r.receiver?.skin_url,
          accountType: r.receiver?.account_type
        }
      }));

      return { incoming, outgoing };
    } catch (err) {
      logger.error('[Supabase] Excepción en getPendingRequests:', err);
      return { incoming: [], outgoing: [] };
    }
  }

  /**
   * Aceptar solicitud de amistad
   */
  async acceptFriendRequest(requestId, currentUserId) {
    if (!this.client || !requestId) return { success: false, error: 'Parámetros inválidos' };
    const sessionOk = await this.ensureSession(currentUserId);
    if (!sessionOk) return { success: false, error: 'Sesión expirada. Por favor vuelve a iniciar sesión.' };

    try {
      const { error } = await this.client
        .from('friendships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('friend_id', currentUserId);

      if (error) throw error;
      logger.info(`[Supabase] Solicitud ${requestId} aceptada por ${currentUserId}`);
      return { success: true };
    } catch (err) {
      logger.error('[Supabase] Error al aceptar amistad:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Rechazar o cancelar solicitud de amistad
   */
  async rejectOrCancelRequest(requestId, currentUserId) {
    if (!this.client || !requestId) return { success: false, error: 'Parámetros inválidos' };
    const sessionOk = await this.ensureSession(currentUserId);
    if (!sessionOk) return { success: false, error: 'Sesión expirada. Por favor vuelve a iniciar sesión.' };

    try {
      const { error } = await this.client
        .from('friendships')
        .delete()
        .eq('id', requestId)
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      logger.error('[Supabase] Error al cancelar/rechazar solicitud:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Eliminar un amigo
   */
  async removeFriend(currentUserId, friendId) {
    if (!this.client || !currentUserId || !friendId) return { success: false };
    const sessionOk = await this.ensureSession(currentUserId);
    if (!sessionOk) return { success: false, error: 'Sesión expirada.' };

    try {
      const { error } = await this.client
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${currentUserId})`);

      if (error) throw error;
      logger.info(`[Supabase] Amistad eliminada entre ${currentUserId} y ${friendId}`);
      return { success: true };
    } catch (err) {
      logger.error('[Supabase] Error al eliminar amigo:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Suscribirse a cambios en tiempo real (Realtime Channel)
   */
  subscribeRealtime(currentUserId, onUpdate) {
    if (!this.client || !currentUserId) return null;
    try {
      const channel = this.client
        .channel(`shubacore_social_${currentUserId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
          if (typeof onUpdate === 'function') onUpdate({ table: 'friendships' });
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
          if (typeof onUpdate === 'function') onUpdate({ table: 'profiles' });
        })
        .subscribe();

      return channel;
    } catch (err) {
      logger.warn('[Supabase] No se pudo conectar a Realtime:', err.message);
      return null;
    }
  }
}

let supabaseManagerInstance = null;
function getSupabaseManager() {
  if (!supabaseManagerInstance) {
    supabaseManagerInstance = new SupabaseManager();
  }
  return supabaseManagerInstance;
}

module.exports = {
  SupabaseManager,
  getSupabaseManager
};
