import { Room } from './Room.js'
import { generateRoomId } from './utils.js'

export class GameManager {
  constructor() {
    this.rooms = new Map() // roomId -> Room
  }

  createRoom() {
    let roomId
    do {
      roomId = generateRoomId()
    } while (this.rooms.has(roomId))

    const room = new Room(roomId)
    this.rooms.set(roomId, room)

    return room
  }

  getRoom(roomId) {
    return this.rooms.get(roomId)
  }

  joinRoom(roomId) {
    const room = this.rooms.get(roomId)
    if (!room) return null
    if (room.isFull()) return null

    return room
  }

  deleteRoom(roomId) {
    const room = this.rooms.get(roomId)
    if (room) {
      room.destroy()
      this.rooms.delete(roomId)
    }
  }

  findRoomByWs(ws) {
    for (const room of this.rooms.values()) {
      if (room.getPlayer(ws)) {
        return room
      }
    }
    return null
  }

  removePlayer(ws) {
    const room = this.findRoomByWs(ws)
    if (!room) return

    const player = room.removePlayer(ws)

    // 如果房间空了，删除房间
    if (room.playerList.length === 0) {
      this.deleteRoom(room.roomId)
    }

    return player
  }
}