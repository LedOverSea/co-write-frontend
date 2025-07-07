// // 文档相关 API 接口
// import request from './request'
// import type {
//   CreateDocumentRequest,
//   UpdateDocumentRequest,
//   DeleteDocumentRequest,
//   GetRecentDocumentsRequest,
//   CreateDocumentResponse,
//   UpdateDocumentResponse,
//   DeleteDocumentResponse,
//   GetRecentDocumentsResponse
// } from '@/types/index'


// // 新建文档
// export const createDocument = (data: CreateDocumentRequest): Promise<CreateDocumentResponse> => {
//   return request.post('/api/documents', data)
// }

// // 编辑文档
// export const updateDocument = (id: string, data: UpdateDocumentRequest): Promise<UpdateDocumentResponse> => {
//   return request.put(`/api/documents/${id}`, data)
// }

// // 获取文档详情
// export const getDocumentDetail = (id: string) => {
//   return request.get(`/document/${id}`)
// }

// // 删除文档
// export const deleteDocument = (id: string): Promise<DeleteDocumentResponse> => {
//   return request.delete(`/api/documents/${id}`)
// }


// // 获取最近访问文档
// export const getRecentDocuments = (limit?: number): Promise<GetRecentDocumentsApi['response']> => {
//   return request.get('/api/documents/recent', { params: { limit } })
// }

// 文档相关 API 接口 - 根据接口文档实现
import request from './request'
import type {
  CreateDocumentRequest,
  UpdateDocumentRequest,
  CreateDocumentResponse,
  UpdateDocumentResponse,
  GetDocumentResponse,
  GetRecentDocumentsResponse,
  DocumentDTO,
  GetDocumentPermissionsResponse,
  CreateVersionRequest,
  DocumentVersion,
  DocumentVersionCompareResponse,
  JoinDocumentResponse
} from '@/types/index'

// 获取文档详情 - GET /docs/{docId}
export const getDocument = (docId: string): Promise<GetDocumentResponse> => {
  return request.get(`/docs/${docId}`)
}

// 获取知识库下的文档列表 - GET /docs/kb/{knowledgeBaseId}
export const getKnowledgeDocuments = (knowledgeBaseId: string): Promise<GetDocumentResponse[]> => {
  // 检查是否是路由占位符
  if (knowledgeBaseId.startsWith(':') || knowledgeBaseId === ':knowledgeId') {
    throw new Error('知识库ID参数错误：收到路由占位符而非实际值')
  }
  
  if (!knowledgeBaseId || knowledgeBaseId.trim() === '') {
    throw new Error('知识库ID不能为空')
  }
  
  const url = `/docs/kb/${knowledgeBaseId}`
  return request.get(url)
}

// 获取用户有权访问的所有文档 - GET /docs/my
export const getUserDocuments = (): Promise<GetDocumentResponse[]> => {
  return request.get('/docs/my')
}

// 创建文档 - POST /docs
export const createDocument = (data: CreateDocumentRequest): Promise<CreateDocumentResponse> => {
  return request.post('/docs', data)
}

// 更新文档 - PUT /docs/{id}
export const updateDocument = (id: string, data: UpdateDocumentRequest): Promise<UpdateDocumentResponse> => {
  return request.put(`/docs/${id}`, data)
}

// 删除文档 - DELETE /docs/{id}
export const deleteDocument = (id: string): Promise<boolean> => {
  return request.delete(`/docs/${id}`)
}

// 获取最近访问文档 - GET /docs/recent/{userId}
export const getRecentDocuments = (userId: string): Promise<GetRecentDocumentsResponse[]> => {
  return request.get(`/docs/recent/${userId}`)
}

// ============= 文档权限管理相关接口 =============

// 授权文档权限 - POST /docs/{docId}/permissions/{userId}
export const grantDocumentPermission = (docId: string, userId: string, permission: string): Promise<string> => {
  return request.post(`/docs/${docId}/permissions/${userId}?permission=${permission}`)
}

// 撤销文档权限 - DELETE /docs/{docId}/permissions/{userId}
export const revokeDocumentPermission = (docId: string, userId: string): Promise<string> => {
  return request.delete(`/docs/${docId}/permissions/${userId}`)
}

// 获取文档权限列表 - GET /docs/{docId}/permissions
export const getDocumentPermissions = (docId: string): Promise<GetDocumentPermissionsResponse[]> => {
  return request.get(`/docs/${docId}/permissions`)
}

// ============= 文档版本控制相关接口 =============

// 创建文档版本 - POST /docs/{docId}/versions
export const createDocumentVersion = (docId: string, data: CreateVersionRequest): Promise<DocumentVersion> => {
  return request.post(`/docs/${docId}/versions`, data)
}

// 获取文档版本列表 - GET /docs/{docId}/versions
export const getDocumentVersions = (docId: string): Promise<DocumentVersion[]> => {
  return request.get(`/docs/${docId}/versions`)
}

// 获取指定版本详情 - GET /docs/{docId}/versions/{versionNumber}
export const getDocumentVersionDetail = (docId: string, versionNumber: number): Promise<DocumentVersion> => {
  return request.get(`/docs/${docId}/versions/${versionNumber}`)
}

// 恢复到指定版本 - POST /docs/{docId}/versions/{versionNumber}/restore
export const restoreDocumentVersion = (docId: string, versionNumber: number): Promise<string> => {
  return request.post(`/docs/${docId}/versions/${versionNumber}/restore`)
}

// 删除指定版本 - DELETE /docs/{docId}/versions/{versionNumber}
export const deleteDocumentVersion = (docId: string, versionNumber: number): Promise<string> => {
  return request.delete(`/docs/${docId}/versions/${versionNumber}`)
}

// 版本对比 - GET /docs/{docId}/versions/compare
export const compareDocumentVersions = (docId: string, version1: number, version2: number): Promise<DocumentVersionCompareResponse> => {
  return request.get(`/docs/${docId}/versions/compare?version1=${version1}&version2=${version2}`)
}

// ============= 分享码相关接口 =============

// 创建分享码 - POST /docs/{docId}/shares
export const createShareCode = (docId: string, data: {
  permission: 'read' | 'write'
  expiresAt?: string
  maxUsers?: number
}): Promise<{
  id: string
  documentId: string
  shareCode: string
  permission: string
  createdBy: string
  expiresAt: string | null
  isActive: boolean
  maxUsers: number
  usedCount: number
  createdAt: string
}> => {
  return request.post(`/docs/${docId}/shares`, data)
}

// 通过分享码加入文档 - POST /docs/join
export const joinDocumentByShareCode = (shareCode: string): Promise<JoinDocumentResponse> => {
  return request.post('/docs/join', { shareCode })
}

// 获取文档分享码列表 - GET /docs/{docId}/shares
export const getDocumentShares = (docId: string): Promise<{
  id: string
  documentId: string
  shareCode: string
  permission: string
  createdBy: string
  expiresAt: string | null
  isActive: boolean
  maxUsers: number
  usedCount: number
  createdAt: string
  documentTitle: string
}[]> => {
  return request.get(`/docs/${docId}/shares`)
}

// 禁用分享码 - DELETE /docs/shares/{shareId}
export const disableShareCode = (shareId: string): Promise<string> => {
  return request.delete(`/docs/shares/${shareId}`)
}

// 验证分享码有效性 - GET /docs/shares/validate/{shareCode}
export const validateShareCode = (shareCode: string): Promise<{ valid: boolean }> => {
  return request.get(`/docs/shares/validate/${shareCode}`)
}

// ============= 成员管理相关接口 =============

// 获取文档成员列表 - GET /docs/{docId}/members
export const getDocumentMembers = (docId: string): Promise<{
  userId: string
  username: string
  permission: string
  joinedAt: string
  joinMethod: string
}[]> => {
  return request.get(`/docs/${docId}/members`)
}

// 添加文档成员 - POST /docs/{docId}/members
export const addDocumentMember = (docId: string, data: {
  userId: string
  permission: 'read' | 'write' | 'admin'
}): Promise<string> => {
  return request.post(`/docs/${docId}/members`, data)
}

// 移除文档成员 - DELETE /docs/{docId}/members/{userId}
export const removeDocumentMember = (docId: string, userId: string): Promise<string> => {
  return request.delete(`/docs/${docId}/members/${userId}`)
}

// 修改成员权限 - PUT /docs/{docId}/members/{userId}
export const updateMemberPermission = (docId: string, userId: string, permission: 'read' | 'write' | 'admin'): Promise<string> => {
  return request.put(`/docs/${docId}/members/${userId}`, { permission })
}

// ============= 用户搜索接口 =============

// 搜索用户 - GET /auth/search
export const searchUsers = (keyword: string): Promise<{
  id: number
  username: string
  createdAt: string
  updatedAt: string
}[]> => {
  return request.get('/auth/search', { params: { keyword } })
}

// ============= Yjs协同编辑相关接口 ============= ⭐ 核心

// 获取文档Yjs状态 - GET /docs/{docId}/yjs-state
export const getDocumentYjsState = (docId: string): Promise<ArrayBuffer> => {
  return request.get(`/docs/${docId}/yjs-state`, {
    responseType: 'arraybuffer' // 返回二进制数据
  })
}

// 获取文档在线用户列表 - GET /docs/{docId}/online-users  
export const getDocumentOnlineUsers = (docId: string): Promise<string[]> => {
  return request.get(`/docs/${docId}/online-users`)
}

// 获取文档在线会话数量 - GET /docs/{docId}/online-count
export const getDocumentOnlineCount = (docId: string): Promise<number> => {
  return request.get(`/docs/${docId}/online-count`)
} 