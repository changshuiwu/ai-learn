import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 数据库文件在项目根目录的 db 文件夹
const DB_FILE = join(__dirname, '..', 'db', 'database.json')

const defaultData = {
  users: [],
  sessions: [],
  rooms: [] // 存储房间信息：{ roomId, creatorId, creatorUsername, status, createdAt }
}

let db = null

export async function initDB() {
  try {
    db = new Low(new JSONFile(DB_FILE), defaultData)
    await db.read()

    if (!db.data) {
      db.data = defaultData
      await db.write()
    } else {
      // 确保必要的字段存在（兼容旧数据库）
      if (!db.data.sessions) db.data.sessions = []
      if (!db.data.rooms) db.data.rooms = []
      await db.write()
    }

    console.log('数据库已初始化:', DB_FILE)
    return db
  } catch (e) {
    console.error('数据库初始化失败:', e)
    throw e
  }
}

export function getDB() {
  return db
}

export class UserManager {
  async register(username, password) {
    await db.read()

    const existing = db.data.users.find(u => u.username === username)
    if (existing) {
      return { success: false, error: '用户名已存在' }
    }

    if (username.length < 3 || username.length > 20) {
      return { success: false, error: '用户名需要3-20字符' }
    }
    if (password.length < 6 || password.length > 20) {
      return { success: false, error: '密码需要6-20字符' }
    }

    const user = {
      id: Date.now(),
      username,
      password,
      createdAt: new Date().toISOString()
    }

    db.data.users.push(user)
    await db.write()

    return { success: true, user: { id: user.id, username: user.username } }
  }

  async login(username, password) {
    await db.read()

    const user = db.data.users.find(u => u.username === username && u.password === password)
    if (!user) {
      return { success: false, error: '用户名或密码错误' }
    }

    return { success: true, user: { id: user.id, username: user.username } }
  }

  verifyUser(userId) {
    return db.data.users.find(u => u.id === userId)
  }

  // ==================== 房间管理方法 ====================

  /**
   * 创建房间（存储到数据库）
   * @param {string} roomId - 房间ID
   * @param {number} creatorId - 创建者用户ID
   * @param {string} creatorUsername - 创建者用户名
   * @returns {Object} 创建结果
   */
  async createRoom(roomId, creatorId, creatorUsername) {
    await db.read()

    // 检查是否已存在该房间号（防止重复创建）
    const existingRoom = db.data.rooms.find(r => r.roomId === roomId)
    if (existingRoom) {
      return { success: false, error: '房间号已存在' }
    }

    const room = {
      roomId,
      creatorId,
      creatorUsername,
      status: 'waiting', // waiting: 等待对手, playing:游戏中, finished:已结束
      createdAt: new Date().toISOString()
    }

    db.data.rooms.push(room)
    await db.write()

    return { success: true, room }
  }

  /**
   * 获取房间信息
   * @param {string} roomId - 房间ID
   * @returns {Object|null} 房间信息
   */
  async getRoom(roomId) {
    await db.read()
    return db.data.rooms.find(r => r.roomId === roomId) || null
  }

  /**
   * 更新房间状态
   * @param {string} roomId - 房间ID
   * @param {string} status - 新状态
   */
  async updateRoomStatus(roomId, status) {
    await db.read()
    const room = db.data.rooms.find(r => r.roomId === roomId)
    if (room) {
      room.status = status
      await db.write()
    }
  }

  /**
   * 删除房间
   * @param {string} roomId - 房间ID
   */
  async deleteRoom(roomId) {
    await db.read()
    const index = db.data.rooms.findIndex(r => r.roomId === roomId)
    if (index !== -1) {
      db.data.rooms.splice(index, 1)
      await db.write()
    }
  }

  /**
   * 获取用户创建的房间（如果有）
   * @param {number} creatorId - 创建者用户ID
   * @returns {Object|null} 房间信息
   */
  async getUserRoom(creatorId) {
    await db.read()
    // 查找该用户创建的未完成房间
    return db.data.rooms.find(r => r.creatorId === creatorId && r.status !== 'finished') || null
  }
}