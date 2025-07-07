<!-- 登录页面 -->
<template>
  <div class="login-container">
    <!-- 登录表单内容 -->
    <div class="login-box">
      <h2 class="title">富文本编辑器-登录</h2>
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        label-position="top"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            clearable
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            @click="handleLogin"
            style="width: 100%"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
      
      <!-- 注册入口 -->
      <div class="register-link">
        <span>还没有账户？</span>
        <el-button type="text" @click="goToRegister">立即注册</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 登录逻辑
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

// 登录表单
const loginForm = ref({
  username: '',
  password: ''
})

// 表单验证规则
const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ]
}

const loginFormRef = ref()
const loading = ref(false)

// 登录处理
const handleLogin = async () => {
  try {
    // 验证表单
    await loginFormRef.value.validate()
    loading.value = true
    
    // 调用登录API
    const result = await userStore.loginUser(loginForm.value)
    
    ElMessage.success('登录成功')
    
    // 跳转到首页
    await router.push('/')
    
  } catch (error) {
    console.error('登录失败:', error)
    ElMessage.error(error instanceof Error ? error.message : '登录失败，请重试')
  } finally {
    loading.value = false
  }
}

// 跳转到注册页面
const goToRegister = () => {
  router.push('/register')
}
</script>

<style scoped>
.login-container {
  /* 登录页面样式 */
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #cfd4db;
  background-image: linear-gradient(120deg, #b5caf0 0%, #c2e9fb 100%);
}

.login-box {
  width: 400px;
  padding: 40px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
}

.title {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

:deep(.el-form-item__label) {
  font-weight: bold;
  padding-bottom: 0;
}

:deep(.el-input__wrapper) {
  height: 40px;
}

.register-link {
  text-align: center;
  margin-top: 20px;
  color: #666;
}

.register-link span {
  font-size: 14px;
}

:deep(.el-button--text) {
  color: #409eff;
  font-size: 14px;
  padding: 0 4px;
}

:deep(.el-button--text:hover) {
  color: #337ecc;
}

</style> 