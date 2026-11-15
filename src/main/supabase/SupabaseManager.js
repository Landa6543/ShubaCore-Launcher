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
      logger.info(`[Supabase] Conectado exitosamente a: ${this.url}`);
    } catch (err) {
      logger.error('[Supabase] Error al inicializar cliente:', err);
    }
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
          accountType: 'shubacore'
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
          skinUrl: profile?.skin_url || null,
          skinModel: profile?.skin_model || 'classic',
          msGamertag: profile?.ms_gamertag || null,
          msUuid: profile?.ms_uuid || null
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
   * Actualiza el estado de presencia (En línea, Jugando, Offline)
   */
  async updatePresence(userId, status, currentGame = null) {
    if (!this.client || !userId) return;
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
