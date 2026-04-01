import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import path from 'path'
import { fileURLToPath } from 'url'
import { GameManager } from './game/GameManager.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 配置
const PORT = process.env.PORT || 3001

// 创建 HTTP 服务器
const app = express()
const server = createServer(app)

// WebSocket 服务器
const wss = new WebSocketServer({ server })

// 游戏管理器
const gameManager = new GameManager()

// 静态文件服务（前端构建产物）
app.use(express.static(path.join(__dirname, '../gomoku/dist')))

// 处理 WebSocket 连接
wss.on('connection', (ws) => {
  console.log('客户端连接')

  // 发送连接成功消息
  ws.send(JSON.stringify({ type: 'connected' }))

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
    console.log('客户端断开')
    const player = gameManager.removePlayer(ws)
    if (player) {
      const room = gameManager.findRoomByWs(ws)
      if (room) {
        room.broadcast({ type: 'player_left', playerName: player.name })
      }
    }
  })

  ws.on('error', (error) => {
    console.error('WebSocket 错误:', error)
  })
})

// 处理消息
function handleMessage(ws, message) {
  const { type } = message

  switch (type) {
    case 'create_room':
      handleCreateRoom(ws, message)
      break
    case 'join_room':
      handleJoinRoom(ws, message)
      break
    case 'place_piece':
      handlePlacePiece(ws, message)
      break
    case 'timer_sync':
      handleTimerSync(ws)
      break
    case 'restart':
      handleRestart(ws)
      break
    default:
      sendError(ws, '未知消息类型')
  }
}

// 创建房间
function handleCreateRoom(ws, { playerName }) {
  const room = gameManager.createRoom()
  const result = room.addPlayer(ws, playerName || '玩家A')

  if (!result.success) {
    sendError(ws, result.error)
    return
  }

  ws.send(JSON.stringify({
    type: 'room_created',
    roomId: room.roomId,
    playerColor: result.color,
    playerName: playerName || '玩家A'
  }))

  console.log(`房间创建: ${room.roomId} by ${playerName}`)
}

// 加入房间
function handleJoinRoom(ws, { roomId, playerName }) {
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

  const result = room.addPlayer(ws, playerName || '玩家B')

  if (!result.success) {
    sendError(ws, result.error)
    return
  }

  ws.send(JSON.stringify({
    type: 'room_joined',
    roomId: room.roomId,
    playerColor: result.color,
    playerName: playerName || '玩家B'
  }))

  // 通知房主有人加入
  const host = room.getPlayerByColor('black')
  if (host) {
    host.ws.send(JSON.stringify({
      type: 'player_joined',
      playerName: playerName || '玩家B'
    }))
  }

  // 游戏开始
  const state = room.game.getState()
  room.broadcast({
    type: 'game_start',
    challenger: room.playerList[0].name,
    challenged: room.playerList[1].name,
    first: 'black',
    gameState: state
  })

  // 启动倒计时
  room.startTimer((winner) => {
    room.broadcast({
      type: 'player_timeout',
      winner: winner
    })
  })

  // 发送初始倒计时
  ws.send(JSON.stringify({
    type: 'timer_start',
    timeRemaining: room.getTimeRemaining()
  }))

  console.log(`玩家加入房间: ${roomIdUpper} by ${playerName}`)
}

// 落子
function handlePlacePiece(ws, { x, y }) {
  const room = gameManager.findRoomByWs(ws)
  if (!room) {
    sendError(ws, '不在房间中')
    return
  }

  const result = room.placePiece(x, y, ws)

  if (!result.success) {
    sendError(ws, result.error)
    return
  }

  // 广播落子消息
  room.broadcast({
    type: 'piece_placed',
    x,
    y,
    gameState: result.gameState
  })

  // 如果游戏结束
  if (room.game.gameOver) {
    room.broadcast({
      type: 'game_over',
      winner: room.game.winner,
      winningPieces: room.game.winningPieces
    })
    room.stopTimer()
  } else {
    // 更新倒计时
    room.broadcast({
      type: 'timer_update',
      timeRemaining: room.getTimeRemaining()
    })
  }
}

// 倒计时同步
function handleTimerSync(ws) {
  const room = gameManager.findRoomByWs(ws)
  if (!room) return

  ws.send(JSON.stringify({
    type: 'timer_sync',
    timeRemaining: room.getTimeRemaining()
  }))
}

// 重新开始
function handleRestart(ws) {
  const room = gameManager.findRoomByWs(ws)
  if (!room) {
    sendError(ws, '不在房间中')
    return
  }

  room.game.reset()
  room.resetTimer()

  const state = room.game.getState()
  room.broadcast({
    type: 'game_start',
    challenger: room.playerList[0].name,
    challenged: room.playerList[1]?.name || '',
    first: 'black',
    gameState: state
  })

  // 重新启动倒计时
  room.startTimer((winner) => {
    room.broadcast({
      type: 'player_timeout',
      winner: winner
    })
  })
}

// 发送错误消息
function sendError(ws, message) {
  ws.send(JSON.stringify({ type: 'error', message }))
}

// 启动服务器
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
  console.log(`WebSocket 运行在 ws://localhost:${PORT}`)
})