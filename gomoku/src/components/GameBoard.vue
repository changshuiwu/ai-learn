<template>
  <div class="board-wrapper" ref="boardWrapper">
    <canvas
      ref="canvas"
      @click="handleClick"
      @mousemove="handleMouseMove"
      @mouseleave="handleMouseLeave"
    ></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { BOARD_SIZE, BLACK, WHITE, EMPTY } from '../composables/gameLogic.js'

const props = defineProps({
  board: {
    type: Array,
    required: true
  },
  currentPlayer: {
    type: String,
    required: true
  },
  gameOver: {
    type: Boolean,
    default: false
  },
  winner: {
    type: String,
    default: null
  },
  winningPieces: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['place-piece'])

// DOM 引用
const canvas = ref(null)
const boardWrapper = ref(null)

// Canvas 上下文
let ctx = null

// 格子大小（响应式）
const cellSize = ref(40)
const padding = 40 // 棋盘边缘padding

// 鼠标悬停位置
const hoverPos = ref(null)

// 颜色配置
const colors = {
  board: '#deb887',
  line: '#5c4033',
  black: '#1a1a1a',
  white: '#fefefe',
  highlight: '#c41e3a',
  hover: 'rgba(0, 0, 0, 0.3)'
}

// 计算棋盘尺寸
const boardSize = computed(() => (BOARD_SIZE - 1) * cellSize.value + padding * 2)

// 初始化 Canvas
function initCanvas() {
  if (!canvas.value) return

  const wrapper = boardWrapper.value
  const size = Math.min(wrapper.clientWidth, wrapper.clientHeight)
  cellSize.value = Math.floor((size - padding * 2) / (BOARD_SIZE - 1))

  canvas.value.width = (BOARD_SIZE - 1) * cellSize.value + padding * 2
  canvas.value.height = (BOARD_SIZE - 1) * cellSize.value + padding * 2

  ctx = canvas.value.getContext('2d')
  draw()
}

// 绘制棋盘
function draw() {
  if (!ctx) return

  // 清空画布
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)

  // 绘制棋盘背景（木质）
  drawBoard()

  // 绘制网格线
  drawGrid()

  // 绘制天元和星位
  drawStarPoints()

  // 绘制所有棋子
  drawPieces()

  // 绘制获胜高亮
  drawWinnerHighlight()

  // 绘制鼠标悬停预览
  if (hoverPos.value && !props.gameOver) {
    drawHoverPreview()
  }
}

// 绘制棋盘背景
function drawBoard() {
  ctx.fillStyle = colors.board
  ctx.fillRect(0, 0, canvas.value.width, canvas.value.height)

  // 添加木质纹理效果
  ctx.strokeStyle = 'rgba(139, 69, 19, 0.1)'
  ctx.lineWidth = 1
  for (let i = 0; i < canvas.value.width; i += 4) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, canvas.value.height)
    ctx.stroke()
  }
}

// 绘制网格线
function drawGrid() {
  ctx.strokeStyle = colors.line
  ctx.lineWidth = 1

  for (let i = 0; i < BOARD_SIZE; i++) {
    const pos = padding + i * cellSize.value

    // 横线
    ctx.beginPath()
    ctx.moveTo(padding, pos)
    ctx.lineTo(canvas.value.width - padding, pos)
    ctx.stroke()

    // 竖线
    ctx.beginPath()
    ctx.moveTo(pos, padding)
    ctx.lineTo(pos, canvas.value.height - padding)
    ctx.stroke()
  }
}

// 绘制星位点
function drawStarPoints() {
  const starPoints = [
    [3, 3], [3, 7], [3, 11],
    [7, 3], [7, 7], [7, 11],
    [11, 3], [11, 7], [11, 11]
  ]

  ctx.fillStyle = colors.line
  for (const [x, y] of starPoints) {
    const px = padding + x * cellSize.value
    const py = padding + y * cellSize.value

    ctx.beginPath()
    ctx.arc(px, py, 4, 0, Math.PI * 2)
    ctx.fill()
  }
}

// 绘制棋子
function drawPieces() {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const piece = props.board[y][x]
      if (piece !== EMPTY) {
        drawPiece(x, y, piece)
      }
    }
  }
}

// 绘制单个棋子
function drawPiece(gridX, gridY, color) {
  const cx = padding + gridX * cellSize.value
  const cy = padding + gridY * cellSize.value
  const radius = cellSize.value * 0.42

  if (color === BLACK) {
    // 黑子
    const gradient = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, radius * 0.1, cx, cy, radius)
    gradient.addColorStop(0, '#4a4a4a')
    gradient.addColorStop(0.5, '#2a2a2a')
    gradient.addColorStop(1, colors.black)

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()

    // 黑子光泽
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.beginPath()
    ctx.arc(cx - radius * 0.3, cy - radius * 0.3, radius * 0.3, 0, Math.PI * 2)
    ctx.fill()
  } else {
    // 白子
    const gradient = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, radius * 0.1, cx, cy, radius)
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(0.5, '#f0f0f0')
    gradient.addColorStop(1, '#dddddd')

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()

    // 白子阴影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
    ctx.shadowBlur = 4
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowColor = 'transparent'
  }
}

// 绘制获胜高亮
function drawWinnerHighlight() {
  if (props.winningPieces.length < 5) return

  ctx.strokeStyle = colors.highlight
  ctx.lineWidth = 3

  for (const { x, y } of props.winningPieces) {
    const cx = padding + x * cellSize.value
    const cy = padding + y * cellSize.value
    const radius = cellSize.value * 0.45

    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()
  }
}

// 绘制鼠标悬停预览
function drawHoverPreview() {
  if (!hoverPos.value) return

  const { x, y } = hoverPos.value
  if (props.board[y][x] !== EMPTY) return

  const cx = padding + x * cellSize.value
  const cy = padding + y * cellSize.value
  const radius = cellSize.value * 0.42

  ctx.globalAlpha = 0.4
  if (props.currentPlayer === BLACK) {
    ctx.fillStyle = colors.black
  } else {
    ctx.fillStyle = colors.white
  }

  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

// 处理点击
function handleClick(e) {
  if (props.gameOver) return

  const { x, y } = getGridPos(e)
  if (x === null || y === null) return

  emit('place-piece', { x, y })
}

// 处理鼠标移动
function handleMouseMove(e) {
  hoverPos.value = getGridPos(e)
  draw()
}

// 处理鼠标离开
function handleMouseLeave() {
  hoverPos.value = null
  draw()
}

// 获取点击的网格坐标
function getGridPos(e) {
  const rect = canvas.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  // 转换为网格坐标
  const gridX = Math.round((x - padding) / cellSize.value)
  const gridY = Math.round((y - padding) / cellSize.value)

  // 检查是否在棋盘范围内
  if (gridX < 0 || gridX >= BOARD_SIZE || gridY < 0 || gridY >= BOARD_SIZE) {
    return { x: null, y: null }
  }

  return { x: gridX, y: gridY }
}

// 监听窗口大小变化
function handleResize() {
  initCanvas()
}

// 监听棋盘变化，重新绘制
watch(() => props.board, draw, { deep: true })
watch(() => props.winningPieces, draw, { deep: true })

onMounted(() => {
  initCanvas()
  window.addEventListener('resize', handleResize)
})
</script>

<style scoped>
.board-wrapper {
  width: 100%;
  max-width: 600px;
  aspect-ratio: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

canvas {
  cursor: pointer;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .board-wrapper {
    max-width: 100%;
  }
}
</style>