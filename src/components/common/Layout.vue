<!-- 主要布局组件 -->
<template>
  <div class="layout-container">
    <!-- 顶部导航栏 -->
    <Header @toggle-sidebar="toggleSidebar" />
    
    <div class="layout-body">
      <!-- 左侧边栏 -->
      <div class="sidebar-wrap" :style="{ width: sidebarWidth + 'px' }">
        <Sidebar :collapsed="sidebarCollapsed" @toggle="toggleSidebar" />
      </div>
      <!-- 拖拽分割条 -->
      <div class="sidebar-resizer" @mousedown="startResize"></div>
      
      <!-- 主内容区域 -->
      <main class="main-content">
        <!-- 面包屑导航 -->
        <div class="breadcrumb-container">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item 
              v-for="(item, index) in breadcrumbs" 
              :key="index"
              :to="index === breadcrumbs.length - 1 ? undefined : item.path"
            >
              {{ item.name }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        
        <!-- 路由内容 - 这里会显示具体的页面 -->
        <div class="content-wrapper">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import Header from './Header.vue'
import Sidebar from './Sidebar.vue'

const route = useRoute()
const sidebarCollapsed = ref(false)
const sidebarWidth = ref(260)
let resizing = false

const startResize = () => {
  resizing = true
  document.body.style.cursor = 'col-resize'
}
const onMouseMove = (e: MouseEvent) => {
  if (resizing) {
    sidebarWidth.value = Math.max(180, Math.min(400, e.clientX))
  }
}
const stopResize = () => {
  resizing = false
  document.body.style.cursor = ''
}
onMounted(() => {
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', stopResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', stopResize)
})

const dataSources: { [key: string]: { [key: string]: string } } = {
  knowledge: {
    '1': '研发部',
    '2': '运营部'
  },
  documents: {
    'doc1': '文档1',
    'doc2': '文档2',
    'doc3': '文档3',
    'doc4': '文档4',
  }
}

// 根据路由元信息动态生成面包屑
const breadcrumbs = computed(() => {
  const matchedRoutes = route.matched.filter(item => item.meta && item.meta.title);

  // 总是添加一个不可点击的"首页"作为根
  if (matchedRoutes.length > 0 && matchedRoutes[0].name !== 'Home') {
      matchedRoutes.unshift({
          path: '/',
          name: 'Home',
          meta: { title: '首页' }
      } as any);
  }

  return matchedRoutes.map((item, index) => {
    let name = item.meta.title as string;
    let path = item.path;
    
    // 动态名称处理
    if (item.name === 'KnowledgeBase' && route.params.knowledgeId) {
      const id = route.params.knowledgeId as string;
      name = dataSources.knowledge[id] || (item.meta.title as string);
      // 构建实际路径，替换占位符
      path = `/knowledge/${id}`;
    } else if (item.name === 'DocumentEditor' && route.params.documentId) {
      const id = route.params.documentId as string;
      name = dataSources.documents[id] || (item.meta.title as string);
      // 构建实际路径，替换占位符
      if (route.params.knowledgeId) {
        path = `/knowledge/${route.params.knowledgeId}/document/${id}`;
      }
    }
    
    // 如果路径包含占位符，尝试替换为实际值
    if (path.includes(':')) {
      // 替换路径中的参数占位符
      let actualPath = path;
      
      // 替换 :knowledgeId
      if (route.params.knowledgeId && actualPath.includes(':knowledgeId')) {
        actualPath = actualPath.replace(':knowledgeId', route.params.knowledgeId as string);
      }
      
      // 替换 :documentId
      if (route.params.documentId && actualPath.includes(':documentId')) {
        actualPath = actualPath.replace(':documentId', route.params.documentId as string);
      }
      
      path = actualPath;
      
      // 如果仍然包含占位符，设置为undefined以禁用点击
      if (path.includes(':')) {
        path = undefined;
      }
    }

    return {
      name: name,
      path: path
    }
  });
})

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>

<style scoped lang="scss">
.layout-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
}

.layout-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar-wrap {
  height: 100%;
  transition: width 0.2s;
  background: #f8f9fa;
  border-right: 1px solid #ebeef5;
  min-width: 64px;
  max-width: 400px;
  overflow: hidden;
  position: relative;
}

.sidebar-resizer {
  width: 5px;
  cursor: col-resize;
  background: transparent;
  transition: background 0.2s;
  z-index: 10;
  &:hover {
    background: #dcdfe6;
  }
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  padding: 10px;
  min-width: 0;
}

.breadcrumb-container {
  background: white;
  padding: 16px 24px;
  border-bottom: 1px solid #ebeef5;
  margin: -10px -10px 10px -10px;
}

.content-wrapper {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .main-content {
    margin-left: 0;
  }
}
</style>