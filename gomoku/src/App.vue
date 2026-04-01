<template>
  <div class="game-container">
    <!-- 连接/创建房间界面 -->
    <div v-if="!gameStarted" class="connect-screen">
      <h1 class="title">五子棋</h1>

      <div class="connect-form">
        <div class="input-group">
          <input
            v-model="playerName"
            type="text"
            placeholder="输入你的昵称"
            maxlength="20"
          />
        </div>

        <div class="connect-buttons">
          <button class="btn btn-primary" @click="handleCreateRoom">
            创建房间
          </button>
        </div>

        <div class="divider">或</div>

        <div class="input-group">
          <input
            v-model="joinRoomId"
            type="text"
            placeholder="输入房间号"
            maxlength="6"
            @keyup.enter="handleJoinRoom"
          />
          <button class="btn" @click="handleJoinRoom" :disabled="!joinRoomId">
            加入房间
          </button>
        </div>
      </div>

      <div v-if="error" class="error-message">{{ error }}</div>
    </div>

    <!-- 等待房间界面 -->
    <div v-else-if="waiting" class="waiting-screen">
      <h2 class="title">房间号: {{ roomId }}</h2>
      <p class="room-info">
        你是: {{ playerColor === BLACK ? '黑方' : '白方' }}
      </p>
      <p v-if="playerColor === BLACK" class="wait-tip">
        等待对手加入...
      </p>
      <p v-else class="wait-tip">
        对手已准备，游戏即将开始
      </p>
      <button class="btn" @click="handleLeaveRoom">离开房间</button>
    </div>

    <!-- 游戏界面 -->
    <div v-else class="game-screen">
      <!-- 信息面板 -->
      <div class="info-panel">
        <!-- 玩家信息 -->
        <div class="player-info">
          <span class="player-name">{{ opponentName }}</span>
          <span class="piece" :class="opponentColor"></span>
        </div>

        <!-- 倒计时 -->
        <div class="timer" :class="{ warning: timerWarning }">
          {{ formatTime(timeRemaining) }}
        </div>

        <!-- 当前玩家 -->
        <div class="player-info">
          <span class="piece" :class="myColor"></span>
          <span class="player-name">(你) {{ playerName }}</span>
        </div>
      </div>

      <!-- 棋盘 -->
      <GameBoard
        :board="board"
        :current-player="currentPlayer"
        :game-over="gameOver"
        :winner="winner"
        :winning-pieces="winningPieces"
        :can-play="canPlay"
        @place-piece="handlePlacePiece"
      />

      <!-- 落子统计 -->
      <div class="piece-count">
        已落子：{{ pieceCount }} 子
      </div>

      <!-- 游戏结束弹窗 -->
      <div v-if="winner" class="winner-toast">
        <div class="winner-text">
          🎉 {{ winner === myColor ? '你获胜！' : winner === 'timeout' ? '对手超时，你获胜！' : '你输了' }} 🎉
        </div>
        <button class="btn" @click="handleRestart">再来一局</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import GameBoard from './components/GameBoard.vue'
import { useWebSocket } from './composables/websocket.js'
import { BLACK, WHITE, EMPTY, BOARD_SIZE } from './composables/gameLogic.js'

// WebSocket
const {
  connected,
  error,
  roomId,
  playerColor: wsPlayerColor,
  connect,
  createRoom,
  joinRoom,
  placePiece: sendPlacePiece,
  restart: sendRestart,
  disconnect,
  on
} = useWebSocket()

// 状态
const gameStarted = ref(false)
const waiting = ref(false)
const playerName = ref('')
const joinRoomId = ref('')

// 游戏状态
const board = ref(createEmptyBoard())
const currentPlayer = ref(BLACK)
const gameOver = ref(false)
const winner = ref(null)
const pieceCount = ref(0)
const winningPieces = ref([])

// 我的信息
const myColor = ref(null)
const canPlay = ref(false)

// 倒计时
const timeRemaining = ref(2 * 60 * 1000)
const timerWarning = ref(false)

// 对手信息
const opponentName = ref('')
const opponentColor = computed(() => myColor.value === BLACK ? WHITE : BLACK)

// 创建空棋盘
function createEmptyBoard() {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY))
}

// 格式化时间
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000)
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

// 初始化
onMounted(async () => {
  try {
    await connect()
    setupHandlers()
  } catch (e) {
    console.error('连接失败:', e)
  }
})

// 设置消息处理
function setupHandlers() {
  on('room_created', (msg) => {
    myColor.value = msg.playerColor
    playerName.value = msg.playerName
    waiting.value = true
    gameStarted.value = false
  })

  on('room_joined', (msg) => {
    myColor.value = msg.playerColor
    playerName.value = msg.playerName
    waiting.value = true
    gameStarted.value = false
  })

  on('player_joined', (msg) => {
    opponentName.value = msg.playerName
  })

  on('game_start', (msg) => {
    waiting.value = false
    gameStarted.value = true

    // 设置游戏状态
    if (msg.gameState) {
      board.value = msg.gameState.board
      currentPlayer.value = msg.gameState.currentPlayer
      pieceCount.value = msg.gameState.pieceCount
      gameOver.value = msg.gameState.gameOver
      winner.value = msg.gameState.winner
      winningPieces.value = msg.gameState.winningPieces || []
    }

    opponentName.value = msg.challenged || '对手'
  })

  on('piece_placed', (msg) => {
    if (msg.gameState) {
      board.value = msg.gameState.board
      currentPlayer.value = msg.gameState.currentPlayer
      pieceCount.value = msg.gameState.pieceCount
      gameOver.value = msg.gameState.gameOver
      winner.value = msg.gameState.winner
      winningPieces.value = msg.gameState.winningPieces || []
    }

    // 更新是否可以落子
    canPlay.value = currentPlayer.value === myColor.value && !gameOver.value
  })

  on('game_over', (msg) => {
    gameOver.value = true
    winner.value = msg.winner
    winningPieces.value = msg.winningPieces || []
    canPlay.value = false
  })

  on('player_timeout', (msg) => {
    gameOver.value = true
    winner.value = msg.winner
    // 超时判负，对手获胜
    if (msg.winner !== myColor.value) {
      winner.value = 'timeout'
    }
    canPlay.value = false
  })

  on('timer', (msg) => {
    timeRemaining.value = msg.timeRemaining
    timerWarning.value = msg.timeRemaining <= 30000
  })

  on('error', (msg) => {
    error.value = msg.message
  })

  on('player_left', (msg) => {
    // 对手离开，重置游戏
    handleLeaveRoom()
  })
}

// 创建房间
function handleCreateRoom() {
  if (!playerName.value.trim()) {
    error.value = '请输入昵称'
    return
  }
  error.value = null
  createRoom(playerName.value.trim())
}

// 加入房间
function handleJoinRoom() {
  if (!playerName.value.trim()) {
    error.value = '请输入昵称'
    return
  }
  if (!joinRoomId.value.trim()) {
    error.value = '请��入房间号'
    return
  }
  error.value = null
  joinRoom(joinRoomId.value.trim().toUpperCase(), playerName.value.trim())
}

// 离开房间
function handleLeaveRoom() {
  disconnect()
  gameStarted.value = false
  waiting.value = false
  resetGame()
}

// 落子
function handlePlacePiece({ x, y }) {
  if (!canPlay.value) return

  sendPlacePiece(x, y)
}

// 重新开始
function handleRestart() {
  sendRestart()
  resetGame()
}

// 重置游戏
function resetGame() {
  board.value = createEmptyBoard()
  currentPlayer.value = BLACK
  gameOver.value = false
  winner.value = null
  pieceCount.value = 0
  winningPieces.value = []
  canPlay.value = false
  timeRemaining.value = 2 * 60 * 1000
  timerWarning.value = false
}
</script>

<style scoped>
.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

/* 连接界面 */
.connect-screen {
  text-align: center;
}

.title {
  font-size: 48px;
  margin-bottom: 40px;
  color: var(--text-primary);
}

.connect-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 32px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.input-group {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.input-group input {
  padding: 12px 16px;
  font-size: 16px;
  border: 2px solid #ddd;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.3s;
}

.input-group input:focus {
  border-color: var(--btn-bg);
}

.input-group input:first-child {
  width: 200px;
}

.connect-buttons .btn {
  width: 200px;
}

.btn-primary {
  background: var(--btn-bg);
  color: #fff;
}

.btn-primary:hover {
  background: var(--btn-hover);
}

.divider {
  color: #999;
  font-size: 14px;
}

.error-message {
  margin-top: 16px;
  color: var(--accent);
  font-size: 14px;
}

/* 等待界面 */
.waiting-screen {
  text-align: center;
}

.room-info {
  font-size: 24px;
  margin: 20px 0;
}

.wait-tip {
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 20px;
}

/* 游戏界面 */
.info-panel {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 16px 32px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.player-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.player-name {
  font-size: 16px;
}

.timer {
  font-size: 32px;
  font-weight: bold;
  padding: 8px 16px;
  background: #f0f0f0;
  border-radius: 8px;
  transition: all 0.3s;
}

.timer.warning {
  background: #ffebee;
  color: var(--accent);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.piece {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.piece.black {
  background: radial-gradient(circle at 30% 30%, #4a4a4a, #1a1a1a);
}

.piece.white {
  background: radial-gradient(circle at 30% 30%, #fff, #ddd);
}

.piece-count {
  font-size: 16px;
  color: var(--text-secondary);
}

.winner-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.9);
  color: #fff;
  padding: 40px 60px;
  border-radius: 20px;
  text-align: center;
  z-index: 100;
  animation: popIn 0.4s ease;
}

.winner-text {
  font-size: 32px;
  margin-bottom: 20px;
}

@keyframes popIn {
  0% {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 0;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .title {
    font-size: 36px;
  }

  .input-group input:first-child,
  .btn {
    width: 100%;
  }

  .info-panel {
    flex-direction: column;
    gap: 12px;
  }

  .timer {
    font-size: 24px;
  }
}
</style>