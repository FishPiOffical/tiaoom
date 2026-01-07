import { createApp } from 'vue'
import MessageBox from './MessageBox.vue'

export interface MsgBoxOptions {
  title?: string
  message?: string | any
  showCancel?: boolean
  confirmText?: string
  cancelText?: string
  showInput?: boolean
  inputPlaceholder?: string
  inputValue?: string
  inputType?: string
}

function mountBox<T = boolean>(options: MsgBoxOptions): Promise<T | false> {
  const container = document.createElement('div')
  document.body.appendChild(container)

  return new Promise((resolve) => {
    const app = createApp(MessageBox, {
      ...options,
      visible: true,
      onConfirm: (val: any) => { // 接收组件 emit 出来的值
        resolve(val)
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

    app.mount(container)

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
  return mountBox<boolean>({ title, message, showCancel: true, ...options })
}

export function alert(message: string, title = '提示', options: Partial<MsgBoxOptions> = {}) {
  return mountBox<boolean>({ title, message, showCancel: false, confirmText: '知道了', ...options })
}

export function prompt(message: string, title = '请输入', options: Partial<MsgBoxOptions> = {}) {
  return mountBox<string | false>({ 
    title, 
    message, 
    showCancel: true, 
    showInput: true, 
    ...options 
  })
}

export default {
  confirm,
  alert,
  prompt
}
