import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { createPinia } from 'pinia'
import { useUserStore } from './stores/user'

const pinia = createPinia()
const app = createApp(App);

app.use(pinia)
app.use(router);
app.use(ElementPlus);

if (typeof window !== 'undefined') {
  import('@umoteam/editor').then(({ useUmoEditor }) => {
    app.use(useUmoEditor);
  }).catch(error => {
    console.warn('UmoEditor加载失败:', error);
  });
}

// 恢复用户状态
const userStore = useUserStore()
userStore.restoreUserState()

app.mount('#app');
