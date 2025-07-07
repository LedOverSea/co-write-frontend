// 客户端入口文件 - 用于SSR hydration
import { createApp } from 'vue'
import App from './App.vue'
import { createAppRouter } from './router'
import { useUmoEditor } from '@umoteam/editor'
import ElementPlus, { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from 'element-plus'
import 'element-plus/dist/index.css'
import { createPinia } from 'pinia'
import { useUserStore } from './stores/user'
// 导入所有样式文件
import './style.css'
import './styles/common.scss'

// 创建应用实例
const app = createApp(App)
const router = createAppRouter()
const pinia = createPinia()

// 注册插件
app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.use(useUmoEditor)

// Element Plus SSR配置 - 客户端也需要提供相同的注入器
app.provide(ID_INJECTION_KEY, {
  prefix: Math.floor(Math.random() * 10000),
  current: 0,
})

app.provide(ZINDEX_INJECTION_KEY, { current: 0 })

// 如果存在服务端渲染的状态，恢复它
if (typeof window !== 'undefined' && window.__INITIAL_STATE__) {
  pinia.state.value = window.__INITIAL_STATE__
}

// 等待路由准备就绪
router.isReady().then(() => {
  // 恢复用户状态（客户端专用）
  const userStore = useUserStore()
  userStore.restoreUserState()
  
  // 挂载应用（hydrate SSR内容）
  app.mount('#app')
  
  // Hydration完成后，显示应用并移除加载状态
  setTimeout(() => {
    const appElement = document.getElementById('app')
    if (appElement) {
      appElement.classList.add('hydrated')
    }
  }, 100)
})

// 声明全局类型
declare global {
  interface Window {
    __INITIAL_STATE__?: any
  }
} 