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
  sessions: []
}

let db = null

export async function initDB() {
  try {
    db = new Low(new JSONFile(DB_FILE), defaultData)
    await db.read()

    if (!db.data) {
      db.data = defaultData
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
}