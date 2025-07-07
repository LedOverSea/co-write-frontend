<template>
  <div class="ai-summary-container">
    <!-- AI摘要浮动按钮 -->
    <transition name="fade-scale">
      <el-tooltip
        v-if="hasSelectedText || alwaysShow"
        content="点击生成AI摘要 (Ctrl+Shift+S)"
        placement="left"
      >
        <el-button
          :class="['ai-summary-btn', { 'has-selection': hasSelectedText, 'pulse': hasSelectedText }]"
          :disabled="!hasSelectedText || loading"
          :loading="loading"
          type="primary"
          size="default"
          @click="generateAISummary"
        >
          <el-icon><MagicStick /></el-icon>
          {{ loading ? '生成中...' : 'AI摘要' }}
        </el-button>
      </el-tooltip>
    </transition>

    <!-- 右键菜单 -->
    <el-dropdown
      ref="contextMenuRef"
      trigger="contextmenu"
      placement="bottom-start"
      @visible-change="handleContextMenuVisibility"
    >
      <span class="context-menu-trigger"></span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            :disabled="!hasSelectedText || loading"
            @click="generateAISummary"
          >
            <el-icon><MagicStick /></el-icon>
            生成AI摘要
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- 摘要结果对话框 -->
    <el-dialog
      v-model="showSummaryDialog"
      title="AI摘要结果"
      width="600px"
      :before-close="handleCloseSummary"
    >
      <div class="summary-content">
        <!-- 原文预览 -->
        <div class="original-text">
          <h4>原文内容：</h4>
          <div class="text-preview">{{ truncatedSelectedText }}</div>
        </div>

        <!-- 摘要结果 -->
        <div class="summary-result">
          <div class="summary-header">
            <h4>AI摘要：</h4>
            <el-button
              size="small"
              type="success"
              :disabled="!summaryText"
              @click="copySummary"
            >
              <el-icon><DocumentCopy /></el-icon>
              复制摘要
            </el-button>
          </div>
          
          <div class="summary-text" v-if="summaryText">
            {{ summaryText }}
          </div>
          
          <el-empty 
            v-else-if="!loading" 
            description="暂无摘要内容"
            :image-size="60"
          />
          
          <div v-else class="loading-summary">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>正在生成摘要，请稍候...</span>
          </div>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleCloseSummary">关闭</el-button>
          <el-button
            v-if="summaryText"
            type="primary"
            @click="copySummary"
          >
            复制摘要
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { MagicStick, DocumentCopy, Loading } from '@element-plus/icons-vue'
import { generateSummary } from '@/api/ai'

interface Props {
  selectedText: string
}

const props = defineProps<Props>()

// 响应式状态
const loading = ref(false)
const showSummaryDialog = ref(false)
const summaryText = ref('')
const alwaysShow = ref(false) // 是否总是显示按钮
const contextMenuRef = ref()

// 计算属性
const hasSelectedText = computed(() => {
  return props.selectedText && props.selectedText.trim().length > 0
})

const truncatedSelectedText = computed(() => {
  const text = props.selectedText
  if (text.length <= 200) {
    return text
  }
  return text.substring(0, 200) + '...'
})

// 监听选中文本变化
watch(() => props.selectedText, (newText) => {
  if (!newText || newText.trim().length === 0) {
    // 如果没有选中文本，关闭对话框
    if (showSummaryDialog.value) {
      handleCloseSummary()
    }
  }
})

// 生成AI摘要
const generateAISummary = async () => {
  const selectedText = props.selectedText?.trim()
  
  if (!selectedText) {
    ElMessage.warning('请先选中文字')
    return
  }

  // 检查文本长度
  if (selectedText.length < 10) {
    ElMessage.warning('选中的文字太短，请选择更多内容')
    return
  }

  if (selectedText.length > 10000) {
    ElMessage.warning('选中的文字太长，请选择少于10000字的内容')
    return
  }

  loading.value = true
  summaryText.value = ''
  showSummaryDialog.value = true

  try {
    const summary = await generateSummary(selectedText)
    summaryText.value = summary
    ElMessage.success('摘要生成成功')
  } catch (error: any) {
    console.error('生成AI摘要失败:', error)
    ElMessage.error(error.message || '生成摘要失败，请稍后再试')
    // 保持对话框打开，显示错误状态
  } finally {
    loading.value = false
  }
}

// 复制摘要
const copySummary = async () => {
  if (!summaryText.value) {
    ElMessage.warning('没有可复制的摘要内容')
    return
  }

  try {
    await navigator.clipboard.writeText(summaryText.value)
    ElMessage.success('摘要已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    // 降级方案：使用传统的复制方法
    try {
      const textArea = document.createElement('textarea')
      textArea.value = summaryText.value
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      ElMessage.success('摘要已复制到剪贴板')
    } catch (fallbackError) {
      ElMessage.error('复制失败，请手动复制')
    }
  }
}

// 关闭摘要对话框
const handleCloseSummary = () => {
  showSummaryDialog.value = false
  // 延迟清空内容，避免闪烁
  setTimeout(() => {
    if (!showSummaryDialog.value) {
      summaryText.value = ''
    }
  }, 300)
}

// 处理右键菜单显示状态
const handleContextMenuVisibility = (visible: boolean) => {
  if (visible && hasSelectedText.value) {
    // 当右键菜单显示且有选中文本时，可以执行相关操作
  }
}

// 暴露方法给父组件
defineExpose({
  generateAISummary,
  copySummary
})
</script>

<style scoped lang="scss">
.ai-summary-container {
  .ai-summary-btn {
    position: fixed;
    top: 120px;
    right: 20px;
    z-index: 1000;
    border-radius: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    padding: 12px 20px;
    font-weight: 500;

    &.has-selection {
      opacity: 1;
      transform: scale(1.02);
      box-shadow: 0 6px 25px rgba(64, 158, 255, 0.4);
      background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
      border: none;
      
      &.pulse {
        animation: pulse 2s infinite;
      }
    }

    &:hover {
      transform: scale(1.05);
      box-shadow: 0 8px 30px rgba(64, 158, 255, 0.5);
    }

    &:disabled {
      opacity: 0.5;
      transform: none;
      cursor: not-allowed;
    }
  }

  .context-menu-trigger {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: -1;
  }
}

// 动画效果
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.3s ease;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(10px);
}

@keyframes pulse {
  0% {
    transform: scale(1.02);
    box-shadow: 0 6px 25px rgba(64, 158, 255, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 8px 30px rgba(64, 158, 255, 0.6);
  }
  100% {
    transform: scale(1.02);
    box-shadow: 0 6px 25px rgba(64, 158, 255, 0.4);
  }
}

.summary-content {
  .original-text {
    margin-bottom: 20px;
    
    h4 {
      margin: 0 0 8px 0;
      color: #606266;
      font-size: 14px;
    }
    
    .text-preview {
      background: #f5f7fa;
      padding: 12px;
      border-radius: 6px;
      border-left: 3px solid #e6a23c;
      font-size: 13px;
      line-height: 1.6;
      color: #606266;
      max-height: 120px;
      overflow-y: auto;
    }
  }

  .summary-result {
    .summary-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      
      h4 {
        margin: 0;
        color: #606266;
        font-size: 14px;
      }
    }
    
    .summary-text {
      background: #f0f9ff;
      padding: 16px;
      border-radius: 6px;
      border-left: 3px solid #409eff;
      line-height: 1.8;
      color: #303133;
      min-height: 80px;
      white-space: pre-wrap;
    }
    
    .loading-summary {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: #909399;
      
      .el-icon {
        margin-right: 8px;
        font-size: 16px;
      }
    }
  }
}

.dialog-footer {
  display: flex;
  gap: 12px;
}

// 响应式设计
@media (max-width: 768px) {
  .ai-summary-container .ai-summary-btn {
    top: 80px;
    right: 10px;
    font-size: 12px;
    padding: 8px 12px;
  }
}
</style> 