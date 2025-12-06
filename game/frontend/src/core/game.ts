import ReconnectingWebSocket from 'reconnecting-websocket'
import { Tiaoom, TiaoomEvents } from 'tiaoom/client'
import type { Message } from '@/types'
import { IUser } from '@/api'

export class GameCore extends Tiaoom {
  private address: string
  private socket?: ReconnectingWebSocket

  constructor(address: string) {
    super()
    this.address = address
  }

  /**
   * 连接服务器
   */
  connect() {
    this.socket = new ReconnectingWebSocket(this.address, [], {
      debug: true,
      connectionTimeout: 3000
    })

    window.addEventListener('beforeunload', () => {
      this.close()
    })
    
    this.socket.onopen = () => {
      this.emit('sys.ready')
    }
    
    this.socket.onmessage = ({ data: msg }) => {
      const message: Message = JSON.parse(msg)
      const { type, data, sender } = message
      this.emit(type as keyof TiaoomEvents, data, sender)
    }
    
    this.socket.onerror = (err) => {
      console.log("Socket error:", err)
      this.emit('sys.error', err)
    }
    
    this.socket.onclose = () => {
      this.emit('sys.close')
    }
  }

  /**
   * 关闭连接
   */
  close() {
    this.socket?.close()
  }

  /**
   * 发送消息
   */
  send({ type, data }: { type: string; data?: any }) {
    this.socket?.send(JSON.stringify({ type, data }))
    return this
  }

  /**
   * 发送聊天消息
   */
  say(message: string, roomId?: string) {
    if (roomId) {
      this.command(roomId, { type: 'say', data: message })
    } else {
      this.command({ type: 'say', data: message })
    }
  }

  /**
   * 初始化玩家游戏状态
   * @param {string} roomId 房间ID
   * @param {object} player 玩家信息
   * @returns 
   */
  init(roomId: string, player: IUser) {
    this.send({ type: "room.player-command", data: { id: roomId, type: 'status', data: player } });
    return this;
  }

  /**
   * 房间指令监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns 
   */
  onCommand(cb: (command: any) => void, on=true) {
    this.onPlayerCommand(cb, on);
    this.onRoomCommand(cb, on);
    return this;
  }

  /**
   * 消息监听
   * @param {function} cb 监听函数
   * @param {boolean} on 开启/关闭监听
   * @returns 
   */
  onMessage(cb: (message: any) => void, on=true) {
    this.onPlayerMessage(cb, on);
    this.onRoomMessage(cb, on);
    return this;
  }
}
