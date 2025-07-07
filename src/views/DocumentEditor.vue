<!-- 文档编辑器页面 -->
<template>
  <div class="document-editor-page">
    <!-- 顶部工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <el-button link @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h2 class="document-title" v-if="currentDocument">{{ currentDocument.title }}</h2>
        <!-- 添加文档状态信息 -->
        <span class="document-status">
          <el-tag v-if="saving" type="warning">保存中...</el-tag>
          <el-tag v-else-if="hasUnsavedChanges" type="danger">未保存</el-tag>
          <el-tag v-else type="success">已保存</el-tag>
        </span>
        <span v-if="lastSaveTime && !hasUnsavedChanges" class="last-save-time">
          最后保存: {{ formatSaveTime(lastSaveTime) }}
        </span>
      </div>
      <div class="toolbar-right">
        <!-- 手动保存按钮 -->
        <el-button 
          v-if="hasUnsavedChanges && currentDocument" 
          :loading="saving" 
          type="primary" 
          size="small"
          @click="manualSave"
        >
          {{ saving ? '保存中...' : '保存 (Ctrl+S)' }}
        </el-button>
        
        <!-- 版本管理按钮 -->
        <el-button 
          v-if="currentDocument"
          size="small"
          @click="showCreateVersionDialog = true"
        >
          <el-icon><DocumentAdd /></el-icon>
          创建版本
        </el-button>
        <el-button 
          v-if="currentDocument"
          size="small"
          @click="showVersionHistory = true"
        >
          <el-icon><Clock /></el-icon>
          版本历史
        </el-button>
        <el-button 
          v-if="currentDocument"
          size="small"
          type="success"
          @click="showVersionCompare = true"
        >
          <el-icon><Histogram /></el-icon>
          版本对比
        </el-button>
        <span class="version-info" v-if="currentDocument">
          v{{ currentDocument.currentVersion }}
        </span>
        
        <!-- 协同编辑按钮 -->
        <el-button 
          size="small"
          @click="showMemberDialog = true"
        >
          <el-icon><User /></el-icon>
          成员管理
        </el-button>
        <el-button 
          size="small"
          :type="collaborationEnabled ? 'warning' : 'primary'"
          :loading="collaborationConnecting"
          @click="toggleCollaboration"
        >
          <el-icon><Connection /></el-icon>
          {{ collaborationEnabled ? '关闭协同' : '开启协同' }}
        </el-button>

        <!-- 同步延迟设置 -->
        <el-dropdown 
          v-if="collaborationEnabled" 
          @command="handleSyncDelayChange"
          trigger="click"
        >
          <el-button size="small" type="info" plain>
            <el-icon><Clock /></el-icon>
            延迟: {{ syncDelayText }}
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="0">立即同步</el-dropdown-item>
              <el-dropdown-item command="500">500ms</el-dropdown-item>
              <el-dropdown-item command="800" :class="{ 'is-active': syncDelay === 800 }">800ms (推荐)</el-dropdown-item>
              <el-dropdown-item command="1000">1000ms</el-dropdown-item>
              <el-dropdown-item command="2000">2000ms</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        
        <!-- 输入状态指示器 -->
        <el-tag 
          v-if="collaborationEnabled"
          :type="isUserTyping ? 'warning' : 'success'" 
          size="small"
          style="margin-left: 8px;"
        >
          {{ isUserTyping ? '🎹 输入中' : '⏸️ 空闲' }}
        </el-tag>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 编辑器区域 -->
      <div class="editor-section">
        <!-- 协同编辑器包装器 -->
        <CollaborativeEditor
          v-if="currentUserId && currentUsername"
          ref="collaborativeEditorRef"
          :document-id="documentId"
          :user-id="currentUserId"
          :username="currentUsername"
          :enabled="collaborationEnabled"
          @yjs-document-ready="handleYjsDocumentReady"
          @connection-status-change="handleConnectionStatusChange"
          @online-users-change="handleOnlineUsersChange"
        >
          <!-- 主编辑器 -->
          <Editor 
            ref="editorRef"
            :yjs-document="yjsDocument"
            :collaboration-enabled="collaborationEnabled"
            :sync-delay="syncDelay"
            @content-change="handleLocalContentChange"
            @collaboration-status-change="handleCollaborationStatusChange"
            @saving-change="handleSavingChange"
            @unsaved-changes="handleUnsavedChanges"
            @save-time-update="handleSaveTimeUpdate"
            @typing-status-change="handleTypingStatusChange"
          />
        </CollaborativeEditor>

        <!-- 加载状态 -->
        <div v-else class="loading-container">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>正在加载编辑器...</span>
        </div>
      </div>

      <!-- 评论系统区域 -->
      <div class="comments-section" v-if="showComments">
        <CommentSystem
          v-if="currentUserId && documentId"
          :document-id="documentId"
          :current-user-id="currentUserId"
        />
      </div>
    </div>

    <!-- 成员管理对话框 -->
    <DocumentPermissions
      v-model:visible="showMemberDialog"
      :document-id="documentId"
    />

    <!-- 创建版本对话框 -->
    <el-dialog
      v-model="showCreateVersionDialog"
      title="创建版本节点"
      width="500px"
    >
      <el-form
        ref="versionFormRef"
        :model="versionForm"
        :rules="versionRules"
        label-width="100px"
      >
        <el-form-item label="版本名称" prop="versionName">
          <el-input
            v-model="versionForm.versionName"
            placeholder="请输入版本名称，如：v1.0 - 功能完成"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="版本描述" prop="description">
          <el-input
            v-model="versionForm.description"
            type="textarea"
            :rows="4"
            placeholder="请输入版本描述（可选）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showCreateVersionDialog = false">取消</el-button>
          <el-button
            type="primary"
            :loading="creatingVersion"
            @click="handleCreateVersionClick"
          >
            创建
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 版本历史组件 -->
    <VersionHistory
      v-model:visible="showVersionHistory"
      :document-id="documentId"
      :current-version="currentDocument?.currentVersion"
      @version-restored="handleVersionRestored"
    />

    <!-- 版本对比组件 -->
    <VersionCompare
      v-model:visible="showVersionCompare"
      :document-id="documentId"
      :versions="documentVersions"
    />

    <!-- 评论按钮 -->
    <el-button 
      class="comments-toggle-btn"
      :type="showComments ? 'primary' : 'info'"
      @click="showComments = !showComments"
    >
      {{ showComments ? '隐藏评论' : '显示评论' }}
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { 
  ArrowLeft, 
  User, 
  Connection,
  Loading,
  DocumentAdd,
  Clock,
  Histogram,
  ArrowDown
} from '@element-plus/icons-vue'
import * as Y from 'yjs'
import Editor from '@/components/editor/Editor.vue'
import CollaborativeEditor from '@/components/editor/CollaborativeEditor.vue'
import DocumentPermissions from '@/components/editor/DocumentPermissions.vue'
import CommentSystem from '@/components/editor/CommentSystem.vue'
import VersionHistory from '@/components/editor/VersionHistory.vue'
import VersionCompare from '@/components/editor/VersionCompare.vue'
import { useDocumentStore } from '@/stores/document'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { getDocumentVersions } from '@/api/document'

const route = useRoute()
const router = useRouter()
const documentStore = useDocumentStore()
const userStore = useUserStore()

// 从store获取状态
const { currentDocument } = storeToRefs(documentStore)
const { user: userInfo } = storeToRefs(userStore)

// refs
const editorRef = ref()
const collaborativeEditorRef = ref()
const versionFormRef = ref<FormInstance>()

// 状态
const showMemberDialog = ref(false)
const showComments = ref(false) // 评论系统显示状态
const collaborationEnabled = ref(false) // 默认关闭协同编辑
const collaborationConnecting = ref(false)
const yjsDocument = ref<Y.Doc | null>(null)
const onlineUsers = ref<string[]>([])
const syncDelay = ref(800) // 同步延迟时间（毫秒）
const isUserTyping = ref(false) // 用户输入状态

// 版本管理相关状态
const showCreateVersionDialog = ref(false)
const showVersionHistory = ref(false)
const showVersionCompare = ref(false)
const saving = ref(false)
const hasUnsavedChanges = ref(false)
const lastSaveTime = ref<Date | null>(null)
const creatingVersion = ref(false)
const documentVersions = ref<any[]>([])

// 版本表单
const versionForm = ref({
  versionName: '',
  description: ''
})

const versionRules = {
  versionName: [
    { required: true, message: '请输入版本名称', trigger: 'blur' },
    { min: 1, max: 100, message: '版本名称长度为 1-100 个字符', trigger: 'blur' }
  ]
}

// 计算属性
const documentId = computed(() => route.params.documentId as string)
const currentUserId = computed(() => {
  // 添加安全检查
  if (userInfo.value && userInfo.value.id) {
    return userInfo.value.id.toString()
  }
  return localStorage.getItem('userId') || ''
})
const currentUsername = computed(() => {
  // 添加安全检查
  if (userInfo.value && userInfo.value.username) {
    return userInfo.value.username
  }
  return localStorage.getItem('username') || '未知用户'
})

// 同步延迟显示文本
const syncDelayText = computed(() => {
  if (syncDelay.value === 0) return '立即'
  return `${syncDelay.value}ms`
})

// 页面初始化
onMounted(async () => {
  // 确保用户状态被正确恢复
  if (!userStore.user && localStorage.getItem('token')) {
    userStore.restoreUserState()
  }

  // 恢复用户的同步延迟偏好
  const savedDelay = localStorage.getItem('collaboration-sync-delay')
  if (savedDelay) {
    syncDelay.value = parseInt(savedDelay)
  }

  // 加载文档数据
  if (documentId.value) {
    try {
      await documentStore.loadDocument(documentId.value)
    } catch (error) {
      console.error('加载文档失败:', error)
      ElMessage.error('加载文档失败')
      goBack()
    }
  }

  // 监听页面关闭，发送用户离开消息
  window.addEventListener('beforeunload', handlePageUnload)
  
  // 监听快捷键
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handlePageUnload)
  document.removeEventListener('keydown', handleGlobalKeydown)
  
  // 如果协同编辑已启用，断开连接
  if (collaborationEnabled.value && collaborativeEditorRef.value) {
    collaborativeEditorRef.value.disconnect()
  }
})

// 返回上一页
const goBack = () => {
  router.back()
}

// 处理页面卸载
const handlePageUnload = () => {
  // 断开协同编辑连接
  if (collaborativeEditorRef.value) {
    collaborativeEditorRef.value.disconnect()
  }
}

// 快捷键处理
const handleGlobalKeydown = (event: KeyboardEvent) => {
  // Ctrl+S 保存
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    manualSave()
  }
}

// 切换协同编辑
const toggleCollaboration = async () => {
  if (!collaborationEnabled.value) {
    // 开启协同编辑
    collaborationConnecting.value = true
    collaborationEnabled.value = true
    
    ElMessage.info('正在连接协同编辑服务...')
  } else {
    // 关闭协同编辑
    collaborationEnabled.value = false
    collaborationConnecting.value = false
    
    if (collaborativeEditorRef.value) {
      collaborativeEditorRef.value.disconnect()
    }
    
    ElMessage.info('协同编辑已关闭')
  }
}

// 处理Yjs文档就绪
const handleYjsDocumentReady = (ydoc: Y.Doc) => {
  console.log('Yjs文档已准备就绪')
  yjsDocument.value = ydoc
  ElMessage.success('协同编辑已启用')
}

// 处理连接状态变化
const handleConnectionStatusChange = (status: 'disconnected' | 'connecting' | 'connected') => {
  collaborationConnecting.value = status === 'connecting'
  
  if (status === 'connected') {
    ElMessage.success('协同编辑连接成功')
  } else if (status === 'disconnected' && collaborationEnabled.value) {
    ElMessage.warning('协同编辑连接断开')
  }
}

// 处理在线用户变化
const handleOnlineUsersChange = (users: string[]) => {
  onlineUsers.value = users
  console.log('在线用户更新:', users)
}

// 处理本地内容变更（用户编辑）
const handleLocalContentChange = (content: any) => {
  // 更新本地文档状态
  documentStore.updateLocalContent(content)
  
  // 如果启用了协同编辑，Yjs会自动处理同步
  console.log('本地内容已更新')
}

// 处理同步延迟变更
const handleSyncDelayChange = (delay: string) => {
  const newDelay = parseInt(delay)
  syncDelay.value = newDelay
  
  // 保存用户偏好到localStorage
  localStorage.setItem('collaboration-sync-delay', delay)
  
  const delayText = newDelay === 0 ? '立即同步' : `${newDelay}ms延迟`
  ElMessage.success(`同步延迟已设置为: ${delayText}`)
  
  console.log('协同编辑同步延迟已更改:', newDelay)
}

// 处理协同编辑状态变化（从Editor组件传来）
const handleCollaborationStatusChange = (status: 'connected' | 'disconnected' | 'connecting') => {
  if (collaborativeEditorRef.value) {
    collaborativeEditorRef.value.updateConnectionStatus(status)
  }
  
  if (status === 'connected') {
    collaborationConnecting.value = false
  } else if (status === 'connecting') {
    collaborationConnecting.value = true
  } else if (status === 'disconnected') {
    collaborationConnecting.value = false
  }
}

// 处理保存状态变化
const handleSavingChange = (isSaving: boolean) => {
  saving.value = isSaving
}

// 处理未保存状态变化
const handleUnsavedChanges = (hasChanges: boolean) => {
  hasUnsavedChanges.value = hasChanges
}

// 处理保存时间更新
const handleSaveTimeUpdate = (time: Date) => {
  lastSaveTime.value = time
}

// 处理输入状态变化
const handleTypingStatusChange = (typing: boolean) => {
  isUserTyping.value = typing
}

// 格式化保存时间
const formatSaveTime = (time: Date) => {
  const now = new Date()
  const diff = Math.floor((now.getTime() - time.getTime()) / 1000) // 秒差
  
  if (diff < 60) {
    return '刚刚'
  } else if (diff < 3600) {
    return `${Math.floor(diff / 60)}分钟前`
  } else if (diff < 86400) {
    return `${Math.floor(diff / 3600)}小时前`
  } else {
    return time.toLocaleDateString() + ' ' + time.toLocaleTimeString().slice(0, 5)
  }
}

// 手动保存
const manualSave = async () => {
  if (editorRef.value && editorRef.value.manualSave) {
    await editorRef.value.manualSave()
  } else {
    ElMessage.warning('编辑器未准备就绪')
  }
}

// 创建版本处理
const handleCreateVersionClick = async () => {
  try {
    await versionFormRef.value?.validate()
    
    creatingVersion.value = true
    
    await documentStore.createNewDocumentVersion(documentId.value, versionForm.value)
    
    ElMessage.success('版本创建成功')
    showCreateVersionDialog.value = false
    resetVersionForm()
    
  } catch (error) {
    console.error('创建版本失败:', error)
    if (error instanceof Error) {
      ElMessage.error('创建版本失败: ' + error.message)
    } else {
      ElMessage.error('创建版本失败，请重试')
    }
  } finally {
    creatingVersion.value = false
  }
}

// 重置版本表单
const resetVersionForm = () => {
  versionFormRef.value?.resetFields()
  versionForm.value = {
    versionName: '',
    description: ''
  }
}

// 版本历史处理
const handleVersionRestored = async () => {
  // 版本恢复后重新加载文档内容
  try {
    await documentStore.loadDocument(documentId.value)
    ElMessage.success('文档已恢复')
    showVersionHistory.value = false
    
    // 立即刷新页面
    window.location.reload()
    
  } catch (error) {
    console.error('重新加载文档失败:', error)
    ElMessage.error('重新加载文档失败')
  }
}

// 加载文档版本列表
const loadDocumentVersions = async () => {
  if (!documentId.value) return
  
  try {
    documentVersions.value = await getDocumentVersions(documentId.value)
  } catch (error) {
    console.error('加载版本列表失败:', error)
    ElMessage.error('加载版本列表失败')
  }
}

// 监听版本对比对话框显示状态
watch(showVersionCompare, (visible) => {
  if (visible) {
    loadDocumentVersions()
  }
})
</script>

<style scoped lang="scss">
.document-editor-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  position: relative;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  border-bottom: 1px solid #e4e7ed;
  background: #fff;
  z-index: 100;
  flex-shrink: 0;

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .document-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #303133;
    }

    .document-status {
      font-size: 12px;
    }

    .last-save-time {
      font-size: 12px;
      color: #909399;
    }
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .version-info {
      font-size: 12px;
      color: #909399;
      padding: 4px 8px;
      background: #f5f7fa;
      border-radius: 4px;
      margin-left: 8px;
    }
  }
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.comments-section {
  width: 400px;
  border-left: 1px solid #e4e7ed;
  background: #fafbfc;
  overflow-y: auto;
}

.comments-toggle-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  border-radius: 50px;
  padding: 12px 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.loading-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 16px;
  color: #606266;
  font-size: 14px;

  .el-icon {
    font-size: 32px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .editor-toolbar {
    flex-direction: column;
    gap: 12px;
    padding: 8px 12px;
    
    .toolbar-left,
    .toolbar-right {
      width: 100%;
      justify-content: space-between;
    }
    
    .toolbar-right {
      flex-wrap: wrap;
      gap: 4px;
    }
  }
  
  .comments-section {
    width: 100%;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    background: #fff;
  }
}
</style> 