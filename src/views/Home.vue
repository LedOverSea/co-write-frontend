<!-- 知识库首页 -->
<template>
  <div class="home-container">
    <!-- 知识库列表区域 -->
    <section class="knowledge-section">
      <div class="section-header">
        <h2 class="section-title">知识库列表</h2>
        <button class="btn btn-primary" @click="showCreateDialog = true" style="margin-top: 10px;">
          <span class="icon">+</span>
          新建知识库
        </button>
      </div>
      
      <div class="knowledge-grid">
        <div 
          v-for="knowledge in knowledgeList" 
          :key="knowledge.id"
          class="knowledge-card"
          @click="openKnowledge(knowledge.id)"
        >
          <img :src="knowledge.coverUrl" :alt="knowledge.name" class="knowledge-cover" />
          <div class="knowledge-info">
            <h3 class="knowledge-name">{{ knowledge.name }}</h3>
            <p class="knowledge-stats">知识库</p>
          </div>
          
          <!-- 操作按钮区域 -->
          <div class="knowledge-actions" @click.stop>
            <el-button 
              type="primary" 
              size="small" 
              :icon="Edit"
              @click="editKnowledge(knowledge)"
              class="action-btn"
            >
              编辑
            </el-button>
            <el-button 
              type="danger" 
              size="small" 
              :icon="Delete"
              @click="deleteKnowledge(knowledge)"
              class="action-btn"
            >
              删除
            </el-button>
          </div>
        </div>
      </div>
    </section>

    <!-- 最近访问区域 -->
    <section class="recent-section">
      <div class="section-header">
        <h2 class="section-title">最近访问列表</h2>
        <div class="view-controls">
          <button 
            class="view-btn" 
            :class="{ active: viewMode === 'list' }"
            @click="viewMode = 'list'"
          >
            📋 列表
          </button>
          <button 
            class="view-btn" 
            :class="{ active: viewMode === 'grid' }"
            @click="viewMode = 'grid'"
          >
            🔲 网格
          </button>
        </div>
      </div>
      
      <div class="recent-documents" :class="viewMode">
        <div 
          v-for="document in recentDocuments" 
          :key="document.id"
          class="document-item"
          @click="openDocument(document.id)"
        >
          <div class="document-icon">
            <span class="file-icon">📄</span>
          </div>
          <div class="document-info">
            <h4 class="document-title">{{ document.name }}</h4>
            <p class="document-time">{{ formatTime(document.accessTime) }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 创建知识库对话框 -->
    <CreateKnowledgeDialog
      v-model:visible="showCreateDialog"
      @success="handleCreateSuccess"
    />

    <!-- 编辑知识库对话框 -->
    <EditKnowledgeDialog
      v-model:visible="showEditDialog"
      :knowledge-data="editingKnowledge"
      @success="handleEditSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElButton, ElMessageBox, ElMessage } from 'element-plus'
import { Edit, Delete } from '@element-plus/icons-vue'

import { useKnowledgeStore } from '@/stores/knowledge'
import { useUserStore } from '@/stores/user'
import { useDocumentStore } from '@/stores/document'
import { storeToRefs } from 'pinia'
import CreateKnowledgeDialog from '@/components/knowledge/CreateKnowledgeDialog.vue'
import EditKnowledgeDialog from '@/components/knowledge/EditKnowledgeDialog.vue'

const router = useRouter()
const viewMode = ref<'list' | 'grid'>('grid')
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const editingKnowledge = ref<any>(null)
const knowledgeStore = useKnowledgeStore()
const userStore = useUserStore()
const documentStore = useDocumentStore()

const { knowledgeList } = storeToRefs(knowledgeStore)
const { recentDocuments } = storeToRefs(documentStore)

        // 创建知识库成功回调
const handleCreateSuccess = () => {
  // 刷新知识库列表
  const userId = userStore.userId
  if (userId) {
    knowledgeStore.fetchKnowledgeList(userId)
  }
}

// 编辑知识库成功回调
const handleEditSuccess = () => {
  // 刷新知识库列表
  const userId = userStore.userId
  if (userId) {
    knowledgeStore.fetchKnowledgeList(userId)
  }
}

const openKnowledge = (id: string | number) => {
  router.push(`/knowledge/${id}`)
}

const editKnowledge = (knowledge: any) => {
  editingKnowledge.value = knowledge
  showEditDialog.value = true
}

const deleteKnowledge = async (knowledge: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除知识库"${knowledge.name}"吗？删除后无法恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    await knowledgeStore.deleteKnowledge(knowledge.id.toString())
    
    ElMessage({
      message: `知识库"${knowledge.name}"已删除`,
      type: 'success',
    })
  } catch (error) {
    console.error('删除操作失败:', error)
    // 可以在这里加一个错误提示
  }
}

const openDocument = async (id: string) => {
  try {
    // 首先检查最近文档中是否包含知识库ID
    const recentDoc = recentDocuments.value.find(doc => doc.id === id)
    if (recentDoc?.knowledgeBaseId) {
      router.push(`/knowledge/${recentDoc.knowledgeBaseId}/document/${id}`)
      return
    }
    
    // 检查是否有嵌套的knowledgeBase对象
    if (recentDoc?.knowledgeBase?.id) {
      router.push(`/knowledge/${recentDoc.knowledgeBase.id}/document/${id}`)
      return
    }
    
    // 如果最近文档中没有知识库ID，尝试从store中获取
    const knowledgeBaseId = documentStore.getKnowledgeBaseIdByDocumentId(id)
    if (knowledgeBaseId) {
      router.push(`/knowledge/${knowledgeBaseId}/document/${id}`)
      return
    }
    
    // 如果都没有，则需要先获取文档详情来确定知识库ID
    ElMessage.info('正在获取文档信息...')
    
    try {
      const { document, knowledgeBaseId: fetchedKnowledgeBaseId } = await documentStore.fetchDocumentWithKnowledgeBase(id)
      
      if (fetchedKnowledgeBaseId) {
        router.push(`/knowledge/${fetchedKnowledgeBaseId}/document/${id}`)
      } else if (document?.knowledgeBase?.id) {
        // 检查文档中的嵌套knowledgeBase结构
        router.push(`/knowledge/${document.knowledgeBase.id}/document/${id}`)
      } else {
        ElMessage.error('无法确定文档所属的知识库')
        console.error('文档缺少知识库信息:', document)
      }
    } catch (fetchError) {
      console.error('获取文档详情失败:', fetchError)
      ElMessage.error('文档可能已被删除或您没有访问权限')
    }
  } catch (error) {
    console.error('打开文档失败:', error)
    ElMessage.error('打开文档失败，请稍后重试')
  }
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString()
}

const loadData = async () => {
  try {
    // 获取当前用户ID
    let userId = userStore.userId
    
    // 如果userId为空，尝试从localStorage获取
    if (!userId || userId === '' || userId === 'undefined') {
      const savedUserId = localStorage.getItem('userId')
      
      if (savedUserId && savedUserId !== 'undefined' && savedUserId !== '') {
        userId = savedUserId
      } else {
        return
      }
    }
    
    // 并行加载知识库列表和最近文档
    const promises = []
    
    if (userId && userId !== '' && userId !== 'undefined') {
      if (knowledgeList.value.length === 0) {
        promises.push(knowledgeStore.fetchKnowledgeList(userId))
      }
      
      if (recentDocuments.value.length === 0) {
        promises.push(documentStore.fetchRecentDocuments(userId))
      }
    }
    
    await Promise.all(promises)
    
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.home-container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: #303133;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &.btn-primary {
    background: #409eff;
    color: white;
    
    &:hover {
      background: #337ecc;
    }
  }
}

.knowledge-section {
  margin-bottom: 48px;
}

.knowledge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.knowledge-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #ebeef5;
  position: relative;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    
    .knowledge-actions {
      opacity: 1;
      visibility: visible;
    }
  }
}

.knowledge-cover {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 6px;
  margin-bottom: 12px;
}

.knowledge-name {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 4px 0;
  color: #303133;
}

.knowledge-stats {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.view-controls {
  display: flex;
  gap: 8px;
}

.view-btn {
  padding: 6px 12px;
  border: 1px solid #dcdfe6;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  
  &.active {
    background: #409eff;
    color: white;
    border-color: #409eff;
  }
  
  &:hover:not(.active) {
    border-color: #409eff;
    color: #409eff;
  }
}

.recent-documents {
  &.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }
  
  &.list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
}

.document-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #ebeef5;
  
  &:hover {
    background: #f5f7fa;
    border-color: #409eff;
  }
}

.document-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 6px;
  
  .file-icon {
    font-size: 20px;
  }
}

.document-title {
  font-size: 14px;
  font-weight: 500;
  margin: 0 0 4px 0;
  color: #303133;
}

.document-time {
  font-size: 12px;
  color: #909399;
  margin: 0;
}

.knowledge-actions {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  
  .action-btn {
    padding: 4px 8px;
    font-size: 12px;
  }
}

@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .knowledge-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
  
  .recent-documents.grid {
    grid-template-columns: 1fr;
  }
}
</style> 