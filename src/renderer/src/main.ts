import './assets/sass/reset.scss'
import 'virtual:uno.css'
import store from './stores'
import { setupRouter } from './router'
import { createApp } from 'vue'
import App from './App.vue'
import SvgIcon from '@renderer/plugins/svg-icon'

const app = createApp(App)

// 关闭警告
app.config.warnHandler = () => null
async function setupApp() {
  await app.use(store)
  setupRouter(app)
  app.use(SvgIcon)
  app.mount('#app')
}

setupApp()
