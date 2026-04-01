import { Game } from './Game.js'
import { generateRoomId } from './utils.js'

// 倒计时时间（毫秒）
const TIMEOUT_MS = 2 * 60 * 1000 // 2分钟

export class Room {
  constructor(roomId) {
    this.roomId = roomId
    this.game = new Game()
    this.players = {} // { ws: { name, color } }
    this.playerList = [] // [{ ws, name, color }]
    this.timer = null
    this.timeRemaining = TIMEOUT_MS
  }

  addPlayer(ws, playerName) {
    if (this.playerList.length >= 2) {
      return { success: false, error: '房间已满' }
    }

    const color = this.playerList.length === 0 ? 'black' : 'white'
    const player = { ws, name: playerName, color }

    this.players[ws] = player
    this.playerList.push(player)

    return { success: true, color, isFull: this.playerList.length === 2 }
  }

  removePlayer(ws) {
    const player = this.players[ws]
    if (!player) return null

    delete this.players[ws]
    this.playerList = this.playerList.filter(p => p.ws !== ws)

    this.stopTimer()
    return player
  }

  getPlayer(ws) {
    return this.players[ws]
  }

  getPlayerByColor(color) {
    return this.playerList.find(p => p.color === color)
  }

  isFull() {
    return this.playerList.length >= 2
  }

  placePiece(x, y, ws) {
    const player = this.players[ws]
    if (!player) return { success: false, error: '不在房间中' }

    const currentColor = this.game.currentPlayer
    if (player.color !== currentColor) {
      return { success: false, error: '还不是你的回合' }
    }

    if (this.game.gameOver) {
      return { success: false, error: '游戏已结束' }
    }

    const success = this.game.placePiece(x, y)

    if (success) {
      this.resetTimer()

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
        // 超时判负
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

  broadcast(message, excludeWs = null) {
    for (const player of this.playerList) {
      if (player.ws !== excludeWs && player.ws.readyState === 1) {
        player.ws.send(JSON.stringify(message))
      }
    }
  }

  destroy() {
    this.stopTimer()
  }
}