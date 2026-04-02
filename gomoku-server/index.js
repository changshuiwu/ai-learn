/**
 * 五子棋游戏服务器
 * 提供 WebSocket 实时对战功能
 *
 * 主要功能：
 * 1. 用户注册/登录（HTTP API）
 * 2. 房间创建/加入（WebSocket）
 * 3. 游戏状态同步（WebSocket）
 * 4. 超时判定
 */

import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import path from 'path'
import { fileURLToPath } from 'url'
import { Room } from './game/Room.js'
import { generateRoomId } from './game/utils.js'
import { initDB, UserManager } from './game/User.js'

// 获取当前文件目录
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ==================== 服务器配置 ====================

// 服务器端口，默认 3001
const PORT = process.env.PORT || 3001

// 创建 Express 应用
const app = express()

// 创建 HTTP 服务器
const server = createServer(app)

// 创建 WebSocket 服务器（与 HTTP 共用同一端口）
const wss = new WebSocketServer({ server })

// 中间件配置
app.use(express.json())  // 解析 JSON 请求体

// 静态文件服务（前端页面）
app.use(express.static(path.join(__dirname, '../gomoku/dist')))

// ==================== 房间管理 ====================

/**
 * 房间存储（全局 Map）
 * key: roomId (string)
 * value: Room 实例
 *
 * 使用全局 Map 确保所有 WebSocket 连接共享同一份房间数据
 */
const rooms = new Map()

/**
 * 创建新房间
 * 生成唯一房间号，将房间添加到 rooms Map 中
 * @returns {Room} 创建的房间实例
 */
function createRoom() {
  let roomId
  // 确保房间号不重复
  do {
    roomId = generateRoomId()
  } while (rooms.has(roomId))

  // 创建房间并存储
  const room = new Room(roomId)
  rooms.set(roomId, room)
  console.log('创建房间成功:', roomId, '总房间数:', rooms.size)
  return room
}

/**
 * 获取房间实例
 * @param {string} roomId - 房间号
 * @returns {Room|undefined}
 */
function getRoom(roomId) {
  return rooms.get(roomId)
}

/**
 * 删除房间
 * 销毁房间实例并从 Map 中移除
 * @param {string} roomId - 房间号
 */
function deleteRoom(roomId) {
  const room = rooms.get(roomId)
  if (room) {
    room.destroy()  // 清理计时器等资源
    rooms.delete(roomId)
    console.log('删除房间:', roomId, '总房间数:', rooms.size)
  }
}

// ==================== 用户管理 ====================

// 创建用户管理器实例（处理注册/登录）
const userManager = new UserManager()

console.log('=== 服务器启动 ===')

/**
 * WebSocket 连接映射
 * ws -> { user, roomId }  (正向映射)
 * 用于根据 WebSocket 实例查找对应的用户和房间
 */
const userWsMap = new Map()

/**
 * 用户 ID -> WebSocket 反向映射
 * userId -> ws
 * 用于根据用户 ID 查找对应的 WebSocket，实现点对点消息发送
 */
const userWs反向Map = new Map()

// ==================== 数据库初始化 ====================

// 初始化低代码数据库（lowdb）
await initDB()
console.log('数据库已就绪')

// 将 broadcast 函数暴露给 Room 类使用
globalThis.broadcast = broadcast

// ==================== HTTP 接口 ====================

/**
 * 用户注册接口
 * POST /api/register
 * 请求体: { username, password }
 * 响应: { success: boolean, error?: string }
 */
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body
  const result = await userManager.register(username, password)
  res.json(result)
})

/**
 * 用户登录接口
 * POST /api/login
 * 请求体: { username, password }
 * 响应: { success: boolean, user?, error?: string }
 */
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body
  const result = await userManager.login(username, password)
  res.json(result)
})

// ==================== WebSocket 消息处理 ====================

/**
 * 广播消息到指定房间的所有玩家
 * @param {string} roomId - 房间号
 * @param {Object} message - 要发送的消息对象
 *
 * 逻辑：为每个接收者单独发送消息，添加 targetUsername 用于客户端过滤
 */
function broadcast(roomId, message) {
  for (const [ws, info] of userWsMap) {
    // 只发送给同一房间且连接正常的 WebSocket
    if (info.roomId === roomId && ws.readyState === 1) {
      // 为每个接收者添加 targetUsername
      const msgWithTarget = {
        ...message,
        targetUsername: info.user?.username
      }
      ws.send(JSON.stringify(msgWithTarget))
    }
  }
}

/**
 * 发送消息给指定用户
 * @param {string} username - 目标用户名
 * @param {Object} message - 消息对象
 */
function sendToUser(username, message) {
  const msgWithTarget = {
    ...message,
    targetUsername: username
  }
  const messageStr = JSON.stringify(msgWithTarget)

  for (const [ws, info] of userWsMap) {
    if (info.user?.username === username && ws.readyState === 1) {
      ws.send(messageStr)
      return true
    }
  }
  return false
}

/**
 * WebSocket 连接处理
 * 每个客户端连接都会创建一个新的处理函数闭包
 */
wss.on('connection', (ws) => {
  // 当前连接的用户的用户信息
  let currentUser = null

  // 当前所在的房间号
  let currentRoom = null

  console.log('客户端连接')

  /**
   * 接收客户端消息
   * @param {Buffer} data - 收到的二进制数据
   */
  ws.on('message', (data) => {
    try {
      // 解析 JSON 消息
      const message = JSON.parse(data.toString())
      handleMessage(ws, message)
    } catch (e) {
      console.error('消息解析错误:', e)
      sendError(ws, '消息格式错误')
    }
  })

  /**
   * WebSocket 断开连接处理
   * 处理玩家离开房间的逻辑
   */
  ws.on('close', async () => {
    console.log('WebSocket 断开, 用户:', currentUser?.username, '房间:', currentRoom)

    // 如果用户还在房间里
    if (currentUser && currentRoom) {
      // 1. 广播玩家离开消息
      broadcast(currentRoom, { type: 'player_left', username: currentUser.username })

      // 2. 从房间移除该玩家
      const room = getRoom(currentRoom)
      if (room) {
        const isCreator = room.players.length > 0 && room.players[0].id === currentUser.id
        room.removePlayer(currentUser.id)

        if (room.players.length === 0) {
          // 房间空了，删除内存中的房间
          console.log('删除空房间:', currentRoom)
          deleteRoom(currentRoom)

          // 如果是创建者离开，同时删除数据库中的房间记录
          if (isCreator) {
            await userManager.deleteRoom(currentRoom)
            console.log('删除数据库房间:', currentRoom)
          }
        } else {
          // 房间还有玩家（加入者），通知对方创建者已离开
          broadcast(currentRoom, {
            type: 'creator_disconnected',
            message: '对方已离开，游戏结束'
          })
          // 删除房间
          deleteRoom(currentRoom)
          // 删除数据库记录
          await userManager.deleteRoom(currentRoom)
        }
      }
    }

    // 清理映射数据
    if (currentUser) {
      userWs反向Map.delete(currentUser.id)
    }
    userWsMap.delete(ws)
  })

  /**
   * 消息分发处理
   * 根据消息 type 字段调用不同的处理函数
   * @param {WebSocket} ws - WebSocket 连接
   * @param {Object} message - 消息对象
   */
  function handleMessage(ws, message) {
    const { type } = message
    console.log('收到完整消息:', JSON.stringify(message))

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

  /**
   * 处理用户登录（WebSocket 登录）
   * @param {WebSocket} ws - WebSocket 连接
   * @param {Object} message - 消息 { user }
   *
   * 登录流程：
   * 1. 保存用户信息到本地变量
   * 2. 建立 WebSocket 到用户ID 的映射
   * 3. 发送登录成功响应
   */
  function handleLogin(ws, { user }) {
    currentUser = user
    // 保存用户和房间的映射关系
    userWsMap.set(ws, { user, roomId: null })
    userWs反向Map.set(user.id, ws)

    // 发送登录成功消息
    ws.send(JSON.stringify({ type: 'login_ok', user }))
    console.log(`用户登录: ${user.username}`)
  }

  /**
   * 处理创建房间请求
   * @param {WebSocket} ws - WebSocket 连接
   * @param {Object} message - 消息 { user }
   */
  async function handleCreateRoom(ws, { user }) {
    currentUser = user

    // 生成房间号
    let roomId
    do {
      roomId = generateRoomId()
    } while (rooms.has(roomId))

    // 创建内存中的房间
    const room = new Room(roomId)
    rooms.set(roomId, room)

    // 将创建者添加到房间
    const result = room.addPlayer(user)

    if (!result.success) {
      sendError(ws, result.error)
      return
    }

    // 将房间信息存储到数据库（绑定创建者）
    await userManager.createRoom(roomId, user.id, user.username)

    // 设置当前房间
    currentRoom = roomId
    userWsMap.set(ws, { user, roomId })

    // 发送房间创建成功消息
    ws.send(JSON.stringify({
      type: 'room_created',
      roomId: roomId,
      color: result.color,
      username: user.username
    }))
    console.log(`房间创建: ${roomId}, 创建者: ${user.username}`)
  }

  /**
   * 处理加入房间请求
   * @param {WebSocket} ws - WebSocket 连接
   * @param {Object} message - 消息 { roomId, user }
   *
   * 加入流程：
   * 1. 验证房间存在于数据库
   * 2. 检查创建者是否在线
   * 3. 检查房间是否在内存中（已创建且未删除）
   * 4. 添加玩家到房间
   * 5. 通知房主
   * 6. 开始游戏
   */
  async function handleJoinRoom(ws, { roomId, user }) {
    currentUser = user
    const roomIdUpper = roomId.toUpperCase()

    console.log('尝试加入房间:', roomIdUpper)

    // 1. 检查房间是否存在于数据库
    const dbRoom = await userManager.getRoom(roomIdUpper)
    if (!dbRoom) {
      sendError(ws, '房间不存在')
      return
    }

    // 2. 检查房间状态是否为等待中
    if (dbRoom.status !== 'waiting') {
      sendError(ws, '房间游戏已开始或已结束')
      return
    }

    // 3. 检查创建者是否在线（通过 WebSocket 映射）
    const creatorWs = userWs反向Map.get(dbRoom.creatorId)
    if (!creatorWs || creatorWs.readyState !== 1) {
      // 创建者不在线，提示对战用户不存在
      sendError(ws, '对战用户不存在')
      return
    }

    // 4. 检查内存中房间是否存在
    const room = getRoom(roomIdUpper)
    if (!room) {
      // 房间在数据库中存在但内存中没有（可能是服务器重启），重新创建
      const newRoom = new Room(roomIdUpper)
      rooms.set(roomIdUpper, newRoom)
      // 房主需要重新加入（这里简化处理，提示重新创建）
      sendError(ws, '房间已失效，请重新创建')
      return
    }

    // 5. 检查房间是否已满
    if (room.isFull()) {
      sendError(ws, '房间已满')
      return
    }

    // 6. 检查用户是否已在房间中
    if (room.hasUser(user.id)) {
      sendError(ws, '你已在房间中')
      return
    }

    // 添加玩家到房间
    const result = room.addPlayer(user)
    currentRoom = roomIdUpper
    userWsMap.set(ws, { user, roomId: roomIdUpper })

    // 更新数据库房间状态为游戏中
    await userManager.updateRoomStatus(roomIdUpper, 'playing')

    // 通知房主有玩家加入
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

    // 获取游戏状态
    const state = room.game.getState()

    // 广播游戏开始消息给房间内所有玩家
    broadcast(roomIdUpper, {
      type: 'game_start',
      first,
      challenger: room.players[0].username,  // 房主
      challenged: room.players[1].username,   // 加入者
      gameState: state
    })

    // 启动超时计时器
    room.startTimer((winner) => {
      broadcast(roomIdUpper, { type: 'player_timeout', winner })
    })

    // 发送加入成功消息给客户端
    ws.send(JSON.stringify({
      type: 'room_joined',
      roomId: roomIdUpper,
      color: result.color,
      username: user.username
    }))
    console.log(`加入房间: ${roomIdUpper}, 加入者: ${user.username}`)
  }

  /**
   * 处理落子请求
   * @param {WebSocket} ws - WebSocket 连接
   * @param {Object} message - 消息 { x, y }
   *
   * 落子验证：
   * 1. 用户必须在房间里
   * 2. 必须是当前用户的回合
   * 3. 游戏未结束
   * 4. 落子位置有效
   */
  function handlePlacePiece(ws, { x, y }) {
    const room = currentRoom ? getRoom(currentRoom) : null
    if (!room || !currentUser) {
      sendError(ws, '不在房间中')
      return
    }

    // 检查是否轮到该用户落子
    const myColor = room.getUserColor(currentUser.id)
    if (myColor !== room.game.currentPlayer) {
      sendError(ws, '还不是你的回合')
      return
    }

    // 检查游戏是否已结束
    if (room.game.gameOver) {
      sendError(ws, '游戏已结束')
      return
    }

    // 执行落子
    const success = room.placePiece(x, y, currentUser.id)
    if (!success) {
      sendError(ws, '无效的位置')
      return
    }

    // 获取更新后的游戏状态
    const state = room.game.getState()

    // 广播落子消息
    broadcast(room.roomId, { type: 'piece_placed', gameState: state })

    // 检查游戏是否结束
    if (room.game.gameOver) {
      // 游戏结束，广播获胜信息
      broadcast(room.roomId, {
        type: 'game_over',
        winner: room.game.winner,
        winningPieces: room.game.winningPieces
      })
      room.stopTimer()
    } else {
      // 游戏继续，重置并重启计时器
      room.resetTimer()
      room.startTimer((winner) => {
        broadcast(room.roomId, { type: 'player_timeout', winner })
      })

      // 广播计时器更新
      broadcast(room.roomId, {
        type: 'timer_update',
        timeRemaining: room.getTimeRemaining(),
        currentPlayer: room.game.currentPlayer
      })
    }
  }

  /**
   * 处理重新开始请求
   * 重置游戏状态，重新开始游戏
   */
  function handleRestart() {
    const room = currentRoom ? getRoom(currentRoom) : null
    if (!room) return

    // 重置游戏
    room.game.reset()
    room.stopTimer()

    // 随机先手
    const first = Math.random() < 0.5 ? 'black' : 'white'
    room.game.firstPlayer = first

    const state = room.game.getState()

    // 广播游戏开始
    broadcast(room.roomId, {
      type: 'game_start',
      first,
      challenger: room.players[0].username,
      challenged: room.players[1].username,
      gameState: state
    })

    // 启动计时器
    room.startTimer((winner) => {
      broadcast(room.roomId, { type: 'player_timeout', winner })
    })
  }

  /**
   * 处理离开房间请求
   * 用户主动离开房间
   */
  async function handleLeaveRoom() {
    if (currentRoom && currentUser) {
      const room = getRoom(currentRoom)
      if (room) {
        const isCreator = room.players.length > 0 && room.players[0].id === currentUser.id

        // 从房间移除玩家
        room.removePlayer(currentUser.id)

        // 广播玩家离开
        broadcast(currentRoom, { type: 'player_left', username: currentUser.username })

        if (room.players.length === 0) {
          // 房间空了，删除内存中的房间
          deleteRoom(currentRoom)
          // 删除数据库记录
          await userManager.deleteRoom(currentRoom)
        } else {
          // 房间还有玩家，通知对方并删除
          broadcast(currentRoom, {
            type: 'creator_disconnected',
            message: '对方已离开，游戏结束'
          })
          deleteRoom(currentRoom)
          await userManager.deleteRoom(currentRoom)
        }
      }
      currentRoom = null
    }
    // 更新用户房间映射
    userWsMap.set(ws, { user: currentUser, roomId: null })
  }

  /**
   * 发送错误消息给客户端
   * @param {WebSocket} ws - WebSocket 连接
   * @param {string} message - 错误信息
   */
  function sendError(ws, message) {
    ws.send(JSON.stringify({ type: 'error', message }))
  }
})

// ==================== 启动服务器 ====================

server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`)
})