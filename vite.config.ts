import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  // 修复SockJS在Vite环境中的兼容性问题
  define: {
    global: 'globalThis',
  },
  // SSR构建配置
  build: {
    rollupOptions: {
      // 确保外部化处理那些你不想打包进库的依赖
      external: ['express']
    }
  },
  // SSR特定配置
  ssr: {
    // 需要在SSR中处理的包
    noExternal: ['element-plus', '@popperjs/core'],
    // 排除有问题的包，让它们在客户端处理
    external: ['@umoteam/editor']
  },
  // 开发服务器配置
  server: {
    proxy: {
      // 代理所有 /auth 请求到后端
      '/auth': {
        target: 'http://localhost:8080', 
        changeOrigin: true
      },
      // 代理所有 /kbs 请求到后端
      '/kbs': {
        target: 'http://localhost:8080', 
        changeOrigin: true
      },
      // 代理所有 /docs 请求到后端
      '/docs': {
        target: 'http://localhost:8080', 
        changeOrigin: true
      },
      // 代理所有 /api 请求到后端（用于评论等功能）
      '/api': {
        target: 'http://localhost:8080', 
        changeOrigin: true
      }
    }
  }
})
