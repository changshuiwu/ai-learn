<template>
  <div class="game-container">
    <!-- 信息面板 -->
    <div class="info-panel">
      <!-- 黑方指示器 -->
      <div class="player-indicator" :class="{ active: currentPlayer === BLACK && !gameOver }">
        <span class="piece black"></span>
        <span>黑方</span>
      </div>

      <!-- 白方指示器 -->
      <div class="player-indicator" :class="{ active: currentPlayer === WHITE && !gameOver }">
        <span class="piece white"></span>
        <span>白方</span>
      </div>

      <!-- 重新开始按钮 -->
      <button class="btn" @click="handleReset">重新开始</button>
    </div>

    <!-- 棋盘 -->
    <GameBoard
      :board="board"
      :current-player="currentPlayer"
      :game-over="gameOver"
      :winner="winner"
      :winning-pieces="winningPieces"
      @place-piece="handlePlacePiece"
    />

    <!-- 落子统计 -->
    <div class="piece-count">
      已落子：{{ pieceCount }} 子
    </div>

    <!-- 获胜提示 -->
    <div v-if="winner" class="winner-toast">
      <div class="winner-text">
        🎉 {{ winner === BLACK ? '黑方' : '白方' }} 获胜！ 🎉
      </div>
      <button class="btn" @click="handleReset">再来一局</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import GameBoard from './components/GameBoard.vue'
import { useGameLogic, BLACK, WHITE } from './composables/gameLogic.js'

const {
  board,
  currentPlayer,
  gameOver,
  winner,
  pieceCount,
  initGame,
  placePiece,
  getWinningPieces
} = useGameLogic()

// 获胜棋子位置
const winningPieces = ref([])

// 处理落子
function handlePlacePiece({ x, y }) {
  const success = placePiece(x, y)
  if (success && winner.value) {
    // 计算获胜棋子
    winningPieces.value = getWinningPieces(x, y)
  }
}

// 处理重置
function handleReset() {
  initGame()
  winningPieces.value = []
}
</script>

<style scoped>
.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.info-panel {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 16px 32px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
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
</style>