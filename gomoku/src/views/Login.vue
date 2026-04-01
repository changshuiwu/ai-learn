<template>
  <div class="login-page">
    <div class="login-box">
      <h1 class="title">五子棋</h1>

      <div class="form">
        <div class="input-group">
          <input
            v-model="username"
            type="text"
            placeholder="用户名（3-20字符）"
            maxlength="20"
          />
        </div>
        <div class="input-group">
          <input
            v-model="password"
            type="password"
            placeholder="密码（6-20字符）"
            maxlength="20"
            @keyup.enter="handleLogin"
          />
        </div>

        <div class="buttons">
          <button class="btn btn-primary" @click="handleLogin" :disabled="loading">
            {{ loading ? '登录中...' : '登录' }}
          </button>
          <button class="btn" @click="handleRegister" :disabled="loading">
            注册
          </button>
        </div>
      </div>

      <div v-if="error" class="error">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWebSocket } from '../composables/websocket.js'

const router = useRouter()
const { login: wsLogin } = useWebSocket()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!validate()) return

  loading.value = true
  error.value = ''

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        password: password.value
      })
    })
    const data = await res.json()

    if (data.success) {
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/home')
    } else {
      error.value = data.error
    }
  } catch (e) {
    error.value = '网络错误'
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (!validate()) return

  loading.value = true
  error.value = ''

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        password: password.value
      })
    })
    const data = await res.json()

    if (data.success) {
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/home')
    } else {
      error.value = data.error
    }
  } catch (e) {
    error.value = '网络错误'
  } finally {
    loading.value = false
  }
}

function validate() {
  if (username.value.length < 3) {
    error.value = '用户名需要至少3个字符'
    return false
  }
  if (password.value.length < 6) {
    error.value = '密码需要至少6个字符'
    return false
  }
  return true
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-box {
  width: 100%;
  max-width: 360px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.title {
  text-align: center;
  font-size: 42px;
  margin-bottom: 32px;
  color: var(--text-primary);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-group input {
  width: 100%;
  padding: 14px 16px;
  font-size: 16px;
  border: 2px solid #ddd;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.3s;
}

.input-group input:focus {
  border-color: var(--btn-bg);
}

.buttons {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.buttons .btn {
  flex: 1;
  padding: 14px;
  font-size: 16px;
}

.btn-primary {
  background: var(--btn-bg);
  color: #fff;
}

.btn-primary:hover {
  background: var(--btn-hover);
}

.btn:disabled,
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  margin-top: 16px;
  text-align: center;
  color: var(--accent);
  font-size: 14px;
}
</style>