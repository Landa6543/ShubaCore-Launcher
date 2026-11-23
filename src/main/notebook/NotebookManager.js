/**
 * ShubaCore - World Notebook & Coordinates Manager
 * Developed by SHUBATECH
 * Gestión de libreta de coordenadas y notas para mundos y servidores de Minecraft.
 */

const fs = require('fs');
const path = require('path');
const { defaultLogger: logger } = require('../utils/logger');

class NotebookManager {
  _getNotebookPath(instancePath) {
    return path.join(instancePath, 'shuba-notes.json');
  }

  getNotes(instancePath) {
    if (!instancePath || !fs.existsSync(instancePath)) return [];
    const p = this._getNotebookPath(instancePath);
    if (!fs.existsSync(p)) return [];
    try {
      const data = fs.readFileSync(p, 'utf8');
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  saveNotes(instancePath, notes) {
    if (!instancePath || !fs.existsSync(instancePath)) return false;
    const p = this._getNotebookPath(instancePath);
    try {
      fs.writeFileSync(p, JSON.stringify(notes, null, 2), 'utf8');
      return true;
    } catch (err) {
      logger.error('[NotebookManager] Error guardando notas:', err);
      return false;
    }
  }

  addNote(instancePath, noteData = {}) {
    const notes = this.getNotes(instancePath);
    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: noteData.title?.trim() || 'Punto de Interés',
      dimension: noteData.dimension || 'overworld', // overworld | nether | end
      x: parseInt(noteData.x, 10) || 0,
      y: parseInt(noteData.y, 10) || 64,
      z: parseInt(noteData.z, 10) || 0,
      description: noteData.description?.trim() || '',
      color: noteData.color || '#10b981',
      tpCommand: `/tp @s ${parseInt(noteData.x, 10) || 0} ${parseInt(noteData.y, 10) || 64} ${parseInt(noteData.z, 10) || 0}`,
      createdAt: new Date().toISOString()
    };
    notes.unshift(newNote);
    this.saveNotes(instancePath, notes);
    return { success: true, note: newNote };
  }

  updateNote(instancePath, noteId, updates = {}) {
    const notes = this.getNotes(instancePath);
    const idx = notes.findIndex(n => n.id === noteId);
    if (idx === -1) return { success: false, error: 'Nota no encontrada' };

    const curr = notes[idx];
    const x = updates.x !== undefined ? parseInt(updates.x, 10) : curr.x;
    const y = updates.y !== undefined ? parseInt(updates.y, 10) : curr.y;
    const z = updates.z !== undefined ? parseInt(updates.z, 10) : curr.z;

    notes[idx] = {
      ...curr,
      ...updates,
      x,
      y,
      z,
      tpCommand: `/tp @s ${x} ${y} ${z}`,
      updatedAt: new Date().toISOString()
    };
    this.saveNotes(instancePath, notes);
    return { success: true, note: notes[idx] };
  }

  deleteNote(instancePath, noteId) {
    const notes = this.getNotes(instancePath);
    const filtered = notes.filter(n => n.id !== noteId);
    this.saveNotes(instancePath, filtered);
    return { success: true, remainingCount: filtered.length };
  }
}

let notebookManagerInstance = null;
function getNotebookManager() {
  if (!notebookManagerInstance) {
    notebookManagerInstance = new NotebookManager();
  }
  return notebookManagerInstance;
}

module.exports = {
  NotebookManager,
  getNotebookManager
};
