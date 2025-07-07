<!-- 顶部导航栏组件 -->
<template>
  <header class="header">
    <div class="header-left">
      
      <!-- Logo和标题 -->
      <div class="logo-section">
        <div class="logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="10,9 9,9 8,9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h1 class="title">富文本编辑器</h1>
      </div>
    </div>
    
    <div class="header-right">
      <!-- 用户下拉菜单 -->
      <el-dropdown @command="handleCommand" trigger="click">
        <el-avatar 
          :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'default'}`"
          :alt="user?.username || '用户'"
          :size="36"
          class="user-avatar"
        />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item disabled>
              <div class="user-info">
                <div class="username">{{ user?.username || '未知用户' }}</div>
              </div>
            </el-dropdown-item>
            <el-dropdown-item divided command="logout" class="logout-item">
              <el-icon><SwitchButton /></el-icon>
              退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElDropdown, ElDropdownMenu, ElDropdownItem, ElAvatar, ElIcon} from 'element-plus'
import { SwitchButton} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'

const router = useRouter()
const userStore = useUserStore()

// 定义emits
defineEmits<{
  toggleSidebar: []
}>()

const { user } = storeToRefs(userStore)

const handleCommand = (command: string) => {
  switch (command) {
    case 'logout':
      logout()
      break
  }
}

const logout = () => {
  userStore.logoutUser()
  router.push('/login')
}

onMounted(() => {
  // 如果没有用户信息，尝试获取当前用户信息
  if (!user.value && userStore.isLoggedIn) {
    userStore.fetchCurrentUser().catch(error => {
      console.error('获取用户信息失败:', error)
    })
  }
})
</script>

<style scoped lang="scss">
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  padding: 0 24px;
  background: white;
  border-bottom: 1px solid #ebeef5;
  position: relative;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.menu-toggle-btn {
  color: #606266;
  
  &:hover {
    color: #409eff;
    background-color: #f5f7fa;
  }
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #409eff;
}

.title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-avatar {
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    transform: scale(1.05);
  }
}

.user-info {
  padding: 8px 0;
  text-align: center;
  
  .username {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 4px;
  }
}

:deep(.logout-item) {
  color: #f56c6c;
  
  &:hover {
    color: #f78989;
    background-color: #fef0f0;
  }
}

@media (max-width: 768px) {
  .header {
    padding: 0 16px;
  }
  
  .title {
    display: none;
  }
}
</style> 