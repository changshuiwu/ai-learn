import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import path from 'path'
import { fileURLToPath } from 'url'
import { GameManager } from './game/GameManager.js'
import { initDB, UserManager } from './game/User.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PORT = process.env.PORT || 3001

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server })

app.use(express.json())
app.use(express.static(path.join(__dirname, '../gomoku/dist')))

const gameManager = new GameManager()
const userManager = new UserManager()

const userWsMap = new Map() // ws -> { user, roomId }
const userWs反向Map = new Map() // userId -> ws

await initDB()
console.log('数据库已就绪')

// HTTP 接口
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body
  const result = await userManager.register(username, password)
  res.json(result)
})

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body
  const result = await userManager.login(username, password)
  res.json(result)
})

// 广播到房间
function broadcast(roomId, message) {
  const messageStr = JSON.stringify(message)
  for (const [ws, info] of userWsMap) {
    if (info.roomId === roomId && ws.readyState === 1) {
      ws.send(messageStr)
    }
  }
}

// WebSocket 处理
wss.on('connection', (ws) => {
  let currentUser = null
  let currentRoom = null

  console.log('客户端连接')

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString())
      handleMessage(ws, message)
    } catch (e) {
      console.error('消息解析错误:', e)
      sendError(ws, '消息格式错误')
    }
  })

  ws.on('close', () => {
    if (currentUser && currentRoom) {
      broadcast(currentRoom, { type: 'player_left', username: currentUser.username })
      const room = gameManager.getRoom(currentRoom)
      if (room) {
        room.removePlayer(currentUser.id)
        if (room.players.length === 0) {
          gameManager.deleteRoom(currentRoom)
        }
      }
    }
    if (currentUser) {
      userWs反向Map.delete(currentUser.id)
    }
    userWsMap.delete(ws)
  })

  function handleMessage(ws, message) {
    const { type } = message
    console.log('收到:', type)

    switch (type) {
      case 'login_ws':
        handleLogin(ws, message)
        break
      case 'create_room':
        handleCreateRoom(ws, message)
        break
      case 'join_room':
        handleJoinRoom(ws, message)
        break
      case 'place_piece':
        handlePlacePiece(ws, message)
        break
      case 'restart':
        handleRestart(ws)
        break
      case 'leave_room':
        handleLeaveRoom(ws)
        break
      default:
        sendError(ws, '未知消息')
    }
  }

  function handleLogin(ws, { user }) {
    currentUser = user
    userWsMap.set(ws, { user, roomId: null })
    userWs反向Map.set(user.id, ws)
    ws.send(JSON.stringify({ type: 'login_ok', user }))
    console.log(`用户登录: ${user.username}`)
  }

  function handleCreateRoom(ws, { user }) {
    currentUser = user
    const room = gameManager.createRoom()
    const result = room.addPlayer(currentUser)

    if (!result.success) {
      sendError(ws, result.error)
      return
    }

    currentRoom = room.roomId
    userWsMap.set(ws, { user, roomId: room.roomId })

    ws.send(JSON.stringify({
      type: 'room_created',
      roomId: room.roomId,
      color: result.color,
      username: user.username
    }))
    console.log(`房间创建: ${room.roomId}`)
  }

  function handleJoinRoom(ws, { roomId, user }) {
    currentUser = user
    const roomIdUpper = roomId.toUpperCase()
    const room = gameManager.getRoom(roomIdUpper)

    if (!room) {
      sendError(ws, '房间不存在')
      return
    }

    if (room.isFull()) {
      sendError(ws, '房间已满')
      return
    }

    if (room.hasUser(user.id)) {
      sendError(ws, '你已在房间中')
      return
    }

    const result = room.addPlayer(user)
    currentRoom = room.roomId
    userWsMap.set(ws, { user, roomId: room.roomId })

    // 通知房主
    const hostWs = userWs反向Map.get(room.getHost()?.id)
    if (hostWs && hostWs !== ws) {
      hostWs.send(JSON.stringify({
        type: 'player_joined',
        username: user.username
      }))
    }

    // 游戏开始 - 随机先手
    const first = Math.random() < 0.5 ? 'black' : 'white'
    room.game.firstPlayer = first

    const state = room.game.getState()
    broadcast(room.roomId, {
      type: 'game_start',
      first,
      challenger: room.players[0].username,
      challenged: room.players[1].username,
      gameState: state
    })

    room.startTimer((winner) => {
      broadcast(room.roomId, { type: 'player_timeout', winner })
    })

    ws.send(JSON.stringify({
      type: 'room_joined',
      roomId: room.roomId,
      color: result.color,
      username: user.username
    }))
    console.log(`加入房间: ${roomIdUpper}`)
  }

  function handlePlacePiece(ws, { x, y }) {
    const room = currentRoom ? gameManager.getRoom(currentRoom) : null
    if (!room || !currentUser) {
      sendError(ws, '不在房间中')
      return
    }

    const myColor = room.getUserColor(currentUser.id)
    if (myColor !== room.game.currentPlayer) {
      sendError(ws, '还不是你的回合')
      return
    }

    if (room.game.gameOver) {
      sendError(ws, '游戏已结束')
      return
    }

    const success = room.placePiece(x, y, currentUser.id)
    if (!success) {
      sendError(ws, '无效的位置')
      return
    }

    const state = room.game.getState()
    broadcast(room.roomId, { type: 'piece_placed', gameState: state })

    if (room.game.gameOver) {
      broadcast(room.roomId, {
        type: 'game_over',
        winner: room.game.winner,
        winningPieces: room.game.winningPieces
      })
      room.stopTimer()
    } else {
      // 重置倒计时，给当前玩家
      room.resetTimer()
      room.startTimer((winner) => {
        broadcast(room.roomId, { type: 'player_timeout', winner })
      })
      broadcast(room.roomId, {
        type: 'timer_update',
        timeRemaining: room.getTimeRemaining(),
        currentPlayer: room.game.currentPlayer
      })
    }
  }

  function handleRestart() {
    const room = currentRoom ? gameManager.getRoom(currentRoom) : null
    if (!room) return

    room.game.reset()
    room.stopTimer()

    const first = Math.random() < 0.5 ? 'black' : 'white'
    room.game.firstPlayer = first

    const state = room.game.getState()
    broadcast(room.roomId, {
      type: 'game_start',
      first,
      challenger: room.players[0].username,
      challenged: room.players[1].username,
      gameState: state
    })

    room.startTimer((winner) => {
      broadcast(room.roomId, { type: 'player_timeout', winner })
    })
  }

  function handleLeaveRoom() {
    if (currentRoom && currentUser) {
      const room = gameManager.getRoom(currentRoom)
      if (room) {
        room.removePlayer(currentUser.id)
        broadcast(currentRoom, { type: 'player_left', username: currentUser.username })
        if (room.players.length === 0) {
          gameManager.deleteRoom(currentRoom)
        }
      }
      currentRoom = null
    }
    userWsMap.set(ws, { user: currentUser, roomId: null })
  }

  function sendError(ws, message) {
    ws.send(JSON.stringify({ type: 'error', message }))
  }
})

server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
})