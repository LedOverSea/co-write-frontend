// 服务端入口文件 - 用于SSR渲染
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import App from './App.vue'
import { createAppRouter } from './router'
import ElementPlus, { ID_INJECTION_KEY, ZINDEX_INJECTION_KEY } from 'element-plus'
import { createPinia } from 'pinia'
import { useUserStore } from './stores/user'
import { useKnowledgeStore } from './stores/knowledge'
import { useDocumentStore } from './stores/document'

// SSR渲染上下文接口
export interface SSRContext {
  userToken?: string
  userId?: string
  cookies?: string
  userAgent?: string
}

// 数据预取函数
async function prefetchData(route: any, context: SSRContext) {
  const userStore = useUserStore()
  const knowledgeStore = useKnowledgeStore()
  const documentStore = useDocumentStore()
  
  try {
    // 如果有用户token，预取用户信息
    if (context.userToken && context.userId) {
      // 设置用户信息到store（服务端安全方式）
      userStore.setToken(context.userToken)
      
      // 根据路由预取不同的数据
      switch (route.name) {
        case 'Home':
          // 首页：预取知识库列表
          await knowledgeStore.fetchKnowledgeList(context.userId)
          break
          
        case 'KnowledgeBase':
          // 知识库页面：预取文档列表
          const knowledgeId = route.params.knowledgeId
          if (knowledgeId) {
            await documentStore.fetchKnowledgeDocuments(knowledgeId as string)
          }
          break
          
        case 'DocumentEditor':
        case 'SharedDocument':
          // 文档页面：预取文档详情
          const documentId = route.params.documentId
          if (documentId) {
            await documentStore.fetchDocument(documentId as string)
          }
          break
      }
    }
  } catch (error) {
    console.error('数据预取失败:', error)
    // 预取失败不影响页面渲染，只是没有预填数据
  }
}

// 主要的渲染函数
export async function render(url: string, context: SSRContext = {}) {
  // 创建SSR应用实例
  const app = createSSRApp(App)
  const router = createAppRouter()
  const pinia = createPinia()
  
  // 注册插件
  app.use(pinia)
  app.use(router)
  app.use(ElementPlus)
  
  // Element Plus SSR配置 - 提供ID和Z-Index注入器
  app.provide(ID_INJECTION_KEY, {
    prefix: Math.floor(Math.random() * 10000),
    current: 0,
  })
  
  app.provide(ZINDEX_INJECTION_KEY, { current: 0 })
  
  // 注意：@umoteam/editor 在服务端环境中可能有CSS导入问题，暂时跳过
  
  // 设置路由
  await router.push(url)
  await router.isReady()
  
  // 数据预取
  await prefetchData(router.currentRoute.value, context)
  
  // 渲染应用为HTML字符串
  const html = await renderToString(app)
  
  // 获取状态用于客户端hydration
  const state = pinia.state.value
  
  // 生成页面meta信息
  const route = router.currentRoute.value
  const pageTitle = getPageTitle(route)
  const pageDescription = getPageDescription(route)
  
  // 收集关键CSS类名（用于Critical CSS优化）
  const criticalCssClasses = extractCriticalCssClasses(html)
  
  return {
    html,
    state,
    title: pageTitle,
    description: pageDescription,
    criticalCss: criticalCssClasses
  }
}

// 提取关键CSS类名
function extractCriticalCssClasses(html: string): string[] {
  const classRegex = /class="([^"]*)"/g
  const classes = new Set<string>()
  let match
  
  while ((match = classRegex.exec(html)) !== null) {
    const classList = match[1].split(' ')
    classList.forEach(cls => {
      if (cls.trim()) {
        classes.add(cls.trim())
      }
    })
  }
  
  return Array.from(classes)
}

// 获取页面标题
function getPageTitle(route: any): string {
  const routeTitleMap: Record<string, string> = {
    'Login': '登录 - 协同编辑器',
    'Register': '注册 - 协同编辑器',
    'Home': '首页 - 协同编辑器',
    'KnowledgeBase': '知识库 - 协同编辑器',
    'DocumentEditor': '文档编辑 - 协同编辑器',
    'NotFound': '页面未找到 - 协同编辑器'
  }
  
  return routeTitleMap[route.name] || '协同编辑器'
}

// 获取页面描述
function getPageDescription(route: any): string {
  const routeDescMap: Record<string, string> = {
    'Login': '登录协同编辑器，开始您的文档协作之旅',
    'Register': '注册协同编辑器账号，体验实时协同编辑功能',
    'Home': '管理您的知识库和文档，支持多人实时协同编辑',
    'KnowledgeBase': '浏览知识库中的文档，支持实时协作编辑',
    'DocumentEditor': '实时协同文档编辑器，支持多人同时编辑',
    'SharedDocument': '通过分享链接协作编辑文档'
  }
  
  return routeDescMap[route.name] || '基于Vue 3的实时协同文档编辑器'
} 