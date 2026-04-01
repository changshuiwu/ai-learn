import { Room } from "./Room.js";
import { generateRoomId } from "./utils.js";

let wss = null;

export function setWss(server) {
  wss = server;
}

export class GameManager {
  constructor() {
    this.rooms = new Map();
  }

  createRoom() {
    let roomId;
    do {
      roomId = generateRoomId();
    } while (this.rooms.has(roomId));

    const room = new Room(roomId);
    this.rooms.set(roomId, room);

    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.destroy();
      this.rooms.delete(roomId);
    }
  }

  removePlayer(userId) {
    for (const [roomId, room] of this.rooms) {
      const player = room.players.find((p) => p.id === userId);
      if (player) {
        room.removePlayer(userId);
        if (room.players.length === 0) {
          this.deleteRoom(roomId);
        }
        return player;
      }
    }
    return null;
  }

  broadcast(roomId, message) {
    if (!wss) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const messageStr = JSON.stringify(message);

    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(messageStr);
      }
    });
  }
}
