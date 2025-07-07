// 评论相关 API 接口 - 根据评论功能api文档.md重新实现
import request from './request'

// 评论数据接口 - 根据API文档定义
export interface Comment {
  id: string
  documentId: string
  userId: string
  username: string
  content: string
  parentId: string | null
  createdAt: string
  updatedAt: string
  replies: Comment[]
}

// 创建评论请求接口
export interface CreateCommentRequest {
  documentId: string
  content: string
  parentId?: string | null
}

// 创建回复请求接口
export interface CreateReplyRequest {
  documentId: string
  content: string
}

// 修改评论请求接口
export interface UpdateCommentRequest {
  content: string
}

// 添加评论 - POST /docs/comments
export const createComment = (data: CreateCommentRequest): Promise<Comment> => {
  return request.post('/docs/comments', data, {
    headers: {
      'X-User-Id': localStorage.getItem('userId') || ''
    }
  })
}

// 获取文档评论列表 - GET /docs/comments/document/{documentId}
export const getDocumentComments = (documentId: string): Promise<Comment[]> => {
  return request.get(`/docs/comments/document/${documentId}`)
}

// 回复评论 - POST /docs/comments/{parentId}/reply
export const replyToComment = (parentId: string, data: CreateReplyRequest): Promise<Comment> => {
  return request.post(`/docs/comments/${parentId}/reply`, data, {
    headers: {
      'X-User-Id': localStorage.getItem('userId') || ''
    }
  })
}

// 修改评论 - PUT /docs/comments/{commentId}
export const updateComment = (commentId: string, data: UpdateCommentRequest): Promise<Comment> => {
  return request.put(`/docs/comments/${commentId}`, data, {
    headers: {
      'X-User-Id': localStorage.getItem('userId') || ''
    }
  })
}

// 删除评论 - DELETE /docs/comments/{commentId}
export const deleteComment = (commentId: string): Promise<string> => {
  return request.delete(`/docs/comments/${commentId}`, {
    headers: {
      'X-User-Id': localStorage.getItem('userId') || ''
    }
  })
}