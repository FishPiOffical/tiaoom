import { createApp } from 'vue'
import MessageContainer from './MessageContainer.vue'

type MsgType = 'success' | 'info' | 'warning' | 'error'
type Options = { type?: MsgType; duration?: number }

let instance: any = null

function ensure() {
  if (instance) return instance
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = createApp(MessageContainer)
  instance = app.mount(container)
  return instance
}

export function show(content: string, options: Options = {}) {
  const inst = ensure()
  const { type = 'info', duration = 3000 } = options

  let resolver: ((value: void) => void) | null = null
  const closedPromise = new Promise<void>((resolve) => {
    resolver = resolve
  })

  const id = inst.add({
    type,
    content,
    duration,
    onClose: () => {
      if (resolver) resolver()
    }
  })

  return {
    id,
    close: () => inst.remove(id),
    closed: closedPromise
  }
}

export function success(content: string, duration?: number) { return show(content, { type: 'success', duration }) }
export function info(content: string, duration?: number) { return show(content, { type: 'info', duration }) }
export function warning(content: string, duration?: number) { return show(content, { type: 'warning', duration }) }
export function error(content: string, duration?: number) { return show(content, { type: 'error', duration }) }

export default { show, success, info, warning, error }
