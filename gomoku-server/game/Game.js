// 五子棋游戏逻辑

export const BOARD_SIZE = 15
export const BLACK = 'black'
export const WHITE = 'white'
export const EMPTY = null

// 方向向量
const DIRECTIONS = [
  [1, 0],   // 水平
  [0, 1],  // 垂直
  [1, 1],  // 主对角线
  [1, -1]  // 副对角线
]

export class Game {
  constructor() {
    this.board = this.createEmptyBoard()
    this.currentPlayer = BLACK
    this.firstPlayer = BLACK // 随机先手
    this.gameOver = false
    this.winner = null
    this.pieceCount = 0
    this.lastPiece = null
    this.winningPieces = []
  }

  createEmptyBoard() {
    return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY))
  }

  placePiece(x, y) {
    if (
      x < 0 || x >= BOARD_SIZE ||
      y < 0 || y >= BOARD_SIZE ||
      this.board[y][x] !== EMPTY ||
      this.gameOver
    ) {
      return false
    }

    this.board[y][x] = this.currentPlayer
    this.lastPiece = { x, y }
    this.pieceCount++

    // 检查是否获胜
    if (this.checkWin(x, y)) {
      this.gameOver = true
      this.winner = this.currentPlayer
      this.winningPieces = this.getWinningPieces(x, y)
      return true
    }

    // 切换玩家
    this.currentPlayer = this.currentPlayer === BLACK ? WHITE : BLACK
    return true
  }

  getPiece(x, y) {
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
      return EMPTY
    }
    return this.board[y][x]
  }

  checkWin(x, y) {
    const color = this.board[y][x]

    for (const [dx, dy] of DIRECTIONS) {
      let count = 1

      // 正向查找
      let nx = x + dx
      let ny = y + dy
      while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && this.board[ny][nx] === color) {
        count++
        nx += dx
        ny += dy
      }

      // 反向查找
      nx = x - dx
      ny = y - dy
      while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && this.board[ny][nx] === color) {
        count++
        nx -= dx
        ny -= dy
      }

      if (count >= 5) return true
    }

    return false
  }

  getWinningPieces(x, y) {
    const color = this.board[y][x]
    const winning = []

    for (const [dx, dy] of DIRECTIONS) {
      let pieces = [{ x, y }]

      // 正向查找
      let nx = x + dx
      let ny = y + dy
      while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && this.board[ny][nx] === color) {
        pieces.push({ x: nx, y: ny })
        nx += dx
        ny += dy
      }

      // 反向查找
      nx = x - dx
      ny = y - dy
      while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && this.board[ny][nx] === color) {
        pieces.unshift({ x: nx, y: ny })
        nx -= dx
        ny -= dy
      }

      if (pieces.length >= 5) {
        winning.push(...pieces)
      }
    }

    return winning
  }

  reset() {
    this.board = this.createEmptyBoard()
    this.currentPlayer = this.firstPlayer
    this.gameOver = false
    this.winner = null
    this.pieceCount = 0
    this.lastPiece = null
    this.winningPieces = []
  }

  getState() {
    return {
      board: this.board.map(row => [...row]),
      currentPlayer: this.currentPlayer,
      gameOver: this.gameOver,
      winner: this.winner,
      pieceCount: this.pieceCount,
      lastPiece: this.lastPiece,
      winningPieces: this.winningPieces
    }
  }
}