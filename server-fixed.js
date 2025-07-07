// 修复WebSocket问题的SSR服务器
import express from 'express'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { createServer as createViteServer } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function createServer() {
  const app = express()

  // 创建Vite开发服务器，配置WebSocket
  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
      hmr: {
        port: 24679, // 使用不同的端口避免冲突
        clientPort: 24679
      }
    },
    appType: 'custom'
  })

  // 使用vite的中间件
  app.use(vite.middlewares)

  // 处理所有路由
  app.use('*', async (req, res, next) => {
    const url = req.originalUrl

    try {
      // 读取index.html模板
      let template = `
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>协同编辑器</title>
    <style>
      /* 防止FOUC的基础样式 - 包含关键CSS */
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      html, body {
        height: 100%;
        font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
        font-size: 14px;
        color: #303133;
        background-color: #ffffff;
        line-height: 1.5;
        overflow: hidden;
      }
      
      #app { 
        opacity: 0; 
        transition: opacity 0.3s ease-in-out;
        width: 100%;
        height: 100%;
        min-height: 100vh;
      }
      
      #app.hydrated { 
        opacity: 1; 
      }
      
      /* 基础加载样式 */
      .loading-placeholder {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
      }
      
      /* 通用工具类 */
      .flex {
        display: flex;
      }
      
      .flex-center {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .flex-between {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
    </style>
  </head>
  <body>
    <div id="app"><!--ssr-outlet--></div>
    <script type="module" src="/src/entry-client.ts"></script>
  </body>
</html>`

      // 使用Vite转换模板
      template = await vite.transformIndexHtml(url, template)

      try {
        
        const { render } = await vite.ssrLoadModule('/src/entry-server.ts')
        const context = {
          userToken: null,
          userId: null,
          cookies: req.headers.cookie || '',
          userAgent: req.headers['user-agent']
        }

        const { html, state, title, description, criticalCss } = await render(url, context)

        // 生成关键CSS信息（用于调试）
        const criticalCssInfo = criticalCss && criticalCss.length > 0 
          ? `<!-- 关键CSS类: ${criticalCss.slice(0, 10).join(', ')}${criticalCss.length > 10 ? '...' : ''} -->`
          : '<!-- 无关键CSS类 -->'

        // 替换模板
        const finalHtml = template
          .replace('<!--ssr-outlet-->', html)
          .replace('<title>协同编辑器</title>', `<title>${title}</title>`)
          .replace('</head>', `
    <meta name="description" content="${description}" />
    ${criticalCssInfo}
    <link rel="preload" href="/src/style.css" as="style">
    <link rel="preload" href="/src/styles/common.scss" as="style">
    <link rel="preload" href="/node_modules/element-plus/dist/index.css" as="style">
    <link rel="modulepreload" href="/src/entry-client.ts">
    <style>
      /* 内联关键CSS - 防止FOUC */
      .el-loading-mask { position: absolute; z-index: 2000; background-color: rgba(255,255,255,0.9); margin: 0; top: 0; right: 0; bottom: 0; left: 0; transition: opacity 0.3s; }
      .el-button { display: inline-block; line-height: 1; white-space: nowrap; cursor: pointer; background: #fff; border: 1px solid #dcdfe6; color: #606266; text-align: center; box-sizing: border-box; outline: none; margin: 0; transition: 0.1s; font-weight: 500; padding: 12px 20px; font-size: 14px; border-radius: 4px; }
      .el-input { position: relative; font-size: 14px; display: inline-block; width: 100%; }
      .el-input__inner { background-color: #fff; background-image: none; border-radius: 4px; border: 1px solid #dcdfe6; box-sizing: border-box; color: #606266; display: inline-block; font-size: inherit; height: 40px; line-height: 40px; outline: none; padding: 0 15px; transition: border-color 0.2s cubic-bezier(0.645,0.045,0.355,1); width: 100%; }
    </style>
    <script>
      window.__INITIAL_STATE__ = ${JSON.stringify(state)};
      // 预加载关键资源并优化hydration
      document.addEventListener('DOMContentLoaded', function() {
        const app = document.getElementById('app');
        if (app && !app.classList.contains('hydrated')) {
          // 确保基础样式已加载后再显示
          setTimeout(() => {
            app.style.opacity = '1';
          }, 50);
        }
      });
    </script>
  </head>`)

        res.status(200).set({ 'Content-Type': 'text/html' }).end(finalHtml)
        
      } catch (ssrError) {
        console.log('⚠️ SSR渲染失败，详细错误:', ssrError.message)
        
        // 降级到客户端渲染
        const fallbackHtml = template.replace('<!--ssr-outlet-->', `
          <div class="loading-placeholder">
            <div style="text-align: center;">
              <div style="display: inline-block; width: 32px; height: 32px; border: 3px solid #f3f3f3; border-top: 3px solid #409eff; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px;"></div>
              <h3 style="margin: 0 0 8px 0; color: #303133;">正在加载协同编辑器...</h3>
              <p style="margin: 0; color: #909399; font-size: 14px;">请稍候</p>
            </div>
            <style>
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
          </div>
        `)
        res.status(200).set({ 'Content-Type': 'text/html' }).end(fallbackHtml)
      }
    } catch (error) {
      console.error('❌ 服务器错误:', error)
      res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>服务器内部错误</h2>
            <p>抱歉，服务器遇到了问题。</p>
            <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">${error.message}</pre>
          </body>
        </html>
      `)
    }
  })

  return { app, vite }
}

// 启动服务器
createServer().then(({ app, vite }) => {
  const port = 3000
  const server = app.listen(port, () => {
    console.log(`SSR服务器运行在 http://localhost:${port}`)
    console.log(`WebSocket HMR运行在端口 24679`)
  })

  // 优雅关闭
  process.on('SIGTERM', () => {
    console.log('正在关闭服务器...')
    server.close(() => {
      vite.close()
      process.exit(0)
    })
  })
}).catch(error => {
  console.error('❌ 服务器启动失败:', error)
  process.exit(1)
}) 