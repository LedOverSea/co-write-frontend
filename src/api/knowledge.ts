// 知识库相关接口 - 根据接口文档重构
import request from './request'
import type {
  CreateKnowledgeRequest,
  UpdateKnowledgeRequest,
  GetKnowledgeListResponse,
  CreateKnowledgeResponse,
  KnowledgeBaseDTO
} from '@/types/index'

// 获取知识库列表 - GET /kbs/{id}
export const getKnowledgeListAPI = (userId: string): Promise<GetKnowledgeListResponse[]> => {
  return request.get(`/kbs/${userId}`)
}

// 创建知识库 - POST /kbs
export const createKnowledgeAPI = (data: CreateKnowledgeRequest): Promise<CreateKnowledgeResponse> => {
  const knowledgeBaseDTO: KnowledgeBaseDTO = {
    id: 0, // 创建时ID由后端生成
    name: data.name,
    ownerId: data.ownerId,
    coverUrl: data.coverUrl
  }
  return request.post('/kbs', knowledgeBaseDTO)
}

// 更新知识库 - PUT /kbs
export const updateKnowledgeAPI = (data: UpdateKnowledgeRequest): Promise<CreateKnowledgeResponse> => {
  const knowledgeBaseDTO: KnowledgeBaseDTO = {
    id: data.id,
    name: data.name,
    ownerId: data.ownerId,
    coverUrl: data.coverUrl
  }
  return request.put('/kbs', knowledgeBaseDTO)
}

// 删除知识库 - DELETE /kbs/{id}
export const deleteKnowledgeAPI = (id: string): Promise<boolean> => {
  return request.delete(`/kbs/${id}`)
} 