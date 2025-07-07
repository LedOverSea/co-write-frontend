// TypeScript 类型定义 - 根据接口文档重新定义

// ============= 基础类型 =============

// 用户类型 - 根据接口文档ResponseEntityUser
export interface User {
  id: number
  username: string
  password: string
  createdAt: string
  updatedAt: string
}

// 知识库类型 - 根据接口文档ListKnowledgeBase
export interface KnowledgeBase {
  id: number
  name: string
  coverUrl: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

// 知识库DTO - 根据接口文档KnowledgeBaseDTO
export interface KnowledgeBaseDTO {
  id: number
  name: string
  ownerId: string
  coverUrl: string
}

// 文档DTO - 根据接口文档DocumentDTO
export interface DocumentDTO {
  id?: string  // 创建时可选，由后端生成
  knowledgeBaseId?: string  // 改为可选
  title: string  // 修正：接口文档中是title，不是name
  description?: string  // 改为可选
  color?: string  // 改为可选
  content?: any  // 修正：实际应该是对象格式，存储Tiptap JSON
  currentVersion?: number  // 改为可选
}

// 最近文档VO - 根据接口文档ListRecentDocumentVO
export interface RecentDocumentVO {
  id: string
  name: string
  accessTime: string
}

// 文档权限类型 - 根据接口文档ListDocumentPermissions
export interface DocumentPermission {
  id: string
  documentId: string
  userId: string
  permission: string
  createdAt: string
  updatedAt: string
}

// ============= 用户相关类型 =============

// 用户DTO - 根据接口文档UserDTO
export interface UserDTO {
  id: number
  username: string
  password: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
}

// 登录结果 - 根据接口文档ResponseEntityLoginResult
export interface LoginResult {
  token: string
  user: User
}

export interface LoginResponse {
  token: string
  user: User
}

export interface RegisterResponse {
  id: number
  username: string
  password: string
  createdAt: string
  updatedAt: string
}

export interface LogoutRequest {
  token: string
}

// ============= 知识库相关类型 =============

export interface CreateKnowledgeRequest {
  name: string
  ownerId: string
  coverUrl: string
}

export interface UpdateKnowledgeRequest {
  id: number
  name: string
  ownerId: string
  coverUrl: string
}

export interface GetKnowledgeListResponse {
  id: number
  name: string
  coverUrl: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface CreateKnowledgeResponse {
  id: number
  name: string
  coverUrl: string
  ownerId: string
  createdAt: string
  updatedAt: string
}

// ============= 文档相关类型 =============

export interface CreateDocumentRequest {
  knowledgeBaseId: string
  title: string  // 修正：接口文档中是title
  description?: string  // 改为可选
  color?: string  // 改为可选
  content?: DocumentContentItem[] | any  // 修正：支持DocumentContentItem数组或任意格式（创建时可能是简单对象）
  currentVersion?: number  // 改为可选
}

export interface UpdateDocumentRequest {
  id: string
  knowledgeBaseId: string
  title: string  // 修正：接口文档中是title
  description?: string  // 改为可选
  color?: string  // 改为可选
  content?: DocumentContentItem[] | any  // 修正：支持DocumentContentItem数组或任意格式
  currentVersion?: number  // 改为可选
}

// 文档内容项类型
export interface DocumentContentItem {
  html: string
  json: any  // Tiptap JSON格式
  text: string
}

export interface GetDocumentResponse {
  id: string
  title: string
  content: DocumentContentItem[] | null  // 修正：应该是包含html、json、text的对象数组
  currentVersion: number
  knowledgeBaseId: number  // 新增：知识库ID
  createdBy: string  // 新增：创建者ID
  knowledgeBase: string  // 修正：兼容字段，是JSON字符串
  createdAt: string
  updatedAt: string
}

export interface CreateDocumentResponse {
  id: string
  title: string
  content: DocumentContentItem[]  // 修正：应该是包含html、json、text的对象数组
  currentVersion: number
  knowledgeBaseId: number  // 新增：知识库ID
  createdBy: string  // 新增：创建者ID
  knowledgeBase: string  // 修正：兼容字段，是JSON字符串
  createdAt: string
  updatedAt: string
}

export interface UpdateDocumentResponse {
  id: string
  title: string
  content: DocumentContentItem[]
  currentVersion: number
  knowledgeBaseId: number  // 新增：知识库ID
  createdBy: string  // 新增：创建者ID
  knowledgeBase: string  // 修正：兼容字段，是JSON字符串
  createdAt: string
  updatedAt: string
}

export interface GetRecentDocumentsResponse {
  id: string
  name: string
  accessTime: string
  knowledgeBaseId?: string  // 添加知识库ID字段，可选以保持向后兼容
}

// ============= 文档权限相关类型 =============

export interface GrantPermissionRequest {
  docId: string
  userId: string
  permission: string
}

export interface RevokePermissionRequest {
  docId: string
  userId: string
}

export interface GetDocumentPermissionsResponse {
  id: string
  documentId: string
  userId: string
  permission: string
  createdAt: string
  updatedAt: string
}

// ============= 文档版本控制相关类型 =============

// 创建版本请求
export interface CreateVersionRequest {
  versionName: string
  description?: string
}

// 文档版本信息
export interface DocumentVersion {
  id: number
  documentId: string
  versionNumber: number
  versionName: string
  description?: string
  createdBy: string
  createdAt: string
}

// 版本对比相关类型
export interface VersionCompareRequest {
  version1: number
  version2: number
}

export interface VersionInfo {
  versionNumber: number
  versionName: string
  description: string
  createdBy: string
  createdAt: string
}

export interface TextDiff {
  operation: 'INSERT' | 'DELETE' | 'EQUAL'
  text: string
  startIndex: number
  endIndex: number
}

export interface TextComparison {
  diffs: TextDiff[]
  unifiedDiff: string
}

export interface HtmlDiff {
  operation: 'INSERT' | 'DELETE' | 'MODIFY'
  tagName: string
  content: string
  attributes: string | null
  position: number
}

export interface HtmlComparison {
  htmlDiff: string
  structuralDiffs: HtmlDiff[]
}

export interface JsonDiff {
  operation: 'ADD' | 'REMOVE' | 'REPLACE' | 'MOVE' | 'COPY'
  path: string
  oldValue: any
  newValue: any
  description: string
}

export interface JsonComparison {
  diffs: JsonDiff[]
  summary: string
}

export interface DiffStatistics {
  totalChanges: number
  textInsertions: number
  textDeletions: number
  textModifications: number
  htmlInsertions: number
  htmlDeletions: number
  htmlModifications: number
  jsonInsertions: number
  jsonDeletions: number
  jsonModifications: number
  similarityPercentage: number
}

export interface ComparisonResult {
  textComparison: TextComparison
  htmlComparison: HtmlComparison
  jsonComparison: JsonComparison
  statistics: DiffStatistics
}

export interface DocumentVersionCompareResponse {
  documentId: string
  version1: VersionInfo
  version2: VersionInfo
  comparison: ComparisonResult
}

// ============= 分享码相关类型 =============

export interface ShareCode {
  id: string
  documentId: string
  shareCode: string
  permission: 'read' | 'write'
  createdBy: string
  expiresAt: string | null
  isActive: boolean
  maxUsers: number
  usedCount: number
  createdAt: string
  documentTitle?: string
}

export interface CreateShareCodeRequest {
  permission: 'read' | 'write'
  expiresAt?: string
  maxUsers?: number
}

export interface JoinDocumentRequest {
  shareCode: string
}

export interface JoinDocumentResponse {
  success: boolean
  message: string
  documentId: string | null
  documentTitle: string | null
  permission: 'read' | 'write' | 'admin' | null
}

export interface ValidateShareCodeResponse {
  valid: boolean
}

// ============= 成员管理相关类型 =============

export interface DocumentMember {
  userId: string
  username: string
  permission: 'read' | 'write' | 'admin'
  joinedAt: string
  joinMethod: 'invite' | 'share'
}

export interface AddMemberRequest {
  userId: string
  permission: 'read' | 'write' | 'admin'
}

export interface UpdateMemberPermissionRequest {
  permission: 'read' | 'write' | 'admin'
}

// ============= 用户搜索相关类型 =============

export interface SearchUser {
  id: number
  username: string
  createdAt: string
  updatedAt: string
}

// ============= WebSocket协同编辑相关类型 =============

export interface CollaborativeMessage {
  type: 'content-change' | 'cursor-change' | 'user-join' | 'user-leave'
  userId: string
  username?: string
  content?: any
  position?: number
  selection?: {
    from: number
    to: number
  }
  timestamp: number
}

// ============= 评论相关类型 =============

// 评论数据接口 - 根据评论功能API文档定义
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



