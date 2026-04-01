import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Home from '../views/Home.vue'
import Room from '../views/Room.vue'
import Game from '../views/Game.vue'

const routes = [
  { path: '/', name: 'Login', component: Login },
  { path: '/home', name: 'Home', component: Home },
  { path: '/room/:roomId', name: 'Room', component: Room },
  { path: '/game', name: 'Game', component: Game }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router