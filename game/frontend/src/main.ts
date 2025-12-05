import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'
import { registerGameComponents } from './components'

const app = createApp(App)

app.use(createPinia())
app.use(router)
registerGameComponents(app)
app.mount('#app')
