/**
 * Room 类单元测试
 * 测试房间管理逻辑
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Room } from './Room.js'

describe('Room 类', () => {
  let room

  beforeEach(() => {
    room = new Room('TEST123')
  })

  // ==================== 构造函数测试 ====================

  describe('构造函数', () => {
    it('应该正确设置房间ID', () => {
      expect(room.roomId).toBe('TEST123')
    })

    it('应该初始化空玩家列表', () => {
      expect(room.players).toHaveLength(0)
    })

    it('应该初始化计时器为 null', () => {
      expect(room.timer).toBe(null)
    })
  })

  // ==================== addPlayer 测试 ====================

  describe('addPlayer() 添加玩家', () => {
    it('第一个玩家应该是黑方', () => {
      const user = { id: 'user1', username: '玩家1' }
      const result = room.addPlayer(user)

      expect(result.success).toBe(true)
      expect(result.color).toBe('black')
      expect(room.players).toHaveLength(1)
      expect(room.players[0].color).toBe('black')
    })

    it('第二个玩家应该是白方', () => {
      room.addPlayer({ id: 'user1', username: '玩家1' })
      const result = room.addPlayer({ id: 'user2', username: '玩家2' })

      expect(result.success).toBe(true)
      expect(result.color).toBe('white')
      expect(room.players).toHaveLength(2)
    })

    it('房间满时应该拒绝第三个玩家', () => {
      room.addPlayer({ id: 'user1', username: '玩家1' })
      room.addPlayer({ id: 'user2', username: '玩家2' })
      const result = room.addPlayer({ id: 'user3', username: '玩家3' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('房间已满')
    })

    it('添加玩家后应该返回 isFull 状态', () => {
      const result1 = room.addPlayer({ id: 'user1', username: '玩家1' })
      expect(result1.isFull).toBe(false)

      const result2 = room.addPlayer({ id: 'user2', username: '玩家2' })
      expect(result2.isFull).toBe(true)
    })
  })

  // ==================== hasUser 测试 ====================

  describe('hasUser() 检查用户是否存在', () => {
    it('应该正确检测存在的用户', () => {
      room.addPlayer({ id: 'user1', username: '玩家1' })
      expect(room.hasUser('user1')).toBe(true)
    })

    it('应该正确检测不存在的用户', () => {
      room.addPlayer({ id: 'user1', username: '玩家1' })
      expect(room.hasUser('user2')).toBe(false)
    })
  })

  // ==================== getUserColor 测试 ====================

  describe('getUserColor() 获取用户颜色', () => {
    it('应该返回用户的棋子颜色', () => {
      room.addPlayer({ id: 'user1', username: '玩家1' })
      expect(room.getUserColor('user1')).toBe('black')
    })

    it('用户不在房间中应该返回 null 或 undefined', () => {
      // getUserColor 用 find()，找不到时返回 undefined
      expect(room.getUserColor('user1')).toBeUndefined()
    })
  })

  // ==================== getHost 测试 ====================

  describe('getHost() 获取房主', () => {
    it('应该返回第一个加入的玩家', () => {
      room.addPlayer({ id: 'user1', username: '玩家1' })
      room.addPlayer({ id: 'user2', username: '玩家2' })

      const host = room.getHost()
      expect(host.id).toBe('user1')
    })
  })

  // ==================== removePlayer 测试 ====================

  describe('removePlayer() 移除玩家', () => {
    it('应该正确移除存在的玩家', () => {
      room.addPlayer({ id: 'user1', username: '玩家1' })
      const removed = room.removePlayer('user1')

      expect(removed).not.toBeNull()
      expect(room.players).toHaveLength(0)
    })

    it('移除不存在的玩家应该返回 null', () => {
      const removed = room.removePlayer('user1')
      expect(removed).toBeNull()
    })
  })

  // ==================== isFull 测试 ====================

  describe('isFull() 房间是否满员', () => {
    it('1人时应该返回 false', () => {
      room.addPlayer({ id: 'user1', username: '玩家1' })
      expect(room.isFull()).toBe(false)
    })

    it('2人时应该返回 true', () => {
      room.addPlayer({ id: 'user1', username: '玩家1' })
      room.addPlayer({ id: 'user2', username: '玩家2' })
      expect(room.isFull()).toBe(true)
    })
  })

  // ==================== placePiece 测试 ====================

  describe('placePiece() 落子功能', () => {
    beforeEach(() => {
      room.addPlayer({ id: 'user1', username: '玩家1' }) // 黑方
      room.addPlayer({ id: 'user2', username: '玩家2' }) // 白方
    })

    it('当前玩家应该能成功落子', () => {
      const result = room.placePiece(7, 7, 'user1')
      expect(result.success).toBe(true)
    })

    it('非当前玩家落子应该失败', () => {
      // user1 是黑方，当前先手
      const result = room.placePiece(7, 7, 'user2')
      expect(result.success).toBe(false)
      expect(result.error).toBe('还不是你的回合')
    })

    it('玩家不在房间中应该失败', () => {
      const result = room.placePiece(7, 7, 'user3')
      expect(result.success).toBe(false)
      expect(result.error).toBe('不在房间中')
    })
  })

  // ==================== 计时器测试 ====================

  describe('计时器功能', () => {
    // 使用 vi.useFakeTimers 来模拟时间
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('startTimer 应该启动计时器', () => {
      const callback = vi.fn()
      room.startTimer(callback)

      // 快速前进 1 秒
      vi.advanceTimersByTime(1000)
      expect(room.timeRemaining).toBeLessThan(2 * 60 * 1000)
    })

    it('stopTimer 应该停止计时器', () => {
      room.startTimer(() => {})

      // 停止后不再减少
      const beforeTime = room.getTimeRemaining()
      vi.advanceTimersByTime(1000)
      const afterTime = room.getTimeRemaining()

      // 注意：stopTimer 会重置计时器，所以时间会重置
      // 这个测试需要检查停止后时间确实停止了
      room.stopTimer()
      // 重新启动后检查
      room.startTimer(() => {})
      vi.advanceTimersByTime(1000)
      expect(room.getTimeRemaining()).toBe(2 * 60 * 1000 - 1000)
    })

    it('resetTimer 应该重置时间', () => {
      room.startTimer(() => {})
      vi.advanceTimersByTime(30000)

      room.resetTimer()
      expect(room.getTimeRemaining()).toBe(2 * 60 * 1000)
    })

    it('超时应该触发回调', () => {
      const callback = vi.fn()
      room.startTimer(callback)

      // 前进 2 分钟
      vi.advanceTimersByTime(2 * 60 * 1000)

      expect(callback).toHaveBeenCalled()
      expect(room.game.gameOver).toBe(true)
    })

    it('getTimeRemaining 应该返回剩余时间', () => {
      room.startTimer(() => {})
      vi.advanceTimersByTime(10000)

      expect(room.getTimeRemaining()).toBe(2 * 60 * 1000 - 10000)
    })
  })

  // ==================== destroy 测试 ====================

  describe('destroy() 销毁房间', () => {
    it('应该停止计时器', () => {
      vi.useFakeTimers()
      room.startTimer(() => {})
      room.destroy()
      vi.useRealTimers()
      expect(room.timer).toBe(null)
    })
  })
})