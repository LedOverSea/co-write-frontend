// 知识库状态管理 - Pinia Store
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { 
  getKnowledgeListAPI, 
  createKnowledgeAPI, 
  updateKnowledgeAPI, 
  deleteKnowledgeAPI 
} from '@/api/knowledge'
import { getKnowledgeDocuments } from '@/api/document'
import type { 
  GetKnowledgeListResponse, 
  CreateKnowledgeRequest, 
  UpdateKnowledgeRequest,
  GetDocumentResponse
} from '@/types/index'

// 扩展知识库类型，添加文档列表
interface KnowledgeWithDocs extends GetKnowledgeListResponse {
  docs?: GetDocumentResponse[]
  docsLoaded?: boolean
}

export const useKnowledgeStore = defineStore('knowledge', () => {
  // 状态
  const knowledgeList = ref<KnowledgeWithDocs[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 获取知识库列表
  const fetchKnowledgeList = async (userId: string) => {
    try {
      loading.value = true
      error.value = null
      const result = await getKnowledgeListAPI(userId)
      // 将结果转换为扩展类型，初始化文档列表
      knowledgeList.value = result.map(kb => ({
        ...kb,
        docs: [],
        docsLoaded: false
      }))
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取知识库列表失败'
      console.error('获取知识库列表失败:', err)
      knowledgeList.value = []
      throw err
    } finally {
      loading.value = false
    }
  }

  // 获取知识库下的文档列表
  const fetchKnowledgeDocuments = async (knowledgeId: number) => {
    try {
      const knowledge = knowledgeList.value.find(kb => kb.id === knowledgeId)
      if (!knowledge) {
        throw new Error('知识库不存在')
      }

      // 如果已经加载过文档，直接返回
      if (knowledge.docsLoaded) {
        return knowledge.docs || []
      }

      loading.value = true
      error.value = null
      
      const docs = await getKnowledgeDocuments(knowledgeId.toString())
      
      // 更新知识库的文档列表
      knowledge.docs = docs
      knowledge.docsLoaded = true
      
      return docs
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取知识库文档失败'
      console.error('获取知识库文档失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 创建知识库
  const createKnowledge = async (data: CreateKnowledgeRequest) => {
    try {
      loading.value = true
      error.value = null
      const result = await createKnowledgeAPI(data)
      
      // 添加到本地列表，初始化文档列表
      knowledgeList.value.push({
        ...result,
        docs: [],
        docsLoaded: false
      })
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建知识库失败'
      console.error('创建知识库失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 更新知识库
  const updateKnowledge = async (data: UpdateKnowledgeRequest) => {
    try {
      loading.value = true
      error.value = null
      const result = await updateKnowledgeAPI(data)
      
      // 更新本地列表中的数据
      const index = knowledgeList.value.findIndex(item => item.id === data.id)
      if (index !== -1) {
        // 保持原有的文档数据
        const originalDocs = knowledgeList.value[index].docs
        const originalDocsLoaded = knowledgeList.value[index].docsLoaded
        knowledgeList.value[index] = {
          ...result,
          docs: originalDocs,
          docsLoaded: originalDocsLoaded
        }
      }
      return result
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新知识库失败'
      console.error('更新知识库失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 删除知识库
  const deleteKnowledge = async (id: string) => {
    try {
      loading.value = true
      error.value = null
      await deleteKnowledgeAPI(id)
      
      // 从本地列表中删除
      const index = knowledgeList.value.findIndex(item => item.id.toString() === id)
      if (index !== -1) {
        knowledgeList.value.splice(index, 1)
      }
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除知识库失败'
      console.error('删除知识库失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 根据ID获取知识库
  const getKnowledgeById = (id: number) => {
    return knowledgeList.value.find(item => item.id === id) || null
  }

  // 添加文档到知识库
  const addDocumentToKnowledge = (knowledgeId: number, document: GetDocumentResponse) => {
    const knowledge = knowledgeList.value.find(kb => kb.id === knowledgeId)
    if (knowledge) {
      if (!knowledge.docs) {
        knowledge.docs = []
      }
      knowledge.docs.unshift(document) // 添加到最前面
    }
  }

  // 从知识库中删除文档
  const removeDocumentFromKnowledge = (knowledgeId: number, documentId: string) => {
    const knowledge = knowledgeList.value.find(kb => kb.id === knowledgeId)
    if (knowledge && knowledge.docs) {
      const index = knowledge.docs.findIndex(doc => doc.id === documentId)
      if (index !== -1) {
        knowledge.docs.splice(index, 1)
      }
    }
  }

  // 更新知识库中的文档
  const updateDocumentInKnowledge = (knowledgeId: number, document: GetDocumentResponse) => {
    const knowledge = knowledgeList.value.find(kb => kb.id === knowledgeId)
    if (knowledge && knowledge.docs) {
      const index = knowledge.docs.findIndex(doc => doc.id === document.id)
      if (index !== -1) {
        knowledge.docs[index] = document
      }
    }
  }

  // 清空状态
  const clearKnowledgeList = () => {
    knowledgeList.value = []
    error.value = null
  }

  return {
    // 状态
    knowledgeList,
    loading,
    error,
    
    // 方法
    fetchKnowledgeList,
    fetchKnowledgeDocuments,
    createKnowledge,
    updateKnowledge,
    deleteKnowledge,
    getKnowledgeById,
    addDocumentToKnowledge,
    removeDocumentFromKnowledge,
    updateDocumentInKnowledge,
    clearKnowledgeList
  }
}) 