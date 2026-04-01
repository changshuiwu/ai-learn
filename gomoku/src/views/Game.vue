<template>
  <div class="game-page">
    <div class="game-container">
      <!-- 对手信息 -->
      <div class="player-info top">
        <div class="player">
          <span class="piece" :class="opponentColor"></span>
          <span class="name">{{ opponentName }}</span>
        </div>
        <div class="timer" :class="{ warning: isOpponentWarning }">
          {{ formatTime(opponentTime) }}
        </div>
        <div v-if="!isMyTurn && !gameOver" class="status">思考中...</div>
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

      <!-- 己方信息 -->
      <div class="player-info bottom">
        <div class="player">
          <span class="piece" :class="myColor"></span>
          <span class="name">{{ myName }} (你)</span>
        </div>
        <div class="timer" :class="{ warning: isMyWarning }">
          {{ formatTime(myTime) }}
        </div>
        <div v-if="isMyTurn && !gameOver" class="status">请落子</div>
        <div v-else-if="!gameOver" class="status">等待...</div>
      </div>

      <!-- 游戏结束弹窗 -->
      <div v-if="gameOver" class="game-over">
        <div class="result">
          {{ isWinner ? '🎉 你获胜！' : isLoser ? '😢 你输了' : '对方超时，你获胜！' }}
        </div>
        <button class="btn" @click="handleRestart">再来一局</button>
        <button class="btn btn-secondary" @click="handleExit">退出</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import GameBoard from '../components/GameBoard.vue'
import { useWebSocket } from '../composables/websocket.js'
import { BLACK, WHITE, EMPTY, BOARD_SIZE } from '../composables/gameLogic.js'

const router = useRouter()
const {
  on,
  placePiece: wsPlacePiece,
  restart: wsRestart,
  disconnect
} = useWebSocket()

const board = ref(createEmptyBoard())
const currentPlayer = ref(BLACK)
const gameOver = ref(false)
const winner = ref(null)
const winningPieces = ref([])
const pieceCount = ref(0)

const user = ref(null)
const myColor = ref('')
const opponentName = ref('对手')
const myName = ref('')
const opponentColor = computed(() => myColor.value === BLACK ? WHITE : BLACK)

const myTime = ref(2 * 60 * 1000)
const opponentTime = ref(2 * 60 * 1000)
const currentPlayerColor = ref(BLACK)

const isMyTurn = computed(() => currentPlayerColor.value === myColor.value)
const canPlay = computed(() => isMyTurn.value && !gameOver.value)

const isMyWarning = computed(() => myTime.value <= 30000)
const isOpponentWarning = computed(() => opponentTime.value <= 30000)

const isWinner = computed(() =>
  gameOver.value &&
  (winner.value === 'timeout' || winner.value === myColor.value)
)
const isLoser = computed(() =>
  gameOver.value && winner.value && winner.value !== myColor.value && winner.value !== 'timeout'
)

function createEmptyBoard() {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY))
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000)
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function handlePlacePiece({ x, y }) {
  if (!canPlay.value) return
  wsPlacePiece(x, y)
}

function handleRestart() {
  wsRestart()
  resetGame()
}

function handleExit() {
  disconnect()
  localStorage.removeItem('roomId')
  localStorage.removeItem('myColor')
  router.push('/home')
}

function resetGame() {
  board.value = createEmptyBoard()
  currentPlayer.value = BLACK
  currentPlayerColor.value = BLACK
  gameOver.value = false
  winner.value = null
  winningPieces.value = []
  pieceCount.value = 0
  myTime.value = 2 * 60 * 1000
  opponentTime.value = 2 * 60 * 1000
}

let timerInterval = null

onMounted(() => {
  user.value = JSON.parse(localStorage.getItem('user') || '{}')
  myName.value = user.value.username
  myColor.value = localStorage.getItem('myColor') || ''

  on('game_start', (msg) => {
    if (msg.gameState) {
      board.value = msg.gameState.board
      currentPlayer.value = msg.gameState.currentPlayer
      pieceCount.value = msg.gameState.pieceCount
      currentPlayerColor.value = msg.first
      winner.value = msg.gameState.winner
      winningPieces.value = msg.gameState.winningPieces || []
      gameOver.value = msg.gameState.gameOver
    }

    opponentName.value = msg.first === myColor.value ? msg.challenged : msg.challenger
    currentPlayerColor.value = msg.first

    // 启动倒计时
    startTimer()
  })

  on('piece_placed', (msg) => {
    if (msg.gameState) {
      board.value = msg.gameState.board
      currentPlayerColor.value = msg.gameState.currentPlayer
      pieceCount.value = msg.gameState.pieceCount
    }
  })

  on('game_over', (msg) => {
    gameOver.value = true
    winner.value = msg.winner
    winningPieces.value = msg.winningPieces || []
    stopTimer()
  })

  on('player_timeout', (msg) => {
    gameOver.value = true
    winner.value = msg.winner === myColor.value ? 'timeout' : msg.winner
    stopTimer()
  })

  on('timer_update', (msg) => {
    currentPlayerColor.value = msg.currentPlayer
    if (msg.currentPlayer === myColor.value) {
      myTime.value = msg.timeRemaining
    } else {
      opponentTime.value = msg.timeRemaining
    }
  })

  on('player_left', () => {
    alert('对手离开了')
    router.push('/home')
  })

  function startTimer() {
    stopTimer()
    timerInterval = setInterval(() => {
      if (currentPlayerColor.value === myColor.value) {
        myTime.value -= 1000
        if (myTime.value <= 0) {
          stopTimer()
        }
      } else {
        opponentTime.value -= 1000
        if (opponentTime.value <= 0) {
          stopTimer()
        }
      }
    }, 1000)
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }
})

onUnmounted(() => {
  stopTimer()
})
</script>

<style scoped>
.game-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 500px;
  justify-content: space-between;
}

.player {
  display: flex;
  align-items: center;
  gap: 8px;
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

.name {
  font-size: 16px;
}

.timer {
  font-size: 28px;
  font-weight: bold;
  padding: 4px 12px;
  background: #f5f5f5;
  border-radius: 8px;
}

.timer.warning {
  background: #ffebee;
  color: var(--accent);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.status {
  font-size: 14px;
  color: #666;
}

.game-over {
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
}

.result {
  font-size: 32px;
  margin-bottom: 24px;
}

.game-over .btn {
  display: block;
  width: 200px;
  margin: 8px auto;
}

.btn-secondary {
  background: transparent;
  border: 2px solid #fff;
  color: #fff;
}
</style>