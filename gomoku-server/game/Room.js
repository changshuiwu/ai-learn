/**
 * 房间类 - 管理五子棋游戏房间
 * 负责玩家加入、游戏状态管理、超时计时器等功能
 */

import { Game } from './Game.js'

// 超时时间：2分钟（每次落子后的倒计时）
const TIMEOUT_MS = 2 * 60 * 1000

/**
 * 房间构造函数
 * @param {string} roomId - 房间唯一标识符
 */
export class Room {
  constructor(roomId) {
    /**
     * @property {string} roomId - 房间ID
     * @property {Game} game - 游戏实例，管理棋盘和游戏逻辑
     * @property {Array} players - 玩家数组，存储已加入房间的玩家信息
     * @property {NodeJS.Timeout|null} timer - 超时计时器ID
     * @property {number} timeRemaining - 剩余时间（毫秒）
     */
    this.roomId = roomId
    this.game = new Game()
    this.players = [] // [{ id, username, color }]
    this.timer = null
    this.timeRemaining = TIMEOUT_MS
  }

  /**
   * 添加玩家到房间
   * @param {Object} user - 用户对象 { id, username, ... }
   * @returns {Object} { success: boolean, color: string, isFull: boolean, error?: string }
   *
   * 逻辑说明：
   * - 第1个加入的玩家自动成为黑方（执黑）
   * - 第2个加入的玩家自动成为白方（执白）
   * - 房间最多容纳2个玩家
   */
  addPlayer(user) {
    // 检查房间是否已满（最多2人）
    if (this.players.length >= 2) {
      return { success: false, error: '房间已满' }
    }

    // 第1个玩家执黑，第2个玩家执白
    const color = this.players.length === 0 ? 'black' : 'white'

    // 将玩家信息（包含颜色）添加到玩家列表
    const player = { ...user, color }
    this.players.push(player)

    return { success: true, color, isFull: this.players.length >= 2 }
  }

  /**
   * 检查指定用户是否在房间中
   * @param {string} userId - 用户ID
   * @returns {boolean}
   */
  hasUser(userId) {
    return this.players.some(p => p.id === userId)
  }

  /**
   * 获取指定用户的棋子颜色
   * @param {string} userId - 用户ID
   * @returns {string|null} 'black' | 'white' | null
   */
  getUserColor(userId) {
    const player = this.players.find(p => p.id === userId)
    return player?.color
  }

  /**
   * 获取房主（第一个加入的玩家）
   * @returns {Object|null}
   */
  getHost() {
    return this.players[0]
  }

  /**
   * 从房间移除玩家
   * @param {string} userId - 要移除的用户ID
   * @returns {Object|null} 被移除的玩家对象，如果不在房间中则返回null
   */
  removePlayer(userId) {
    // 查找玩家在数组中的索引
    const index = this.players.findIndex(p => p.id === userId)
    if (index === -1) return null

    // splice 会修改原数组，返回被删除的元素
    return this.players.splice(index, 1)[0]
  }

  /**
   * 检查房间是否已满（2人）
   * @returns {boolean}
   */
  isFull() {
    return this.players.length >= 2
  }

  /**
   * 在棋盘上放置棋子
   * @param {number} x - 横坐标 (0-14)
   * @param {number} y - 纵坐标 (0-14)
   * @param {string} userId - 用户ID
   * @returns {Object} { success: boolean, error?: string }
   *
   * 落子规则：
   * 1. 玩家必须在房间中
   * 2. 必须是当前玩家的回合
   * 3. 游戏尚未结束
   * 4. 落子位置为空
   */
  placePiece(x, y, userId) {
    // 检查玩家是否在房间中
    const player = this.players.find(p => p.id === userId)
    if (!player) return { success: false, error: '不在房间中' }

    // 检查是否是当前玩家的回合
    const currentColor = this.game.currentPlayer
    if (player.color !== currentColor) {
      return { success: false, error: '还不是你的回合' }
    }

    // 检查游戏是否已结束
    if (this.game.gameOver) {
      return { success: false, error: '游戏已结束' }
    }

    // 重置倒计时（给下一个玩家）
    this.resetTimer()

    // 调用游戏类的落子方法
    const success = this.game.placePiece(x, y)

    if (success) {
      return {
        success: true,
        gameState: this.game.getState()
      }
    }

    return { success: false, error: '无效的位置' }
  }

  /**
   * 启动超时计时器
   * 当玩家在规定时间内没有落子，判定该玩家超时负
   * @param {Function} onTimeout - 超时回调函数，参数为获胜方颜色
   */
  startTimer(onTimeout) {
    // 重置剩余时间
    this.timeRemaining = TIMEOUT_MS

    // 先停止已有的计时器（防止重复计时）
    this.stopTimer()

    // 每秒更新一次剩余时间
    this.timer = setInterval(() => {
      this.timeRemaining -= 1000

      // 广播计时器更新给所有玩家
      if (globalThis.broadcast) {
        globalThis.broadcast(this.roomId, {
          type: 'timer_update',
          timeRemaining: this.timeRemaining,
          currentPlayer: this.game.currentPlayer
        })
      }

      // 时间耗尽，判定超时
      if (this.timeRemaining <= 0) {
        this.stopTimer()

        // 设置游戏结束，超时方判负
        this.game.gameOver = true
        this.game.winner = this.game.currentPlayer === 'black' ? 'white' : 'black'

        // 触发超时回调
        if (onTimeout) {
          onTimeout(this.game.winner)
        }
      }
    }, 1000)
  }

  /**
   * 停止超时计时器
   */
  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  /**
   * 重置计时器（每次落子后调用）
   * 将剩余时间重置为初始值，并停止当前计时器
   */
  resetTimer() {
    this.timeRemaining = TIMEOUT_MS
    if (this.timer) {
      this.stopTimer()
    }
  }

  /**
   * 获取当前剩余时间
   * @returns {number} 剩余毫秒数
   */
  getTimeRemaining() {
    return this.timeRemaining
  }

  /**
   * 广播消息给房间内所有玩家
   * @param {Object} message - 要发送的消息对象
   *
   * 注意：这里调用全局的 broadcast 函数
   */
  broadcast(message) {
    // 通过全局 wss 发送（这里简化处理）
    // 实际应该通过连接的 WebSocket 发送
    globalThis.broadcast?.(message, this.roomId)
  }

  /**
   * 销毁房间
   * 清理计时器等资源
   */
  destroy() {
    this.stopTimer()
  }
}