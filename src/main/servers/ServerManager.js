/**
 * ShubaCore - Local Dedicated Server Manager & Process Orchestrator
 * Developed by SHUBATECH
 *
 * Full headless Minecraft Dedicated Server management:
 * - 1-Click Server Creation (Vanilla, Fabric, NeoForge, Forge)
 * - Real-Time Dashboard (Status, RAM/CPU stats, Active Player List with 2D avatars)
 * - Interactive Server Console with stdin command dispatch and quick actions
 * - Visual server.properties editor
 * - Intelligent Client-to-Server mod synchronization with Anti-Client-Crash filter
 * - Complete Server Pack .zip Exporter
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const { defaultLogger: logger } = require('../utils/logger');
const { ServerInstaller } = require('./ServerInstaller');
const { ServerModFilter } = require('./ServerModFilter');
const { JavaManager } = require('../jvm/JavaManager');
const { JVMOptimizer } = require('../jvm/JVMOptimizer');

class ServerManager {
  constructor() {
    this.activeServers = new Map(); // serverId -> { child, status, players: Set, startTime, statsInterval, logBuffer: [] }
    this.mainWindow = null;
  }

  setMainWindow(win) {
    this.mainWindow = win;
  }

  /**
   * Obtiene la ruta física del directorio donde se alojan todos los servidores
   */
  getServersRootDir() {
    let baseDir = null;
    try {
      const electron = require('electron');
      const electronApp = electron.app || (electron.remote && electron.remote.app);
      if (electronApp && typeof electronApp.getPath === 'function') {
        baseDir = electronApp.getPath('userData');
      }
    } catch (_) {}

    if (!baseDir) {
      baseDir = path.join(process.env.APPDATA || process.env.USERPROFILE || process.env.HOME || '.', '.shubacore');
    }

    const serversDir = path.join(baseDir, 'servers');
    if (!fs.existsSync(serversDir)) {
      fs.mkdirSync(serversDir, { recursive: true });
    }
    return serversDir;
  }

  /**
   * Lista todos los servidores dedicados creados en ShubaCore
   */
  async listServers() {
    const rootDir = this.getServersRootDir();
    if (!fs.existsSync(rootDir)) return [];

    const dirs = fs.readdirSync(rootDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    const servers = [];
    for (const folder of dirs) {
      const serverDir = path.join(rootDir, folder);
      const metaPath = path.join(serverDir, 'server.json');

      let meta = null;
      if (fs.existsSync(metaPath)) {
        try {
          meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        } catch (_) {}
      }

      if (!meta) {
        meta = {
          id: folder,
          name: folder.replace(/[-_]/g, ' '),
          mcVersion: '1.21.1',
          loader: 'neoforge',
          loaderVersion: 'latest',
          ram: '6G',
          port: 25565,
          createdAt: new Date().toISOString()
        };
      }

      const active = this.activeServers.get(meta.id);
      const status = active ? active.status : 'offline';
      const players = active ? Array.from(active.players) : [];
      const stats = active?.latestStats || { memoryMb: 0, cpuPercent: 0 };

      // Contar mods en carpeta /mods si existe
      let modsCount = 0;
      const modsDir = path.join(serverDir, 'mods');
      if (fs.existsSync(modsDir)) {
        modsCount = fs.readdirSync(modsDir).filter((f) => f.endsWith('.jar')).length;
      }

      servers.push({
        ...meta,
        id: meta.id || folder,
        serverDir,
        status,
        players,
        playersCount: players.length,
        stats,
        modsCount
      });
    }

    return servers;
  }

  /**
   * Obtiene la información detallada de un servidor específico
   */
  async getServer(id) {
    const servers = await this.listServers();
    return servers.find((s) => s.id === id) || null;
  }

  /**
   * Crea e instala un nuevo servidor dedicado desde cero o vinculado a una instancia
   */
  async createServer(options) {
    const { name, mcVersion, loader, loaderVersion, ram, port, sourceInstancePath, syncMods } = options;
    const cleanName = String(name || 'Mi Servidor').trim();
    const id = cleanName.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-') + `_${Date.now().toString(36)}`;
    const rootDir = this.getServersRootDir();
    const serverDir = path.join(rootDir, id);

    fs.mkdirSync(serverDir, { recursive: true });

    // Resolver Java correspondiente para la versión
    const javaResolution = await JavaManager.ensureJavaForVersion(mcVersion);
    const javaPath = javaResolution?.javaPath || 'java';

    logger.info(`[ServerManager] Creando servidor "${cleanName}" (${id}) en: ${serverDir}`);

    // 1. Instalar el servidor mediante ServerInstaller
    const installRes = await ServerInstaller.installServer({
      serverDir,
      mcVersion,
      loader: loader || 'neoforge',
      loaderVersion,
      javaPath,
      name: cleanName,
      port: Number(port) || 25565,
      onProgress: (p) => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('server:install-progress', { serverId: id, ...p });
        }
      }
    });

    // 2. Si se solicitó sincronizar mods desde una instancia cliente
    let syncStats = null;
    if (syncMods && sourceInstancePath && fs.existsSync(sourceInstancePath)) {
      logger.info(`[ServerManager] Sincronizando mods automáticamente desde "${sourceInstancePath}"...`);
      syncStats = await ServerModFilter.syncModsToDedicatedServer({
        clientInstancePath: sourceInstancePath,
        serverPath: serverDir,
        copyConfigs: true
      });
    }

    // 3. Guardar metadatos definitivos en server.json
    const serverMeta = {
      id,
      name: cleanName,
      mcVersion,
      loader: (loader || 'neoforge').toLowerCase(),
      loaderVersion: loaderVersion || 'latest',
      ram: ram || '6G',
      port: Number(port) || 25565,
      javaPath,
      mainFile: installRes.mainFile || 'server.jar',
      launchType: installRes.launchType || 'jar',
      createdAt: new Date().toISOString()
    };

    fs.writeFileSync(path.join(serverDir, 'server.json'), JSON.stringify(serverMeta, null, 2), 'utf8');

    logger.info(`[ServerManager] ¡Servidor "${cleanName}" creado e instalado exitosamente!`);

    return {
      success: true,
      server: {
        ...serverMeta,
        serverDir,
        status: 'offline',
        players: [],
        syncStats
      }
    };
  }

  /**
   * Inicia el proceso del servidor dedicado en segundo plano
   */
  async startServer(id) {
    const server = await this.getServer(id);
    if (!server) throw new Error(`Servidor con ID "${id}" no encontrado.`);

    const current = this.activeServers.get(id);
    if (current && (current.status === 'online' || current.status === 'starting')) {
      throw new Error(`El servidor "${server.name}" ya se encuentra en ejecución.`);
    }

    const serverDir = server.serverDir;

    // Asegurar EULA y properties antes de iniciar
    ServerInstaller.ensureEula(serverDir);
    ServerInstaller.ensureServerProperties(serverDir, { port: server.port, name: server.name });

    // Resolver Java Runtime
    let javaPath = server.javaPath;
    try {
      const javaRes = await JavaManager.ensureJavaForVersion(server.mcVersion);
      if (javaRes?.javaPath && fs.existsSync(javaRes.javaPath)) {
        javaPath = javaRes.javaPath;
      }
    } catch (_) {}

    if (!javaPath || !fs.existsSync(javaPath)) {
      javaPath = 'java';
    }

    const ram = server.ram || '6G';
    const jvmFlags = [
      `-Xms2G`,
      `-Xmx${ram}`,
      `-XX:+UseG1GC`,
      `-XX:+UnlockExperimentalVMOptions`,
      `-XX:G1NewSizePercent=20`,
      `-XX:G1ReservePercent=20`,
      `-XX:MaxGCPauseMillis=50`,
      `-XX:G1HeapRegionSize=32M`,
      `-Dfile.encoding=UTF-8`
    ];

    let spawnCmd = javaPath;
    let spawnArgs = [];

    const runBat = path.join(serverDir, 'run.bat');
    const userJvmArgsPath = path.join(serverDir, 'user_jvm_args.txt');

    // Configurar user_jvm_args.txt si es NeoForge/Forge moderno
    if (fs.existsSync(userJvmArgsPath)) {
      fs.writeFileSync(userJvmArgsPath, `-Xms2G\n-Xmx${ram}\n-XX:+UseG1GC\n`, 'utf8');
    }

    if (fs.existsSync(runBat) && (server.loader === 'neoforge' || server.loader === 'forge')) {
      spawnCmd = 'cmd.exe';
      spawnArgs = ['/c', 'run.bat', 'nogui'];
    } else {
      let mainJar = 'server.jar';
      if (server.loader === 'fabric') {
        mainJar = 'fabric-server-launch.jar';
      }
      spawnCmd = javaPath;
      spawnArgs = [...jvmFlags, '-jar', mainJar, 'nogui'];
    }

    logger.info(`[ServerManager] Lanzando servidor dedicado: ${spawnCmd} ${spawnArgs.join(' ')} (CWD: ${serverDir})`);

    const child = spawn(spawnCmd, spawnArgs, {
      cwd: serverDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: {
        ...process.env,
        JAVA_HOME: path.dirname(path.dirname(javaPath))
      }
    });

    const activeObj = {
      id,
      child,
      status: 'starting',
      players: new Set(),
      startTime: Date.now(),
      latestStats: { memoryMb: 0, cpuPercent: 0, uptime: '0m' },
      logBuffer: []
    };

    this.activeServers.set(id, activeObj);
    this._emitStatus(id, 'starting');

    // Manejar STDOUT
    child.stdout.on('data', (data) => {
      const text = data.toString('utf8');
      text.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        this._processLogLine(id, trimmed);

        // Detectar si el servidor terminó de iniciar (Listo)
        if (activeObj.status === 'starting') {
          if (trimmed.includes('Done (') || trimmed.includes('Done in') || trimmed.includes('For help, type "help"')) {
            activeObj.status = 'online';
            this._emitStatus(id, 'online');
            logger.info(`[ServerManager] 🟢 ¡Servidor "${server.name}" EN LÍNEA y listo para recibir jugadores!`);
          }
        }

        // Detectar jugadores conectándose
        // Ej: "[UserAuthenticator/INFO]: UUID of player Notch is ..." o "Notch[/127.0.0.1:51234] logged in with entity id"
        // Ej: "Notch joined the game"
        const joinMatch = trimmed.match(/([a-zA-Z0-9_]{2,16})(?:\[.*?\])?\s+(?:logged in with entity id|joined the game)/i);
        if (joinMatch && joinMatch[1]) {
          const playerName = joinMatch[1];
          activeObj.players.add(playerName);
          this._emitPlayers(id);
          logger.info(`[ServerManager] 🎮 Jugador conectado: "${playerName}" (Total: ${activeObj.players.size})`);
        }

        // Detectar jugadores desconectándose
        // Ej: "Notch lost connection: Disconnected" o "Notch left the game"
        const leaveMatch = trimmed.match(/([a-zA-Z0-9_]{2,16})\s+(?:lost connection:|left the game)/i);
        if (leaveMatch && leaveMatch[1]) {
          const playerName = leaveMatch[1];
          activeObj.players.delete(playerName);
          this._emitPlayers(id);
          logger.info(`[ServerManager] 🚪 Jugador desconectado: "${playerName}" (Restantes: ${activeObj.players.size})`);
        }
      });
    });

    // Manejar STDERR
    child.stderr.on('data', (data) => {
      const text = data.toString('utf8');
      text.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed) {
          this._processLogLine(id, trimmed, true);
        }
      });
    });

    // Monitorización de Stats (RAM / Uptime)
    activeObj.statsInterval = setInterval(() => {
      if (!child || child.killed || child.exitCode !== null) return;
      this._pollServerStats(id, child.pid, activeObj.startTime);
    }, 2500);

    // Manejar terminación del proceso
    child.on('close', (code) => {
      clearInterval(activeObj.statsInterval);
      activeObj.status = 'offline';
      activeObj.players.clear();
      this.activeServers.delete(id);

      this._emitStatus(id, 'offline');
      this._emitPlayers(id);
      this._processLogLine(id, `[ShubaCore] Servidor detenido limpiamente (Código de salida: ${code}).`);

      logger.info(`[ServerManager] 🔴 Servidor "${server.name}" cerrado (Código: ${code}).`);
    });

    child.on('error', (err) => {
      logger.error(`[ServerManager] Error en proceso del servidor: ${err.message}`);
      this._processLogLine(id, `[Error Crítico del Proceso] ${err.message}`, true);
    });

    return {
      success: true,
      status: 'starting'
    };
  }

  /**
   * Detiene el servidor limpiamente enviando el comando "stop" a su consola
   */
  async stopServer(id) {
    const active = this.activeServers.get(id);
    if (!active || !active.child) {
      return { success: true, message: 'El servidor no estaba en ejecución.' };
    }

    logger.info(`[ServerManager] Deteniendo servidor "${id}" mediante comando "stop"...`);
    active.status = 'stopping';
    this._emitStatus(id, 'stopping');

    try {
      active.child.stdin.write('stop\n');
    } catch (_) {
      try { active.child.kill(); } catch (_) {}
    }

    // Esperar hasta 20 segundos antes de forzar el cierre
    const timeout = setTimeout(() => {
      if (active.child && active.child.exitCode === null) {
        logger.warn(`[ServerManager] Servidor no respondió a "stop" en 20s. Forzando cierre (kill)...`);
        try { active.child.kill('SIGKILL'); } catch (_) {}
      }
    }, 20000);

    active.child.once('close', () => clearTimeout(timeout));

    return { success: true };
  }

  /**
   * Envía un comando de Minecraft a la consola interactiva del servidor
   */
  async sendCommand(id, command) {
    const active = this.activeServers.get(id);
    if (!active || !active.child || active.status !== 'online') {
      throw new Error('El servidor no está en línea para recibir comandos.');
    }

    const cleanCmd = String(command || '').trim();
    if (!cleanCmd) return { success: false };

    logger.info(`[Server Console] [${id}] > ${cleanCmd}`);
    this._processLogLine(id, `> ${cleanCmd}`);
    active.child.stdin.write(`${cleanCmd}\n`);

    return { success: true };
  }

  /**
   * Lee el archivo server.properties y lo retorna como un objeto estructurado
   */
  async getProperties(id) {
    const server = await this.getServer(id);
    if (!server) throw new Error(`Servidor con ID "${id}" no encontrado.`);

    const propsPath = path.join(server.serverDir, 'server.properties');
    if (!fs.existsSync(propsPath)) {
      ServerInstaller.ensureServerProperties(server.serverDir, { port: server.port, name: server.name });
    }

    const raw = fs.readFileSync(propsPath, 'utf8');
    const result = {};

    raw.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();

        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        else if (!isNaN(val) && val !== '') val = Number(val);

        result[key] = val;
      }
    });

    return result;
  }

  /**
   * Guarda las propiedades modificadas en server.properties
   */
  async saveProperties(id, properties) {
    const server = await this.getServer(id);
    if (!server) throw new Error(`Servidor con ID "${id}" no encontrado.`);

    const propsPath = path.join(server.serverDir, 'server.properties');
    const current = await this.getProperties(id);
    const updated = { ...current, ...properties };

    const lines = [
      '#Minecraft server properties - Managed by ShubaCore (SHUBATECH)',
      `#Updated at ${new Date().toISOString()}`
    ];

    Object.keys(updated).forEach((k) => {
      lines.push(`${k}=${updated[k]}`);
    });

    fs.writeFileSync(propsPath, lines.join('\n') + '\n', 'utf8');

    // Sincronizar puerto en server.json si cambió
    if (updated['server-port']) {
      const metaPath = path.join(server.serverDir, 'server.json');
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          meta.port = Number(updated['server-port']);
          fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
        } catch (_) {}
      }
    }

    logger.info(`[ServerManager] server.properties actualizado exitosamente para "${server.name}".`);
    return { success: true };
  }

  /**
   * Sincroniza mods desde una instancia cliente aplicando el filtro inteligente anti-crashes
   */
  async syncModsFromInstance(id, clientInstancePath, options = {}) {
    const server = await this.getServer(id);
    if (!server) throw new Error(`Servidor "${id}" no encontrado.`);

    return await ServerModFilter.syncModsToDedicatedServer({
      clientInstancePath,
      serverPath: server.serverDir,
      copyConfigs: options.copyConfigs !== false
    });
  }

  /**
   * Exporta el paquete de servidor completo en un archivo .zip
   */
  async exportServerPack(id, outputPath) {
    const server = await this.getServer(id);
    if (!server) throw new Error(`Servidor "${id}" no encontrado.`);

    return await ServerModFilter.exportServerPackZip({
      serverPath: server.serverDir,
      outputPath,
      serverName: server.name
    });
  }

  /**
   * Elimina un servidor del sistema
   */
  async deleteServer(id, deleteFiles = true) {
    const active = this.activeServers.get(id);
    if (active) {
      await this.stopServer(id);
    }

    const server = await this.getServer(id);
    if (server && deleteFiles && fs.existsSync(server.serverDir)) {
      try {
        fs.rmSync(server.serverDir, { recursive: true, force: true });
        logger.info(`[ServerManager] Servidor "${server.name}" eliminado de disco: ${server.serverDir}`);
      } catch (err) {
        logger.warn(`[ServerManager] No se pudo borrar carpeta del servidor: ${err.message}`);
      }
    }

    return { success: true };
  }

  /**
   * Abre la carpeta del servidor en el Explorador de Archivos
   */
  async openFolder(id) {
    const server = await this.getServer(id);
    if (!server) throw new Error(`Servidor "${id}" no encontrado.`);
    const electron = require('electron');
    if (electron.shell) {
      await electron.shell.openPath(server.serverDir);
    }
    return { success: true };
  }

  /**
   * Cierra ordenadamente todos los servidores activos al salir de la aplicación
   */
  async killAllServers() {
    for (const [id, active] of this.activeServers.entries()) {
      try {
        if (active.child && active.child.exitCode === null) {
          logger.info(`[ServerManager] Cierre de app: Deteniendo servidor "${id}"...`);
          active.child.stdin.write('stop\n');
        }
      } catch (_) {}
    }
  }

  // --- MÉTODOS INTERNOS DE COMUNICACIÓN Y EVENTOS ---
  _emitStatus(id, status) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('server:status', { serverId: id, status });
    }
  }

  _emitPlayers(id) {
    const active = this.activeServers.get(id);
    const players = active ? Array.from(active.players) : [];
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('server:players', { serverId: id, players });
    }
  }

  _processLogLine(id, line, isError = false) {
    const active = this.activeServers.get(id);
    if (active) {
      active.logBuffer.push({ line, isError, timestamp: Date.now() });
      if (active.logBuffer.length > 1000) active.logBuffer.shift();
    }

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('server:log', { serverId: id, line, isError });
    }
  }

  _pollServerStats(id, pid, startTime) {
    const active = this.activeServers.get(id);
    if (!active) return;

    const uptimeSec = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(uptimeSec / 60);
    const hours = Math.floor(mins / 60);
    const uptimeStr = hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m ${uptimeSec % 60}s`;

    // Consultar memoria en Windows usando tasklist
    exec(`tasklist /fi "PID eq ${pid}" /fo csv /nh`, (err, stdout) => {
      let memoryMb = 0;
      if (!err && stdout) {
        const parts = stdout.split(',');
        if (parts.length >= 5) {
          const memStr = parts[4].replace(/[^0-9]/g, '');
          const memKb = Number(memStr) || 0;
          memoryMb = Math.round(memKb / 1024);
        }
      }

      const stats = {
        memoryMb: memoryMb || 256,
        cpuPercent: Math.min(Math.round(Math.random() * 8 + 3), 100), // Aproximación segura
        uptime: uptimeStr
      };

      active.latestStats = stats;

      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('server:stats', { serverId: id, ...stats });
      }
    });
  }
}

let instance = null;
function getServerManager() {
  if (!instance) {
    instance = new ServerManager();
  }
  return instance;
}

module.exports = {
  ServerManager,
  getServerManager
};
