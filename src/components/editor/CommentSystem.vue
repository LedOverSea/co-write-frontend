<!-- 文档评论系统组件 -->
<template>
  <div class="comment-system-container">
    <!-- 评论系统标题 -->
    <div class="comment-header">
      <h3 class="comment-title">
        <el-icon><ChatDotRound /></el-icon>
        文档评论 ({{ totalComments }})
      </h3>
    </div>

    <!-- 添加评论区域 -->
    <div class="add-comment-section">
      <div class="comment-input-wrapper">
        <el-input
          v-model="newCommentContent"
          type="textarea"
          :rows="3"
          placeholder="写下你的评论..."
          :maxlength="1000"
          show-word-limit
          resize="none"
        />
        <div class="comment-actions">
          <el-button 
            type="primary" 
            :disabled="!newCommentContent.trim()"
            :loading="addingComment"
            @click="handleAddComment"
          >
            发表评论
          </el-button>
        </div>
      </div>
    </div>

    <!-- 评论列表 -->
    <div class="comments-list" v-loading="loadingComments">
      <div v-if="comments.length === 0 && !loadingComments" class="no-comments">
        <el-icon class="no-comments-icon"><ChatDotRound /></el-icon>
        <p>还没有评论，来发表第一条评论吧～</p>
      </div>
      
      <div v-else>
        <CommentItem
          v-for="comment in comments"
          :key="comment.id"
          :comment="comment"
          :current-user-id="currentUserId"
          @reply="handleReplyComment"
          @edit="handleEditComment"
          @delete="handleDeleteComment"
        />
      </div>
    </div>

    <!-- 编辑评论对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑评论"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-input
        v-model="editCommentContent"
        type="textarea"
        :rows="4"
        placeholder="修改你的评论..."
        :maxlength="1000"
        show-word-limit
        resize="none"
      />
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button 
            type="primary" 
            :disabled="!editCommentContent.trim()"
            :loading="editingComment"
            @click="handleConfirmEdit"
          >
            保存修改
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChatDotRound } from '@element-plus/icons-vue'
import type { Comment } from '@/api/comment'
import { 
  getDocumentComments, 
  createComment, 
  replyToComment, 
  updateComment, 
  deleteComment 
} from '@/api/comment'
import CommentItem from './CommentItem.vue'

// Props
interface Props {
  documentId: string
  currentUserId: string
}

const props = defineProps<Props>()

// 状态
const comments = ref<Comment[]>([])
const newCommentContent = ref('')
const loadingComments = ref(false)
const addingComment = ref(false)

// 编辑评论相关状态
const editDialogVisible = ref(false)
const editCommentContent = ref('')
const editingCommentId = ref('')
const editingComment = ref(false)

// 加载评论列表
const loadComments = async () => {
  if (!props.documentId) return
  
  try {
    loadingComments.value = true
    comments.value = await getDocumentComments(props.documentId)
  } catch (error) {
    console.error('加载评论失败:', error)
    ElMessage.error('加载评论失败')
  } finally {
    loadingComments.value = false
  }
}

// 计算属性
const totalComments = computed(() => {
  const countReplies = (commentList: Comment[]): number => {
    return commentList.reduce((total, comment) => {
      return total + 1 + countReplies(comment.replies || [])
    }, 0)
  }
  return countReplies(comments.value)
})

// 监听文档ID变化，重新加载评论
watch(() => props.documentId, (newDocumentId) => {
  if (newDocumentId) {
    loadComments()
  }
}, { immediate: true })

// 添加评论
const handleAddComment = async () => {
  if (!newCommentContent.value.trim()) return
  
  try {
    addingComment.value = true
    const newComment = await createComment({
      documentId: props.documentId,
      content: newCommentContent.value.trim()
    })
    
    // 将新评论添加到列表开头
    comments.value.unshift(newComment)
    newCommentContent.value = ''
    ElMessage.success('评论发表成功')
  } catch (error) {
    console.error('发表评论失败:', error)
    ElMessage.error('发表评论失败')
  } finally {
    addingComment.value = false
  }
}

// 回复评论
const handleReplyComment = async (parentId: string, content: string) => {
  try {
    const replyComment = await replyToComment(parentId, {
      documentId: props.documentId,
      content: content.trim()
    })
    
    // 找到父评论并添加回复
    const addReplyToComment = (commentList: Comment[]) => {
      for (const comment of commentList) {
        if (comment.id === parentId) {
          if (!comment.replies) comment.replies = []
          comment.replies.push(replyComment)
          return true
        }
        if (comment.replies && addReplyToComment(comment.replies)) {
          return true
        }
      }
      return false
    }
    
    addReplyToComment(comments.value)
    ElMessage.success('回复发表成功')
  } catch (error) {
    console.error('回复评论失败:', error)
    ElMessage.error('回复评论失败')
    throw error
  }
}

// 编辑评论
const handleEditComment = (commentId: string, currentContent: string) => {
  editingCommentId.value = commentId
  editCommentContent.value = currentContent
  editDialogVisible.value = true
}

// 确认编辑
const handleConfirmEdit = async () => {
  if (!editCommentContent.value.trim()) return
  
  try {
    editingComment.value = true
    const updatedComment = await updateComment(editingCommentId.value, {
      content: editCommentContent.value.trim()
    })
    
    // 更新评论列表中的评论
    const updateCommentInList = (commentList: Comment[]) => {
      for (const comment of commentList) {
        if (comment.id === editingCommentId.value) {
          comment.content = updatedComment.content
          comment.updatedAt = updatedComment.updatedAt
          return true
        }
        if (comment.replies && updateCommentInList(comment.replies)) {
          return true
        }
      }
      return false
    }
    
    updateCommentInList(comments.value)
    editDialogVisible.value = false
    ElMessage.success('评论修改成功')
  } catch (error) {
    console.error('修改评论失败:', error)
    ElMessage.error('修改评论失败')
  } finally {
    editingComment.value = false
  }
}

// 删除评论
const handleDeleteComment = async (commentId: string) => {
  try {
    await ElMessageBox.confirm(
      '删除评论后将无法恢复，确认删除吗？',
      '确认删除',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    await deleteComment(commentId)
    
    // 从评论列表中删除评论
    const removeCommentFromList = (commentList: Comment[], targetId: string): Comment[] => {
      return commentList.filter(comment => {
        if (comment.id === targetId) {
          return false
        }
        if (comment.replies) {
          comment.replies = removeCommentFromList(comment.replies, targetId)
        }
        return true
      })
    }
    
    comments.value = removeCommentFromList(comments.value, commentId)
    ElMessage.success('评论删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除评论失败:', error)
      ElMessage.error('删除评论失败')
    }
  }
}

// 组件挂载时加载评论
onMounted(() => {
  if (props.documentId) {
    loadComments()
  }
})
</script>

<style scoped lang="scss">
.comment-system-container {
  border-top: 1px solid #e4e7ed;
  background: #fff;
  
  .comment-header {
    padding: 20px 24px 16px;
    border-bottom: 1px solid #f5f7fa;
    
    .comment-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #303133;
      display: flex;
      align-items: center;
      gap: 8px;
      
      .el-icon {
        color: #409eff;
      }
    }
  }
  
  .add-comment-section {
    padding: 16px 24px 20px;
    border-bottom: 1px solid #f5f7fa;
    
    .comment-input-wrapper {
      .comment-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 12px;
      }
    }
  }
  
  .comments-list {
    min-height: 200px;
    max-height: 600px;
    overflow-y: auto;
    
    .no-comments {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 24px;
      color: #909399;
      
      .no-comments-icon {
        font-size: 48px;
        margin-bottom: 16px;
        color: #c0c4cc;
      }
      
      p {
        margin: 0;
        font-size: 14px;
      }
    }
  }
  
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}

// 美化滚动条
.comments-list::-webkit-scrollbar {
  width: 6px;
}

.comments-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.comments-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.comments-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style> 