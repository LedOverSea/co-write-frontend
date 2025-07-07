import axios from 'axios'

// DeepSeek API配置
const DEEPSEEK_API_KEY = 'sk-d277c14cf4664293813339ec33347ba5'
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'

// 创建专门用于AI服务的axios实例
const aiRequest = axios.create({
  baseURL: DEEPSEEK_BASE_URL,
  timeout: 30000, // 增加超时时间，因为AI响应可能较慢
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
  }
})

// AI摘要生成接口
export interface AISummaryRequest {
  content: string
}

export interface AISummaryResponse {
  summary: string
}

/**
 * 生成文档摘要
 * @param content 需要生成摘要的文本内容
 * @returns 返回生成的摘要
 */
export const generateSummary = async (content: string): Promise<string> => {
  try {
    const response = await aiRequest.post('/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的文档摘要生成助手。请为用户提供的文本内容生成简洁、准确的摘要。摘要应该：1.保持核心信息完整 2.语言简洁明了 3.逻辑清晰 4.字数控制在100-300字之间。请直接返回摘要内容，不要添加额外的说明。'
        },
        {
          role: 'user',
          content: `请为以下内容生成摘要：\n\n${content}`
        }
      ],
      stream: false,
      max_tokens: 1000,
      temperature: 0.7
    })

    if (response.data?.choices?.[0]?.message?.content) {
      return response.data.choices[0].message.content.trim()
    } else {
      throw new Error('AI响应格式异常')
    }
  } catch (error: any) {
    console.error('生成AI摘要失败:', error)
    
    // 处理不同类型的错误
    if (error.response) {
      const { status, data } = error.response
      switch (status) {
        case 401:
          throw new Error('API密钥无效，请检查配置')
        case 429:
          throw new Error('请求过于频繁，请稍后再试')
        case 500:
          throw new Error('AI服务暂时不可用，请稍后再试')
        default:
          throw new Error(data?.error?.message || `请求失败 (${status})`)
      }
    } else if (error.request) {
      throw new Error('网络连接失败，请检查网络设置')
    } else {
      throw new Error(error.message || '生成摘要失败')
    }
  }
} 