<template>
  <div class="not-found">
    <div class="not-found-content">
      <div class="not-found-icon">
        <div class="icon-placeholder">📄❌</div>
      </div>
      <h1 class="not-found-title">404</h1>
      <p class="not-found-description">抱歉，您访问的页面不存在</p>
      <div class="not-found-actions">
        <button class="btn btn-primary" @click="goHome">
          🏠 返回首页
        </button>
        <button class="btn btn-secondary" @click="goBack">
          ← 返回上一页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  router.go(-1)
}
</script>

<style scoped lang="scss">
.not-found {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-sizing: border-box;
  overflow: hidden;
}

.not-found-content {
  text-align: center;
  background: white;
  padding: 80px 60px;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 600px;
  min-width: 320px;
}

.not-found-icon {
  margin-bottom: 32px;
}

.icon-placeholder {
  font-size: 120px;
  line-height: 1;
  opacity: 0.6;
}

.not-found-title {
  font-size: 96px;
  font-weight: bold;
  color: #909399;
  margin: 0 0 24px 0;
  line-height: 1;
}

.not-found-description {
  font-size: 20px;
  color: #606266;
  margin-bottom: 40px;
  line-height: 1.6;
}

.not-found-actions {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 140px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  &.btn-primary {
    background: #409eff;
    color: white;
    
    &:hover {
      background: #337ecc;
    }
  }
  
  &.btn-secondary {
    background: #f5f7fa;
    color: #606266;
    
    &:hover {
      background: #e4e7ed;
    }
  }
}

@media (max-width: 768px) {
  .not-found {
    padding: 15px;
  }
  
  .not-found-content {
    padding: 60px 40px;
  }
  
  .not-found-title {
    font-size: 72px;
  }
  
  .not-found-description {
    font-size: 18px;
  }
  
  .not-found-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .btn {
    width: 100%;
    max-width: 200px;
  }
}
</style> 