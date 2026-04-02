<template>
  <div class="room-page">
    <div class="room-box">
      <h1 class="title">等待对手加入</h1>

      <div class="room-id-box">
        <span class="label">房间号</span>
        <span class="room-id">{{ roomId }}</span>
        <button class="btn-copy" @click="copyRoomId">复制</button>
      </div>

      <div class="color-info">
        你的执子：<span :class="['color', myColor]">{{
          myColor === 'black' ? '黑方' : '白方'
        }}</span>
      </div>

      <div class="waiting">
        <span class="dots"> <span /><span /><span /> </span>
        等待对手中...
      </div>

      <button class="btn-cancel" @click="handleCancel">取消</button>
    </div>

    <div v-if="copied" class="copied-toast">已复制</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useWebSocket } from '../composables/websocket.js'

const router = useRouter()
const route = useRoute()
const { on, disconnect, connect, connected } = useWebSocket()

// 使用固定 key
const STORAGE_KEY = 'gomoku_user'
const ROOM_KEY = 'gomoku_room'
const COLOR_KEY = 'gomoku_color'

const roomId = ref('')
const myColor = ref('')
const copied = ref(false)
const gameStarted = ref(false)
const user = ref(null)

onMounted(async () => {
  roomId.value = route.params.roomId || localStorage.getItem(ROOM_KEY) || ''
  user.value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  myColor.value = localStorage.getItem(COLOR_KEY) || ''

  if (!roomId.value || !user.value.username) {
    router.push('/home')
    return
  }

  // 确保 WebSocket 已连接
  if (!connected.value) {
    try {
      await connect(user.value)
    } catch (e) {
      console.error('WebSocket 连接失败:', e)
      alert('连接失败')
      router.push('/home')
      return
    }
  }

  // 对手加入
  on('player_joined', () => {
    // 等待 game_start
  })

  // 游戏开始（双方都监听这个）
  on('game_start', () => {
    router.push('/game')
  })

  on('error', (msg) => {
    alert(msg.message)
    router.push('/home')
  })
})

function copyRoomId() {
  navigator.clipboard.writeText(roomId.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

function handleCancel() {
  disconnect()
  router.push('/home')
}
</script>

<style scoped>
.room-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.room-box {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.title {
  font-size: 28px;
  margin-bottom: 32px;
}

.room-id-box {
  margin-bottom: 24px;
}

.label {
  display: block;
  font-size: 14px;
  color: #999;
  margin-bottom: 8px;
}

.room-id {
  display: block;
  font-size: 48px;
  font-weight: bold;
  letter-spacing: 8px;
  color: var(--btn-bg);
  margin-bottom: 12px;
}

.btn-copy {
  background: #f0f0f0;
  border: none;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
}

.btn-copy:hover {
  background: #e0e0e0;
}

.color-info {
  margin-bottom: 24px;
  font-size: 18px;
}

.color.black {
  color: #1a1a1a;
  font-weight: bold;
}

.color.white {
  color: #999;
  font-weight: bold;
}

.waiting {
  margin-bottom: 32px;
  color: #666;
  font-size: 16px;
}

.dots {
  display: inline-flex;
  gap: 4px;
}

.dots span {
  width: 6px;
  height: 6px;
  background: #999;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}

.dots span:nth-child(1) {
  animation-delay: 0s;
}
.dots span:nth-child(2) {
  animation-delay: 0.2s;
}
.dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.btn-cancel {
  background: none;
  border: none;
  color: #999;
  font-size: 14px;
  cursor: pointer;
}

.btn-cancel:hover {
  color: var(--accent);
}

.copied-toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 12px 24px;
  border-radius: 8px;
}
</style>
