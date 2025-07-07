<!-- 版本对比组件 -->
<template>
  <div class="version-compare">
    <el-dialog
      v-model="visible"
      title="版本对比"
      width="90%"
      top="5vh"
      @close="handleClose"
      :before-close="handleBeforeClose"
    >
      <!-- 工具栏 -->
      <div class="compare-toolbar">
        <div class="toolbar-left">
          <h3>版本对比</h3>
          <div class="version-selector">
            <el-select
              v-model="selectedVersion1"
              placeholder="选择版本1"
              size="small"
              style="width: 180px; margin-right: 12px;"
              @change="handleVersionChange"
            >
              <el-option
                v-for="version in availableVersions"
                :key="version.versionNumber"
                :label="`v${version.versionNumber} - ${version.versionName}`"
                :value="version.versionNumber"
                :disabled="version.versionNumber === selectedVersion2"
              />
            </el-select>
            <span class="vs-text">对比</span>
            <el-select
              v-model="selectedVersion2"
              placeholder="选择版本2"
              size="small"
              style="width: 180px; margin-left: 12px;"
              @change="handleVersionChange"
            >
              <el-option
                v-for="version in availableVersions"
                :key="version.versionNumber"
                :label="`v${version.versionNumber} - ${version.versionName}`"
                :value="version.versionNumber"
                :disabled="version.versionNumber === selectedVersion1"
              />
            </el-select>
          </div>
        </div>
        <div class="toolbar-right">
          <el-button
            type="primary"
            size="small"
            :disabled="!selectedVersion1 || !selectedVersion2"
            :loading="comparing"
            @click="performCompare"
          >
            <el-icon><Search /></el-icon>
            开始对比
          </el-button>
        </div>
      </div>

      <!-- 统计信息 -->
      <div v-if="compareResult" class="compare-stats">
        <div class="stats-item">
          <span class="stats-label">相似度:</span>
          <span class="stats-value similarity">{{ compareResult.comparison.statistics.similarityPercentage.toFixed(1) }}%</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">总变更:</span>
          <span class="stats-value">{{ compareResult.comparison.statistics.totalChanges }}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">新增:</span>
          <span class="stats-value insertion">+{{ compareResult.comparison.statistics.textInsertions }}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">删除:</span>
          <span class="stats-value deletion">-{{ compareResult.comparison.statistics.textDeletions }}</span>
        </div>
      </div>

      <!-- 对比视图切换 -->
      <div v-if="compareResult" class="view-tabs">
        <el-radio-group v-model="activeView" size="small">
          <el-radio-button label="side-by-side">左右对比</el-radio-button>
          <el-radio-button label="unified">统一视图</el-radio-button>
          <el-radio-button label="html">HTML视图</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 对比内容区域 -->
      <div class="compare-content" v-loading="comparing">
        <!-- 左右对比视图 -->
        <div v-if="compareResult && activeView === 'side-by-side'" class="side-by-side-view">
          <div class="version-panel">
            <div class="version-header">
              <h4>{{ compareResult.version1.versionName }}</h4>
              <div class="version-meta">
                <span>v{{ compareResult.version1.versionNumber }}</span>
                <span>{{ formatTime(compareResult.version1.createdAt) }}</span>
                <span>{{ compareResult.version1.createdBy }}</span>
              </div>
            </div>
            <div class="version-content" v-html="getFormattedContent('version1')"></div>
          </div>
          
          <div class="version-panel">
            <div class="version-header">
              <h4>{{ compareResult.version2.versionName }}</h4>
              <div class="version-meta">
                <span>v{{ compareResult.version2.versionNumber }}</span>
                <span>{{ formatTime(compareResult.version2.createdAt) }}</span>
                <span>{{ compareResult.version2.createdBy }}</span>
              </div>
            </div>
            <div class="version-content" v-html="getFormattedContent('version2')"></div>
          </div>
        </div>

        <!-- 统一视图 -->
        <div v-if="compareResult && activeView === 'unified'" class="unified-view">
          <div class="unified-header">
            <h4>统一差异视图</h4>
            <div class="legend">
              <span class="legend-item">
                <span class="legend-color deletion"></span>
                删除内容
              </span>
              <span class="legend-item">
                <span class="legend-color insertion"></span>
                新增内容
              </span>
            </div>
          </div>
          <pre class="unified-diff">{{ compareResult.comparison.textComparison.unifiedDiff }}</pre>
        </div>

        <!-- HTML视图 -->
        <div v-if="compareResult && activeView === 'html'" class="html-view">
          <div class="html-header">
            <h4>HTML差异视图</h4>
          </div>
          <div class="html-diff" v-html="compareResult.comparison.htmlComparison.htmlDiff"></div>
        </div>

        <!-- 空状态 -->
        <div v-if="!compareResult && !comparing" class="empty-state">
          <el-icon size="64"><DocumentCopy /></el-icon>
          <h3>请选择要对比的版本</h3>
          <p>选择两个不同的版本进行内容对比</p>
        </div>
      </div>


    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, DocumentCopy } from '@element-plus/icons-vue'
import { compareDocumentVersions } from '@/api/document'
import type { DocumentVersion, DocumentVersionCompareResponse } from '@/types/index'

interface Props {
  documentId: string
  versions: DocumentVersion[]
  visible: boolean
  defaultVersion1?: number
  defaultVersion2?: number
}

interface Emits {
  (e: 'update:visible', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 状态
const selectedVersion1 = ref<number | null>(null)
const selectedVersion2 = ref<number | null>(null)
const comparing = ref(false)
const compareResult = ref<DocumentVersionCompareResponse | null>(null)
const activeView = ref<'side-by-side' | 'unified' | 'html'>('side-by-side')

// 计算属性
const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const availableVersions = computed(() => {
  return [...props.versions].sort((a, b) => b.versionNumber - a.versionNumber)
})

// 监听默认版本设置
watch(() => [props.defaultVersion1, props.defaultVersion2], ([v1, v2]) => {
  if (v1 !== undefined) selectedVersion1.value = v1
  if (v2 !== undefined) selectedVersion2.value = v2
}, { immediate: true })

// 监听对话框显示状态
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    // 如果没有设置默认版本，自动选择最新的两个版本
    if (!selectedVersion1.value && !selectedVersion2.value && availableVersions.value.length >= 2) {
      selectedVersion1.value = availableVersions.value[1].versionNumber // 第二新的版本
      selectedVersion2.value = availableVersions.value[0].versionNumber // 最新版本
    }
  }
})

// 版本选择变化处理
const handleVersionChange = () => {
  compareResult.value = null
}

// 执行对比
const performCompare = async () => {
  if (!selectedVersion1.value || !selectedVersion2.value) {
    ElMessage.warning('请选择两个不同的版本进行对比')
    return
  }

  if (selectedVersion1.value === selectedVersion2.value) {
    ElMessage.warning('不能对比相同的版本')
    return
  }

  try {
    comparing.value = true
    compareResult.value = await compareDocumentVersions(
      props.documentId,
      selectedVersion1.value,
      selectedVersion2.value
    )
    ElMessage.success('版本对比完成')
  } catch (error) {
    console.error('版本对比失败:', error)
    ElMessage.error('版本对比失败: ' + (error as Error).message)
  } finally {
    comparing.value = false
  }
}

// 获取格式化的内容（用于左右对比视图）
const getFormattedContent = (version: 'version1' | 'version2') => {
  if (!compareResult.value) return ''
  
  const diffs = compareResult.value.comparison.textComparison.diffs
  let content = ''
  
  // 根据差异信息重构内容并添加高亮
  for (const diff of diffs) {
    switch (diff.operation) {
      case 'EQUAL':
        content += `<span class="equal">${escapeHtml(diff.text)}</span>`
        break
      case 'DELETE':
        if (version === 'version1') {
          content += `<span class="deletion">${escapeHtml(diff.text)}</span>`
        }
        break
      case 'INSERT':
        if (version === 'version2') {
          content += `<span class="insertion">${escapeHtml(diff.text)}</span>`
        }
        break
    }
  }
  
  return content || '<span class="empty-content">内容为空</span>'
}

// HTML转义
const escapeHtml = (text: string) => {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
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

// 关闭对话框前的处理
const handleBeforeClose = (done: () => void) => {
  if (comparing.value) {
    ElMessage.warning('正在对比中，请稍候...')
    return
  }
  done()
}

// 关闭对话框
const handleClose = () => {
  visible.value = false
  compareResult.value = null
  selectedVersion1.value = null
  selectedVersion2.value = null
  activeView.value = 'side-by-side'
}
</script>

<style scoped>
.version-compare {
  /* 主容器样式在对话框中，这里不需要额外样式 */
}

.compare-toolbar {
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
  gap: 20px;
}

.toolbar-left h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.version-selector {
  display: flex;
  align-items: center;
}

.vs-text {
  font-size: 14px;
  color: #909399;
  font-weight: 500;
}

.compare-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.stats-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stats-label {
  font-size: 12px;
  color: #666;
}

.stats-value {
  font-size: 14px;
  font-weight: 600;
}

.stats-value.similarity {
  color: #409eff;
}

.stats-value.insertion {
  color: #67c23a;
}

.stats-value.deletion {
  color: #f56c6c;
}

.view-tabs {
  margin-bottom: 16px;
}

.compare-content {
  min-height: 400px;
  max-height: 70vh;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.side-by-side-view {
  display: flex;
  height: 100%;
}

.version-panel {
  flex: 1;
  border-right: 1px solid #ebeef5;
}

.version-panel:last-child {
  border-right: none;
}

.version-header {
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #ebeef5;
}

.version-header h4 {
  margin: 0 0 6px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.version-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #909399;
}

.version-content {
  padding: 16px;
  white-space: pre-wrap;
  line-height: 1.6;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
}

.unified-view {
  padding: 16px;
}

.unified-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.unified-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.legend {
  display: flex;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-color.deletion {
  background-color: #ffe6e6;
  border: 1px solid #f56c6c;
}

.legend-color.insertion {
  background-color: #e6f7e6;
  border: 1px solid #67c23a;
}

.unified-diff {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
  white-space: pre-wrap;
  overflow-x: auto;
}

.html-view {
  padding: 16px;
}

.html-header h4 {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.html-diff {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 4px;
  line-height: 1.6;
  overflow-x: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
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
  margin: 0;
  font-size: 14px;
}



/* 内容高亮样式 */
:deep(.equal) {
  color: #303133;
}

:deep(.deletion) {
  background-color: #ffe6e6;
  color: #f56c6c;
  text-decoration: line-through;
  padding: 1px 2px;
  border-radius: 2px;
}

:deep(.insertion) {
  background-color: #e6f7e6;
  color: #67c23a;
  padding: 1px 2px;
  border-radius: 2px;
}

:deep(.empty-content) {
  color: #c0c4cc;
  font-style: italic;
}

/* HTML差异高亮样式 */
:deep(del) {
  background-color: #ffe6e6;
  color: #f56c6c;
  text-decoration: line-through;
}

:deep(ins) {
  background-color: #e6f7e6;
  color: #67c23a;
  text-decoration: none;
}

/* 滚动条样式 */
.compare-content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.compare-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.compare-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.compare-content::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .side-by-side-view {
    flex-direction: column;
  }
  
  .version-panel {
    border-right: none;
    border-bottom: 1px solid #ebeef5;
  }
  
  .version-panel:last-child {
    border-bottom: none;
  }
}

@media (max-width: 768px) {
  .compare-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .toolbar-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .version-selector {
    flex-direction: column;
    gap: 8px;
  }
  
  .vs-text {
    display: none;
  }
  
  .compare-stats {
    flex-direction: column;
    gap: 8px;
  }
}
</style> 