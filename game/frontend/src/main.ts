import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import './style.css'
import { registerGameComponents } from './components'
import { setupStore } from './stores'

function bootstrap() {
  const app = createApp(App)

  app.use(router)
  registerGameComponents(app)
  setupStore(app)
  app.mount('#app')

  return {
    getComponent: (name: string) => app.component(name),
  }
}

const { getComponent } = bootstrap()

export { getComponent }