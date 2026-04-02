/**
 * Game 类单元测试
 * 测试五子棋游戏核心逻辑
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { Game, BOARD_SIZE, BLACK, WHITE, EMPTY } from './Game.js'

describe('Game 类', () => {
  let game

  beforeEach(() => {
    game = new Game()
  })

  // ==================== 构造函数测试 ====================

  describe('构造函数', () => {
    it('应该正确初始化棋盘', () => {
      expect(game.board).toHaveLength(BOARD_SIZE)
      expect(game.board[0]).toHaveLength(BOARD_SIZE)
    })

    it('应该初始化为黑方先行', () => {
      expect(game.currentPlayer).toBe(BLACK)
    })

    it('应该初始化游戏未结束', () => {
      expect(game.gameOver).toBe(false)
      expect(game.winner).toBe(null)
    })

    it('应该初始化落子数为0', () => {
      expect(game.pieceCount).toBe(0)
    })
  })

  // ==================== 落子测试 ====================

  describe('placePiece() 落子功能', () => {
    it('应该在空位成功落子', () => {
      const result = game.placePiece(7, 7)
      expect(result).toBe(true)
      expect(game.board[7][7]).toBe(BLACK)
    })

    it('落子后应该增加落子数', () => {
      game.placePiece(7, 7)
      expect(game.pieceCount).toBe(1)
    })

    it('落子后应该切换玩家', () => {
      game.placePiece(7, 7)
      expect(game.currentPlayer).toBe(WHITE)
    })

    it('不应该在已有棋子的位置落子', () => {
      game.placePiece(7, 7)
      const result = game.placePiece(7, 7)
      expect(result).toBe(false)
    })

    it('不应该在棋盘外落子', () => {
      expect(game.placePiece(-1, 7)).toBe(false)
      expect(game.placePiece(7, 15)).toBe(false)
      expect(game.placePiece(15, 7)).toBe(false)
    })

    it('游戏结束后不应该允许落子', () => {
      // 先让游戏结束（模拟）
      game.gameOver = true
      const result = game.placePiece(7, 7)
      expect(result).toBe(false)
    })
  })

  // ==================== 胜负判定测试 ====================

  describe('checkWin() 胜负判定', () => {
    it('水平方向五连应该获胜', () => {
      // 只需要让同一方连续落5子即可
      // 黑: (0,0), 白: (5,5), 黑: (1,0), 白: (5,6), 黑: (2,0), 白: (5,7), 黑: (3,0), 白: (5,8), 黑: (4,0)
      game.placePiece(0, 0)  // 黑
      game.placePiece(5, 5)  // 白 (无所谓的落子)
      game.placePiece(1, 0)  // 黑
      game.placePiece(5, 6)  // 白
      game.placePiece(2, 0)  // 黑
      game.placePiece(5, 7)  // 白
      game.placePiece(3, 0)  // 黑
      game.placePiece(5, 8)  // 白
      const result = game.placePiece(4, 0) // 黑 - 这次落子后形成5连

      expect(result).toBe(true)
      expect(game.gameOver).toBe(true)
      expect(game.winner).toBe(BLACK)
    })

    it('垂直方向五连应该获胜', () => {
      game.placePiece(0, 0)  // 黑
      game.placePiece(5, 5)  // 白
      game.placePiece(0, 1)  // 黑
      game.placePiece(5, 6)  // 白
      game.placePiece(0, 2)  // 黑
      game.placePiece(5, 7)  // 白
      game.placePiece(0, 3)  // 黑
      game.placePiece(5, 8)  // 白
      const result = game.placePiece(0, 4) // 黑

      expect(result).toBe(true)
      expect(game.gameOver).toBe(true)
      expect(game.winner).toBe(BLACK)
    })

    it('主对角线方向五连应该获胜', () => {
      // (0,0), (5,5), (1,1), (5,6), (2,2), (5,7), (3,3), (5,8), (4,4)
      game.placePiece(0, 0)  // 黑
      game.placePiece(10, 10) // 白
      game.placePiece(1, 1)  // 黑
      game.placePiece(10, 11) // 白
      game.placePiece(2, 2)  // 黑
      game.placePiece(10, 12) // 白
      game.placePiece(3, 3)  // 黑
      game.placePiece(10, 13) // 白
      const result = game.placePiece(4, 4) // 黑

      expect(result).toBe(true)
      expect(game.gameOver).toBe(true)
      expect(game.winner).toBe(BLACK)
    })

    it('副对角线方向五连应该获胜', () => {
      // 副对角线：坐标 (x, 4-x) 即 (0,4), (1,3), (2,2), (3,1), (4,0)
      game.placePiece(0, 4)  // 黑
      game.placePiece(10, 10) // 白
      game.placePiece(1, 3)  // 黑
      game.placePiece(10, 11) // 白
      game.placePiece(2, 2)  // 黑
      game.placePiece(10, 12) // 白
      game.placePiece(3, 1)  // 黑
      game.placePiece(10, 13) // 白
      const result = game.placePiece(4, 0) // 黑

      expect(result).toBe(true)
      expect(game.gameOver).toBe(true)
      expect(game.winner).toBe(BLACK)
    })

    it('四连不应该获胜', () => {
      game.placePiece(0, 0)
      game.placePiece(5, 5)
      game.placePiece(1, 0)
      game.placePiece(5, 6)
      game.placePiece(2, 0)
      game.placePiece(5, 7)
      game.placePiece(3, 0)

      expect(game.gameOver).toBe(false)
      expect(game.winner).toBe(null)
    })

    it('白方获胜后游戏应该结束', () => {
      // 这个测试简化为：直接验证白方获胜的情况
      // 使用 setFirstPlayer 来让白方先手，然后直接测试
      game.placePiece(0, 5)  // 黑
      game.placePiece(5, 0)  // 白 1
      game.placePiece(1, 5)  // 黑
      game.placePiece(5, 1)  // 白 2
      game.placePiece(2, 5)  // 黑
      game.placePiece(5, 2)  // 白 3
      game.placePiece(3, 5)  // 黑
      const lastMove = game.placePiece(5, 3) // 白 4 - 但这不是第5个

      // 简化：这个测试主要验证同色连续5子能获胜
      // 白方实际需要5个子在垂直方向
      // 重新设置：
      const game2 = new Game()
      // 让白方先手
      game2.currentPlayer = 'white'

      // 白方落5子在第7列
      game2.board[0][7] = 'white'
      game2.board[1][7] = 'white'
      game2.board[2][7] = 'white'
      game2.board[3][7] = 'white'
      const winResult = game2.placePiece(7, 4) // 白方落第5子

      expect(winResult).toBe(true)
      expect(game2.gameOver).toBe(true)
      expect(game2.winner).toBe(WHITE)
    })
  })

  // ==================== getWinningPieces 测试 ====================

  describe('getWinningPieces() 获胜棋子', () => {
    it('应该返回获胜的五子坐标', () => {
      // 正确的落子顺序让黑方获胜
      game.placePiece(0, 0)  // 黑
      game.placePiece(5, 5)  // 白 (无所谓的落子)
      game.placePiece(1, 0)  // 黑
      game.placePiece(5, 6)  // 白
      game.placePiece(2, 0)  // 黑
      game.placePiece(5, 7)  // 白
      game.placePiece(3, 0)  // 黑
      game.placePiece(5, 8)  // 白
      game.placePiece(4, 0)  // 黑 - 获胜

      expect(game.winningPieces.length).toBe(5)
      expect(game.winningPieces).toContainEqual({ x: 0, y: 0 })
      expect(game.winningPieces).toContainEqual({ x: 4, y: 0 })
    })
  })

  // ==================== 重置测试 ====================

  describe('reset() 重置游戏', () => {
    it('应该清空棋盘', () => {
      game.placePiece(7, 7)
      game.reset()
      expect(game.board[7][7]).toBe(EMPTY)
    })

    it('应该重置落子数', () => {
      game.placePiece(7, 7)
      game.reset()
      expect(game.pieceCount).toBe(0)
    })

    it('应该重置游戏状态', () => {
      // 先让游戏结束
      for (let i = 0; i < 5; i++) {
        game.placePiece(i, 0)
      }
      game.reset()
      expect(game.gameOver).toBe(false)
      expect(game.winner).toBe(null)
      expect(game.winningPieces).toHaveLength(0)
    })
  })

  // ==================== getState 测试 ====================

  describe('getState() 获取状态', () => {
    it('应该返回完整游戏状态', () => {
      game.placePiece(7, 7)
      const state = game.getState()

      expect(state).toHaveProperty('board')
      expect(state).toHaveProperty('currentPlayer')
      expect(state).toHaveProperty('gameOver')
      expect(state).toHaveProperty('winner')
      expect(state).toHaveProperty('pieceCount')
      expect(state).toHaveProperty('lastPiece')
      expect(state).toHaveProperty('winningPieces')
    })

    it('应该返回棋盘的深拷贝', () => {
      game.placePiece(7, 7)
      const state = game.getState()

      // 修改返回的棋盘不应影响原棋盘
      state.board[7][7] = 'test'
      expect(game.board[7][7]).toBe(BLACK)
    })
  })

  // ==================== getPiece 测试 ====================

  describe('getPiece() 获取棋子', () => {
    it('应该返回空位的棋子为空', () => {
      expect(game.getPiece(0, 0)).toBe(EMPTY)
    })

    it('应该返回已落子的位置', () => {
      game.placePiece(5, 5)
      expect(game.getPiece(5, 5)).toBe(BLACK)
    })

    it('应该处理边界外的情况', () => {
      expect(game.getPiece(-1, 0)).toBe(EMPTY)
      expect(game.getPiece(0, 15)).toBe(EMPTY)
    })
  })
})