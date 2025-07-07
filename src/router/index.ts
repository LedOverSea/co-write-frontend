// 路由配置
import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

// 创建路由实例的工厂函数
export function createAppRouter() {
  const router = createRouter({
    // 服务端使用内存历史，客户端使用Web历史
    history: typeof window === 'undefined' ? createMemoryHistory() : createWebHistory(),
  routes: [
    // 登录页面
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { 
        title: '登录 - 富文本编辑器',
        hideNavigation: true 
      }
    },
    
    // 注册页面
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/Register.vue'),
      meta: { 
        title: '注册 - 富文本编辑器',
        hideNavigation: true 
      }
    },

    // 主应用布局 - 包含侧边栏和顶部导航
    {
      path: '/',
      component: () => import('@/components/common/Layout.vue'),
      meta: { requiresAuth: true },
      children: [
        // 首页 - 知识库列表页面
        {
          path: '',
          name: 'Home',
          component: () => import('@/views/Home.vue'),
          meta: { 
            title: '首页',
          }
        },
        // 知识库详情页面（显示某个知识库下的所有文档）
        {
          path: 'knowledge/:knowledgeId',
          name: 'KnowledgeBase',
          component: () => import('@/views/KnowledgeBase.vue'),
          meta: { 
            title: '知识库', // 将作为父级面包屑
          },
          // 将文档编辑器作为子路由
          children: [
            {
              path: 'document/:documentId',
              name: 'DocumentEditor',
              component: () => import('@/views/DocumentEditor.vue'),
              meta: {
                title: '文档', // 将作为子级面包屑
              }
            }
          ]
        },

        // 为共享文档创建新的路由规则
        {
          path: 'shared',
          // 使用一个简单的内联模板作为父路由的容器
          component:() => import('@/views/SharedEditor.vue'),
          meta: {
            title: '共享文档' // 面包屑的父级
          },
          children: [
            {
              path: ':documentId',
              name: 'SharedDocument',
              component: () => import('@/views/DocumentEditor.vue'),
              meta: {
                title: '文档' // 动态部分，会显示为文档标题
              }
            }
          ]
        },
      ]
    },

    // 404 页面
    {
      path: '/404',
      name: 'NotFound',
      component: () => import('@/views/404.vue'),
      meta: { 
        title: '页面未找到',
        hideNavigation: true 
      }
    },

    // 捕获所有未匹配的路由
    {
      path: '/:pathMatch(.*)*',
      redirect: '/404'
    }
  ]
})

// 路由守卫 - 实现JWT验证和路由保护
router.beforeEach(async (to, from, next) => {
  // 设置页面标题（仅客户端）
  if (typeof window !== 'undefined' && to.meta.title) {
    document.title = to.meta.title as string
  }
  
  const userStore = useUserStore()
  
  // 服务端环境：简化处理，主要逻辑在数据预取中完成
  if (typeof window === 'undefined') {
    next()
    return
  }
  
  // 客户端环境：完整的认证逻辑
  const token = localStorage.getItem('token')
  
  // 如果有token但用户store中没有用户信息，尝试恢复用户状态
  if (token && !userStore.user) {
    userStore.restoreUserState()
  }
  
  // 需要认证的路由
  if (to.meta.requiresAuth) {
    if (!token || !userStore.isLoggedIn) {
      next('/login')
      return
    }
    
    // 如果有token但没有用户信息，尝试获取用户信息
    if (token && !userStore.user) {
      try {
        await userStore.fetchCurrentUser()
      } catch (error) {
        console.error('获取用户信息失败:', error)
        // 如果获取用户信息失败，清除无效token并重定向到登录页
        userStore.logoutUser()
        next('/login')
        return
      }
    }
  }
  
  // 已登录用户访问登录/注册页面时，重定向到首页
  if ((to.name === 'Login' || to.name === 'Register') && token && userStore.isLoggedIn) {
    next('/')
    return
  }
  
  next()
})

  // 路由后置守卫 - 可用于页面加载完成后的处理
  router.afterEach((to) => {
    // 可以在这里添加页面访问统计等逻辑
  })

  return router
}

// 创建默认路由实例（用于客户端）
const router = createAppRouter()

export default router 