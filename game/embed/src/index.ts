import Tiaoom, { MessageTypes, Player, Room, TiaoomEvents } from 'tiaoom/client';
import ReconnectingWebSocket from 'reconnecting-websocket'

const scriptSrc = new URL(document.currentScript && (document.currentScript as any).src);

class GameCore extends Tiaoom {
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
      connectionTimeout: 3000
    })

    window.addEventListener('beforeunload', () => {
      this.close()
    })
    
    this.socket.onopen = () => {
      this.emit('sys.ready')
    }
    
    this.socket.onmessage = ({ data: msg }) => {
      const message: any = JSON.parse(msg)
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
  send({ type, data }: { type: MessageTypes; data?: any }) {
    this.socket?.send(JSON.stringify({ type, data }))
    return this
  }
}

interface GameHookRender { 
  room?: Room, 
  player?: Player, 
  logo: string, 
  visitRoom: (roomId: string) => void 
}

interface GameHookRenderMap {
  render: HTMLElement | ((data: GameHookRender) => void);
  oId: string;
}

class GameHook {

  renders: GameHookRenderMap[] = [];
  tiaoom = new GameCore(`${scriptSrc.protocol}//${scriptSrc.host}/ws`);
  config: any = {};

  constructor(renders: GameHookRenderMap[] = []) {
    this.renders = renders;
    fetch(`${scriptSrc.origin}/api/config`).then(res => res.json()).then((res) => {
      this.config = res.data;
    });
    this.tiaoom.run().onRoomList(() => {
      this.update();
    }).onPlayerList(() => {
      this.update();
    });
  }
  
  append(render: HTMLElement | ((data: GameHookRender) => void), oId: string) {
    this.renders.push({ render, oId });
  }

  remove(render: (data: GameHookRender) => void | HTMLElement) {
    this.renders = this.renders.filter(item => item.render !== render);
  }

  update() {
    if (!this.tiaoom) return;
    const render = (domOrRender: HTMLElement | ((data: GameHookRender) => void), { room, player }: { room?: Room, player?: Player }) => {
      if (!domOrRender) return;
      if (typeof domOrRender === 'function') {
        domOrRender({ 
          room, player, logo: scriptSrc.origin + '/logo.png', visitRoom: (roomId) => {
            window.open(`${scriptSrc.origin}/r/${roomId}`, '_blank');
          } 
        });
        return;
      }
      if (!player || !room) return domOrRender.innerHTML = '';
      const roomPlayer = room.players.find(p => p.id === player.id)!;
      const gameName = this.config[room.attrs.type].name;
      const tag = document.createElement('span');

      tag.style.display = 'inline-flex';
      tag.style.alignItems = 'center';
      tag.style.fontSize = '1em';
      tag.style.cursor = 'pointer';
      tag.style.paddingLeft = '0.4em';
      tag.style.backgroundColor = '#66cc8a';
      tag.style.borderRadius = '0.25em';
      tag.title = `前往房间【${room.name}】`;
      tag.innerHTML = `
        <img src="${scriptSrc.origin}/logo.png" alt="♟️" style="width:1.2em;margin-right:0.3em;" />
        <span style="font-weight:bold;">${gameName}</span>
        <span style="padding: 0 0.2em" title="${roomPlayer.role == 'player' ? '游戏中...' : '围观中...'}">
          ${roomPlayer.role == 'player' ? '🎮' : '👀'}
        </span>
      `;
      tag.onclick = () => {
        window.open(`${scriptSrc.origin}/r/${room.id}`, '_blank');
      };
      domOrRender.innerHTML = tag.outerHTML;
    }
    this.renders.forEach(item => {
      const player = this.tiaoom.players.find(p => p.id === item.oId);
      const room = player && this.tiaoom.rooms.find(room => room.players.find(p => p.id === item.oId));
      render(item.render, { room, player});
    });
  }
}

export default GameHook;