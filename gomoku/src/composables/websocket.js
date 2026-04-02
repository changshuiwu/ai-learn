import { ref } from 'vue'

const WS_URL = () => {
  const isDev = import.meta.env.DEV
  if (isDev) {
    return 'ws://localhost:3000/ws'
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}`
}

// ==================== 单例模式：共享 WebSocket 连接 ====================

const ws = ref(null)
const connected = ref(false)
const error = ref(null)
const roomId = ref(null)
const messageHandlers = ref({})
const currentUser = ref(null)

/**
 * 连接 WebSocket
 * @param {Object} user - 用户对象 { id, username }
 */
function connect(user) {
  return new Promise((resolve, reject) => {
    // 如果已经连接，直接返回
    if (ws.value && ws.value.readyState === 1) {
      resolve()
      return
    }

    try {
      currentUser.value = user
      ws.value = new WebSocket(WS_URL())

      ws.value.onopen = () => {
        console.log('WebSocket 已连接')
        // 发送登录消息，使用 username 作为唯一标识
        const loginMsg = { type: 'login_ws', user }
        console.log('发送登录:', JSON.stringify(loginMsg))
        ws.value.send(JSON.stringify(loginMsg))
      }

      ws.value.onclose = () => {
        console.log('WebSocket 已断开')
        connected.value = false
      }

      ws.value.onerror = (e) => {
        console.error('WebSocket 错误:', e)
        error.value = '连接失败'
      }

      ws.value.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('收到:', message.type)

          // 检查消息是否发给当前用户（通过 username 过滤）
          if (message.targetUsername && message.targetUsername !== currentUser.value?.username) {
            console.log('消息不是发给当前用户的，跳过')
            return
          }

          if (message.type === 'login_ok') {
            connected.value = true
            resolve()
          }
          handleMessage(message)
        } catch (e) {
          console.error('消息解析错误:', e)
        }
      }
    } catch (e) {
      error.value = '连接失败'
      reject(e)
    }
  })
}

function handleMessage(message) {
  const { type } = message

  switch (type) {
    case 'login_ok':
    case 'room_created':
    case 'room_joined':
    case 'player_joined':
    case 'game_start':
    case 'piece_placed':
    case 'timer_update':
    case 'game_over':
    case 'player_timeout':
      dispatch(type, message)
      break
    case 'error':
      error.value = message.message
      dispatch(type, message)
      break
    case 'player_left':
    case 'creator_disconnected':
      dispatch(type, message)
      break
  }
}

function send(message) {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) {
    console.error('WebSocket 未连接, readyState:', ws.value?.readyState)
    return false
  }
  const msgStr = JSON.stringify(message)
  console.log('发送:', msgStr)
  ws.value.send(msgStr)
  return true
}

function createRoom(user) {
  send({ type: 'create_room', user })
}

function joinRoom(roomId, user) {
  console.log('joinRoom 发送:', { type: 'join_room', roomId, user })
  send({ type: 'join_room', roomId: roomId, user: user })
}

function placePiece(x, y) {
  send({ type: 'place_piece', x, y })
}

function restart() {
  send({ type: 'restart' })
}

function leaveRoom() {
  send({ type: 'leave_room' })
}

function disconnect() {
  if (ws.value) {
    ws.value.close()
    ws.value = null
  }
  connected.value = false
  roomId.value = null
  currentUser.value = null
}

function on(type, handler) {
  if (!messageHandlers.value[type]) {
    messageHandlers.value[type] = []
  }
  messageHandlers.value[type].push(handler)
}

function dispatch(type, data) {
  const handlers = messageHandlers.value[type]
  if (handlers) {
    handlers.forEach(handler => handler(data))
  }
}

// 导出统一的单例接口
export function useWebSocket() {
  return {
    connected,
    error,
    roomId,
    connect,
    createRoom,
    joinRoom,
    placePiece,
    restart,
    leaveRoom,
    disconnect,
    on
  }
}