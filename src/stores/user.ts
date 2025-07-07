// 用户状态管理 - Pinia Store
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { login, register, getCurrentUser } from '@/api/user'
import type { User, LoginRequest, RegisterRequest } from '@/types/index'

export const useUserStore = defineStore('user', () => {
  // 状态
  const user = ref<User | null>(null)
  const token = ref<string>('')
  const loading = ref(false)

  // 计算属性
  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const userId = computed(() => user.value?.id?.toString() || '')
  const userInfo = computed(() => user.value)

  // 登录
  const loginUser = async (loginData: LoginRequest) => {
    try {
      loading.value = true
      const result = await login(loginData)
      
      // 保存用户信息和token
      user.value = result.user
      token.value = result.token
      
      // 保存到localStorage
      localStorage.setItem('token', result.token)
      localStorage.setItem('userId', result.user.id.toString())
      localStorage.setItem('userInfo', JSON.stringify(result.user))
      
      return result
    } catch (error) {
      console.error('登录失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 注册
  const registerUser = async (registerData: RegisterRequest) => {
    try {
      loading.value = true
      const newUser = await register(registerData)
      
      // 注册成功后自动登录
      return await loginUser({
        username: registerData.username,
        password: registerData.password
      })
    } catch (error) {
      console.error('注册失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 获取当前用户信息
  const fetchCurrentUser = async () => {
    try {
      loading.value = true
      const currentUser = await getCurrentUser()
      user.value = currentUser
      
      // 更新localStorage中的用户信息
      localStorage.setItem('userInfo', JSON.stringify(currentUser))
      
      return currentUser
    } catch (error) {
      console.error('获取用户信息失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 退出登录
  const logoutUser = () => {
    user.value = null
    token.value = ''
    
    // 清除localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    localStorage.removeItem('userInfo')
  }

  // 从localStorage恢复用户状态（客户端专用）
  const restoreUserState = () => {
    // 服务端环境跳过localStorage操作
    if (typeof window === 'undefined') return
    
    const savedToken = localStorage.getItem('token')
    const savedUserInfo = localStorage.getItem('userInfo')
    
    if (savedToken && savedUserInfo) {
      try {
        token.value = savedToken
        user.value = JSON.parse(savedUserInfo)
      } catch (error) {
        console.error('恢复用户状态失败:', error)
        logoutUser()
      }
    }
  }

  // 从cookie恢复用户状态（SSR友好）
  const restoreFromCookie = (cookieString: string) => {
    try {
      // 解析cookie中的用户信息
      const tokenMatch = cookieString.match(/token=([^;]+)/)
      const userInfoMatch = cookieString.match(/userInfo=([^;]+)/)
      
      if (tokenMatch && userInfoMatch) {
        token.value = decodeURIComponent(tokenMatch[1])
        user.value = JSON.parse(decodeURIComponent(userInfoMatch[1]))
      }
    } catch (error) {
      console.error('从cookie恢复用户状态失败:', error)
    }
  }

  // 设置token（兼容旧版本）
  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  // 设置用户信息（兼容旧版本）
  const setUserInfo = (userInfo: User) => {
    user.value = userInfo
    localStorage.setItem('userId', userInfo.id.toString())
    localStorage.setItem('userInfo', JSON.stringify(userInfo))
  }

  return {
    // 状态
    user,
    token,
    loading,
    
    // 计算属性
    isLoggedIn,
    userId,
    userInfo,
    
    // 方法
    loginUser,
    registerUser,
    fetchCurrentUser,
    logoutUser,
    restoreUserState,
    restoreFromCookie,
    setToken,
    setUserInfo
  }
}) 