<!-- 注册页面 -->
<template>
  <div class="register-container">
    <!-- 注册表单内容 -->
    <div class="register-box">
      <h2 class="title">用户注册</h2>
      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        label-position="top"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="registerForm.username"
            placeholder="请输入用户名"
            clearable
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            show-password
            @keyup.enter="handleRegister"
          />
        </el-form-item>
        <!-- <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="registerForm.email"
            placeholder="请输入邮箱"
            clearable
          /> -->
        <!-- </el-form-item> -->
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            @click="handleRegister"
            style="width: 100%"
          >
            注册
          </el-button>
        </el-form-item>
        <div class="login-link">
          已有账号？<router-link to="/login">立即登录</router-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
// 注册逻辑
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { register } from '@/api/user'

const router = useRouter()

// 注册表单
const registerForm = ref({
  username: '',
  password: '',
  confirmPassword: ''
  // email: ''
})

// 自定义密码验证规则
const validatePassword = (rule: any, value: string, callback: Function) => {
  if (value !== registerForm.value.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

// 表单验证规则
const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' },
    { 
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^]{6,20}$/,
      message: '必须包含大小写字母和数字',
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validatePassword, trigger: 'blur' }
  ]
  // email: [
  //   { required: true, message: '请输入邮箱', trigger: 'blur' },
  //   { 
  //     type: 'email',
  //     message: '请输入正确的邮箱格式',
  //     trigger: ['blur', 'change']
  //   }
  // ]
}

const registerFormRef = ref()
const loading = ref(false)

// 注册处理
const handleRegister = async () => {
  try {
    // 验证表单
    await registerFormRef.value.validate()
    loading.value = true
    
    // 准备注册数据 (移除确认密码字段)
    const { confirmPassword, ...registerData } = registerForm.value
    
    // 调用注册API
    await register(registerData)
    
    ElMessage.success('注册成功')
    
    // 跳转到登录页面
    router.push('/login')
  } catch (error) {
    console.error('注册失败:', error)
    ElMessage.error(error.response?.data?.message || '注册失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>

  /* 注册页面样式 */
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f5f7fa;
  background-image: linear-gradient(120deg, #b5caf0 0%, #c2e9fb 100%);
}

.register-box {
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

.login-link {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: #666;
}

.login-link a {
  color: #409eff;
  text-decoration: none;
}

.login-link a:hover {
  text-decoration: underline;
}

:deep(.el-form-item__label) {
  font-weight: bold;
  padding-bottom: 0;
}

:deep(.el-input__wrapper) {
  height: 40px;
}

</style> 