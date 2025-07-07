<template>
    <div class="editor-container">
        <!-- 富文本编辑器 -->
        <div class="editor-wrapper">
            <!-- 只在UmoEditor加载完成后才渲染编辑器 -->
            <component
                v-if="UmoEditor"
                :is="UmoEditor"
                ref="editorRef"
                v-bind="editorOptions"
                @update="handleEditorUpdate"
                @ready="handleEditorReady"
                @selection-update="handleSelectionUpdate"
                v-loading="documentLoading"
            />
            <!-- 编辑器加载状态 -->
            <div v-else class="editor-loading">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>正在加载编辑器...</span>
            </div>
        </div>

        <!-- 创建版本对话框 -->
        <el-dialog
            v-model="showCreateVersionDialog"
            title="创建版本节点"
            width="500px"
        >
            <el-form
                ref="versionFormRef"
                :model="versionForm"
                :rules="versionRules"
                label-width="100px"
            >
                <el-form-item label="版本名称" prop="versionName">
                    <el-input
                        v-model="versionForm.versionName"
                        placeholder="请输入版本名称，如：v1.0 - 功能完成"
                        maxlength="100"
                        show-word-limit
                    />
                </el-form-item>
                <el-form-item label="版本描述" prop="description">
                    <el-input
                        v-model="versionForm.description"
                        type="textarea"
                        :rows="4"
                        placeholder="请输入版本描述（可选）"
                        maxlength="500"
                        show-word-limit
                    />
                </el-form-item>
            </el-form>

            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="showCreateVersionDialog = false">取消</el-button>
                    <el-button
                        type="primary"
                        :loading="creatingVersion"
                        @click="handleCreateVersionClick"
                    >
                        创建
                    </el-button>
                </span>
            </template>
        </el-dialog>

        <!-- 版本历史组件 -->
        <VersionHistory
            v-model:visible="showVersionHistory"
            :document-id="documentId"
            :current-version="currentDocument?.currentVersion"
            @version-restored="handleVersionRestored"
        />

        <!-- 版本对比组件 -->
        <VersionCompare
            v-model:visible="showVersionCompare"
            :document-id="documentId"
            :versions="documentVersions"
        />

        <!-- AI摘要组件 -->
        <AISummary
            ref="aiSummaryRef"
            :selected-text="selectedText"
        />
    </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
// 动态导入UmoEditor，避免SSR时的CSS导入问题
// import { UmoEditor } from '@umoteam/editor'
import { ElMessage, ElTag, ElButton, ElDialog, ElForm, ElFormItem, ElInput } from 'element-plus'
import { Clock, DocumentAdd, Histogram, Loading } from '@element-plus/icons-vue'
import type { FormInstance } from 'element-plus'
// import * as Y from 'yjs' 
import SockJS from 'sockjs-client'
import { useDocumentStore } from '@/stores/document'
import { storeToRefs } from 'pinia'
import { extractKnowledgeBaseId, validateDocumentKnowledgeBase } from '@/utils/index'
import { getDocumentVersions } from '@/api/document'
// import { getDocumentYjsState } from '@/api/document' 
import VersionHistory from './VersionHistory.vue'
import VersionCompare from './VersionCompare.vue'
import AISummary from './AISummary.vue'
// 导入防抖函数
import { debounce } from 'perfect-debounce'

// UmoEditor组件引用
let UmoEditor: any = null

// 动态加载UmoEditor
const loadUmoEditor = async () => {
  if (typeof window !== 'undefined' && !UmoEditor) {
    try {
      const module = await import('@umoteam/editor')
      UmoEditor = module.UmoEditor
    } catch (error) {
      console.error('UmoEditor加载失败:', error)
    }
  }
}

// 定义Props
interface Props {
  
  yjsDocument?: any  // 保留兼容性
  collaborationEnabled?: boolean  // 新增：协同编辑启用状态
  syncDelay?: number  // 新增：同步延迟时间（毫秒）
}

const props = withDefaults(defineProps<Props>(), {
  collaborationEnabled: false,
  syncDelay: 800  // 默认800ms延迟
})

// 定义Emits
interface Emits {
  (e: 'content-change', content: any): void
  (e: 'collaboration-status-change', status: 'connected' | 'disconnected' | 'connecting'): void
  (e: 'saving-change', saving: boolean): void
  (e: 'unsaved-changes', hasChanges: boolean): void
  (e: 'save-time-update', time: Date): void
  (e: 'typing-status-change', isTyping: boolean): void
}

const emit = defineEmits<Emits>()

const route = useRoute()
const router = useRouter()
const documentStore = useDocumentStore()

// 从store获取状态
const { currentDocument, loading: documentLoading } = storeToRefs(documentStore)

// 编辑器相关状态
const editorRef = ref()
const aiSummaryRef = ref()
const saving = ref(false)
const hasUnsavedChanges = ref(false)
const autoSaveTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const lastSaveTime = ref<Date | null>(null)
const showVersionHistory = ref(false)
const showVersionCompare = ref(false)
const showCreateVersionDialog = ref(false)
const creatingVersion = ref(false)
const selectedText = ref('')
const documentVersions = ref<any[]>([])

// 协同编辑相关状态
let customProvider: any = null

// 版本表单相关
const versionFormRef = ref<FormInstance>()
const versionForm = ref({
    versionName: '',
    description: ''
})

const versionRules = {
    versionName: [
        { required: true, message: '请输入版本名称', trigger: 'blur' },
        { min: 1, max: 100, message: '版本名称长度为 1-100 个字符', trigger: 'blur' }
    ]
}

// 计算属性
const documentId = computed(() => route.params.documentId as string)
const knowledgeId = computed(() => route.params.knowledgeId as string)

// 创建自定义JSON Provider适配后端SockJS
class CustomJsonProvider {
  private documentId: string
  private userId: string
  private socket: any = null
  private connected = false
  private listeners: Map<string, Function[]> = new Map()
  public pollInterval: any = null

  constructor(ydoc: any, documentId: string, userId: string) {
    // ydoc参数现在不再使用，保留为了兼容性
    this.documentId = documentId
    this.userId = userId
    this.init()
  }

  private async init() {
    try {
      // 1. 获取初始Yjs状态
      await this.loadInitialState()
      
      // 2. 建立SockJS连接
      await this.connect()
      
      // 3. 设置内容监听
      this.setupContentListeners()
      
      console.log('CustomJsonProvider初始化完成')
    } catch (error) {
      console.error('CustomJsonProvider初始化失败:', error)
    }
  }

  private async loadInitialState() {
    // 初始内容通过document_sync消息获取
    console.log('📋 [JSON] JSON模式不需要预加载状态，等待服务器发送document_sync消息')
  }

  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const sockUrl = `http://localhost:8080/collab?docId=${this.documentId}&userId=${this.userId}`
        this.socket = new SockJS(sockUrl)

        this.socket.onopen = () => {
          console.log('CustomJsonProvider SockJS连接已建立')
          this.connected = true
          this.emit('connect')
          resolve()
        }

        this.socket.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.socket.onclose = () => {
          console.log('CustomJsonProvider SockJS连接已关闭')
          this.connected = false
          this.emit('disconnect')
        }

        this.socket.onerror = (error) => {
          console.error('CustomJsonProvider SockJS错误:', error)
          reject(error)
        }

        // 连接超时
        setTimeout(() => {
          if (!this.connected) {
            reject(new Error('连接超时'))
          }
        }, 10000)

      } catch (error) {
        reject(error)
      }
    })
  }

  private handleMessage(data: any) {
    console.log('📨 [JSON] 收到消息:', {
      type: typeof data,
      data: data,
      preview: typeof data === 'string' ? data.substring(0, 100) + '...' : data
    })

    try {
      // 处理JSON格式消息
      if (typeof data === 'string') {
        // 跳过SockJS控制消息
        if (data === 'o' || data === 'h') {
          console.log('🔍 [JSON] 跳过SockJS控制消息:', data)
          return
        }
        
        // 尝试解析JSON消息
        try {
          const message = JSON.parse(data)
          this.handleJsonMessage(message)
          return
        } catch (jsonError) {
          // 如果不是JSON，检查是否是欢迎消息
          if (data.includes('欢迎用户') || data.includes('加入文档协作')) {
            console.log('✅ [JSON] 识别为欢迎消息:', data)
            return
          }
          
          console.log('⚠️ [JSON] 无法解析为JSON，跳过:', data.substring(0, 100) + '...')
        }
      }
    } catch (error) {
      console.error('❌ [JSON] 处理消息失败:', error)
    }
  }

  private handleJsonMessage(message: any) {
    console.log('📋 [JSON] 解析JSON消息:', message)
    
    if (!message || typeof message !== 'object') {
      console.warn('⚠️ [JSON] 无效的JSON消息格式')
      return
    }

    const { type, content, userId, timestamp, docId } = message

    switch (type) {
      case 'document_sync':
        console.log('🔄 [JSON] 处理文档同步消息')
        this.handleDocumentSync(content)
        break
        
      case 'content_update':
        console.log('📝 [JSON] 处理内容更新消息')
        this.handleContentUpdate(content, userId)
        break
        
      default:
        console.log('⚠️ [JSON] 未知消息类型:', type)
    }
  }

  private handleDocumentSync(content: string) {
    console.log('🔄 [JSON] 同步文档内容:', {
      content: content?.substring(0, 100) + '...',
      length: content?.length || 0
    })
    
    if (typeof content === 'string') {
      // 直接通知外部更新编辑器
      this.emit('document-sync', content)
    }
  }

  private handleContentUpdate(content: string, userId: string) {
    console.log('📝 [JSON] 处理远程内容更新:', {
      content: content?.substring(0, 100) + '...',
      length: content?.length || 0,
      from: userId
    })
    
    if (typeof content === 'string') {
      // 通知外部有远程更新
      this.emit('remote-update', content)
    }
  }

  // JSON模式下不需要Yjs监听器
  private setupContentListeners() {
    // 内容发送由外部编辑器直接调用sendContentUpdate
    console.log('📋 [JSON] JSON模式已启用，等待外部内容更新调用')
  }

  sendContentUpdate(content: any) {
    if (!this.socket || !this.connected) return

    try {
      const message = {
        type: 'content_update',
        content: content, // 支持对象格式
        userId: this.userId,
        timestamp: Date.now(),
        docId: this.documentId
      }
      
      const jsonMessage = JSON.stringify(message)
      this.socket.send(jsonMessage)
      console.log('📤 [JSON] 发送内容更新:', {
        contentType: typeof content,
        isObject: typeof content === 'object',
        preview: typeof content === 'object' ? JSON.stringify(content).substring(0, 100) : content?.substring(0, 100),
        length: typeof content === 'string' ? content.length : JSON.stringify(content).length,
        userId: this.userId
      })
    } catch (error) {
      console.error('❌ [JSON] 发送内容更新失败:', error)
    }
  }

  // 事件监听器管理
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  private emit(event: string, ...args: any[]) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(...args))
    }
  }

  destroy() {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
    
    // 清理轮询定时器
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    
    this.connected = false
    this.listeners.clear()
  }
}

// UmoEditor配置选项
const editorOptions = computed(() => {
  const baseOptions: any = {
    // 基础配置
    height: 'calc(100vh - 200px)',
    placeholder: '开始编写文档...'
  }

  // JSON协同编辑模式：不使用UmoEditor内置协同编辑
  // 普通编辑模式
  baseOptions.document = {
    content: currentDocument.value?.content?.[0]?.json || ''
  }
  
  // 设置保存回调
  baseOptions.onSave = handleSave

  return baseOptions
})

// 全局的编辑器内容发送函数
let currentEditor: any = null
let isUpdatingFromRemote = false

const sendEditorContentImmediate = () => {
  if (isUpdatingFromRemote || !currentEditor) return
  
  // 检查用户是否正在输入
  if (isUserTyping.value) {
    return
  }
  
  try {
    // 获取编辑器完整内容（保持格式）
    let content: any = null
    
    // 优先使用getContent()获取结构化内容
    if (currentEditor.getContent) {
      content = currentEditor.getContent()
    }
    // 备选：使用getHTML()获取HTML格式
    else if (currentEditor.getHTML) {
      content = currentEditor.getHTML()
    }
    // 最后选择：使用getText()获取纯文本
    else if (currentEditor.getText) {
      content = currentEditor.getText()
    }
    
    if (content !== null && content !== undefined) {
      // 通过自定义Provider发送内容（保持原格式）
      if (customProvider && customProvider.sendContentUpdate) {
        customProvider.sendContentUpdate(content)
      }
    }
  } catch (error) {
    console.warn('发送编辑器内容失败:', error)
  }
}

// JSON模式的编辑器同步
const setupJsonSync = (editor: any) => {
  // 保存编辑器引用
  currentEditor = editor

  // 创建智能发送函数（结合用户输入检测和防抖）
  const sendEditorContent = () => {
    // 如果用户正在输入，不发送
    if (isUserTyping.value) {
      return
    }
    
    // 如果设置了延迟且用户不在输入，使用防抖
    if (props.syncDelay > 0) {
      // 创建临时防抖函数
      if (!sendEditorContent._debouncedFn) {
        sendEditorContent._debouncedFn = debounce(sendEditorContentImmediate, props.syncDelay)
      }
      sendEditorContent._debouncedFn()
    } else {
      // 立即发送
      sendEditorContentImmediate()
    }
  }
  
  // 为防抖函数添加存储属性
  ;(sendEditorContent as any)._debouncedFn = null
  
  // 监听编辑器事件
  if (editor.on) {
    // 尝试监听update事件
    editor.on('update', sendEditorContent)
    // 尝试监听change事件
    editor.on('change', sendEditorContent)
    // 尝试监听content-change事件
    editor.on('content-change', sendEditorContent)
  } else {
    // 作为fallback，使用轮询检测内容变化
    let lastContent = ''
    const pollInterval = setInterval(() => {
      try {
        let currentContent = ''
        if (editor.getText) {
          currentContent = editor.getText()
        } else if (editor.getContent) {
          currentContent = editor.getContent()
          if (typeof currentContent === 'string' && currentContent.includes('<')) {
            currentContent = currentContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ')
          }
        }
        
        if (currentContent !== lastContent) {
          lastContent = currentContent
          sendEditorContent()
        }
      } catch (error) {
        console.warn('轮询检测编辑器内容失败:', error)
      }
    }, 500) // 每500ms检测一次
    
    // 存储定时器ID以便清理
    if (customProvider) {
      customProvider.pollInterval = pollInterval
    }
  }

  // 标记为远程更新时的标志函数
  const setRemoteUpdateFlag = (flag: boolean) => {
    isUpdatingFromRemote = flag
  }

  // 将标志函数绑定到customProvider
  if (customProvider) {
    (customProvider as any).setRemoteUpdateFlag = setRemoteUpdateFlag
  }
  
}

// 设置协同编辑
const setupCollaboration = () => {
  // 获取用户ID - 从localStorage或用户store获取
  const userId = localStorage.getItem('userId') || '1'
  
  // 创建自定义Provider
  customProvider = new CustomJsonProvider(null, documentId.value, userId)
  
  // 监听连接状态
  customProvider.on('connect', () => {
    emit('collaboration-status-change', 'connected')
  })
  
  customProvider.on('disconnect', () => {
    emit('collaboration-status-change', 'disconnected')
  })
  
  // 监听文档同步事件
  customProvider.on('document-sync', (content: any) => {
    updateEditorContent(content, '文档同步')
  })

  // 监听远程更新事件
  customProvider.on('remote-update', (content: any) => {
    updateEditorContent(content, '远程更新')
  })

  // 统一的编辑器内容更新函数
  const updateEditorContent = (content: any, source: string) => {
    nextTick(() => {
      if (editorRef.value && content !== null && content !== undefined) {
        const editor = editorRef.value.editor || editorRef.value
        if (editor) {
          // 获取当前编辑器内容进行比较（使用相同的格式）
          let currentContent: any = null
          if (editor.getContent) {
            currentContent = editor.getContent()
          } else if (editor.getHTML) {
            currentContent = editor.getHTML()
          } else if (editor.getText) {
            currentContent = editor.getText()
          }
          
          // 智能内容比较，减少不必要的更新
          const contentStr = typeof content === 'object' ? JSON.stringify(content) : content
          const currentStr = typeof currentContent === 'object' ? JSON.stringify(currentContent) : currentContent
          const isDifferent = contentStr !== currentStr
          
          if (isDifferent) {
            // 对于远程更新，检查用户是否正在输入
            if (source === '远程更新') {
              // 如果用户正在输入，完全阻止远程更新
              if (isUserTyping.value) {
                return
              }
              
              // 检查内容差异，只跳过非常小的差异（可能是格式差异）
              const contentLength = typeof content === 'string' ? content.length : JSON.stringify(content).length
              const currentLength = typeof currentContent === 'string' ? currentContent.length : JSON.stringify(currentContent).length
              const lengthDiff = Math.abs(contentLength - currentLength)
              
              if (lengthDiff < 2) {
                return
              }
            }
            
            // 设置远程更新标志以避免循环
            if (source === '远程更新' && customProvider && (customProvider as any).setRemoteUpdateFlag) {
              (customProvider as any).setRemoteUpdateFlag(true)
            }
            
            // 更新编辑器内容（优先使用setContent保持格式）
            let updateSuccess = false
            
            // 优先使用setContent（支持富文本格式）
            if (editor.setContent && typeof editor.setContent === 'function') {
              try {
                editor.setContent(content)
                updateSuccess = true
              } catch (e) {
                console.error(`${source} setContent失败:`, e)
              }
            }
            
            // 备选：如果setContent失败且内容是字符串，尝试setText
            if (!updateSuccess && typeof content === 'string' && editor.setText && typeof editor.setText === 'function') {
              try {
                editor.setText(content)
                updateSuccess = true
              } catch (e) {
                console.error(`${source} setText失败:`, e)
              }
            }
            
            // 清除远程更新标志
            if (source === '远程更新' && customProvider && (customProvider as any).setRemoteUpdateFlag) {
              setTimeout(() => {
                (customProvider as any).setRemoteUpdateFlag(false)
              }, 100)
            }
          }
        }
      }
    })
  }
  
  // 设置编辑器协同编辑
  nextTick(() => {
    if (editorRef.value) {
      // 获取UmoEditor实例
      const editor = editorRef.value.editor || editorRef.value
      
      if (editor) {
        // UmoEditor可能支持协同编辑，但我们使用手动同步确保兼容性
        setupJsonSync(editor)
      } else {
        setTimeout(() => setupCollaboration(), 500)
      }
    }
  })
}

// JSON协同编辑初始化 - 修改为不自动连接
watch(() => documentId.value, (newDocId, oldDocId) => {
  if (oldDocId && customProvider) {
    // 清理旧的Provider
    customProvider.destroy()
    customProvider = null
  }
}, { immediate: true })

// 监听协同编辑启用状态
watch(() => props.collaborationEnabled, (enabled, wasEnabled) => {
  if (enabled && !wasEnabled && documentId.value) {
    // 启用协同编辑
    setupCollaboration()
  } else if (!enabled && wasEnabled && customProvider) {
    // 禁用协同编辑
    customProvider.destroy()
    customProvider = null
    emit('collaboration-status-change', 'disconnected')
  }
})

// 清理资源
onUnmounted(() => {
  if (customProvider) {
    customProvider.destroy()
    customProvider = null
  }
  
  if (autoSaveTimer.value) {
    clearInterval(autoSaveTimer.value)
  }
})

// 格式化保存时间
const formatSaveTime = (time: Date) => {
    const now = new Date()
    const diff = Math.floor((now.getTime() - time.getTime()) / 1000) // 秒差
    
    if (diff < 60) {
        return '刚刚'
    } else if (diff < 3600) {
        return `${Math.floor(diff / 60)}分钟前`
    } else if (diff < 86400) {
        return `${Math.floor(diff / 3600)}小时前`
    } else {
        return time.toLocaleDateString() + ' ' + time.toLocaleTimeString().slice(0, 5)
    }
}

// AI助手配置方法（简化版本）
const handleAIMessage = async (payload: any, content: any) => {
    // 临时返回提示信息，避免配置错误
    return '暂不支持AI功能'
}

// 文档保存方法
const handleSave = async (content: any, page: any, document: any) => {
    if (!currentDocument.value) {
        throw new Error('当前文档不存在')
    }
    
    try {
        saving.value = true
        emit('saving-change', true)
        
        // 无论传入什么参数，都主动获取编辑器的当前内容以确保准确性
        const actualContent = await getCurrentEditorContent()
        
        // 处理内容格式，转换为后端期望的结构
        let formattedContent = []
        
        if (actualContent) {
            let contentItem: any = {}
            
            // 如果content是对象（JSON格式）
            if (typeof actualContent === 'object' && actualContent.type) {
                contentItem.json = actualContent
                
                // 尝试从JSON转换为HTML和text
                contentItem.html = convertJsonToHtml(actualContent)
                contentItem.text = convertJsonToText(actualContent)
            }
            // 如果content是HTML字符串
            else if (typeof actualContent === 'string' && actualContent.trim()) {
                contentItem.html = actualContent
                contentItem.text = stripHtmlTags(actualContent)
                
                // 如果可能，尝试解析为JSON结构
                try {
                    contentItem.json = convertHtmlToJson(actualContent)
                } catch (e) {
                    // 如果转换失败，创建基本的JSON结构
                    contentItem.json = {
                        type: "doc",
                        content: [{
                            type: "paragraph",
                            content: [{ type: "text", text: contentItem.text }]
                        }]
                    }
                }
            }
            // 处理空内容或无效内容
            else {
                contentItem = {
                    html: '<p></p>',
                    json: { type: "doc", content: [] },
                    text: ''
                }
            }
            
            formattedContent = [contentItem]
        } else {
            // 如果没有内容，创建空内容
            formattedContent = [{
                html: '<p></p>',
                json: { type: "doc", content: [] },
                text: ''
            }]
        }
        
        // 调用后端API保存文档
        await documentStore.updateExistingDocument(documentId.value, {
            id: currentDocument.value.id,
            knowledgeBaseId: knowledgeId.value,
            title: currentDocument.value.title,
            description: '',
            color: '',
            content: formattedContent,
            currentVersion: currentDocument.value.currentVersion + 1
        })
        
        hasUnsavedChanges.value = false
        lastSaveTime.value = new Date()
        emit('unsaved-changes', false)
        emit('save-time-update', lastSaveTime.value)
        ElMessage.success('文档保存成功')
        return true
        
    } catch (error) {
        console.error('保存文档失败:', error)
        ElMessage.error('保存文档失败: ' + (error as Error).message)
        throw error
    } finally {
        saving.value = false
        emit('saving-change', false)
    }
}

// 获取当前编辑器内容的统一方法
const getCurrentEditorContent = async () => {
    if (!editorRef.value) {
        return editorOptions.value.document.content
    }
    
    try {
        // 尝试多种方法获取编辑器内容
        if (editorRef.value.getJSON) {
            return editorRef.value.getJSON()
        }
        
        if (editorRef.value.getDocument) {
            return editorRef.value.getDocument()
        }
        
        if (editorRef.value.getHTML) {
            return editorRef.value.getHTML()
        }
        
        // 如果都没有，尝试访问编辑器的内部属性
        if (editorRef.value.editor && editorRef.value.editor.getJSON) {
            return editorRef.value.editor.getJSON()
        }
        
        if (editorRef.value.editor && editorRef.value.editor.getHTML) {
            return editorRef.value.editor.getHTML()
        }
        
        // 最后尝试配置中的内容
        return editorOptions.value.document.content
        
    } catch (error) {
        console.error('获取编辑器内容失败:', error)
        return editorOptions.value.document.content
    }
}

// 辅助函数：从JSON转换为HTML
const convertJsonToHtml = (jsonContent: any): string => {
    if (!jsonContent) return '<p></p>'
    
    // 如果是doc类型，处理其content
    if (jsonContent.type === 'doc' && jsonContent.content && Array.isArray(jsonContent.content)) {
        const htmlParts = jsonContent.content.map(convertNodeToHtml).filter(html => html.trim())
        return htmlParts.length > 0 ? htmlParts.join('') : '<p></p>'
    }
    
    // 其他情况使用简单转换
    const text = extractTextFromJson(jsonContent)
    return text ? `<p>${text}</p>` : '<p></p>'
}

// 辅助函数：将单个节点转换为HTML
const convertNodeToHtml = (node: any): string => {
    if (!node) return ''
    
    switch (node.type) {
        case 'paragraph':
            const content = node.content && Array.isArray(node.content) 
                ? node.content.map(convertNodeToHtml).join('') 
                : ''
            return `<p>${content}</p>`
        
        case 'text':
            return node.text || ''
        
        case 'heading':
            const level = node.attrs?.level || 1
            const headingContent = node.content && Array.isArray(node.content) 
                ? node.content.map(convertNodeToHtml).join('') 
                : ''
            return `<h${level}>${headingContent}</h${level}>`
        
        default:
            // 对于未知类型，尝试提取文本内容
            return extractTextFromJson(node)
    }
}

// 辅助函数：从JSON提取纯文本
const convertJsonToText = (jsonContent: any): string => {
    return extractTextFromJson(jsonContent)
}

// 辅助函数：从JSON结构提取文本
const extractTextFromJson = (node: any): string => {
    if (!node) return ''
    
    if (node.type === 'text') {
        return node.text || ''
    }
    
    if (node.content && Array.isArray(node.content)) {
        return node.content.map(extractTextFromJson).join('')
    }
    
    return ''
}

// 辅助函数：去除HTML标签
const stripHtmlTags = (html: string): string => {
    const div = document.createElement('div')
    div.innerHTML = html
    return div.textContent || div.innerText || ''
}

// 辅助函数：HTML转JSON（简单实现）
const convertHtmlToJson = (html: string): any => {
    // 这里实现简单的HTML到JSON转换
    // 实际项目中可能需要更复杂的解析逻辑
    const text = stripHtmlTags(html)
    return {
        type: "doc",
        content: [{
            type: "paragraph",
            attrs: {
                indent: null,
                textAlign: null,
                lineHeight: 1.5,
                margin: {}
            },
            content: text ? [{ type: "text", text }] : []
        }]
    }
}



// 手动保存
const manualSave = async () => {
    if (hasUnsavedChanges.value && currentDocument.value) {
        try {
            // 使用统一的内容获取方法
            const content = await getCurrentEditorContent()
            await handleSave(content, null, null)
        } catch (error) {
            // 错误已在handleSave中处理
        }
    }
}

// 文件上传方法
const handleFileUpload = async (file: File) => {
    // TODO: 实现文件上传API
    // 暂时返回一个模拟的结果
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                id: Date.now().toString(),
                url: URL.createObjectURL(file),
                name: file.name,
                type: file.type,
                size: file.size
            })
        }, 1000)
    })
}

// 编辑器事件处理
const handleEditorReady = () => {
    // 延迟一点时间再设置内容，确保编辑器完全初始化
    setTimeout(() => {
        loadDocumentContent()
    }, 100)
}

const handleEditorUpdate = (event: any) => {
    // UmoEditor会自动管理内容变化状态，我们只需要更新UI状态
    hasUnsavedChanges.value = true
    emit('unsaved-changes', true)
    
    // 触发内容变化事件
    emit('content-change', event)
    
    // 尝试同步更新配置中的内容（作为备用）
    if (event && (typeof event === 'string' || (typeof event === 'object' && event.type))) {
        editorOptions.value.document.content = event
    }
    
    // 设置自动保存定时器（JSON协同编辑模式下不需要自动保存）
    if (true) { // JSON模式下继续使用自动保存
        if (autoSaveTimer.value) {
            clearTimeout(autoSaveTimer.value)
        }
        autoSaveTimer.value = setTimeout(async () => {
            if (hasUnsavedChanges.value && currentDocument.value) {
                try {
                    // 使用统一的内容获取方法
                    const content = await getCurrentEditorContent()
                    await handleSave(content, null, null)
                } catch (error) {
                    // 自动保存失败时不显示错误消息，避免打扰用户
                }
            }
        }, 5000) // 5秒后自动保存
    }
}

const handleSelectionUpdate = (event: any) => {
    // 处理选择变化，获取选中的文本用于AI摘要功能
    updateSelectedText()
}

// 更新选中文本的统一方法
const updateSelectedText = () => {
    try {
        // 优先使用浏览器原生API，这是最可靠的方法
        const selection = window.getSelection()
        if (selection && selection.toString().trim()) {
            selectedText.value = selection.toString().trim()
        } else {
            selectedText.value = ''
        }
    } catch (error) {
        console.error('处理文本选择失败:', error)
        selectedText.value = ''
    }
}



// 加载文档内容到编辑器
const loadDocumentContent = () => {
    if (!currentDocument.value) {
        return
    }
    
    try {
        let editorContent = '<p></p>' // 默认内容
        
        // 解析后端返回的content数组
        if (currentDocument.value.content && Array.isArray(currentDocument.value.content)) {
            const contentArray = currentDocument.value.content
            
            if (contentArray.length > 0) {
                const firstContent = contentArray[0]
                
                // 根据内容结构选择合适的格式
                if (firstContent && typeof firstContent === 'object') {
                    // 优先使用json格式（适合UmoEditor）
                    if (firstContent.json && typeof firstContent.json === 'object') {
                        editorContent = firstContent.json
                    }
                    // 如果没有json，使用html格式
                    else if (firstContent.html && typeof firstContent.html === 'string') {
                        editorContent = firstContent.html
                    }
                    // 如果没有html，使用text格式
                    else if (firstContent.text && typeof firstContent.text === 'string') {
                        editorContent = `<p>${firstContent.text}</p>`
                    }
                    // 如果内容对象直接是html字符串
                    else if (typeof firstContent === 'string') {
                        editorContent = firstContent
                    }
                }
                // 如果content数组的元素直接是字符串
                else if (typeof firstContent === 'string') {
                    editorContent = firstContent
                }
            }
        }
        // 如果content不是数组，可能是直接的字符串或对象
        else if (currentDocument.value.content) {
            editorContent = currentDocument.value.content
        }
        

        
        // 更新编辑器配置中的文档内容
        editorOptions.value.document.content = editorContent
        
        // 直接设置编辑器内容
        if (editorRef.value) {
            const editor = editorRef.value.editor || editorRef.value
            if (editor && editor.setContent) {
                nextTick(() => {
                    editor.setContent(editorContent)
                })
            }
        }
        
        hasUnsavedChanges.value = false
        emit('unsaved-changes', false)
        
    } catch (error) {
        console.error('设置编辑器内容失败:', error)
        ElMessage.error('设置编辑器内容失败')
        // 设置默认内容以防止编辑器空白
        editorOptions.value.document.content = '<p></p>'
    }
}

// 文档加载
const loadDocument = async () => {
    if (!documentId.value) {
        ElMessage.warning('文档ID不存在')
        return
    }
    
    try {
        await documentStore.fetchDocument(documentId.value)
        
        // 验证获取到的文档是否属于当前知识库
        if (currentDocument.value && knowledgeId.value) {
            const isValidKnowledgeBase = validateDocumentKnowledgeBase(currentDocument.value, knowledgeId.value)
            
            if (!isValidKnowledgeBase) {
                const actualKnowledgeBaseId = extractKnowledgeBaseId(currentDocument.value)
                if (actualKnowledgeBaseId) {
                    router.replace(`/knowledge/${actualKnowledgeBaseId}/document/${documentId.value}`)
                    return
                } else {
                    ElMessage.error('文档所属知识库信息异常')
                    return
                }
            }
        }
        
        // 文档加载成功后，在下一个tick中设置内容
        await nextTick()
        loadDocumentContent()
        
        // 更新最近文档中的知识库ID信息
        if (currentDocument.value && knowledgeId.value) {
            documentStore.updateRecentDocumentKnowledgeBase(documentId.value, knowledgeId.value)
        }
        
    } catch (error) {
        console.error('加载文档失败:', error)
        ElMessage.error('加载文档失败: ' + (error as Error).message)
        
        // 如果是因为文档不存在或权限问题，可以考虑重定向到知识库页面
        if (knowledgeId.value) {
            setTimeout(() => {
                router.replace(`/knowledge/${knowledgeId.value}`)
            }, 2000)
        }
    }
}

// 全局选择事件监听
const handleGlobalSelectionChange = () => {
    updateSelectedText()
}

// 快捷键处理
const handleGlobalKeydown = (event: KeyboardEvent) => {
    // Ctrl+S 保存
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        manualSave()
    }
    // Ctrl+Shift+S AI摘要
    else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
        event.preventDefault()
        if (aiSummaryRef.value && selectedText.value.trim()) {
            aiSummaryRef.value.generateAISummary()
        } else {
            ElMessage.warning('请先选中文字再使用快捷键生成摘要')
        }
    }
}

// 用户输入状态管理
const isUserTyping = ref(false)
const isComposing = ref(false)  // 中文输入法状态
let typingTimer: ReturnType<typeof setTimeout> | null = null
let compositionTimer: ReturnType<typeof setTimeout> | null = null

// 键盘输入检测
const handleInputStart = () => {
    if (!isUserTyping.value) {
        isUserTyping.value = true
        emit('typing-status-change', true)
    }
    
    // 清除之前的定时器
    if (typingTimer) {
        clearTimeout(typingTimer)
        typingTimer = null
    }
}

const handleInputEnd = () => {
    // 如果正在使用输入法，不立即结束输入状态
    if (isComposing.value) {
        return
    }
    
    // 清除之前的定时器
    if (typingTimer) {
        clearTimeout(typingTimer)
    }
    
    // 1.5秒后认为用户停止输入
    typingTimer = setTimeout(() => {
        isUserTyping.value = false
        emit('typing-status-change', false)
        typingTimer = null
        
        // 用户停止输入后，主动触发一次同步
        if (editorRef.value) {
            const editor = editorRef.value.editor || editorRef.value
            if (editor) {
                // 直接调用立即发送函数，避免再次防抖
                sendEditorContentImmediate()
            }
        }
    }, 1500)
}

// 输入法状态检测
const handleCompositionStart = () => {
    isComposing.value = true
    isUserTyping.value = true
    
    if (compositionTimer) {
        clearTimeout(compositionTimer)
        compositionTimer = null
    }
}

const handleCompositionEnd = () => {
    isComposing.value = false
    
    // 输入法结束后，延迟一下再检查是否停止输入
    if (compositionTimer) {
        clearTimeout(compositionTimer)
    }
    
    compositionTimer = setTimeout(() => {
        handleInputEnd()
        compositionTimer = null
    }, 500)
}

// 键盘事件处理
const handleKeyboardEvent = (event: KeyboardEvent) => {
    // 忽略功能键
    const ignoredKeys = ['Control', 'Alt', 'Shift', 'Meta', 'Tab', 'CapsLock', 'Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12']
    
    if (!ignoredKeys.includes(event.key)) {
        handleInputStart()
    }
}

// 生命周期
onMounted(async () => {
    // 先动态加载UmoEditor
    await loadUmoEditor()
    
    // 添加事件监听
    document.addEventListener('keydown', handleGlobalKeydown)
    document.addEventListener('keydown', handleKeyboardEvent) // 键盘输入检测
    document.addEventListener('keyup', handleInputEnd) // 键盘释放检测
    document.addEventListener('input', handleInputStart) // 输入事件检测
    document.addEventListener('compositionstart', handleCompositionStart) // 输入法开始
    document.addEventListener('compositionend', handleCompositionEnd) // 输入法结束
    document.addEventListener('selectionchange', handleGlobalSelectionChange)
    
    // 加载文档
    await loadDocument()
    
    // 确保编辑器内容被正确设置 - 添加延迟重试机制
    setTimeout(() => {
        if (currentDocument.value) {
            loadDocumentContent()
            
            // 如果编辑器还没初始化，再等一会儿
            setTimeout(() => {
                loadDocumentContent()
            }, 1000)
        }
    }, 500)
})

onUnmounted(() => {
    // 清理定时器
    if (typingTimer) {
        clearTimeout(typingTimer)
        typingTimer = null
    }
    if (compositionTimer) {
        clearTimeout(compositionTimer)
        compositionTimer = null
    }
    
    // 移除事件监听
    document.removeEventListener('keydown', handleGlobalKeydown)
    document.removeEventListener('keydown', handleKeyboardEvent)
    document.removeEventListener('keyup', handleInputEnd)
    document.removeEventListener('input', handleInputStart)
    document.removeEventListener('compositionstart', handleCompositionStart)
    document.removeEventListener('compositionend', handleCompositionEnd)
    document.removeEventListener('selectionchange', handleGlobalSelectionChange)
    
    // 清理自动保存定时器
    if (autoSaveTimer.value) {
        clearTimeout(autoSaveTimer.value)
        autoSaveTimer.value = null
    }
})

// 监听路由变化
watch(() => route.params.documentId, async (newDocId) => {
    if (newDocId) {
        await loadDocument()
    }
})



// 版本历史处理
const handleVersionRestored = async () => {
    // 版本恢复后重新加载文档内容
    try {
        await loadDocument()
        
        ElMessage.success('文档已恢复')
        showVersionHistory.value = false
        
        // 立即刷新页面
        window.location.reload()
        
    } catch (error) {
        console.error('重新加载文档失败:', error)
        ElMessage.error('重新加载文档失败')
    }
}

// 创建版本处理
const handleCreateVersionClick = async () => {
    try {
        await versionFormRef.value?.validate()
        
        creatingVersion.value = true
        
        await documentStore.createNewDocumentVersion(documentId.value, versionForm.value)
        
        ElMessage.success('版本创建成功')
        showCreateVersionDialog.value = false
        resetVersionForm()
        
    } catch (error) {
        console.error('创建版本失败:', error)
        if (error instanceof Error) {
            ElMessage.error('创建版本失败: ' + error.message)
        } else {
            ElMessage.error('创建版本失败，请重试')
        }
    } finally {
        creatingVersion.value = false
    }
}

// 重置版本表单
const resetVersionForm = () => {
    versionFormRef.value?.resetFields()
    versionForm.value = {
        versionName: '',
        description: ''
    }
}

// 加载文档版本列表
const loadDocumentVersions = async () => {
    if (!documentId.value) return
    
    try {
        documentVersions.value = await getDocumentVersions(documentId.value)
    } catch (error) {
        console.error('加载版本列表失败:', error)
        ElMessage.error('加载版本列表失败')
    }
}

// 监听版本对比对话框显示状态
watch(showVersionCompare, (visible) => {
    if (visible) {
        loadDocumentVersions()
    }
})

// 暴露方法给父组件
defineExpose({
    manualSave
})

</script>

<style scoped>
.editor-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
}

.editor-wrapper {
    flex: 1;
    overflow: hidden;
}

.editor-loading {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}
</style>

