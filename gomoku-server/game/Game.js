/**
 * 五子棋游戏逻辑
 * 管理棋盘数据、落子、胜负判定等核心游戏逻辑
 */

// ==================== 常量定义 ====================

// 棋盘大小：15×15
export const BOARD_SIZE = 15

// 棋子颜色常量
export const BLACK = 'black'   // 黑棋
export const WHITE = 'white'    // 白棋
export const EMPTY = null       // 空位

// ==================== 方向定义 ====================

/**
 * 四个检测方向（用于判断五连）
 * [dx, dy] 表示在 x/y 方向的增量
 */
const DIRECTIONS = [
  [1, 0],   // 水平方向：← →
  [0, 1],   // 垂直方向：↑ ↓
  [1, 1],   // 主对角线：↖ ↘
  [1, -1]   // 副对角线：↗ ↙
]

// ==================== 游戏类 ====================

/**
 * Game 类 - 五子棋游戏核心逻辑
 * 不涉及网络通信，仅处理本地游戏状态
 */
export class Game {
  /**
   * 构造函数 - 初始化游戏状态
   */
  constructor() {
    /**
     * @property {Array<Array<string|null>>} board - 15×15 棋盘二维数组
     *   - null 表示空位
     *   - 'black' 表示黑棋
     *   - 'white' 表示白棋
     * @property {string} currentPlayer - 当前执子方 ('black' 或 'white')
     * @property {string} firstPlayer - 先手方（每局开始时随机设定）
     * @property {boolean} gameOver - 游戏是否已结束
     * @property {string|null} winner - 获胜方 (null/'black'/'white'/'timeout')
     * @property {number} pieceCount - 已落子总数
     * @property {Object|null} lastPiece - 最后落子位置 {x, y}
     * @property {Array} winningPieces - 获胜五子的坐标数组
     */
    this.board = this.createEmptyBoard()
    this.currentPlayer = BLACK
    this.firstPlayer = BLACK // 随机先手
    this.gameOver = false
    this.winner = null
    this.pieceCount = 0
    this.lastPiece = null
    this.winningPieces = []
  }

  /**
   * 创建空棋盘
   * @returns {Array<Array<string|null>>} 15×15 的二维数组
   */
  createEmptyBoard() {
    return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY))
  }

  /**
   * 在指定位置落子
   * @param {number} x - 横坐标 (0-14)
   * @param {number} y - 纵坐标 (0-14)
   * @returns {boolean} 是否成功落子
   *
   * 落子流程：
   * 1. 检查位置是否合法（坐标范围、空位、游戏中）
   * 2. 放置棋子到棋盘
   * 3. 检查是否获胜
   * 4. 切换到下一个玩家
   */
  placePiece(x, y) {
    // 边界检查：坐标必须在 0-14 范围内
    if (
      x < 0 || x >= BOARD_SIZE ||
      y < 0 || y >= BOARD_SIZE ||
      this.board[y][x] !== EMPTY ||  // 位置必须为空
      this.gameOver                   // 游戏不能已结束
    ) {
      return false
    }

    // 1. 放置棋子
    this.board[y][x] = this.currentPlayer
    this.lastPiece = { x, y }
    this.pieceCount++

    // 2. 检查是否获胜（当前玩家是否连成五子）
    if (this.checkWin(x, y)) {
      this.gameOver = true
      this.winner = this.currentPlayer
      this.winningPieces = this.getWinningPieces(x, y)
      return true
    }

    // 3. 切换玩家（黑 → 白 → 黑 → ...）
    this.currentPlayer = this.currentPlayer === BLACK ? WHITE : BLACK
    return true
  }

  /**
   * 获取指定位置的棋子
   * @param {number} x - 横坐标
   * @param {number} y - 纵坐标
   * @returns {string|null} 棋子颜色或 null
   */
  getPiece(x, y) {
    // 边界检查
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
      return EMPTY
    }
    return this.board[y][x]
  }

  /**
   * 检查指定位置是否形成五连
   * @param {number} x - 刚落子的横坐标
   * @param {number} y - 刚落子的纵坐标
   * @returns {boolean} 是否获胜
   *
   * 算法说明：
   * 从刚落子的位置出发，沿四个方向检测同色棋子连续数量
   * 任一方向达到5个即获胜
   */
  checkWin(x, y) {
    // 获取当前落子颜色
    const color = this.board[y][x]

    // 遍历四个方向
    for (const [dx, dy] of DIRECTIONS) {
      let count = 1 // 当前落子算1个

      // ========== 正向查找 ==========
      // 向 dx, dy 方向查找连续同色棋子
      let nx = x + dx
      let ny = y + dy
      while (
        nx >= 0 && nx < BOARD_SIZE &&      // 未越界
        ny >= 0 && ny < BOARD_SIZE &&
        this.board[ny][nx] === color        // 颜色相同
      ) {
        count++
        nx += dx
        ny += dy
      }

      // ========== 反向查找 ==========
      // 向相反方向 (-dx, -dy) 查找
      nx = x - dx
      ny = y - dy
      while (
        nx >= 0 && nx < BOARD_SIZE &&
        ny >= 0 && ny < BOARD_SIZE &&
        this.board[ny][nx] === color
      ) {
        count++
        nx -= dx
        ny -= dy
      }

      // 任意方向达到5子即为获胜
      if (count >= 5) return true
    }

    return false
  }

  /**
   * 获取获胜的五子坐标（用于高亮显示）
   * @param {number} x - 刚落子的横坐标
   * @param {number} y - 刚落子的纵坐标
   * @returns {Array<{x, y}>} 获胜五子的坐标数组
   *
   * 注意：可能出现多方向同时达到5子的情况（如长连禁手）
   * 此时返回所有方向达到5子的棋子
   */
  getWinningPieces(x, y) {
    const color = this.board[y][x]
    const winning = []

    for (const [dx, dy] of DIRECTIONS) {
      // 收集该方向上连续的所有同色棋子
      const pieces = [{ x, y }]

      // 正向查找
      let nx = x + dx
      let ny = y + dy
      while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && this.board[ny][nx] === color) {
        pieces.push({ x: nx, y: ny })
        nx += dx
        ny += dy
      }

      // 反向查找（注意 unshift 是添加到数组开头，保持顺序）
      nx = x - dx
      ny = y - dy
      while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && this.board[ny][nx] === color) {
        pieces.unshift({ x: nx, y: ny })
        nx -= dx
        ny -= dy
      }

      // 该方向达到5子则加入获胜列表
      if (pieces.length >= 5) {
        winning.push(...pieces)
      }
    }

    return winning
  }

  /**
   * 重置游戏
   * 清空棋盘，恢复到初始状态（但保留先手方）
   */
  reset() {
    this.board = this.createEmptyBoard()
    this.currentPlayer = this.firstPlayer
    this.gameOver = false
    this.winner = null
    this.pieceCount = 0
    this.lastPiece = null
    this.winningPieces = []
  }

  /**
   * 获取当前游戏状态（用于网络传输和状态同步）
   * @returns {Object} 游戏状态对象
   */
  getState() {
    return {
      board: this.board.map(row => [...row]),    // 深拷贝棋盘
      currentPlayer: this.currentPlayer,
      gameOver: this.gameOver,
      winner: this.winner,
      pieceCount: this.pieceCount,
      lastPiece: this.lastPiece,
      winningPieces: this.winningPieces
    }
  }
}