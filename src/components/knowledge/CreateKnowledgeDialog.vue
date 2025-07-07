<!-- 创建知识库对话框组件 -->
<template>
  <el-dialog
    v-model="visible"
    title="创建知识库"
    width="500px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="80px"
    >
      <el-form-item label="知识库名称" prop="name">
        <el-input
          v-model="form.name"
          placeholder="请输入知识库名称"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>
      
      <el-form-item label="封面图片" prop="coverUrl">
        <div class="cover-upload">
          <el-input
            v-model="form.coverUrl"
            placeholder="请输入图片URL地址"
          />
          <div class="cover-preview" v-if="form.coverUrl">
            <img :src="form.coverUrl" alt="封面预览" @error="handleImageError" />
          </div>
          <div class="cover-placeholder" v-else>
            <el-icon size="50"><Picture /></el-icon>
            <p>暂无封面</p>
          </div>
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
import { Picture } from '@element-plus/icons-vue'
import { useKnowledgeStore } from '@/stores/knowledge'
import { useUserStore } from '@/stores/user'
import type { FormInstance } from 'element-plus'

interface Props {
  visible: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const knowledgeStore = useKnowledgeStore()
const userStore = useUserStore()

// 表单引用
const formRef = ref<FormInstance>()
const loading = ref(false)

// 表单数据
const form = reactive({
  name: '',
  coverUrl: ''
})

// 验证规则
const rules = {
  name: [
    { required: true, message: '请输入知识库名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
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
    
    await knowledgeStore.createKnowledge({
      name: form.name,
      ownerId: userStore.userId,
      coverUrl: form.coverUrl || getDefaultCoverUrl()
    })
    
    ElMessage.success('知识库创建成功')
    emit('success')
    handleClose()
    
  } catch (error) {
    console.error('创建知识库失败:', error)
    if (error instanceof Error) {
      ElMessage.error(error.message)
    } else {
      ElMessage.error('创建知识库失败，请重试')
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
  form.name = ''
  form.coverUrl = ''
}

// 图片加载错误处理
const handleImageError = () => {
  ElMessage.warning('图片加载失败，请检查URL是否正确')
}

// 获取默认封面
const getDefaultCoverUrl = () => {
  // 返回一个默认的知识库封面图片
  return 'https://via.placeholder.com/300x200/409EFF/ffffff?text=Knowledge+Base'
}
</script>

<style scoped>
.cover-upload {
  width: 100%;
}

.cover-preview, .cover-placeholder {
  margin-top: 10px;
  width: 200px;
  height: 120px;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
}

.cover-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
}

.cover-placeholder {
  flex-direction: column;
  color: #909399;
}

.cover-placeholder p {
  margin: 8px 0 0 0;
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style> 