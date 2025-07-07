// 文档状态管理 - Pinia Store
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { 
  getDocument, 
  getKnowledgeDocuments,
  getUserDocuments,
  createDocument, 
  updateDocument, 
  deleteDocument, 
  getRecentDocuments,
  getDocumentVersions,
  createDocumentVersion,
  restoreDocumentVersion,
  deleteDocumentVersion
} from '@/api/document'
import type { 
  GetDocumentResponse,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  GetRecentDocumentsResponse,
  DocumentVersion,
  CreateVersionRequest
} from '@/types/index'


export const useDocumentStore = defineStore('document', () => {
  // 状态
  const currentDocument = ref<GetDocumentResponse | null>(null)
  const documentList = ref<GetDocumentResponse[]>([])
  const knowledgeDocuments = ref<GetDocumentResponse[]>([])  // 当前知识库的文档列表
  const userDocuments = ref<GetDocumentResponse[]>([])  // 用户的所有文档
  const recentDocuments = ref<GetRecentDocumentsResponse[]>([])
  const documentVersions = ref<DocumentVersion[]>([])  // 当前文档的版本列表
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 获取文档详情
  const fetchDocument = async (docId: string) => {
    try {
      loading.value = true
      error.value = null
      const result = await getDocument(docId)
      currentDocument.value = result
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取文档失败'
      console.error('获取文档失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 获取用户加入的共享文档ID列表
  const getSharedDocumentIds = (): string[] => {
    try {
      const stored = localStorage.getItem('userSharedDocuments')
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('获取共享文档列表失败:', error)
      return []
    }
  }

  // 添加共享文档ID
  const addSharedDocumentId = (documentId: string) => {
    try {
      const sharedIds = getSharedDocumentIds()
      if (!sharedIds.includes(documentId)) {
        sharedIds.push(documentId)
        localStorage.setItem('userSharedDocuments', JSON.stringify(sharedIds))
      }
    } catch (error) {
      console.error('保存共享文档ID失败:', error)
    }
  }

  // 移除共享文档ID
  const removeSharedDocumentId = (documentId: string) => {
    try {
      const sharedIds = getSharedDocumentIds()
      const index = sharedIds.indexOf(documentId)
      if (index !== -1) {
        sharedIds.splice(index, 1)
        localStorage.setItem('userSharedDocuments', JSON.stringify(sharedIds))
      }
    } catch (error) {
      console.error('移除共享文档ID失败:', error)
    }
  }

  // 获取知识库下的文档列表（包含共享文档）
  const fetchKnowledgeDocuments = async (knowledgeBaseId: string) => {
    try {
      loading.value = true
      error.value = null
      
      // 检查参数有效性
      if (!knowledgeBaseId || knowledgeBaseId.trim() === '') {
        throw new Error('知识库ID不能为空')
      }
      
      if (knowledgeBaseId.startsWith(':')) {
        throw new Error('知识库ID参数错误：收到路由占位符而非实际值')
      }

      let documents: GetDocumentResponse[] = []
      
      try {
        // 尝试获取知识库的文档
        documents = await getKnowledgeDocuments(knowledgeBaseId)
      } catch (kbError) {
        console.log('知识库文档API失败，使用替代方案')
        documents = []
      }

      // 获取用户的共享文档
      const sharedDocumentIds = getSharedDocumentIds()
      if (sharedDocumentIds.length > 0) {
        try {
          // 获取每个共享文档的详情
          const sharedDocuments = await Promise.all(
            sharedDocumentIds.map(async (docId) => {
              try {
                return await getDocument(docId)
              } catch (error) {
                console.error(`获取共享文档 ${docId} 失败:`, error)
                // 如果文档不存在，从共享列表中移除
                removeSharedDocumentId(docId)
                return null
              }
            })
          )

          // 过滤掉获取失败的文档，并添加到列表中
          const validSharedDocs = sharedDocuments.filter(doc => doc !== null) as GetDocumentResponse[]
          
          // 避免重复：只添加不在知识库文档中的共享文档
          const existingIds = new Set(documents.map(doc => doc.id))
          const uniqueSharedDocs = validSharedDocs.filter(doc => !existingIds.has(doc.id))
          
          documents = [...documents, ...uniqueSharedDocs]
        } catch (error) {
          console.error('获取共享文档失败:', error)
        }
      }

      knowledgeDocuments.value = documents
      return documents
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取文档列表失败'
      console.error('获取知识库文档失败:', err)
      knowledgeDocuments.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  // 获取用户的所有文档
  const fetchUserDocuments = async () => {
    try {
      loading.value = true
      error.value = null
      
      const documents = await getUserDocuments()
      userDocuments.value = documents
      return documents
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取用户文档失败'
      console.error('获取用户文档失败:', err)
      userDocuments.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  // 创建文档
  const createNewDocument = async (data: CreateDocumentRequest) => {
    try {
      loading.value = true
      error.value = null
      const result = await createDocument(data)
      
      // 添加到文档列表
      documentList.value.push(result)
      
      // 如果是当前知识库的文档，也添加到知识库文档列表
      if (result.knowledgeBaseId) {
        knowledgeDocuments.value.unshift(result) // 添加到最前面
        
        // 同步更新知识库store中的文档列表
        const { useKnowledgeStore } = await import('@/stores/knowledge')
        const knowledgeStore = useKnowledgeStore()
        knowledgeStore.addDocumentToKnowledge(result.knowledgeBaseId, result)
      }
      
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建文档失败'
      console.error('创建文档失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 更新文档
  const updateExistingDocument = async (id: string, data: UpdateDocumentRequest) => {
    try {
      loading.value = true
      error.value = null
      const result = await updateDocument(id, data)
      
      // 更新当前文档
      if (currentDocument.value?.id === id) {
        currentDocument.value = result
      }
      
      // 更新文档列表中的数据
      const index = documentList.value.findIndex(doc => doc.id === id)
      if (index !== -1) {
        documentList.value[index] = result
      }
      
      // 更新知识库文档列表中的数据
      const kbIndex = knowledgeDocuments.value.findIndex(doc => doc.id === id)
      if (kbIndex !== -1) {
        knowledgeDocuments.value[kbIndex] = result
      }
      
      // 同步更新知识库store中的文档列表
      if (result.knowledgeBaseId) {
        const { useKnowledgeStore } = await import('@/stores/knowledge')
        const knowledgeStore = useKnowledgeStore()
        knowledgeStore.updateDocumentInKnowledge(result.knowledgeBaseId, result)
      }
      
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新文档失败'
      console.error('更新文档失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 删除文档
  const deleteExistingDocument = async (id: string, knowledgeBaseId?: string) => {
    try {
      loading.value = true
      error.value = null
      await deleteDocument(id)
      
      // 清除当前文档（如果是被删除的文档）
      if (currentDocument.value?.id === id) {
        currentDocument.value = null
      }
      
      // 从文档列表中删除
      const index = documentList.value.findIndex(doc => doc.id === id)
      if (index !== -1) {
        documentList.value.splice(index, 1)
      }
      
      // 从知识库文档列表中删除
      const kbIndex = knowledgeDocuments.value.findIndex(doc => doc.id === id)
      if (kbIndex !== -1) {
        knowledgeDocuments.value.splice(kbIndex, 1)
      }
      
      // 从最近文档中删除
      const recentIndex = recentDocuments.value.findIndex(doc => doc.id === id)
      if (recentIndex !== -1) {
        recentDocuments.value.splice(recentIndex, 1)
      }
      
      // 同步更新知识库store中的文档列表
      if (knowledgeBaseId) {
        const { useKnowledgeStore } = await import('@/stores/knowledge')
        const knowledgeStore = useKnowledgeStore()
        knowledgeStore.removeDocumentFromKnowledge(parseInt(knowledgeBaseId), id)
      }
      
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除文档失败'
      console.error('删除文档失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 获取最近文档
  const fetchRecentDocuments = async (userId: string) => {
    try {
      loading.value = true
      error.value = null
      const result = await getRecentDocuments(userId)
      
      // 为没有知识库ID的最近文档尝试补充知识库信息
      const enrichedRecentDocuments = result.map(doc => {
        if (!doc.knowledgeBaseId) {
          // 尝试从已缓存的文档中获取知识库ID
          const knowledgeBaseId = getKnowledgeBaseIdByDocumentId(doc.id)
          if (knowledgeBaseId) {
            return { ...doc, knowledgeBaseId }
          }
        }
        return doc
      })
      
      recentDocuments.value = enrichedRecentDocuments
      return enrichedRecentDocuments
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取最近文档失败'
      console.error('获取最近文档失败:', err)
      recentDocuments.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  // 设置当前文档
  const setCurrentDocument = (document: GetDocumentResponse | null) => {
    currentDocument.value = document
  }

  // 根据ID获取文档
  const getDocumentById = (id: string) => {
    return documentList.value.find(doc => doc.id === id) || 
           knowledgeDocuments.value.find(doc => doc.id === id) || 
           null
  }

  // 根据文档ID获取知识库ID
  const getKnowledgeBaseIdByDocumentId = (documentId: string): string | null => {
    // 先从当前文档中查找
    if (currentDocument.value?.id === documentId && currentDocument.value.knowledgeBaseId) {
      return currentDocument.value.knowledgeBaseId.toString()
    }
    
    // 从文档列表中查找
    const doc = documentList.value.find(d => d.id === documentId) || 
                knowledgeDocuments.value.find(d => d.id === documentId)
    if (doc && doc.knowledgeBaseId) {
      return doc.knowledgeBaseId.toString()
    }
    
    return null
  }

  // 通过文档ID获取完整的文档信息（包括知识库ID）
  const fetchDocumentWithKnowledgeBase = async (documentId: string) => {
    try {
      // 先尝试获取文档详情
      const document = await fetchDocument(documentId)
      
      // 从文档信息中提取知识库ID
      const knowledgeBaseId = getKnowledgeBaseIdByDocumentId(documentId)
      
      return {
        document,
        knowledgeBaseId
      }
    } catch (error) {
      console.error('获取文档和知识库信息失败:', error)
      throw error
    }
  }

  // 清空状态
  const clearDocuments = () => {
    currentDocument.value = null
    documentList.value = []
    knowledgeDocuments.value = []
    userDocuments.value = []
    recentDocuments.value = []
    error.value = null
  }

  // 清空当前文档
  const clearCurrentDocument = () => {
    currentDocument.value = null
  }

  // 根据知识库ID更新最近文档的知识库信息
  const updateRecentDocumentKnowledgeBase = (documentId: string, knowledgeBaseId: string) => {
    const recentDoc = recentDocuments.value.find(doc => doc.id === documentId)
    if (recentDoc) {
      recentDoc.knowledgeBaseId = knowledgeBaseId
    }
  }

  // 清空知识库文档列表
  const clearKnowledgeDocuments = () => {
    knowledgeDocuments.value = []
  }

  // ============= 版本控制相关方法 =============

  // 获取文档版本列表
  const fetchDocumentVersions = async (docId: string) => {
    try {
      loading.value = true
      error.value = null
      const result = await getDocumentVersions(docId)
      documentVersions.value = result
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取版本列表失败'
      console.error('获取版本列表失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 创建文档版本
  const createNewDocumentVersion = async (docId: string, data: CreateVersionRequest) => {
    try {
      loading.value = true
      error.value = null
      const result = await createDocumentVersion(docId, data)
      
      // 更新版本列表
      documentVersions.value.unshift(result)
      
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建版本失败'
      console.error('创建版本失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 恢复文档版本
  const restoreToVersion = async (docId: string, versionNumber: number) => {
    try {
      loading.value = true
      error.value = null
      const result = await restoreDocumentVersion(docId, versionNumber)
      
      // 添加延迟等待后端操作完成
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 恢复成功后重新获取文档内容
      await fetchDocument(docId)
      
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : '恢复版本失败'
      console.error('恢复版本失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 删除文档版本
  const removeDocumentVersion = async (docId: string, versionNumber: number) => {
    try {
      loading.value = true
      error.value = null
      const result = await deleteDocumentVersion(docId, versionNumber)
      
      // 从本地状态中移除版本
      documentVersions.value = documentVersions.value.filter(
        v => v.versionNumber !== versionNumber
      )
      
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除版本失败'
      console.error('删除版本失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // ============= 协同编辑相关方法 =============

  // 加载文档（用于编辑器）
  const loadDocument = async (documentId: string) => {
    return await fetchDocument(documentId)
  }

  // 更新本地内容（协同编辑时的本地状态更新）
  const updateLocalContent = (content: any) => {
    if (currentDocument.value) {
      currentDocument.value.content = content
    }
  }

  // 应用远程内容变更
  const applyRemoteContentChange = (content: any) => {
    if (currentDocument.value) {
      currentDocument.value.content = content
      // 这里可以添加更多的远程变更处理逻辑
    }
  }

  return {
    // 状态
    currentDocument,
    documentList,
    knowledgeDocuments,
    userDocuments,
    recentDocuments,
    documentVersions,
    loading,
    error,
    
    // 方法
    fetchDocument,
    fetchKnowledgeDocuments,
    fetchUserDocuments,
    createNewDocument,
    updateExistingDocument,
    deleteExistingDocument,
    fetchRecentDocuments,
    setCurrentDocument,
    getDocumentById,
    getKnowledgeBaseIdByDocumentId,
    fetchDocumentWithKnowledgeBase,
    updateRecentDocumentKnowledgeBase,
    clearDocuments,
    clearCurrentDocument,
    clearKnowledgeDocuments,
    fetchDocumentVersions,
    createNewDocumentVersion,
    restoreToVersion,
    removeDocumentVersion,
    
    // 协同编辑方法
    loadDocument,
    updateLocalContent,
    applyRemoteContentChange,

    // 共享文档方法
    getSharedDocumentIds,
    addSharedDocumentId,
    removeSharedDocumentId
  }
}) 