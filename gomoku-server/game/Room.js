import { Game } from './Game.js'
import { generateRoomId } from './utils.js'

const TIMEOUT_MS = 2 * 60 * 1000 // 2分钟

export class Room {
  constructor(roomId) {
    this.roomId = roomId
    this.game = new Game()
    this.players = [] // [{ id, username, color }]
    this.timer = null
    this.timeRemaining = TIMEOUT_MS
  }

  addPlayer(user) {
    if (this.players.length >= 2) {
      return { success: false, error: '房间已满' }
    }

    const color = this.players.length === 0 ? 'black' : 'white'
    const player = { ...user, color }

    this.players.push(player)

    return { success: true, color, isFull: this.players.length >= 2 }
  }

  hasUser(userId) {
    return this.players.some(p => p.id === userId)
  }

  getUserColor(userId) {
    const player = this.players.find(p => p.id === userId)
    return player?.color
  }

  getHost() {
    return this.players[0]
  }

  removePlayer(userId) {
    const index = this.players.findIndex(p => p.id === userId)
    if (index === -1) return null

    return this.players.splice(index, 1)[0]
  }

  isFull() {
    return this.players.length >= 2
  }

  placePiece(x, y, userId) {
    const player = this.players.find(p => p.id === userId)
    if (!player) return { success: false, error: '不在房间中' }

    const currentColor = this.game.currentPlayer
    if (player.color !== currentColor) {
      return { success: false, error: '还不是你的回合' }
    }

    if (this.game.gameOver) {
      return { success: false, error: '游戏已结束' }
    }

    // 重置倒计时（给下一个玩家）
    this.resetTimer()

    const success = this.game.placePiece(x, y)

    if (success) {
      return {
        success: true,
        gameState: this.game.getState()
      }
    }

    return { success: false, error: '无效的位置' }
  }

  startTimer(onTimeout) {
    this.timeRemaining = TIMEOUT_MS
    this.stopTimer()

    this.timer = setInterval(() => {
      this.timeRemaining -= 1000

      if (this.timeRemaining <= 0) {
        this.stopTimer()
        this.game.gameOver = true
        this.game.winner = this.game.currentPlayer === 'black' ? 'white' : 'black'

        if (onTimeout) {
          onTimeout(this.game.winner)
        }
      }
    }, 1000)
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  resetTimer() {
    this.timeRemaining = TIMEOUT_MS
    if (this.timer) {
      this.stopTimer()
    }
  }

  getTimeRemaining() {
    return this.timeRemaining
  }

  broadcast(message) {
    // 通过全局 wss 发送（这里简化处理）
    // 实际应该通过连接的 WebSocket 发送
    globalThis.broadcast?.(message, this.roomId)
  }

  destroy() {
    this.stopTimer()
  }
}