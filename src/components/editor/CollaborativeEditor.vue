<!-- 协同编辑器组件 -->
<template>
  <div class="collaborative-editor-container">
    <!-- 协同状态栏 -->
    <div class="collaboration-status" v-if="enabled">
      <div class="connection-status">
        <el-icon v-if="connectionStatus === 'connected'" class="status-icon connected">
          <SuccessFilled />
        </el-icon>
        <el-icon v-else-if="connectionStatus === 'connecting'" class="status-icon connecting">
          <Loading />
        </el-icon>
        <el-icon v-else class="status-icon disconnected">
          <CircleCloseFilled />
        </el-icon>
        <span class="status-text">{{ getConnectionStatusText() }}</span>
      </div>
      
      <!-- 在线用户列表 -->
      <div v-if="onlineUsers.length > 0" class="online-users">
        <span class="users-label">在线用户 ({{ onlineUsers.length }}):</span>
        <div class="users-list">
          <el-tooltip
            v-for="user in onlineUsers"
            :key="user"
            :content="getUserDisplayName(user)"
            placement="bottom"
          >
            <div class="user-avatar" :style="{ backgroundColor: getUserColor(user) }">
              {{ getUserInitial(user) }}
            </div>
          </el-tooltip>
        </div>
      </div>
    </div>

    <!-- 编辑器内容区域 -->
    <div class="editor-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { SuccessFilled, Loading, CircleCloseFilled } from '@element-plus/icons-vue'
import * as Y from 'yjs'
import { getDocumentOnlineUsers } from '@/api/document'

interface Props {
  documentId: string
  userId: string
  username: string
  enabled?: boolean
}

interface Emits {
  (e: 'yjs-document-ready', ydoc: Y.Doc): void
  (e: 'connection-status-change', status: 'disconnected' | 'connecting' | 'connected'): void
  (e: 'online-users-change', users: string[]): void
}

const props = withDefaults(defineProps<Props>(), {
  enabled: false
})

const emit = defineEmits<Emits>()

// Yjs文档实例
let ydoc: Y.Doc | null = null

// 响应式状态
const connectionStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
const onlineUsers = ref<string[]>([])

// 在线用户轮询
let onlineUsersTimer: ReturnType<typeof setInterval> | null = null

// 用户颜色映射
const userColorMap = new Map<string, string>()

// 监听enabled状态变化
watch(() => props.enabled, (enabled) => {
  if (enabled && props.documentId) {
    initializeCollaboration()
  } else {
    disconnect()
  }
})

// 监听文档ID变化
watch(() => props.documentId, (newDocId, oldDocId) => {
  if (newDocId !== oldDocId) {
    disconnect()
    if (props.enabled && newDocId) {
      initializeCollaboration()
    }
  }
})

onMounted(() => {
  console.log('CollaborativeEditor已挂载，等待启用信号')
})

onUnmounted(() => {
  disconnect()
})

// 初始化协同编辑
const initializeCollaboration = async () => {
  try {
    connectionStatus.value = 'connecting'
    emit('connection-status-change', 'connecting')
    
    // 1. 创建新的Yjs文档
    ydoc = new Y.Doc()
    
    // 2. 开始监听在线用户
    startOnlineUsersPolling()
    
    // 3. 通知父组件Yjs文档已准备就绪（Editor组件会处理连接）
    emit('yjs-document-ready', ydoc)
    
    // 4. 模拟连接状态（实际状态由Editor组件的CustomProvider管理）
    setTimeout(() => {
      connectionStatus.value = 'connected'
      emit('connection-status-change', 'connected')
    }, 1000)
    
    console.log('协同编辑初始化完成')
  } catch (error) {
    console.error('协同编辑初始化失败:', error)
    connectionStatus.value = 'disconnected'
    emit('connection-status-change', 'disconnected')
    ElMessage.error('协同编辑连接失败，您仍可正常编辑文档')
  }
}

// 断开连接
const disconnect = () => {
  // 清理定时器
  if (onlineUsersTimer) {
    clearInterval(onlineUsersTimer)
    onlineUsersTimer = null
  }

  // 清理Yjs文档
  if (ydoc) {
    ydoc.destroy()
    ydoc = null
  }

  // 重置状态
  connectionStatus.value = 'disconnected'
  onlineUsers.value = []
  
  emit('connection-status-change', 'disconnected')
  emit('online-users-change', [])
}

// 开始轮询在线用户
const startOnlineUsersPolling = () => {
  if (onlineUsersTimer) {
    clearInterval(onlineUsersTimer)
  }
  
  // 立即获取一次
  updateOnlineUsers()
  
  // 每5秒轮询一次
  onlineUsersTimer = setInterval(() => {
    updateOnlineUsers()
  }, 5000)
}

// 更新在线用户列表
const updateOnlineUsers = async () => {
  try {
    const users = await getDocumentOnlineUsers(props.documentId)
    onlineUsers.value = users
    emit('online-users-change', users)
  } catch (error) {
    console.warn('获取在线用户失败:', error)
  }
}

// 获取连接状态文本
const getConnectionStatusText = () => {
  switch (connectionStatus.value) {
    case 'connected':
      return '已连接'
    case 'connecting':
      return '连接中...'
    case 'disconnected':
      return '未连接'
    default:
      return '未知状态'
  }
}

// 获取用户显示名称
const getUserDisplayName = (userId: string) => {
  return userId === props.userId ? `${props.username} (我)` : `用户 ${userId}`
}

// 获取用户首字母
const getUserInitial = (userId: string) => {
  if (userId === props.userId) {
    return props.username.charAt(0).toUpperCase()
  }
  return userId.charAt(0).toUpperCase()
}

// 生成用户颜色
const getUserColor = (userId: string) => {
  if (!userColorMap.has(userId)) {
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', 
      '#f0932b', '#eb4d4b', '#6c5ce7', '#fd79a8'
    ]
    const colorIndex = parseInt(userId) % colors.length
    userColorMap.set(userId, colors[colorIndex])
  }
  return userColorMap.get(userId)!
}

// 暴露方法给父组件
defineExpose({
  getYjsDocument: () => ydoc,
  connect: () => {
    if (props.enabled && props.documentId) {
      initializeCollaboration()
    }
  },
  updateConnectionStatus: (status: 'disconnected' | 'connecting' | 'connected') => {
    connectionStatus.value = status
    emit('connection-status-change', status)
  }
})
</script>

<style scoped lang="scss">
.collaborative-editor-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.collaboration-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  font-size: 12px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-icon {
  font-size: 14px;
  
  &.connected {
    color: #67c23a;
  }
  
  &.connecting {
    color: #e6a23c;
    animation: spin 1s linear infinite;
  }
  
  &.disconnected {
    color: #f56c6c;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.status-text {
  color: #606266;
  font-weight: 500;
}

.online-users {
  display: flex;
  align-items: center;
  gap: 8px;
}

.users-label {
  color: #606266;
  font-weight: 500;
}

.users-list {
  display: flex;
  gap: 4px;
}

.user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
  
  &:hover {
    transform: scale(1.1);
  }
}

.editor-content {
  flex: 1;
  overflow: hidden;
}
</style> 