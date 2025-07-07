// HTTP 请求工具配置
import axios from 'axios'
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios'

// 创建 axios 实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 客户端环境 - 从localStorage获取认证信息
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('userId')
      if (userId) {
        config.headers['X-User-Id'] = userId
      }
      
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    // 服务端环境 - 从请求上下文获取认证信息
    else {
      const ssrContext = (config as any).ssrContext
      if (ssrContext) {
        if (ssrContext.userId) {
          config.headers['X-User-Id'] = ssrContext.userId
        }
        if (ssrContext.userToken) {
          config.headers.Authorization = `Bearer ${ssrContext.userToken}`
        }
      }
    }
    
    return config
  },
  (error: any) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data } = response
    
    // 根据接口文档，后端直接返回业务数据，不包装在统一格式中
    return data
  },
  (error: any) => {
    // HTTP状态码错误处理
    let message = '请求失败'
    
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          message = '未授权，请重新登录'
          // 清除用户信息并跳转到登录页
          localStorage.removeItem('token')
          localStorage.removeItem('userId')
          localStorage.removeItem('userInfo')
          break
        case 403:
          message = '拒绝访问'
          break
        case 404:
          message = '请求的资源不存在'
          break
        case 500:
          message = '服务器内部错误'
          break
        default:
          message = data?.message || `请求失败 (${status})`
      }
    } else if (error.request) {
      message = '网络连接失败'
    }
    
    console.error('请求错误:', message, error)
    return Promise.reject(new Error(message))
  }
)

export default request 