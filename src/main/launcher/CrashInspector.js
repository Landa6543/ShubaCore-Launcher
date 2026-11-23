const fs = require('fs');
const path = require('path');
const { defaultLogger: logger } = require('../utils/logger');

class CrashInspector {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Analiza a fondo una instancia en busca de la causa raíz de un crash
   * @param {string} instancePath - Ruta de la instancia de Minecraft
   * @param {object} context - Metadatos adicionales (código de salida, versión de Java, etc.)
   * @returns {object} Diagnóstico estructurado con soluciones sugeridas
   */
  analyzeCrash(instancePath, context = {}) {
    if (!instancePath || !fs.existsSync(instancePath)) {
      return {
        hasCrash: false,
        errorType: 'NONE',
        title: 'Sin crash detectado',
        summary: 'No se encontró la carpeta de la instancia especificada.',
        suggestedActions: []
      };
    }

    const installedMods = this._scanInstalledMods(instancePath);
    let crashReportData = this._findLatestCrashReport(instancePath);
    let hsErrData = this._findLatestHsErr(instancePath);
    let latestLogData = this._readLatestLog(instancePath);

    // Si no hay archivo crash-*.txt ni hs_err, buscar en latest.log
    let contentToAnalyze = '';
    let logSource = 'none';

    if (crashReportData) {
      contentToAnalyze = crashReportData.content;
      logSource = crashReportData.filename;

      // Si el reporte de crash indica una falla secundaria en cascada (ej. Sodium config no encontrada por error previo),
      // o si latest.log contiene un fallo crítico previo de Mixin/Inyección, combinar con latest.log
      if (latestLogData && (
        /broken state most likely caused by an earlier error/i.test(crashReportData.content) ||
        /check the game log \(latest\.log\)/i.test(crashReportData.content) ||
        /SINYTRA CONNECTOR IS PRESENT/i.test(crashReportData.content) ||
        /Critical injection failure/i.test(latestLogData.content) ||
        /InvalidInjectionException/i.test(latestLogData.content)
      )) {
        contentToAnalyze = `${latestLogData.content}\n\n--- CRASH REPORT (${crashReportData.filename}) ---\n${crashReportData.content}`;
        logSource = `${crashReportData.filename} + latest.log`;
      }
    } else if (hsErrData) {
      contentToAnalyze = hsErrData.content;
      logSource = hsErrData.filename;
    } else if (latestLogData) {
      contentToAnalyze = latestLogData.content;
      logSource = 'latest.log';
    }

    if (!contentToAnalyze || contentToAnalyze.trim().length === 0) {
      return {
        hasCrash: false,
        errorType: 'NONE',
        title: 'Cierre normal o sin registro de error',
        summary: 'Minecraft se cerró sin generar un archivo de reporte de crash.',
        suggestedActions: []
      };
    }

    // 1. Detección de falta de memoria (OutOfMemoryError)
    const oomMatch = contentToAnalyze.match(/java\.lang\.OutOfMemoryError|GC overhead limit exceeded|Java heap space|Out of Memory/i);
    if (oomMatch) {
      return {
        hasCrash: true,
        errorType: 'OUT_OF_MEMORY',
        title: '⚡ Memoria RAM Insuficiente (OutOfMemory)',
        summary: 'Minecraft se quedó sin memoria RAM suficiente para cargar el juego y los mods.',
        explanation: 'El recolector de basura de Java superó el límite asignado (Java heap space). Asignar más RAM resolverá este cierre de inmediato.',
        culpritMod: null,
        logFile: logSource,
        stackTraceExcerpt: this._extractExcerpt(contentToAnalyze, /OutOfMemoryError/i, 15),
        cleanReport: this._buildCleanReport('OUT_OF_MEMORY', 'Memoria RAM agotada', contentToAnalyze, context),
        suggestedActions: [
          { id: 'increase-ram', label: '⚡ Aumentar 2 GB de RAM', action: 'increase-ram', primary: true },
          { id: 'copy-report', label: '📋 Copiar Reporte Limpio', action: 'copy-report' },
          { id: 'open-logs', label: '📂 Ver Log Completo', action: 'open-logs' }
        ]
      };
    }

    // 2. Detección de incompatibilidad de versión de Java
    const javaVerMatch = contentToAnalyze.match(/UnsupportedClassVersionError.*?class file version (\d+\.?\d*).*?version up to (\d+\.?\d*)/i) ||
                         contentToAnalyze.match(/has been compiled by a more recent version of the Java Runtime/i) ||
                         contentToAnalyze.match(/java\.lang\.UnsupportedClassVersionError/i);
    if (javaVerMatch) {
      return {
        hasCrash: true,
        errorType: 'JAVA_VERSION',
        title: '☕ Incompatibilidad de Versión de Java',
        summary: 'La versión de Java en uso no es compatible con los mods o esta versión de Minecraft.',
        explanation: 'Uno o varios mods fueron compilados con una versión superior de Java (ej. Java 21) mientras que la instancia se ejecutó con una versión inferior.',
        culpritMod: null,
        logFile: logSource,
        stackTraceExcerpt: this._extractExcerpt(contentToAnalyze, /UnsupportedClassVersionError/i, 12),
        cleanReport: this._buildCleanReport('JAVA_VERSION', 'Versión de Java incompatible', contentToAnalyze, context),
        suggestedActions: [
          { id: 'install-java21', label: '☕ Configurar Java 21 Automático', action: 'install-java21', primary: true },
          { id: 'copy-report', label: '📋 Copiar Reporte Limpio', action: 'copy-report' },
          { id: 'open-logs', label: '📂 Ver Log Completo', action: 'open-logs' }
        ]
      };
    }

    // 3. Detección de fallo en controladores gráficos / OpenGL
    const openglMatch = contentToAnalyze.match(/GLFW error 65542|WGL: The driver does not appear to support OpenGL|Pixel format not accelerated|org\.lwjgl\.opengl/i);
    if (openglMatch) {
      return {
        hasCrash: true,
        errorType: 'GRAPHICS_DRIVER',
        title: '🖥️ Error de Controladores Gráficos (OpenGL / GLFW)',
        summary: 'Tu tarjeta gráfica no soporta o tiene desactualizado el soporte de OpenGL requerido.',
        explanation: 'Minecraft no pudo inicializar la ventana gráfica debido a un conflicto o falta de drivers actualizados en tu tarjeta gráfica.',
        culpritMod: null,
        logFile: logSource,
        stackTraceExcerpt: this._extractExcerpt(contentToAnalyze, /GLFW error|OpenGL/i, 12),
        cleanReport: this._buildCleanReport('GRAPHICS_DRIVER', 'Fallo OpenGL / Controladores', contentToAnalyze, context),
        suggestedActions: [
          { id: 'copy-report', label: '📋 Copiar Reporte Limpio', action: 'copy-report', primary: true },
          { id: 'open-logs', label: '📂 Ver Log Completo', action: 'open-logs' }
        ]
      };
    }

    // 4. Detección de dependencias faltantes
    const depMatch = contentToAnalyze.match(/ModLoadingException:.*?requires (?:mod|dependency) ([\w-]+)/i) ||
                     contentToAnalyze.match(/Missing mandatory dependencies:?[\s\r\n]+([\w-]+)/i) ||
                     contentToAnalyze.match(/Mod '([\w-]+)' requires (?:mod |dependency )?'?([\w-]+)'?/i) ||
                     contentToAnalyze.match(/requires ([\w-]+), which is missing/i);
    if (depMatch) {
      const missingName = depMatch[1] || depMatch[2] || 'dependencia';
      return {
        hasCrash: true,
        errorType: 'MISSING_DEPENDENCY',
        title: '🧩 Falta una Dependencia Obligatoria',
        summary: `Uno de tus mods necesita "${missingName}" para poder funcionar.`,
        explanation: `Minecraft no pudo iniciarse porque falta la librería o mod requerido: ${missingName}. Puedes buscarlo e instalarlo desde el explorador de mods.`,
        missingDependency: missingName,
        culpritMod: null,
        logFile: logSource,
        stackTraceExcerpt: this._extractExcerpt(contentToAnalyze, /Missing mandatory|requires/i, 10),
        cleanReport: this._buildCleanReport('MISSING_DEPENDENCY', `Falta dependencia: ${missingName}`, contentToAnalyze, context),
        suggestedActions: [
          { id: 'search-dependency', label: `🔍 Buscar "${missingName}" en Catálogo`, action: 'search-dependency', meta: missingName, primary: true },
          { id: 'copy-report', label: '📋 Copiar Reporte Limpio', action: 'copy-report' },
          { id: 'open-logs', label: '📂 Ver Log Completo', action: 'open-logs' }
        ]
      };
    }

    // 5. Detección de mod culpable específico (Suspected Mods, Mixin failures, o Stack Trace matching)
    let culpritMod = this._identifyCulpritMod(contentToAnalyze, installedMods);
    if (!culpritMod && latestLogData && contentToAnalyze !== latestLogData.content) {
      culpritMod = this._identifyCulpritMod(latestLogData.content, installedMods);
      if (culpritMod) {
        logSource = 'latest.log';
      }
    }
    if (culpritMod) {
      return {
        hasCrash: true,
        errorType: 'MOD_CONFLICT',
        title: `🚫 Conflicto con el Mod "${culpritMod.displayName || culpritMod.name}"`,
        summary: `El mod "${culpritMod.fileName}" causó un error crítico durante la carga del juego.`,
        explanation: `Se detectó una excepción originada directamente en el archivo ${culpritMod.fileName}. Desactivar temporalmente este mod permitirá que Minecraft arranque con normalidad.`,
        culpritMod: {
          name: culpritMod.name,
          displayName: culpritMod.displayName || culpritMod.name,
          fileName: culpritMod.fileName,
          filePath: culpritMod.filePath
        },
        logFile: logSource,
        stackTraceExcerpt: culpritMod.excerpt || this._extractExcerpt(contentToAnalyze, new RegExp(culpritMod.name, 'i'), 15),
        cleanReport: this._buildCleanReport('MOD_CONFLICT', `Culpable: ${culpritMod.fileName}`, contentToAnalyze, context),
        suggestedActions: [
          { id: 'disable-mod', label: `🚫 Desactivar "${culpritMod.fileName}"`, action: 'disable-mod', meta: culpritMod.fileName, primary: true },
          { id: 'copy-report', label: '📋 Copiar Reporte Limpio', action: 'copy-report' },
          { id: 'open-logs', label: '📂 Ver Log Completo', action: 'open-logs' }
        ]
      };
    }

    // 6. Crash nativo hs_err_pid (Violación de acceso 0xC0000005)
    if (hsErrData || context.code === 3221225477 || context.code === -1073741819) {
      const frameMatch = contentToAnalyze.match(/Problematic frame:\s*[\r\n]+#\s*([^\r\n]+)/i);
      const problematicFrame = frameMatch ? frameMatch[1].trim() : 'Violación de acceso de memoria nativa';
      return {
        hasCrash: true,
        errorType: 'NATIVE_CRASH',
        title: '⚠️ Crash Nativo de JVM (0xC0000005)',
        summary: 'El motor Java o una librería gráfica nativa sufrió una violación de memoria.',
        explanation: `Fallo detectado en: ${problematicFrame}. Suele resolverse actualizando drivers de GPU o desactivando mods que inyectan shaders / rendering nativo.`,
        culpritMod: null,
        logFile: logSource,
        stackTraceExcerpt: problematicFrame,
        cleanReport: this._buildCleanReport('NATIVE_CRASH', problematicFrame, contentToAnalyze, context),
        suggestedActions: [
          { id: 'copy-report', label: '📋 Copiar Reporte Limpio', action: 'copy-report', primary: true },
          { id: 'open-logs', label: '📂 Ver Log Completo', action: 'open-logs' }
        ]
      };
    }

    // 7. Error genérico / Excepción no clasificada
    const firstExceptionMatch = contentToAnalyze.match(/(?:Caused by:\s*)?([a-zA-Z0-9_.]+(?:Exception|Error):[^\r\n]+)/i);
    const primaryError = firstExceptionMatch ? firstExceptionMatch[1].trim() : 'Excepción desconocida en Minecraft';

    return {
      hasCrash: true,
      errorType: 'GENERIC_CRASH',
      title: '⚠️ Error durante la ejecución de Minecraft',
      summary: primaryError.length > 120 ? primaryError.substring(0, 117) + '...' : primaryError,
      explanation: 'Ocurrió un error inesperado al iniciar o ejecutar Minecraft. Revisa el reporte limpio o consulta con la comunidad de ShubaCore.',
      culpritMod: null,
      logFile: logSource,
      stackTraceExcerpt: this._extractExcerpt(contentToAnalyze, /(?:Exception|Error):/i, 15),
      cleanReport: this._buildCleanReport('GENERIC_CRASH', primaryError, contentToAnalyze, context),
      suggestedActions: [
        { id: 'copy-report', label: '📋 Copiar Reporte Limpio', action: 'copy-report', primary: true },
        { id: 'open-logs', label: '📂 Ver Log Completo', action: 'open-logs' }
      ]
    };
  }

  /**
   * Desactiva un mod renombrando su extensión de .jar a .jar.disabled
   */
  disableMod(instancePath, fileName) {
    try {
      if (!fileName.endsWith('.jar')) return { success: false, error: 'El archivo debe ser un .jar' };
      const modsDir = path.join(instancePath, 'mods');
      const originalPath = path.join(modsDir, fileName);
      if (!fs.existsSync(originalPath)) {
        return { success: false, error: `No se encontró el mod ${fileName}` };
      }
      const disabledName = `${fileName}.disabled`;
      const targetPath = path.join(modsDir, disabledName);
      fs.renameSync(originalPath, targetPath);
      logger.info(`[CrashInspector] Mod desactivado: ${fileName} -> ${disabledName}`);
      return { success: true, disabledFileName: disabledName };
    } catch (err) {
      logger.error(`[CrashInspector] Error al desactivar mod ${fileName}:`, err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Reactiva un mod previamente desactivado (.jar.disabled -> .jar)
   */
  enableMod(instancePath, disabledFileName) {
    try {
      if (!disabledFileName.endsWith('.disabled')) return { success: false, error: 'El archivo no está desactivado' };
      const modsDir = path.join(instancePath, 'mods');
      const disabledPath = path.join(modsDir, disabledFileName);
      if (!fs.existsSync(disabledPath)) {
        return { success: false, error: `No se encontró el archivo ${disabledFileName}` };
      }
      const originalName = disabledFileName.replace(/\.disabled$/, '');
      const targetPath = path.join(modsDir, originalName);
      fs.renameSync(disabledPath, targetPath);
      logger.info(`[CrashInspector] Mod reactivado: ${disabledFileName} -> ${originalName}`);
      return { success: true, enabledFileName: originalName };
    } catch (err) {
      logger.error(`[CrashInspector] Error al reactivar mod ${disabledFileName}:`, err);
      return { success: false, error: err.message };
    }
  }

  // ==========================================
  // HELPERS INTERNOS DE ANÁLISIS
  // ==========================================

  _scanInstalledMods(instancePath) {
    const modsDir = path.join(instancePath, 'mods');
    if (!fs.existsSync(modsDir)) return [];
    try {
      const files = fs.readdirSync(modsDir);
      return files
        .filter(f => f.endsWith('.jar') && !f.endsWith('.disabled'))
        .map(f => {
          // Extraer nombre base simplificado sin versiones (ej. "jei-1.20.1-15.2.0.27.jar" -> "jei")
          const cleanName = f.replace(/\.jar$/i, '').replace(/[-_v\d.]+$/i, '').toLowerCase();
          return {
            fileName: f,
            filePath: path.join(modsDir, f),
            name: cleanName,
            displayName: f.replace(/\.jar$/i, '')
          };
        });
    } catch (_) {
      return [];
    }
  }

  _findLatestCrashReport(instancePath) {
    const crashDir = path.join(instancePath, 'crash-reports');
    if (!fs.existsSync(crashDir)) return null;
    try {
      const files = fs.readdirSync(crashDir);
      let latestFile = null;
      let latestMtime = 0;
      for (const f of files) {
        if (f.startsWith('crash-') && f.endsWith('.txt')) {
          const full = path.join(crashDir, f);
          const stat = fs.statSync(full);
          if (stat.mtimeMs > latestMtime) {
            latestMtime = stat.mtimeMs;
            latestFile = { filename: f, fullPath: full };
          }
        }
      }
      if (latestFile) {
        return {
          filename: latestFile.filename,
          content: fs.readFileSync(latestFile.fullPath, 'utf8')
        };
      }
    } catch (_) {}
    return null;
  }

  _findLatestHsErr(instancePath) {
    try {
      const files = fs.readdirSync(instancePath);
      let latestFile = null;
      let latestMtime = 0;
      for (const f of files) {
        if (f.startsWith('hs_err_pid') && f.endsWith('.log')) {
          const full = path.join(instancePath, f);
          const stat = fs.statSync(full);
          if (stat.mtimeMs > latestMtime) {
            latestMtime = stat.mtimeMs;
            latestFile = { filename: f, fullPath: full };
          }
        }
      }
      if (latestFile) {
        return {
          filename: latestFile.filename,
          content: fs.readFileSync(latestFile.fullPath, 'utf8')
        };
      }
    } catch (_) {}
    return null;
  }

  _readLatestLog(instancePath) {
    const logPath = path.join(instancePath, 'logs', 'latest.log');
    if (!fs.existsSync(logPath)) return null;
    try {
      const stat = fs.statSync(logPath);
      // Leer los últimos ~150 KB para capturar el crash sin saturar la memoria
      const bytesToRead = Math.min(stat.size, 150000);
      const buffer = Buffer.alloc(bytesToRead);
      const fd = fs.openSync(logPath, 'r');
      fs.readSync(fd, buffer, 0, bytesToRead, stat.size - bytesToRead);
      fs.closeSync(fd);
      return {
        filename: 'latest.log',
        content: buffer.toString('utf8')
      };
    } catch (_) {
      return null;
    }
  }

  _identifyCulpritMod(content, installedMods) {
    if (!installedMods || installedMods.length === 0) return null;

    // 0. Revisar fallos críticos de inyección Mixin (InvalidInjectionException / Critical injection failure)
    const critInjectionMatch = content.match(/Critical injection failure:.*?from mod ([\w-]+)/i) ||
                               content.match(/InvalidInjectionException:.*?from mod ([\w-]+)/i) ||
                               content.match(/@Inject annotation on (?:[\w$]+) could not find any targets.*?from mod ([\w-]+)/i) ||
                               content.match(/Injection failure.*?from mod ([\w-]+)/i);
    if (critInjectionMatch) {
      const modToken = critInjectionMatch[1].toLowerCase();
      for (const m of installedMods) {
        if (m.name.includes(modToken) || modToken.includes(m.name) || m.fileName.toLowerCase().includes(modToken)) {
          return {
            ...m,
            excerpt: critInjectionMatch[0]
          };
        }
      }
    }

    // 1. Revisar bloque "Suspected Mods:" típico de Forge / NeoForge
    const suspectedMatch = content.match(/Suspected Mods:\s*[\r\n]+([^\r\n]+)/i);
    if (suspectedMatch) {
      const rawSuspected = suspectedMatch[1].toLowerCase();
      for (const m of installedMods) {
        if (rawSuspected.includes(m.name) || rawSuspected.includes(m.fileName.toLowerCase())) {
          return { ...m, excerpt: suspectedMatch[0] };
        }
      }
    }

    // 2. Revisar fallos de Mixin Transformer
    const mixinMatch = content.match(/MixinApplyError.*?in\s+(?:module\s+)?([a-zA-Z0-9_.-]+)/i) ||
                       contentToAnalyzeMixin(content);
    if (mixinMatch) {
      const targetToken = mixinMatch.toLowerCase();
      for (const m of installedMods) {
        if (targetToken.includes(m.name) || m.name.includes(targetToken)) {
          return { ...m, excerpt: `Mixin Transformer Error originado por ${m.displayName}` };
        }
      }
    }

    // 3. Revisar "Mod Loading Error: <modname>" o "Failed to load mod <modname>"
    const failedModMatch = content.match(/Failed to load mod '([a-zA-Z0-9_-]+)'/i) ||
                           content.match(/Mod '([a-zA-Z0-9_-]+)' failed to load/i) ||
                           content.match(/Caused by:.*?\(([a-zA-Z0-9_.-]+)\.jar\)/i);
    if (failedModMatch) {
      const candidateName = failedModMatch[1].toLowerCase();
      for (const m of installedMods) {
        if (m.name.includes(candidateName) || candidateName.includes(m.name) || m.fileName.toLowerCase().includes(candidateName)) {
          return { ...m, excerpt: failedModMatch[0] };
        }
      }
    }

    // 4. Analizar las primeras 30 líneas de stack trace contra los nombres de mod
    const lines = content.split(/\r?\n/).slice(0, 80);
    for (const line of lines) {
      if (!line.includes('at ')) continue;
      const lowerLine = line.toLowerCase();
      for (const m of installedMods) {
        if (m.name.length >= 3 && lowerLine.includes(m.name)) {
          // Si Sodium falló por un error previo de otro mod ("broken state"), no culpar falsamente a Sodium
          if (m.name.includes('sodium') && /Sodium's config could not be found/i.test(content)) {
            continue;
          }
          return { ...m, excerpt: line.trim() };
        }
      }
    }

    return null;
  }

  _extractExcerpt(content, regex, maxLines = 15) {
    const lines = content.split(/\r?\n/);
    let matchIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        matchIndex = i;
        break;
      }
    }
    if (matchIndex === -1) matchIndex = 0;
    const start = Math.max(0, matchIndex - 2);
    const end = Math.min(lines.length, start + maxLines);
    return lines.slice(start, end).join('\n');
  }

  _buildCleanReport(errorType, headline, fullContent, context = {}) {
    const lines = fullContent.split(/\r?\n/).slice(0, 45).join('\n');
    // Anonimizar rutas de usuario de Windows/Linux (ej: C:\Users\soybe -> C:\Users\***)
    const sanitized = lines
      .replace(/([A-Za-z]:\\[Uu]sers\\[^\\]+)/g, 'C:\\Users\\***')
      .replace(/(\/home\/[^\/]+)/g, '/home/***');

    return [
      `### 🩺 Reporte Diagnóstico ShubaCore`,
      `- **Tipo de Error**: ${errorType}`,
      `- **Resumen**: ${headline}`,
      `- **Instancia**: ${context.instanceName || 'Minecraft'}`,
      `- **Sistema Operativo**: ${process.platform} (${process.arch})`,
      `- **Fecha y Hora**: ${new Date().toLocaleString()}`,
      '',
      '```',
      sanitized,
      '```'
    ].join('\n');
  }
}

function contentToAnalyzeMixin(content) {
  const m = content.match(/org\.spongepowered\.asm\.mixin\.transformer\.throwables\.MixinTransformerError:[^\r\n]+in\s+([a-zA-Z0-9_.-]+)/i);
  return m ? m[1] : null;
}

module.exports = CrashInspector;
