<!-- 版本历史组件 -->
<template>
  <div class="version-history">
    <el-dialog
      v-model="visible"
      title="版本历史"
      width="800px"
      @close="handleClose"
    >
      <!-- 工具栏 -->
      <div class="version-toolbar">
        <div class="toolbar-left">
          <h3>版本管理</h3>
          <span class="version-count">共 {{ versions.length }} 个版本</span>
        </div>
        <div class="toolbar-right">
          <el-button 
            type="success" 
            @click="showCompareDialog = true"
            :disabled="versions.length < 2"
          >
            <el-icon><Histogram /></el-icon>
            版本对比
          </el-button>
          <el-button 
            type="primary" 
            @click="showCreateDialog = true"
            :disabled="!documentId"
          >
            <el-icon><Plus /></el-icon>
            创建版本
          </el-button>
        </div>
      </div>

      <!-- 版本列表 -->
      <div class="version-list" v-loading="loading">
        <div 
          v-for="version in versions" 
          :key="version.id"
          class="version-item"
          :class="{ 'current': version.versionNumber === currentVersion }"
        >
          <div class="version-header">
            <div class="version-info">
              <h4 class="version-name">
                {{ version.versionName }}
                <el-tag v-if="version.versionNumber === currentVersion" type="success" size="small">
                  当前版本
                </el-tag>
              </h4>
              <div class="version-meta">
                <span class="version-number">v{{ version.versionNumber }}</span>
                <span class="version-time">{{ formatTime(version.createdAt) }}</span>
                <span class="version-author">创建者: {{ version.createdBy }}</span>
              </div>
            </div>
            <div class="version-actions">
              <el-button 
                size="small" 
                @click="viewVersionDetail(version)"
              >
                查看详情
              </el-button>
              <el-button 
                size="small" 
                type="info"
                @click="compareWithCurrent(version)"
                :disabled="version.versionNumber === currentVersion"
              >
                与当前版本对比
              </el-button>
              <el-button 
                size="small" 
                type="primary"
                @click="restoreVersion(version)"
                :disabled="version.versionNumber === currentVersion"
              >
                恢复到此版本
              </el-button>
              <el-button 
                size="small" 
                type="danger"
                @click="deleteVersion(version)"
                :disabled="version.versionNumber === currentVersion"
              >
                删除
              </el-button>
            </div>
          </div>
          <div v-if="version.description" class="version-description">
            {{ version.description }}
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="versions.length === 0 && !loading" class="empty-state">
          <el-icon size="64"><DocumentCopy /></el-icon>
          <h3>暂无版本记录</h3>
          <p>为文档创建第一个版本节点吧</p>
          <el-button type="primary" @click="showCreateDialog = true">
            <el-icon><Plus /></el-icon>
            创建版本
          </el-button>
        </div>
      </div>

      <!-- 创建版本对话框 -->
      <el-dialog
        v-model="showCreateDialog"
        title="创建新版本"
        width="500px"
        append-to-body
      >
        <el-form
          ref="createFormRef"
          :model="createForm"
          :rules="createRules"
          label-width="100px"
        >
          <el-form-item label="版本名称" prop="versionName">
            <el-input
              v-model="createForm.versionName"
              placeholder="请输入版本名称，如：v1.0 - 功能完成"
              maxlength="100"
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="版本描述" prop="description">
            <el-input
              v-model="createForm.description"
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
            <el-button @click="showCreateDialog = false">取消</el-button>
            <el-button
              type="primary"
              :loading="creating"
              @click="handleCreateVersion"
            >
              创建
            </el-button>
          </span>
        </template>
      </el-dialog>

      <!-- 版本详情对话框 -->
      <el-dialog
        v-model="showDetailDialog"
        title="版本详情"
        width="600px"
        append-to-body
      >
        <div v-if="selectedVersion" class="version-detail">
          <div class="detail-item">
            <label>版本名称：</label>
            <span>{{ selectedVersion.versionName }}</span>
          </div>
          <div class="detail-item">
            <label>版本号：</label>
            <span>v{{ selectedVersion.versionNumber }}</span>
          </div>
          <div class="detail-item">
            <label>创建时间：</label>
            <span>{{ formatTime(selectedVersion.createdAt) }}</span>
          </div>
          <div class="detail-item">
            <label>创建者：</label>
            <span>{{ selectedVersion.createdBy }}</span>
          </div>
          <div v-if="selectedVersion.description" class="detail-item">
            <label>版本描述：</label>
            <div class="description-content">{{ selectedVersion.description }}</div>
          </div>
        </div>
      </el-dialog>

      <!-- 版本对比组件 -->
      <VersionCompare
        v-model:visible="showCompareDialog"
        :document-id="documentId"
        :versions="versions"
        :default-version1="compareVersion1"
        :default-version2="compareVersion2"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, DocumentCopy, Histogram } from '@element-plus/icons-vue'
import type { FormInstance } from 'element-plus'
import {
  getDocumentVersions,
  createDocumentVersion,
  restoreDocumentVersion,
  deleteDocumentVersion
} from '@/api/document'
import type { DocumentVersion, CreateVersionRequest } from '@/types/index'
import VersionCompare from './VersionCompare.vue'

interface Props {
  documentId: string
  currentVersion?: number
  visible: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'version-restored'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 状态
const versions = ref<DocumentVersion[]>([])
const loading = ref(false)
const creating = ref(false)
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const showCompareDialog = ref(false)
const selectedVersion = ref<DocumentVersion | null>(null)
const compareVersion1 = ref<number | undefined>(undefined)
const compareVersion2 = ref<number | undefined>(undefined)

// 表单相关
const createFormRef = ref<FormInstance>()
const createForm = ref<CreateVersionRequest>({
  versionName: '',
  description: ''
})

const createRules = {
  versionName: [
    { required: true, message: '请输入版本名称', trigger: 'blur' },
    { min: 1, max: 100, message: '版本名称长度为 1-100 个字符', trigger: 'blur' }
  ]
}

// 计算属性
const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 监听对话框显示状态
watch(() => props.visible, (newVisible) => {
  if (newVisible && props.documentId) {
    loadVersions()
  }
})

// 加载版本列表
const loadVersions = async () => {
  if (!props.documentId) return

  try {
    loading.value = true
    versions.value = await getDocumentVersions(props.documentId)
  } catch (error) {
    console.error('加载版本列表失败:', error)
    ElMessage.error('加载版本列表失败: ' + (error as Error).message)
  } finally {
    loading.value = false
  }
}

// 创建版本
const handleCreateVersion = async () => {
  try {
    await createFormRef.value?.validate()
    
    creating.value = true
    
    await createDocumentVersion(props.documentId, createForm.value)
    
    ElMessage.success('版本创建成功')
    showCreateDialog.value = false
    resetCreateForm()
    
    // 重新加载版本列表
    await loadVersions()
    
  } catch (error) {
    console.error('创建版本失败:', error)
    if (error instanceof Error) {
      ElMessage.error('创建版本失败: ' + error.message)
    } else {
      ElMessage.error('创建版本失败，请重试')
    }
  } finally {
    creating.value = false
  }
}

// 恢复版本
const restoreVersion = async (version: DocumentVersion) => {
  try {
    await ElMessageBox.confirm(
      `确定要恢复到版本 "${version.versionName}" (v${version.versionNumber}) 吗？当前状态将会被保存为新版本。`,
      '恢复版本确认',
      {
        confirmButtonText: '确定恢复',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    const result = await restoreDocumentVersion(props.documentId, version.versionNumber)
    
    // 添加短暂延迟等待后端操作完成
    await new Promise(resolve => setTimeout(resolve, 800))
    
    ElMessage.success(result || '文档已恢复到指定版本')
    
    // 重新加载版本列表
    await loadVersions()
    
    // 通知父组件版本已恢复
    emit('version-restored')
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('恢复版本失败:', error)
      ElMessage.error('恢复版本失败: ' + (error as Error).message)
    }
  }
}

// 删除版本
const deleteVersion = async (version: DocumentVersion) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除版本 "${version.versionName}" (v${version.versionNumber}) 吗？删除后无法恢复。`,
      '删除版本确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    const result = await deleteDocumentVersion(props.documentId, version.versionNumber)
    ElMessage.success(result || '版本删除成功')
    
    // 重新加载版本列表
    await loadVersions()
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除版本失败:', error)
      ElMessage.error('删除版本失败: ' + (error as Error).message)
    }
  }
}

// 查看版本详情
const viewVersionDetail = (version: DocumentVersion) => {
  selectedVersion.value = version
  showDetailDialog.value = true
}

// 与当前版本对比
const compareWithCurrent = (version: DocumentVersion) => {
  if (props.currentVersion) {
    compareVersion1.value = version.versionNumber
    compareVersion2.value = props.currentVersion
    showCompareDialog.value = true
  }
}

// 格式化时间
const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 重置创建表单
const resetCreateForm = () => {
  createFormRef.value?.resetFields()
  createForm.value = {
    versionName: '',
    description: ''
  }
}

// 关闭对话框
const handleClose = () => {
  visible.value = false
  resetCreateForm()
}
</script>

<style scoped>
.version-history {
  /* 主容器样式在对话框中，这里不需要额外样式 */
}

.version-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-left h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.version-count {
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  padding: 2px 8px;
  border-radius: 12px;
}

.version-list {
  max-height: 500px;
  overflow-y: auto;
}

.version-item {
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  margin-bottom: 12px;
  transition: all 0.3s ease;
}

.version-item:hover {
  border-color: #c6e2ff;
  background-color: #f5f9ff;
}

.version-item.current {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.version-info {
  flex: 1;
}

.version-name {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: #909399;
}

.version-number {
  font-weight: 600;
  color: #409eff;
}

.version-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.version-description {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f2f5;
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #909399;
}

.empty-state .el-icon {
  margin-bottom: 16px;
  color: #c0c4cc;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #909399;
}

.empty-state p {
  margin: 0 0 20px 0;
  font-size: 14px;
}

.version-detail {
  padding: 8px 0;
}

.detail-item {
  display: flex;
  margin-bottom: 16px;
  align-items: flex-start;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-item label {
  min-width: 80px;
  font-weight: 600;
  color: #606266;
  flex-shrink: 0;
}

.detail-item span {
  color: #303133;
}

.description-content {
  flex: 1;
  color: #303133;
  line-height: 1.5;
  white-space: pre-wrap;
}

/* 滚动条样式 */
.version-list::-webkit-scrollbar {
  width: 6px;
}

.version-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.version-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.version-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .version-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .toolbar-right {
    width: 100%;
  }
  
  .version-header {
    flex-direction: column;
    gap: 12px;
  }
  
  .version-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .version-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style> 