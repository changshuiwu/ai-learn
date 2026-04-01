import { ref } from 'vue'

// WebSocket 服务地址
const WS_URL = () => {
  // 开发环境使用代理，生产环境使用当前主机
  const isDev = import.meta.env.DEV
  if (isDev) {
    return `ws://localhost:3001`
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}`
}

export function useWebSocket() {
  const ws = ref(null)
  const connected = ref(false)
  const error = ref(null)

  // 房间信息
  const roomId = ref(null)
  const playerColor = ref(null)
  const wsPlayerName = ref(null)

  // 消息回调
  const messageHandlers = ref({})

  // 连接 WebSocket
  function connect() {
    return new Promise((resolve, reject) => {
      try {
        ws.value = new WebSocket(WS_URL())

        ws.value.onopen = () => {
          console.log('WebSocket 已连接')
          connected.value = true
          error.value = null
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

  // 处理消息
  function handleMessage(message) {
    const { type } = message
    console.log('收到消息:', type, message)

    switch (type) {
      case 'connected':
        // 连接成功，等待后续消息
        break

      case 'room_created':
        roomId.value = message.roomId
        playerColor.value = message.playerColor
        wsPlayerName.value = message.playerName
        dispatch('room_created', message)
        break

      case 'room_joined':
        roomId.value = message.roomId
        playerColor.value = message.playerColor
        wsPlayerName.value = message.playerName
        dispatch('room_joined', message)
        break

      case 'player_joined':
        dispatch('player_joined', message)
        break

      case 'game_start':
        dispatch('game_start', message)
        break

      case 'piece_placed':
        dispatch('piece_placed', message)
        break

      case 'game_over':
        dispatch('game_over', message)
        break

      case 'player_timeout':
        dispatch('player_timeout', message)
        break

      case 'timer_start':
      case 'timer_update':
      case 'timer_sync':
        dispatch('timer', message)
        break

      case 'error':
        error.value = message.message
        dispatch('error', message)
        break

      case 'player_left':
        dispatch('player_left', message)
        break

      default:
        console.log('未知消息类型:', type)
    }
  }

  // 发送消息
  function send(message) {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) {
      console.error('WebSocket 未连接')
      return false
    }

    ws.value.send(JSON.stringify(message))
    return true
  }

  // 创建房间
  function createRoom(name) {
    return send({ type: 'create_room', playerName: name })
  }

  // 加入房间
  function joinRoom(id, name) {
    return send({ type: 'join_room', roomId: id, playerName: name })
  }

  // 落子
  function placePiece(x, y) {
    return send({ type: 'place_piece', x, y })
  }

  // 重新开始
  function restart() {
    return send({ type: 'restart' })
  }

  // 断开连接
  function disconnect() {
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    connected.value = false
    roomId.value = null
    playerColor.value = null
  }

  // 注册消息回调
  function on(type, handler) {
    if (!messageHandlers.value[type]) {
      messageHandlers.value[type] = []
    }
    messageHandlers.value[type].push(handler)
  }

  // 触发回调
  function dispatch(type, data) {
    const handlers = messageHandlers.value[type]
    if (handlers) {
      handlers.forEach(handler => handler(data))
    }
  }

  return {
    // 状态
    connected,
    error,
    roomId,
    playerColor,

    // 方法
    connect,
    createRoom,
    joinRoom,
    placePiece,
    restart,
    disconnect,
    on
  }
}