// 通用工具函数

/**
 * 从文档对象中提取知识库ID
 * @param document - 文档对象，包含knowledgeBaseId字段
 * @returns 知识库ID字符串，如果无法获取则返回null
 */
export const extractKnowledgeBaseId = (document: any): string | null => {
  if (!document) return null
  
  // 优先使用新的knowledgeBaseId字段
  if (document.knowledgeBaseId !== undefined && document.knowledgeBaseId !== null) {
    return document.knowledgeBaseId.toString()
  }
  
  // 处理knowledgeBase字段是对象的情况
  if (document.knowledgeBase && typeof document.knowledgeBase === 'object' && !Array.isArray(document.knowledgeBase)) {
    return document.knowledgeBase.id?.toString() || null
  }
  
  // 兼容旧的knowledgeBase字段（JSON字符串格式）
  if (document.knowledgeBase && typeof document.knowledgeBase === 'string') {
    try {
      const parsed = JSON.parse(document.knowledgeBase)
      return parsed.id?.toString() || null
    } catch {
      return null
    }
  }
  
  return null
}

/**
 * 验证文档是否属于指定的知识库
 * @param document - 文档对象
 * @param expectedKnowledgeBaseId - 期望的知识库ID
 * @returns 是否匹配
 */
export const validateDocumentKnowledgeBase = (document: any, expectedKnowledgeBaseId: string): boolean => {
  if (!document || !expectedKnowledgeBaseId) return false
  
  const actualKnowledgeBaseId = extractKnowledgeBaseId(document)
  return actualKnowledgeBaseId === expectedKnowledgeBaseId
}

