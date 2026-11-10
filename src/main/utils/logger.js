/**
 * ShubaCore - Logger Utility
 * Developed by SHUBATECH
 */

class Logger {
  constructor(tag = 'ShubaCore') {
    this.tag = tag;
    this.subscribers = new Set();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  _format(level, message, ...args) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const formattedArgs = args.length > 0 ? ' ' + args.map(a => {
      if (a instanceof Error) {
        return a.stack || a.message || String(a);
      }
      if (typeof a === 'object' && a !== null) {
        try {
          return JSON.stringify(a);
        } catch (_) {
          return String(a);
        }
      }
      return String(a);
    }).join(' ') : '';
    return {
      raw: `[SHUBATECH:${this.tag}] [${level}] [${timestamp}] ${message}${formattedArgs}`,
      level,
      timestamp,
      message: `${message}${formattedArgs}`
    };
  }

  _broadcast(entry) {
    for (const callback of this.subscribers) {
      try {
        callback(entry);
      } catch (err) {
        console.error('Error in logger subscriber callback:', err);
      }
    }
  }

  info(message, ...args) {
    const entry = this._format('INFO', message, ...args);
    console.log(entry.raw);
    this._broadcast(entry);
  }

  warn(message, ...args) {
    const entry = this._format('WARN', message, ...args);
    console.warn(entry.raw);
    this._broadcast(entry);
  }

  error(message, ...args) {
    const entry = this._format('ERROR', message, ...args);
    console.error(entry.raw);
    this._broadcast(entry);
  }

  debug(message, ...args) {
    const entry = this._format('DEBUG', message, ...args);
    console.debug(entry.raw);
    this._broadcast(entry);
  }

  game(message, ...args) {
    const entry = this._format('GAME', message, ...args);
    console.log(entry.raw);
    this._broadcast(entry);
  }
}

const defaultLogger = new Logger('Backend');
module.exports = { Logger, defaultLogger };
