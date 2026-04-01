<template>
  <div class="home-page">
    <div class="home-box">
      <h1 class="welcome">你好，{{ user?.username }}</h1>

      <div class="actions">
        <button class="btn btn-large" @click="handleCreateRoom" :disabled="loading">
          创建房间
        </button>

        <div class="divider">或</div>

        <div class="join-section">
          <input
            v-model="roomId"
            type="text"
            placeholder="输入房间号"
            maxlength="6"
            class="room-input"
          />
          <button class="btn" @click="handleJoinRoom" :disabled="!roomId || loading">
            加入房间
          </button>
        </div>
      </div>

      <div v-if="error" class="error">{{ error }}</div>

      <button class="btn-logout" @click="handleLogout">退出登录</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWebSocket } from '../composables/websocket.js'

const router = useRouter()
const { on, createRoom: wsCreateRoom, joinRoom: wsJoinRoom, connect, disconnect } = useWebSocket()

const user = ref(null)
const roomId = ref('')
const loading = ref(false)
const error = ref('')

onMounted(() => {
  const stored = localStorage.getItem('user')
  if (stored) {
    user.value = JSON.parse(stored)
  } else {
    router.push('/')
  }

  on('room_created', (msg) => {
    localStorage.setItem('roomId', msg.roomId)
    localStorage.setItem('myColor', msg.color)
    loading.value = false
    router.push(`/room/${msg.roomId}`)
  })

  on('room_joined', (msg) => {
    localStorage.setItem('roomId', msg.roomId)
    localStorage.setItem('myColor', msg.color)
    loading.value = false
    router.push('/game')
  })

  on('error', (msg) => {
    error.value = msg.message
    loading.value = false
  })
})

async function handleCreateRoom() {
  loading.value = true
  error.value = ''

  try {
    await connect(user.value)
    wsCreateRoom(user.value)
  } catch (e) {
    error.value = '连接失败'
    loading.value = false
  }
}

async function handleJoinRoom() {
  if (!roomId.value || roomId.value.length !== 6) {
    error.value = '请输入6位房间号'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await connect(user.value)
    wsJoinRoom(roomId.value.toUpperCase(), user.value)
  } catch (e) {
    error.value = '连接失败或房间不存在'
    loading.value = false
  }
}

function handleLogout() {
  localStorage.removeItem('user')
  disconnect()
  router.push('/')
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.home-box {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.welcome {
  font-size: 28px;
  margin-bottom: 32px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.btn-large {
  width: 100%;
  padding: 18px;
  font-size: 20px;
}

.btn-large:first-child {
  background: var(--btn-bg);
  color: #fff;
}

.divider {
  color: #999;
  font-size: 14px;
}

.join-section {
  display: flex;
  gap: 12px;
}

.room-input {
  flex: 1;
  padding: 12px 16px;
  font-size: 16px;
  border: 2px solid #ddd;
  border-radius: 8px;
  outline: none;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.room-input:focus {
  border-color: var(--btn-bg);
}

.error {
  margin-top: 16px;
  color: var(--accent);
  font-size: 14px;
}

.btn-logout {
  margin-top: 32px;
  background: none;
  border: none;
  color: #999;
  font-size: 14px;
  cursor: pointer;
}

.btn-logout:hover {
  color: var(--accent);
}
</style>