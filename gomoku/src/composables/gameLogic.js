import { ref, computed } from 'vue'

// 玩家常量
export const BLACK = 'black'
export const WHITE = 'white'
export const EMPTY = null
export const BOARD_SIZE = 15

// 方向向量：水平、垂直、主对角线、副对角线
const DIRECTIONS = [
  [1, 0],   // 水平
  [0, 1],  // 垂直
  [1, 1],  // 主对角线 \
  [1, -1]  // 副对角线 /
]

export function useGameLogic() {
  // 棋盘状态：15×15 二维数组
  const board = ref(createEmptyBoard())

  // 当前玩家
  const currentPlayer = ref(BLACK)

  // 游戏是否结束
  const gameOver = ref(false)

  // 获胜信息
  const winner = ref(null)

  // 已落子数量
  const pieceCount = computed(() => {
    return board.value.flat().filter(cell => cell !== EMPTY).length
  })

  // 创建空棋盘
  function createEmptyBoard() {
    return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY))
  }

  // 初始化/重置游戏
  function initGame() {
    board.value = createEmptyBoard()
    currentPlayer.value = BLACK
    gameOver.value = false
    winner.value = null
  }

  // 落子
  function placePiece(x, y) {
    // 检查位置是否有效
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return false

    // 检查位置是否已有棋子
    if (board.value[y][x] !== EMPTY) return false

    // 检查游戏是否结束
    if (gameOver.value) return false

    // 放置棋子
    board.value[y][x] = currentPlayer.value

    // 检查是否获胜
    if (checkWin(x, y)) {
      gameOver.value = true
      winner.value = currentPlayer.value
      return true
    }

    // 切换玩家
    currentPlayer.value = currentPlayer.value === BLACK ? WHITE : BLACK
    return true
  }

  // 获取棋子
  function getPiece(x, y) {
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return EMPTY
    return board.value[y][x]
  }

  // 检查是否获胜
  function checkWin(x, y) {
    const color = board.value[y][x]

    for (const [dx, dy] of DIRECTIONS) {
      let count = 1

      // 正向查找
      let nx = x + dx
      let ny = y + dy
      while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && board.value[ny][nx] === color) {
        count++
        nx += dx
        ny += dy
      }

      // 反向查找
      nx = x - dx
      ny = y - dy
      while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && board.value[ny][nx] === color) {
        count++
        nx -= dx
        ny -= dy
      }

      // 五子连珠
      if (count >= 5) return true
    }

    return false
  }

  // 获取获胜的五个棋子位置（用于高亮显示）
  function getWinningPieces(x, y) {
    const color = board.value[y][x]
    const winning = []

    for (const [dx, dy] of DIRECTIONS) {
      let pieces = [{ x, y }]

      // 正向查找
      let nx = x + dx
      let ny = y + dy
      while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && board.value[ny][nx] === color) {
        pieces.push({ x: nx, y: ny })
        nx += dx
        ny += dy
      }

      // 反向查找
      nx = x - dx
      ny = y - dy
      while (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && board.value[ny][nx] === color) {
        pieces.unshift({ x: nx, y: ny })
        nx -= dx
        ny -= dy
      }

      // 五子连珠
      if (pieces.length >= 5) {
        winning.push(...pieces)
      }
    }

    return winning
  }

  return {
    board,
    currentPlayer,
    gameOver,
    winner,
    pieceCount,
    initGame,
    placePiece,
    getPiece,
    getWinningPieces
  }
}