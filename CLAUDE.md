# Claude Code 开发规范

## 项目端口约定

- **前端**: 3000 端口 (Vite dev server)
- **后端**: 3001 端口 (Node.js server)

## 前端代理配置 (vite.config.js)

开发环境下，前端需要配置代理连接后端：

```javascript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true
    },
    '/ws': {
      target: 'ws://localhost:3001',
      ws: true
    }
  }
}
```

## WebSocket 连接

开发环境 WebSocket 地址使用代理路径：
```javascript
const WS_URL = () => {
  const isDev = import.meta.env.DEV
  if (isDev) {
    return 'ws://localhost:3000/ws'  // 通过代理
  }
  // 生产环境
  return `${location.protocol}//${location.host}`
}
```

## HTTP API

开发环境使用相对路径（通过代理）：
```javascript
// 正确
const res = await fetch('/api/login', {...})

// 错误（硬编码端口）
const res = await fetch('http://localhost:3001/api/login', {...})
```