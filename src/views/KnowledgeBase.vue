<!-- 知识库管理页面 -->
<template>
  <div class="knowledge-base-container">
    <!-- 知识库信息 -->
    <div class="knowledge-header" v-if="currentKnowledge">
      <div class="knowledge-info">
        <img :src="currentKnowledge.coverUrl" :alt="currentKnowledge.name" class="knowledge-cover" />
        <div class="knowledge-details">
          <h1 class="knowledge-title">{{ currentKnowledge.name }}</h1>
          <p class="knowledge-meta">知识库 • {{ documentList.length }} 个文档</p>
        </div>
      </div>
      <div class="knowledge-actions">
        <el-button type="primary" @click="showCreateDocDialog = true">
          <el-icon><Plus /></el-icon>
          新建文档
        </el-button>
      </div>
    </div>

    <!-- 文档列表 -->
    <div class="documents-section" v-if="!$route.params.documentId">
      <div class="section-header">
        <h2>文档列表</h2>
        <div class="actions">
          <el-button @click="showJoinDialog">
            <el-icon><Link /></el-icon>
            加入分享文档
          </el-button>
          <el-button @click="refreshDocuments" :loading="loading">
            <el-icon><Refresh /></el-icon>
            刷新列表
          </el-button>
        </div>
      </div>

      <!-- 提示信息 -->
      <el-alert
        v-if="documentList.length === 0 && !loading"
        title="暂无文档"
        type="info"
        :closable="false"
        style="margin-bottom: 20px;"
      >
        <template #default>
          <p>当前知识库中暂无文档。您可以：</p>
          <ul>
            <li>点击"新建文档"创建文档</li>
            <li>点击"加入分享文档"通过分享码加入其他人的文档</li>
          </ul>

          
        </template>
      </el-alert>

      <!-- 使用 DocumentList 组件 -->
      <DocumentList
        ref="documentListRef"
        :documents="documentList"
        :loading="loading"
        :knowledge-id="knowledgeId"
        @create-document="showCreateDocDialog = true"
        @edit-document="handleEditDocument"
        @delete-document="handleDeleteDocument"
        @refresh="refreshDocuments"
        @document-joined="handleDocumentJoined"
      />
    </div>

    <!-- 文档编辑器 (子路由) -->
    <router-view v-if="$route.params.documentId" />

    <!-- 创建文档对话框 -->
    <CreateDocumentDialog
      v-model:visible="showCreateDocDialog"
      :knowledge-base-id="knowledgeId"
      @success="handleCreateSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Plus, List, Grid, Document, MoreFilled, 
  Edit, Share, Delete, Link, Refresh 
} from '@element-plus/icons-vue'
import { useKnowledgeStore } from '@/stores/knowledge'
import { useDocumentStore } from '@/stores/document'
import CreateDocumentDialog from '@/components/document/CreateDocumentDialog.vue'
import { storeToRefs } from 'pinia'
import DocumentList from '@/components/knowledge/DocumentList.vue'

const route = useRoute()
const router = useRouter()
const knowledgeStore = useKnowledgeStore()
const documentStore = useDocumentStore()

// 状态
const viewMode = ref<'list' | 'grid'>('grid')
const showCreateDocDialog = ref(false)

// refs
const documentListRef = ref()

// 计算属性
const knowledgeId = computed(() => route.params.knowledgeId as string)
const currentKnowledge = computed(() => 
  knowledgeStore.getKnowledgeById(Number(knowledgeId.value))
)

// 从store获取文档列表
const { knowledgeDocuments: documentList, loading } = storeToRefs(documentStore)

// 方法
const openDocument = (documentId: string) => {
  router.push(`/knowledge/${knowledgeId.value}/document/${documentId}`)
}

const handleEditDocument = (document: any) => {
  openDocument(document.id)
}

const handleDeleteDocument = async (document: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除文档"${document.title}"吗？删除后无法恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    await documentStore.deleteExistingDocument(document.id, knowledgeId.value)
    
    // 如果是共享文档，也从本地存储中移除
    documentStore.removeSharedDocumentId(document.id)
    
    ElMessage.success(`文档"${document.title}"已删除`)
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除文档失败:', error)
      ElMessage.error('删除文档失败')
    }
  }
}

// 显示加入分享文档对话框
const showJoinDialog = () => {
  if (documentListRef.value) {
    documentListRef.value.showJoinDialog()
  }
}

// 刷新文档列表和成员信息
const refreshDocuments = async () => {
  await loadDocumentList()
  // 刷新DocumentList组件的成员信息
  if (documentListRef.value) {
    documentListRef.value.refreshDocumentMembers()
  }
}

const editDocument = (document: any) => {
  openDocument(document.id)
}

const shareDocument = (document: any) => {
  // TODO: 实现文档分享功能
  ElMessage.info('分享功能开发中...')
}

const deleteDocument = async (document: any) => {
  await handleDeleteDocument(document)
}

const handleCreateSuccess = (documentId: string) => {
  // 文档创建成功，可以选择跳转到编辑页面
  ElMessage.success('文档创建成功')
  
  // 可选：直接跳转到新创建的文档编辑页面
  // router.push(`/knowledge/${knowledgeId.value}/${documentId}`)
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString()
}

// 监听路由参数变化
watch(() => route.params.knowledgeId, (newKnowledgeId, oldKnowledgeId) => {
  if (newKnowledgeId && newKnowledgeId !== oldKnowledgeId) {
    if (newKnowledgeId.startsWith(':')) {
      ElMessage.error('路由参数错误：检测到占位符')
      return
    }
    
    loadDocumentList()
  }
}, { immediate: false })

// 提取文档列表加载逻辑
const loadDocumentList = async () => {
  if (!knowledgeId.value) {
    ElMessage.error('知识库ID缺失')
    return
  }
  
  if (knowledgeId.value.startsWith(':')) {
    ElMessage.error('知识库ID参数错误')
    return
  }
  
  try {
    await documentStore.fetchKnowledgeDocuments(knowledgeId.value)
  } catch (error) {
    console.error('获取文档列表失败:', error)
    ElMessage.error('获取文档列表失败')
  }
}

// 处理新加入的文档
const handleDocumentJoined = (document: any) => {
  // 将新文档添加到当前列表的开头
  documentList.value.unshift(document)
  ElMessage.success({
    message: `文档"${document.title}"已成功添加，刷新页面后仍会保留`,
    duration: 4000
  })
  
  // 同时刷新成员信息
  if (documentListRef.value) {
    documentListRef.value.refreshDocumentMembers()
  }
}

// 生命周期
onMounted(async () => {
  // 如果当前知识库信息不存在，尝试获取
  if (!currentKnowledge.value && knowledgeId.value) {
    // TODO: 获取知识库详情
  }

  // 获取知识库下的文档列表
  await loadDocumentList()
})
</script>

<style scoped>
.knowledge-base-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.knowledge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.knowledge-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.knowledge-cover {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
}

.knowledge-title {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.knowledge-meta {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.documents-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 768px) {
  .knowledge-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}
</style> 