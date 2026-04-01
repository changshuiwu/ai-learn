import { ref } from 'vue'

const WS_URL = () => {
  const isDev = import.meta.env.DEV
  if (isDev) {
    return 'ws://localhost:3000/ws'
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}`
}

export function useWebSocket() {
  const ws = ref(null)
  const connected = ref(false)
  const error = ref(null)
  const roomId = ref(null)
  const messageHandlers = ref({})

  function connect(user) {
    return new Promise((resolve, reject) => {
      try {
        ws.value = new WebSocket(WS_URL())

        ws.value.onopen = () => {
          console.log('WebSocket 已连接')
          connected.value = true
          error.value = null
          // 发送登录
          ws.value.send(JSON.stringify({ type: 'login_ws', user }))
          resolve()
        }

        ws.value.onclose = () => {
          console.log('WebSocket 已断开')
          connected.value = false
        }

        ws.value.onerror = (e) => {
          console.error('WebSocket 错误:', e)
          error.value = '连接失败'
          reject(e)
        }

        ws.value.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
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
    console.log('收到:', type, message)

    switch (type) {
      case 'login_ok':
      case 'room_created':
        dispatch(type, message)
        break
      case 'room_joined':
        roomId.value = message.roomId
        localStorage.setItem('roomId', message.roomId)
        localStorage.setItem('myColor', message.color)
        dispatch(type, message)
        break
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
        dispatch(type, message)
        break
    }
  }

  function send(message) {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) {
      console.error('WebSocket 未连接')
      return false
    }
    ws.value.send(JSON.stringify(message))
    return true
  }

  function createRoom(user) {
    roomId.value = null
    send({ type: 'create_room', user })
  }

  function joinRoom(roomId, user) {
    roomId.value = roomId
    send({ type: 'join_room', roomId, user })
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