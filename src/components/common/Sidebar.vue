<!-- 左侧边栏组件 -->
<template>
  <aside class="sidebar" :class="{ collapsed }">
    <!-- 折叠按钮 - 顶部 -->
    <div class="sidebar-header">
      <el-button 
        circle 
        size="small" 
        @click="$emit('toggle')" 
        :icon="collapsed ? ArrowRight : ArrowLeft"
        class="collapse-btn"
        type="primary"
        plain
      />
    </div>

    <div class="sidebar-content">
      <!-- Element Plus 菜单 -->
      <el-menu
        :default-active="activeMenu"
        :collapse="collapsed"
        :collapse-transition="false"
        background-color="#f8f9fa"
        text-color="#606266"
        active-text-color="#409eff"
        @select="handleMenuSelect"
        class="sidebar-menu"
      >
        <!-- 首页 -->
        <el-menu-item index="home" @click="$router.push('/')">
          <el-icon><House /></el-icon>
          <template #title>首页</template>
        </el-menu-item>

        <!-- 我的知识库 -->
        <el-sub-menu index="my-knowledge">
          <template #title>
            <el-icon><Folder /></el-icon>
            <span>我的知识库</span>
          </template>
          
          <!-- 知识库列表 -->
          <el-sub-menu 
            v-for="knowledge in myKnowledgeList" 
            :key="knowledge.id"
            :index="`knowledge-${knowledge.id}`"
            @click="handleKnowledgeClick(knowledge.id)"
          >
            <template #title>
              <el-icon><FolderOpened /></el-icon>
              <span>{{ knowledge.name }}</span>
            </template>
            
            <!-- 文档列表 -->
            <template v-if="knowledge.docs && knowledge.docs.length > 0">
              <el-menu-item 
                v-for="doc in knowledge.docs" 
                :key="doc.id"
                :index="`doc-${doc.id}`"
                @click="$router.push(`/knowledge/${knowledge.id}/document/${doc.id}`)"
              >
                <el-icon><Document /></el-icon>
                <template #title>{{ doc.title }}</template>
              </el-menu-item>
            </template>
            
            <!-- 无文档时的提示 -->
            <el-menu-item 
              v-else-if="knowledge.docsLoaded && (!knowledge.docs || knowledge.docs.length === 0)"
              index="no-docs"
              disabled
            >
              <el-icon><Document /></el-icon>
              <template #title>暂无文档</template>
            </el-menu-item>
            
            <!-- 加载中状态 -->
            <el-menu-item 
              v-else-if="loadingKnowledgeId === knowledge.id"
              index="loading-docs"
              disabled
            >
              <el-icon><Loading /></el-icon>
              <template #title>加载中...</template>
            </el-menu-item>
          </el-sub-menu>
        </el-sub-menu>

        <!-- 共享文档菜单 - 暂时隐藏，等待后端API支持 -->
        <!-- 
        <el-sub-menu index="shared-docs">
          <template #title>
            <el-icon><Share /></el-icon>
            <span>我共享的文档</span>
          </template>
          
          <el-menu-item 
            v-for="doc in sharedDocuments" 
            :key="doc.id"
            :index="`shared-${doc.id}`"
            @click="$router.push(`/shared/${doc.id}`)"
          >
            <el-icon><Document /></el-icon>
            <template #title>{{ doc.name }}</template>
          </el-menu-item>
        </el-sub-menu>
        -->
      </el-menu>
  </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { 
  ElMenu, 
  ElMenuItem, 
  ElSubMenu, 
  ElIcon, 
  ElButton,
  ElMessage
} from 'element-plus'
import { 
  House, 
  Folder, 
  FolderOpened, 
  Document, 
  Share,
  ArrowLeft,
  ArrowRight,
  Loading
} from '@element-plus/icons-vue'
import { useKnowledgeStore } from '@/stores/knowledge'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'

interface Props {
  collapsed: boolean
}

defineProps<Props>()
defineEmits<{
  toggle: []
}>()

const route = useRoute()
const knowledgeStore = useKnowledgeStore()
const userStore = useUserStore()

const { knowledgeList: myKnowledgeList } = storeToRefs(knowledgeStore)
const loadingKnowledgeId = ref<number | null>(null)

const activeMenu = computed(() => {
  const path = route.path
  if (path === '/') return 'home'
  if (path.startsWith('/editor/')) {
    const docId = route.params.documentId as string
    return `doc-${docId}`
  }
  if (path.startsWith('/knowledge/')) {
    const docId = route.params.documentId as string
    if (docId) {
      return `doc-${docId}`
    }
  }
  return 'home'
})

// 处理知识库点击事件
const handleKnowledgeClick = async (knowledgeId: number) => {
  try {
    const knowledge = myKnowledgeList.value.find(kb => kb.id === knowledgeId)
    if (!knowledge) return
    
    // 如果文档已经加载过，直接返回
    if (knowledge.docsLoaded) return
    
    loadingKnowledgeId.value = knowledgeId
    await knowledgeStore.fetchKnowledgeDocuments(knowledgeId)
  } catch (error) {
    console.error('获取知识库文档失败:', error)
    ElMessage.error('获取知识库文档失败，请重试')
  } finally {
    loadingKnowledgeId.value = null
  }
}

const handleMenuSelect = (_key: string, _keyPath: string[]) => {
  // 菜单选择处理
}

onMounted(() => {
  if (myKnowledgeList.value.length === 0) {
    const userId = userStore.userId
    
    if (userId && userId !== '' && userId !== 'undefined') {
      knowledgeStore.fetchKnowledgeList(userId)
    } else {
      // 如果用户状态还没恢复，可以尝试从localStorage获取
      const savedUserId = localStorage.getItem('userId')
      if (savedUserId && savedUserId !== 'undefined' && savedUserId !== '') {
        knowledgeStore.fetchKnowledgeList(savedUserId)
      }
    }
  }
})
</script>

<style scoped lang="scss">
.sidebar {
  width: 260px;
  flex-shrink: 0;
  height: 100%;
  background: #f8f9fa;
  border-right: 1px solid #ebeef5;
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
  position: relative;

  &.collapsed {
    width: 64px;
  }
}

.sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  
  .collapsed & {
    justify-content: center;
    padding: 12px 8px;
  }
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-menu {
  border: none;
  height: 100%;
  
  // 自定义菜单样式
  :deep(.el-menu-item) {
    height: 48px;
    line-height: 48px;
    
    &.is-active {
      background-color: #e8f4ff;
      border-right: 3px solid #409eff;
    }
  }
  
  :deep(.el-sub-menu) {
    .el-sub-menu__title {
      height: 48px;
      line-height: 48px;
    }
  }
  
  // 折叠状态下的样式
  &.el-menu--collapse {
    :deep(.el-sub-menu__title) {
      padding: 0 20px;
    }
    
    :deep(.el-menu-item) {
      padding: 0 20px;
    }
  }
}

.collapse-btn {
  transition: all 0.3s ease;
  
  &:hover {
    transform: scale(1.1);
  }
}

// 自定义滚动条
.sidebar-content::-webkit-scrollbar {
  width: 4px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 2px;
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background: #c0c4cc;
}

// 调整Element Plus图标样式
:deep(.el-icon) {
  margin-right: 8px;
}

@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    
    &:not(.collapsed) {
      transform: translateX(0);
    }
  }
}
</style> 