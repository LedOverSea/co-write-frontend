// 用户相关 API 接口 - 根据接口文档重构
import request from './request'
import type {
  LoginRequest,
  RegisterRequest,
  LoginResult,
  User,
  UserDTO
} from '@/types/index'

// 用户注册 - POST /auth/register
export const register = (data: RegisterRequest): Promise<User> => {
  const userDTO: UserDTO = {
    id: 0, // 注册时ID由后端生成
    username: data.username,
    password: data.password
  }
  return request.post('/auth/register', userDTO)
}

// 用户登录 - POST /auth/login
export const login = (data: LoginRequest): Promise<LoginResult> => {
  const userDTO: UserDTO = {
    id: 0, // 登录时ID由后端验证
    username: data.username,
    password: data.password
  }
  return request.post('/auth/login', userDTO)
}

// 获取当前用户信息 - GET /auth/me
export const getCurrentUser = (): Promise<User> => {
  return request.get('/auth/me')
}

// 退出登录（清除本地存储）
export const logout = (): Promise<void> => {
  // 清除本地存储的用户信息
  localStorage.removeItem('token')
  localStorage.removeItem('userId')
  localStorage.removeItem('userInfo')
  return Promise.resolve()
}
