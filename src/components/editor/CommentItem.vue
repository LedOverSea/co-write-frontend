<!-- 评论项组件 -->
<template>
  <div class="comment-item" :class="{ 'is-reply': isReply }">
    <!-- 评论主体 -->
    <div class="comment-content">
      <!-- 用户头像和信息 -->
      <div class="comment-avatar">
        <el-avatar :size="isReply ? 32 : 40" :src="userAvatar">
          {{ comment.username.charAt(0).toUpperCase() }}
        </el-avatar>
      </div>
      
      <!-- 评论详情 -->
      <div class="comment-details">
        <!-- 评论头部 -->
        <div class="comment-header">
          <span class="comment-username">{{ comment.username }}</span>
          <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
          <span v-if="comment.updatedAt !== comment.createdAt" class="comment-edited">
            (已编辑)
          </span>
        </div>
        
        <!-- 评论内容 -->
        <div class="comment-text">
          {{ comment.content }}
        </div>
        
        <!-- 操作按钮 -->
        <div class="comment-actions">
          <el-button 
            link 
            size="small" 
            @click="showReplyInput = !showReplyInput"
          >
            <el-icon><ChatDotRound /></el-icon>
            回复
          </el-button>
          
          <el-button 
            v-if="canEdit"
            link 
            size="small" 
            @click="handleEdit"
          >
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
          
          <el-button 
            v-if="canDelete"
            link 
            size="small" 
            type="danger" 
            @click="handleDelete"
          >
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
        </div>
        
        <!-- 回复输入框 -->
        <div v-if="showReplyInput" class="reply-input-section">
          <el-input
            v-model="replyContent"
            type="textarea"
            :rows="2"
            placeholder="回复评论..."
            :maxlength="1000"
            show-word-limit
            resize="none"
          />
          <div class="reply-actions">
            <el-button size="small" @click="cancelReply">取消</el-button>
            <el-button 
              size="small" 
              type="primary" 
              :disabled="!replyContent.trim()"
              :loading="replying"
              @click="handleReply"
            >
              发表回复
            </el-button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 回复列表 - 暂时简化显示 -->
    <div v-if="comment.replies && comment.replies.length > 0" class="replies-section">
      <div v-for="reply in comment.replies" :key="reply.id" class="simple-reply">
        <div class="reply-content">
          <strong>{{ reply.username }}:</strong> {{ reply.content }}
          <span class="reply-time">{{ formatTime(reply.createdAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { ChatDotRound, Edit, Delete } from '@element-plus/icons-vue'
import type { Comment } from '@/api/comment'

// 为递归组件定义组件名
defineOptions({
  name: 'CommentItem'
})

// Props
interface Props {
  comment: Comment
  currentUserId: string
  isReply?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isReply: false
})

// Emits
const emit = defineEmits<{
  reply: [parentId: string, content: string]
  edit: [commentId: string, currentContent: string]
  delete: [commentId: string]
}>()

// 状态
const showReplyInput = ref(false)
const replyContent = ref('')
const replying = ref(false)

// 计算属性
const canEdit = computed(() => {
  return props.comment.userId === props.currentUserId
})

const canDelete = computed(() => {
  return props.comment.userId === props.currentUserId
})

const userAvatar = computed(() => {
  // 这里可以根据用户ID生成头像URL，暂时返回空字符串使用默认头像
  return ''
})

// 格式化时间
const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) {
    return '刚刚'
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}分钟前`
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}小时前`
  } else if (diffInSeconds < 2592000) {
    return `${Math.floor(diffInSeconds / 86400)}天前`
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
}

// 处理回复
const handleReply = async () => {
  if (!replyContent.value.trim()) return
  
  try {
    replying.value = true
    await emit('reply', props.comment.id, replyContent.value)
    replyContent.value = ''
    showReplyInput.value = false
  } catch (error) {
    // 错误处理在父组件中进行
  } finally {
    replying.value = false
  }
}

// 取消回复
const cancelReply = () => {
  replyContent.value = ''
  showReplyInput.value = false
}

// 处理编辑
const handleEdit = () => {
  emit('edit', props.comment.id, props.comment.content)
}

// 处理删除
const handleDelete = () => {
  emit('delete', props.comment.id)
}

// 简化版本暂时不需要递归处理方法
</script>

<style scoped lang="scss">
.comment-item {
  border-bottom: 1px solid #f5f7fa;
  
  &:last-child {
    border-bottom: none;
  }
  
  &.is-reply {
    margin-left: 20px;
    border-left: 2px solid #f0f2f5;
    padding-left: 16px;
    
    .comment-content {
      padding: 12px 0;
    }
  }
  
  .comment-content {
    display: flex;
    padding: 16px 24px;
    gap: 12px;
    
    .comment-avatar {
      flex-shrink: 0;
    }
    
    .comment-details {
      flex: 1;
      min-width: 0;
      
      .comment-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        
        .comment-username {
          font-weight: 600;
          color: #303133;
          font-size: 14px;
        }
        
        .comment-time {
          color: #909399;
          font-size: 12px;
        }
        
        .comment-edited {
          color: #909399;
          font-size: 12px;
          font-style: italic;
        }
      }
      
      .comment-text {
        color: #606266;
        font-size: 14px;
        line-height: 1.6;
        margin-bottom: 12px;
        white-space: pre-wrap;
        word-break: break-word;
      }
      
      .comment-actions {
        display: flex;
        gap: 4px;
        
        .el-button {
          padding: 4px 8px;
          font-size: 12px;
          
          .el-icon {
            margin-right: 4px;
          }
        }
      }
      
      .reply-input-section {
        margin-top: 12px;
        padding: 12px;
        background: #fafbfc;
        border-radius: 6px;
        
        .reply-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 8px;
        }
      }
    }
  }
  
  .replies-section {
    background: #fafbfc;
    padding: 8px 16px;
    margin-top: 8px;
    border-radius: 6px;
    
    .simple-reply {
      padding: 8px 0;
      border-bottom: 1px solid #f0f2f5;
      
      &:last-child {
        border-bottom: none;
      }
      
      .reply-content {
        font-size: 13px;
        color: #606266;
        line-height: 1.5;
        
        strong {
          color: #303133;
          margin-right: 4px;
        }
        
        .reply-time {
          color: #909399;
          font-size: 11px;
          margin-left: 8px;
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .comment-item {
    &.is-reply {
      margin-left: 12px;
      padding-left: 12px;
    }
    
    .comment-content {
      padding: 12px 16px;
      gap: 8px;
    }
    
    .comment-details {
      .comment-header {
        flex-wrap: wrap;
        gap: 4px;
      }
      
      .comment-actions {
        flex-wrap: wrap;
      }
    }
  }
}
</style> 