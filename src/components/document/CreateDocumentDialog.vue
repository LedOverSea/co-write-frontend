<!-- 创建文档对话框组件 -->
<template>
  <el-dialog
    v-model="visible"
    title="创建文档"
    width="500px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="80px"
    >
      <el-form-item label="文档标题" prop="title">
        <el-input
          v-model="form.title"
          placeholder="请输入文档标题"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>
      
      <el-form-item label="文档描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="请输入文档描述（可选）"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="文档颜色" prop="color">
        <div class="color-picker">
          <div 
            v-for="color in colorOptions" 
            :key="color"
            class="color-option"
            :class="{ active: form.color === color }"
            :style="{ backgroundColor: color }"
            @click="form.color = color"
          ></div>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          :loading="loading"
          @click="handleSubmit"
        >
          创建
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useDocumentStore } from '@/stores/document'
import type { FormInstance } from 'element-plus'

interface Props {
  visible: boolean
  knowledgeBaseId: string
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'success', documentId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const documentStore = useDocumentStore()

// 表单引用
const formRef = ref<FormInstance>()
const loading = ref(false)

// 颜色选项
const colorOptions = [
  '#409EFF', '#67C23A', '#E6A23C', '#F56C6C', 
  '#909399', '#7B68EE', '#FF69B4', '#20B2AA'
]

// 表单数据
const form = reactive({
  title: '',
  description: '',
  color: '#409EFF'
})

// 验证规则
const rules = {
  title: [
    { required: true, message: '请输入文档标题', trigger: 'blur' },
    { min: 1, max: 100, message: '长度在 1 到 100 个字符', trigger: 'blur' }
  ]
}

// 计算属性
const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 提交表单
const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    
    loading.value = true
    
    const result = await documentStore.createNewDocument({
      knowledgeBaseId: props.knowledgeBaseId,
      title: form.title,
      description: form.description,
      color: form.color,
      content: {} // 空内容对象，后续在编辑器中编辑
    })
    
    ElMessage.success('文档创建成功')
    emit('success', result.id)
    handleClose()
    
  } catch (error) {
    console.error('创建文档失败:', error)
    if (error instanceof Error) {
      ElMessage.error(error.message)
    } else {
      ElMessage.error('创建文档失败，请重试')
    }
  } finally {
    loading.value = false
  }
}

// 关闭对话框
const handleClose = () => {
  visible.value = false
  resetForm()
}

// 重置表单
const resetForm = () => {
  formRef.value?.resetFields()
  form.title = ''
  form.description = ''
  form.color = '#409EFF'
}
</script>

<style scoped>
.color-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-option {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: #303133;
  transform: scale(1.1);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style> 