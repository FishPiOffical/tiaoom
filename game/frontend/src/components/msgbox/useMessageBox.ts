import { createApp } from 'vue'
import MessageBox from './MessageBox.vue'

export interface MsgBoxOptions {
  title?: string
  message?: string | any
  showCancel?: boolean
  confirmText?: string
  cancelText?: string
}

function mountBox(options: MsgBoxOptions) {
  const container = document.createElement('div')
  document.body.appendChild(container)

  return new Promise<boolean>((resolve) => {
    const app = createApp(MessageBox, {
      ...options,
      visible: true,
      onConfirm: () => {
        resolve(true)
        close()
      },
      onCancel: () => {
        resolve(false)
        close()
      },
      onClose: () => {
        resolve(false)
        close()
      }
    })

    const vm = app.mount(container)

    function close() {
      try {
        app.unmount()
      } catch (e) {
        // ignore
      }
      if (container.parentNode) container.parentNode.removeChild(container)
    }
  })
}

export function confirm(message: string, title = '确认', options: Partial<MsgBoxOptions> = {}) {
  return mountBox({ title, message, showCancel: true, ...options })
}

export function alert(message: string, title = '提示', options: Partial<MsgBoxOptions> = {}) {
  return mountBox({ title, message, showCancel: false, confirmText: '知道了', ...options })
}

export default {
  confirm,
  alert
}
