<!-- 文档列表组件 -->
<template>
  <div class="document-list-container">
    <div class="header">
      <h3>文档列表</h3>
      <el-button type="primary" @click="$emit('create-document')">
        <el-icon><Plus /></el-icon>
        新建文档
      </el-button>
    </div>

    <!-- 文档网格 -->
    <div v-if="documents.length > 0" class="document-grid">
      <div
        v-for="document in documents"
        :key="document.id"
        class="document-card"
        @click="openDocument(document)"
      >
        <div class="document-content">
          <div class="document-header">
            <h4 class="document-title">{{ document.title }}</h4>
            <div class="document-actions">
              <!-- 共享文档标识 -->
              <el-tag v-if="isSharedDocument(document)" type="success" size="small" class="share-tag">
                <el-icon><Share /></el-icon>
                共享
              </el-tag>
              <el-dropdown trigger="click" @click.stop>
                <el-button link class="action-btn" @click.stop>
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click.stop="openShareDialog(document)">
                      <el-icon><Share /></el-icon>
                      分享文档
                    </el-dropdown-item>
                    <el-dropdown-item @click.stop="viewShareCodes(document)">
                      <el-icon><Link /></el-icon>
                      查看分享码
                    </el-dropdown-item>
                    <el-dropdown-item @click.stop="editDocument(document)">
                      <el-icon><Edit /></el-icon>
                      编辑
                    </el-dropdown-item>
                    <el-dropdown-item @click.stop="deleteDocument(document)" divided>
                      <el-icon><Delete /></el-icon>
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
          <p class="document-description">{{ '暂无描述' }}</p>
          <div class="document-footer">
            <span class="version">v{{ document.currentVersion }}</span>
            <span class="update-time">{{ formatTime(document.updatedAt) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <el-empty description="暂无文档">
        <el-button type="primary" @click="$emit('create-document')">
          创建第一个文档
        </el-button>
      </el-empty>
    </div>

    <!-- 分享文档对话框 -->
    <el-dialog
      v-model="shareDialogVisible"
      title="分享文档"
      width="500px"
    >
      <el-form :model="shareForm" label-width="100px">
        <el-form-item label="权限类型">
          <el-radio-group v-model="shareForm.permission">
            <el-radio label="read">只读</el-radio>
            <el-radio label="write">编辑</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="过期时间">
          <el-date-picker
            v-model="shareForm.expiresAt"
            type="datetime"
            placeholder="选择过期时间（可选）"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="最大人数">
          <el-input-number
            v-model="shareForm.maxUsers"
            :min="1"
            :max="100"
            placeholder="最大使用人数（可选）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="shareDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :loading="creatingShare"
            @click="createShare"
          >
            生成分享码
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 分享码列表对话框 -->
    <el-dialog
      v-model="shareListDialogVisible"
      title="分享码管理"
      width="700px"
    >
      <el-table :data="shareCodes" style="width: 100%">
        <el-table-column prop="shareCode" label="分享码" width="120">
          <template #default="{ row }">
            <el-text class="share-code-text" @click="copyShareCode(row.shareCode)">
              {{ row.shareCode }}
              <el-icon><CopyDocument /></el-icon>
            </el-text>
          </template>
        </el-table-column>
        <el-table-column prop="permission" label="权限" width="80">
          <template #default="{ row }">
            <el-tag :type="row.permission === 'write' ? 'success' : 'info'">
              {{ row.permission === 'write' ? '编辑' : '只读' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="usedCount" label="使用次数" width="100">
          <template #default="{ row }">
            {{ row.usedCount }}/{{ row.maxUsers || '无限制' }}
          </template>
        </el-table-column>
        <el-table-column prop="expiresAt" label="过期时间" width="160">
          <template #default="{ row }">
            {{ row.expiresAt ? formatTime(row.expiresAt) : '永不过期' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button
              v-if="row.isActive"
              type="danger"
              size="small"
              @click="disableShare(row)"
            >
              禁用
            </el-button>
            <el-tag v-else type="danger" size="small">已禁用</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="shareListDialogVisible = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 加入分享文档对话框 -->
    <el-dialog
      v-model="joinDialogVisible"
      title="通过分享码加入文档"
      width="400px"
    >
      <el-form>
        <el-form-item label="分享码">
          <el-input
            v-model="joinShareCode"
            placeholder="请输入6位分享码"
            maxlength="6"
            show-word-limit
          />
          <div class="form-hint">
            <small>输入分享码后，您将获得相应的文档访问权限</small>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="joinDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :loading="joiningDocument"
            @click="joinDocument"
          >
            加入文档
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  MoreFilled,
  Share,
  Link,
  Edit,
  Delete,
  CopyDocument
} from '@element-plus/icons-vue'
import {
  createShareCode,
  getDocumentShares,
  disableShareCode,
  joinDocumentByShareCode,
  getDocumentMembers,
  getDocument
} from '@/api/document'
import { useUserStore } from '@/stores/user'
import { useDocumentStore } from '@/stores/document'
import type { GetDocumentResponse, ShareCode, CreateShareCodeRequest } from '@/types/index'

interface Props {
  documents: GetDocumentResponse[]
  loading?: boolean
  knowledgeId?: string
}

interface Emits {
  (e: 'create-document'): void
  (e: 'edit-document', document: GetDocumentResponse): void
  (e: 'delete-document', document: GetDocumentResponse): void
  (e: 'refresh'): void
  (e: 'document-joined', document: GetDocumentResponse): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()
const userStore = useUserStore()
const documentStore = useDocumentStore()

// 分享相关状态
const shareDialogVisible = ref(false)
const shareListDialogVisible = ref(false)
const joinDialogVisible = ref(false)
const currentDocument = ref<GetDocumentResponse | null>(null)
const shareCodes = ref<ShareCode[]>([])
const creatingShare = ref(false)
const joiningDocument = ref(false)
const joinShareCode = ref('')

// 文档成员信息缓存
const documentMembers = ref<Map<string, any[]>>(new Map())

// 分享表单
const shareForm = ref<CreateShareCodeRequest>({
  permission: 'read',
  expiresAt: undefined,
  maxUsers: undefined
})

// 格式化时间
const formatTime = (timeStr: string) => {
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN')
}

// 打开文档
const openDocument = (document: GetDocumentResponse) => {
  // 使用新的 knowledgeBaseId 字段
  let knowledgeBaseId = props.knowledgeId || document.knowledgeBaseId?.toString()
  
  if (!knowledgeBaseId) {
    ElMessage.error('无法获取知识库ID')
    return
  }
  
  router.push(`/knowledge/${knowledgeBaseId}/document/${document.id}`)
}

// 编辑文档
const editDocument = (document: GetDocumentResponse) => {
  emit('edit-document', document)
}

// 删除文档
const deleteDocument = (document: GetDocumentResponse) => {
  emit('delete-document', document)
}

// 打开分享对话框
const openShareDialog = (document: GetDocumentResponse) => {
  currentDocument.value = document
  shareForm.value = {
    permission: 'read',
    expiresAt: undefined,
    maxUsers: undefined
  }
  shareDialogVisible.value = true
}

// 创建分享码
const createShare = async () => {
  if (!currentDocument.value) return

  try {
    creatingShare.value = true
    const result = await createShareCode(currentDocument.value.id, shareForm.value)
    
    ElMessage.success('分享码创建成功')
    shareDialogVisible.value = false
    
    // 显示分享码
    ElMessageBox.alert(
      `分享码：${result.shareCode}\n点击复制按钮可复制分享码`,
      '分享码创建成功',
      {
        confirmButtonText: '复制分享码',
        callback: () => {
          copyShareCode(result.shareCode)
        }
      }
    )
  } catch (error) {
    console.error('创建分享码失败:', error)
    ElMessage.error('创建分享码失败')
  } finally {
    creatingShare.value = false
  }
}

// 查看分享码列表
const viewShareCodes = async (document: GetDocumentResponse) => {
  currentDocument.value = document
  try {
    shareCodes.value = await getDocumentShares(document.id)
    shareListDialogVisible.value = true
  } catch (error) {
    console.error('获取分享码列表失败:', error)
    ElMessage.error('获取分享码列表失败')
  }
}

// 禁用分享码
const disableShare = async (shareCode: ShareCode) => {
  try {
    await ElMessageBox.confirm(
      '确定要禁用这个分享码吗？禁用后将无法通过此分享码加入文档。',
      '禁用分享码',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await disableShareCode(shareCode.id)
    ElMessage.success('分享码已禁用')
    
    // 刷新分享码列表
    if (currentDocument.value) {
      shareCodes.value = await getDocumentShares(currentDocument.value.id)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('禁用分享码失败:', error)
      ElMessage.error('禁用分享码失败')
    }
  }
}

// 复制分享码
const copyShareCode = async (shareCode: string) => {
  try {
    await navigator.clipboard.writeText(shareCode)
    ElMessage.success('分享码已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败，请手动复制')
  }
}

// 加入文档
const joinDocument = async () => {
  if (!joinShareCode.value.trim()) {
    ElMessage.warning('请输入分享码')
    return
  }

  try {
    joiningDocument.value = true
    const result = await joinDocumentByShareCode(joinShareCode.value.trim())
    
    if (result.success && result.documentId) {
      const permissionText = result.permission === 'read' ? '只读' : 
                            result.permission === 'write' ? '编辑' : 
                            result.permission === 'admin' ? '管理员' : '未知'
      
      ElMessage.success(`成功加入文档: ${result.documentTitle}，获得${permissionText}权限`)
      joinDialogVisible.value = false
      joinShareCode.value = ''
      
      // 保存共享文档ID到本地存储
      documentStore.addSharedDocumentId(result.documentId)
      
      // 尝试获取完整的文档信息并添加到当前列表
      try {
        const documentDetail = await getDocument(result.documentId)
        // 通知父组件有新文档加入
        emit('document-joined', documentDetail)
      } catch (error) {
        console.error('获取文档详情失败:', error)
        // 即使获取详情失败，也刷新列表
        emit('refresh')
      }
      
      // 延迟刷新成员信息
      setTimeout(() => {
        refreshDocumentMembers()
      }, 1000)
    } else {
      // 显示后端返回的具体错误信息
      ElMessage.error(result.message || '加入文档失败')
    }
  } catch (error: any) {
    console.error('加入文档失败:', error)
    
    // 处理HTTP错误状态码
    if (error.response) {
      const status = error.response.status
      const data = error.response.data
      
      if (status === 400) {
        ElMessage.error(data.message || '请求参数错误')
      } else if (status === 401) {
        ElMessage.error('请先登录')
      } else if (status === 403) {
        ElMessage.error('没有权限执行此操作')
      } else if (status === 404) {
        ElMessage.error('分享码对应的资源不存在')
      } else {
        ElMessage.error(data.message || '服务器错误，请稍后重试')
      }
    } else {
      ElMessage.error('网络错误，请检查网络连接')
    }
  } finally {
    joiningDocument.value = false
  }
}

// 获取文档成员信息
const getDocumentMemberInfo = async (documentId: string) => {
  try {
    if (!documentMembers.value.has(documentId)) {
      const members = await getDocumentMembers(documentId)
      documentMembers.value.set(documentId, members)
    }
    return documentMembers.value.get(documentId) || []
  } catch (error) {
    console.error('获取文档成员信息失败:', error)
    return []
  }
}

// 判断文档是否为共享文档
const isSharedDocument = (document: GetDocumentResponse) => {
  // 首先检查是否在本地共享文档列表中
  const sharedDocumentIds = documentStore.getSharedDocumentIds()
  if (sharedDocumentIds.includes(document.id)) {
    return true
  }

  // 如果本地没有记录，则通过成员信息判断
  const currentUserId = userStore.userInfo?.id?.toString()
  if (!currentUserId) return false
  
  const members = documentMembers.value.get(document.id) || []
  const currentUserMember = members.find(member => member.userId === currentUserId)
  
  // 如果用户是通过分享方式加入的，则标识为共享文档
  return currentUserMember?.joinMethod === 'share'
}

// 暴露加入文档对话框方法
const showJoinDialog = () => {
  joinDialogVisible.value = true
}

// 预加载所有文档的成员信息
const loadDocumentMembers = async () => {
  for (const document of props.documents) {
    await getDocumentMemberInfo(document.id)
  }
}

// 监听文档列表变化，重新加载成员信息
const refreshDocumentMembers = async () => {
  documentMembers.value.clear()
  await loadDocumentMembers()
}

// 组件挂载时加载成员信息
onMounted(() => {
  loadDocumentMembers()
})

// 监听文档列表变化
computed(() => {
  // 当文档列表发生变化时，重新加载成员信息
  if (props.documents.length > 0) {
    loadDocumentMembers()
  }
  return props.documents
})

defineExpose({
  showJoinDialog,
  refreshDocumentMembers
})
</script>

<style scoped lang="scss">
.document-list-container {
  padding: 20px;

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h3 {
      margin: 0;
      color: #303133;
    }
  }

  .document-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }

  .document-card {
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s;
    background: white;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      border-color: #409eff;
    }

    .document-content {
      .document-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;

        .document-title {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #303133;
          flex: 1;
          margin-right: 8px;
          line-height: 1.4;
        }

        .document-actions {
          display: flex;
          align-items: center;
          gap: 8px;

          .share-tag {
            .el-icon {
              margin-right: 2px;
            }
          }

          .action-btn {
            padding: 4px;
            font-size: 16px;
            color: #909399;

            &:hover {
              color: #409eff;
            }
          }
        }
      }

      .document-description {
        margin: 0 0 12px 0;
        color: #606266;
        font-size: 14px;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .document-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: #909399;

        .version {
          background: #f0f9ff;
          color: #0ea5e9;
          padding: 2px 6px;
          border-radius: 4px;
        }
      }
    }
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
  }

  .share-code-text {
    cursor: pointer;
    color: #409eff;
    font-family: monospace;
    display: flex;
    align-items: center;
    gap: 4px;

    &:hover {
      text-decoration: underline;
    }
  }

  .form-hint {
    margin-top: 4px;
    color: #909399;
    font-size: 12px;
  }
}
</style> 