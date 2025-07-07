<template>
    <div class="comment-sidebar">
      <div class="sidebar-header">
        <h3>添加评论</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>
      
      <div class="selected-text">
        <strong>选中内容：</strong>
        <p>"{{ selectedText }}"</p>
      </div>
      
      <textarea
        v-model="commentContent"
        class="comment-input"
        placeholder="写下你的评论..."
        rows="5"
        ref="commentInput"
      ></textarea>
      
      <div class="sidebar-actions">
        <button
          @click="submitComment"
          class="submit-btn"
          :disabled="!commentContent.trim()"
        >
          提交评论
        </button>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, onMounted } from 'vue'
  
  const props = defineProps({
    selectedText: {
      type: String,
      required: true
    }
  })
  
  const emit = defineEmits(['submit', 'close'])
  
  const commentContent = ref('')
  const commentInput = ref<HTMLTextAreaElement | null>(null)
  
  const submitComment = () => {
    emit('submit', commentContent.value)
    commentContent.value = ''
  }
  
  onMounted(() => {
    commentInput.value?.focus()
  })
  </script>
  
  <style scoped>
  .comment-sidebar {
    position: fixed;
    top: 0;
    right: 0;
    width: 320px;
    height: 100vh;
    background: white;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
    padding: 16px;
    z-index: 1001;
    display: flex;
    flex-direction: column;
  }
  
  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
  }
  
  .sidebar-header h3 {
    margin: 0;
    font-size: 18px;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #666;
  }
  
  .selected-text {
    background-color: #dce1e5;
    padding: 8px;
    border-radius: 4px;
    margin-bottom: 16px;
  }
  
  .selected-text p {
    margin: 4px 0 0;
    color: #666;
  }
  
  .comment-input {
    flex: 1;
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    resize: none;
    margin-bottom: 30px;
    font-size: 14px;
  }
  
  .comment-input:focus {
    outline: none;
    border-color: #1890ff;
  }
  
  .sidebar-actions {
    display: flex;
    justify-content: flex-end;
  }
  
  .submit-btn {
    background-color: #1890ff;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
  }
  
  .submit-btn:disabled {
    background-color: #d9d9d9;
    cursor: not-allowed;
  }
  </style>