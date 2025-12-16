import { Tiaoom, MessageTypes, Player, Room, TiaoomEvents } from 'tiaoom/client';
import ReconnectingWebSocket from 'reconnecting-websocket'
import { DOMWatcher } from './dom-watcher';

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

interface GameRenderData { 
  room?: Room, 
  player?: Player, 
  logo: string, 
  visitRoom: (roomId: string) => void 
}

interface GameRenderMap {
  render: HTMLElement | ((data: GameRenderData) => void);
  oId: string;
}

/**
 * 用于在页面中嵌入游戏信息的工具(http://your.deployed.domain/embed.js)
 * 
 * 用法示例：
 * const embed = new GameEmbed();
 * // 监听所有 class 为 .game-badge 的元素，使用其 data-oid 属性作为玩家 ID
 * embed.listen('.game-badge', 'oid');
 * // 也可以直接添加指定元素和玩家 ID
 * embed.append(document.getElementById('specific-player')!, 'player-oId-12345');
 * // 或使用渲染函数，动态渲染内容（listen 方法同理）
 * embed.append((data) => {
 *   if (data.player && data.room) {
 *     console.log(`Player ${data.player.name} is in room ${data.room.name}`);
 *   } else {
 *    console.log('Player not in a room');
 *   }
 * }, 'player-oId-67890');
 */
class GameEmbed {

  renders: GameRenderMap[] = [];
  tiaoom = new GameCore(`${scriptSrc.protocol}//${scriptSrc.host}/ws`);
  config: any = {};

  constructor(renders: GameRenderMap[] = []) {
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
  
  append(render: HTMLElement | ((data: GameRenderData) => void), oId: string) {
    this.renders.push({ render, oId });
    this.update();
  }

  remove(render: HTMLElement | ((data: GameRenderData) => void)) {
    this.renders = this.renders.filter(item => item.render !== render);
  }

  listen(selector: string, idDataset: string, render?: ((el: HTMLElement, data: GameRenderData) => void)) {
    const watcher = new DOMWatcher();
    const elRenders: { el: HTMLElement; render: ((data: GameRenderData) => void) | undefined }[] = [];
    return watcher.watch(selector, {
      onAdd: (el) => {
        const oId = (el as HTMLElement).dataset[idDataset || 'oid'];
        if (oId) {
          const renderFn = render ? (data: GameRenderData) => render(el as HTMLElement, data) : undefined;
          if (!renderFn) this.append(el as HTMLElement, oId);
          else {
            elRenders.push({ el: el as HTMLElement, render: renderFn });
            this.append(renderFn, oId);
          }
        }
      },
      onRemove: (el) => {
        const oId = (el as HTMLElement).dataset[idDataset || 'oid'];
        if (oId) {
          if (!render) this.remove(el as HTMLElement);
          else {
            const index = elRenders.findIndex(item => item.el === el);
            if (index >= 0) {
              this.remove(elRenders[index].render!);
              elRenders.splice(index, 1);
            }
          }
        }
      }
    });
  }

  update() {
    const render = (domOrRender: HTMLElement | ((data: GameRenderData) => void), { room, player }: { room?: Room, player?: Player }) => {
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
      const tag = document.createElement('a');

      tag.style.display = 'inline-flex';
      tag.style.alignItems = 'center';
      tag.style.fontSize = '1em';
      tag.style.cursor = 'pointer';
      tag.style.padding = '0.1em 0.4em';
      tag.style.backgroundColor = '#66cc8a';
      tag.style.borderRadius = '0.25em';
      tag.style.textDecoration = 'none';
      tag.title = `前往房间【${room.name}】`;
      tag.innerHTML = `
        <img src="${scriptSrc.origin}/logo.png" alt="♟️" style="width:1.2em;margin-right:0.3em;" />
        <span style="font-weight:bold;">${gameName}</span>
        <span style="padding-left: 0.2em" title="${roomPlayer.role == 'player' ? '游戏中...' : '围观中...'}">
          ${roomPlayer.role == 'player' ? '🎮' : '👀'}
        </span>
      `;
      tag.href=`${scriptSrc.origin}/r/${room.id}`;
      tag.target = '_blank';
      domOrRender.innerHTML = tag.outerHTML;
    }
    this.renders.forEach(item => {
      const player = this.tiaoom.players.find(p => p.id === item.oId);
      const room = player && this.tiaoom.rooms.find(room => room.players.find(p => p.id === item.oId));
      render(item.render, { room, player});
    });
  }
}

export default GameEmbed;