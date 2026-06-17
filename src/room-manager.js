const crypto = require('crypto');

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  generateRoomCode() {
    return crypto.randomInt(100000, 999999).toString();
  }

  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { salt, hash };
  }

  verifyPassword(password, salt, hash) {
    const inputHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return inputHash === hash;
  }

  createRoom(password = null) {
    let code;
    do {
      code = this.generateRoomCode();
    } while (this.rooms.has(code));

    const roomData = {
      code,
      hostId: null,
      annotations: [],
      createdAt: Date.now(),
      hasPassword: false,
      passwordSalt: null,
      passwordHash: null
    };

    if (password) {
      const { salt, hash } = this.hashPassword(password);
      roomData.hasPassword = true;
      roomData.passwordSalt = salt;
      roomData.passwordHash = hash;
    }

    this.rooms.set(code, roomData);

    return this.rooms.get(code);
  }

  setPassword(code, password) {
    const room = this.rooms.get(code);
    if (!room) return false;
    const { salt, hash } = this.hashPassword(password);
    room.hasPassword = true;
    room.passwordSalt = salt;
    room.passwordHash = hash;
    return true;
  }

  clearPassword(code) {
    const room = this.rooms.get(code);
    if (!room) return false;
    room.hasPassword = false;
    room.passwordSalt = null;
    room.passwordHash = null;
    return true;
  }

  verifyRoomPassword(code, password) {
    const room = this.rooms.get(code);
    if (!room || !room.hasPassword) return true;
    if (!password) return false;
    return this.verifyPassword(password, room.passwordSalt, room.passwordHash);
  }

  hasPassword(code) {
    const room = this.rooms.get(code);
    return room ? room.hasPassword : false;
  }

  getRoom(code) {
    return this.rooms.get(code) || null;
  }

  hasRoom(code) {
    return this.rooms.has(code);
  }

  deleteRoom(code) {
    this.rooms.delete(code);
  }

  setHost(code, clientId) {
    const room = this.rooms.get(code);
    if (room) {
      room.hostId = clientId;
    }
  }

  addAnnotation(code, annotation) {
    const room = this.rooms.get(code);
    if (room) {
      room.annotations.push(annotation);
      return annotation;
    }
    return null;
  }

  clearAnnotations(code) {
    const room = this.rooms.get(code);
    if (room) {
      room.annotations = [];
    }
  }

  deleteAnnotation(code, annotationId) {
    const room = this.rooms.get(code);
    if (room) {
      room.annotations = room.annotations.filter(a => a.id !== annotationId);
    }
  }

  getAnnotations(code) {
    const room = this.rooms.get(code);
    return room ? room.annotations : [];
  }
}

module.exports = RoomManager;
