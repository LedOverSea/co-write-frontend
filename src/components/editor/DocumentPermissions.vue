<!-- 文档权限管理组件 -->
<template>
  <div class="document-permissions">
    <el-dialog
      v-model="visible"
      title="文档成员管理"
      width="700px"
      @close="handleClose"
    >
      <!-- 成员列表 -->
      <div class="permissions-section">
        <div class="section-header">
          <h3>当前成员列表</h3>
          <el-button type="primary" @click="showAddMemberDialog = true">
            <el-icon><Plus /></el-icon>
            添加成员
          </el-button>
        </div>

        <el-table v-loading="loading" :data="members" style="width: 100%">
          <el-table-column prop="username" label="用户名" width="150" />
          <el-table-column prop="permission" label="权限类型" width="120">
            <template #default="{ row }">
              <el-tag :type="getPermissionTagType(row.permission)">
                {{ getPermissionText(row.permission) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="joinMethod" label="加入方式" width="100">
            <template #default="{ row }">
              <el-tag :type="row.joinMethod === 'invite' ? 'success' : 'info'" size="small">
                {{ row.joinMethod === 'invite' ? '邀请' : '分享码' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="joinedAt" label="加入时间" width="180">
            <template #default="{ row }">
              {{ formatTime(row.joinedAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="{ row }">
              <el-button
                v-if="canModifyPermission(row)"
                type="primary"
                size="small"
                @click="openPermissionDialog(row)"
              >
                修改权限
              </el-button>
              <el-button
                v-if="canRemoveMember(row)"
                type="danger"
                size="small"
                @click="removeMember(row)"
              >
                移除
              </el-button>
              <span v-if="!canModifyPermission(row) && !canRemoveMember(row)" class="no-action">
                无可用操作
              </span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 添加成员对话框 -->
      <el-dialog
        v-model="showAddMemberDialog"
        title="添加成员"
        width="500px"
        append-to-body
      >
        <el-form :model="addMemberForm" label-width="80px">
          <el-form-item label="搜索用户" required>
                         <el-autocomplete
               v-model="searchKeyword"
               :fetch-suggestions="searchUsersHandler"
               placeholder="请输入用户名搜索"
               @select="handleUserSelect"
               style="width: 100%"
             >
              <template #default="{ item }">
                <div class="user-item">
                  <span class="username">{{ item.username }}</span>
                  <span class="user-id">(ID: {{ item.id }})</span>
                </div>
              </template>
            </el-autocomplete>
          </el-form-item>
          <el-form-item v-if="selectedUser" label="选中用户">
            <el-tag>{{ selectedUser.username }}</el-tag>
          </el-form-item>
          <el-form-item label="权限类型" required>
            <el-select v-model="addMemberForm.permission" placeholder="请选择权限类型" style="width: 100%">
              <el-option label="只读" value="read" />
              <el-option label="编辑" value="write" />
              <el-option label="管理" value="admin" />
            </el-select>
          </el-form-item>
        </el-form>

        <template #footer>
          <span class="dialog-footer">
            <el-button @click="closeAddMemberDialog">取消</el-button>
            <el-button
              type="primary"
              :loading="adding"
              @click="handleAddMember"
            >
              添加
            </el-button>
          </span>
        </template>
      </el-dialog>

      <!-- 修改权限对话框 -->
      <el-dialog
        v-model="showPermissionDialog"
        title="修改权限"
        width="400px"
        append-to-body
      >
        <el-form :model="permissionForm" label-width="80px">
          <el-form-item label="用户">
            <el-tag>{{ currentMember?.username }}</el-tag>
          </el-form-item>
          <el-form-item label="当前权限">
            <el-tag :type="getPermissionTagType(currentMember?.permission)">
              {{ getPermissionText(currentMember?.permission) }}
            </el-tag>
          </el-form-item>
          <el-form-item label="新权限" required>
            <el-select v-model="permissionForm.permission" placeholder="请选择新权限" style="width: 100%">
              <el-option label="只读" value="read" />
              <el-option label="编辑" value="write" />
              <el-option label="管理" value="admin" />
            </el-select>
          </el-form-item>
        </el-form>

        <template #footer>
          <span class="dialog-footer">
            <el-button @click="showPermissionDialog = false">取消</el-button>
            <el-button
              type="primary"
              :loading="updating"
              @click="handleUpdatePermission"
            >
              确定
            </el-button>
          </span>
        </template>
      </el-dialog>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  getDocumentMembers,
  addDocumentMember,
  removeDocumentMember,
  updateMemberPermission,
  searchUsers
} from '@/api/document'
import type { DocumentMember, SearchUser } from '@/types/index'

interface Props {
  documentId: string
  visible: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 状态
const members = ref<DocumentMember[]>([])
const loading = ref(false)
const showAddMemberDialog = ref(false)
const showPermissionDialog = ref(false)
const adding = ref(false)
const updating = ref(false)

// 搜索相关
const searchKeyword = ref('')
const selectedUser = ref<SearchUser | null>(null)
const searchResults = ref<SearchUser[]>([])

// 当前操作的成员
const currentMember = ref<DocumentMember | null>(null)

// 表单数据
const addMemberForm = ref({
  userId: '',
  permission: 'read' as 'read' | 'write' | 'admin'
})

const permissionForm = ref({
  permission: 'read' as 'read' | 'write' | 'admin'
})

// 计算属性
const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 获取当前用户ID
const currentUserId = localStorage.getItem('userId') || ''

// 监听对话框显示状态
watch(() => props.visible, (newVisible) => {
  if (newVisible && props.documentId) {
    loadMembers()
  }
})

// 加载成员列表
const loadMembers = async () => {
  try {
    loading.value = true
    members.value = await getDocumentMembers(props.documentId)
  } catch (error) {
    console.error('加载成员列表失败:', error)
    ElMessage.error('加载成员列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索用户
const searchUsersHandler = async (queryString: string, callback: (results: any[]) => void) => {
  if (!queryString.trim()) {
    callback([])
    return
  }

  try {
    const results = await searchUsers(queryString)
    const suggestions = results.map(user => ({
      value: user.username,
      ...user
    }))
    callback(suggestions)
  } catch (error) {
    console.error('搜索用户失败:', error)
    callback([])
  }
}

// 选择用户
const handleUserSelect = (item: any) => {
  selectedUser.value = item
  addMemberForm.value.userId = item.id.toString()
}

// 添加成员
const handleAddMember = async () => {
  if (!selectedUser.value || !addMemberForm.value.permission) {
    ElMessage.warning('请选择用户和权限类型')
    return
  }

  try {
    adding.value = true
    await addDocumentMember(props.documentId, {
      userId: addMemberForm.value.userId,
      permission: addMemberForm.value.permission
    })
    
    ElMessage.success('成员添加成功')
    closeAddMemberDialog()
    
    // 重新加载成员列表
    await loadMembers()
  } catch (error) {
    console.error('添加成员失败:', error)
    ElMessage.error('添加成员失败')
  } finally {
    adding.value = false
  }
}

// 关闭添加成员对话框
const closeAddMemberDialog = () => {
  showAddMemberDialog.value = false
  searchKeyword.value = ''
  selectedUser.value = null
  addMemberForm.value = { userId: '', permission: 'read' }
}

// 打开权限修改对话框
const openPermissionDialog = (member: DocumentMember) => {
  currentMember.value = member
  permissionForm.value.permission = member.permission
  showPermissionDialog.value = true
}

// 修改权限
const handleUpdatePermission = async () => {
  if (!currentMember.value) return

  try {
    updating.value = true
    await updateMemberPermission(
      props.documentId,
      currentMember.value.userId,
      permissionForm.value.permission
    )
    
    ElMessage.success('权限修改成功')
    showPermissionDialog.value = false
    
    // 重新加载成员列表
    await loadMembers()
  } catch (error) {
    console.error('权限修改失败:', error)
    ElMessage.error('权限修改失败')
  } finally {
    updating.value = false
  }
}

// 移除成员
const removeMember = async (member: DocumentMember) => {
  try {
    await ElMessageBox.confirm(
      `确定要移除成员"${member.username}"吗？`,
      '移除成员',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    await removeDocumentMember(props.documentId, member.userId)
    ElMessage.success('成员移除成功')
    
    // 重新加载成员列表
    await loadMembers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('移除成员失败:', error)
      ElMessage.error('移除成员失败')
    }
  }
}

// 获取权限标签类型
const getPermissionTagType = (permission?: string) => {
  switch (permission) {
    case 'admin':
      return 'danger'
    case 'write':
      return 'success'
    case 'read':
      return 'info'
    default:
      return 'info'
  }
}

// 获取权限文本
const getPermissionText = (permission?: string) => {
  switch (permission) {
    case 'admin':
      return '管理员'
    case 'write':
      return '编辑'
    case 'read':
      return '只读'
    default:
      return '未知'
  }
}

// 是否可以修改权限
const canModifyPermission = (member: DocumentMember) => {
  return member.userId !== currentUserId
}

// 是否可以移除成员
const canRemoveMember = (member: DocumentMember) => {
  return member.userId !== currentUserId
}

// 格式化时间
const formatTime = (timeStr: string) => {
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN')
}

// 关闭对话框
const handleClose = () => {
  emit('update:visible', false)
}
</script>

<style scoped lang="scss">
.document-permissions {
  .permissions-section {
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      h3 {
        margin: 0;
        color: #303133;
        font-size: 16px;
      }
    }
  }

  .user-item {
    display: flex;
    align-items: center;
    gap: 8px;

    .username {
      font-weight: 500;
    }

    .user-id {
      color: #909399;
      font-size: 12px;
    }
  }

  .no-action {
    color: #c0c4cc;
    font-size: 12px;
  }
}
</style> 