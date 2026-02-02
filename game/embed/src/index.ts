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
      const { type, data } = message
      this.emit(type as keyof TiaoomEvents, data)
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
  game: string,
  visitRoom: (roomId: string) => void 
}

interface GameRenderMap {
  render: HTMLElement | ((data: GameRenderData) => void);
  oId: string;
  src?: HTMLElement;
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
  bgColor: string = '#66cc8a';
  color: string = 'inherit';

  constructor(renders: GameRenderMap[] = []) {
    this.renders = renders;
    fetch(`${scriptSrc.origin}/api/config`).then(res => res.json()).then((res) => {
      this.config = res.data;
      this.update();
    });
    this.tiaoom.run().onRoomList(() => {
      this.update();
    }).onPlayerList(() => {
      this.update();
    });
    this.bgColor = scriptSrc.searchParams.get('bgColor') || this.bgColor;
    this.color = scriptSrc.searchParams.get('color') || this.color;
    if (this.bgColor.match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i) && !this.bgColor.startsWith('#')) 
      this.bgColor = '#' + this.bgColor;
    if (this.color.match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i) && !this.color.startsWith('#')) 
      this.color = '#' + this.color;
  }
  
  append(render: HTMLElement | ((data: GameRenderData) => void), oId: string, src?: HTMLElement) {
    this.renders.push({ render, oId, src });
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
          if (!renderFn) this.append(el as HTMLElement, '$' + idDataset, el as HTMLElement);
          else {
            elRenders.push({ el: el as HTMLElement, render: renderFn });
            this.append(renderFn, oId, el as HTMLElement);
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
          game: this.config[room?.attrs.type || '']?.name,
          room, player, logo: scriptSrc.origin + '/logo.png', visitRoom: (roomId) => {
            window.open(`${scriptSrc.origin}/#/r/${roomId}`, '_blank');
          } 
        });
        return;
      }
      if (!player || !room || !this.config[room.attrs.type]) return domOrRender.innerHTML = '';
      const roomPlayer = room.players.find(p => p.id === player.id)!;
      const gameName = this.config[room.attrs.type].name;
      const tag = document.createElement('a');

      tag.style.display = 'inline-flex';
      tag.style.alignItems = 'center';
      tag.style.fontSize = '1em';
      tag.style.cursor = 'pointer';
      tag.style.padding = '0.1em 0.4em';
      tag.style.backgroundColor = this.bgColor;
      tag.style.borderRadius = '0.25em';
      tag.style.textDecoration = 'none';
      tag.style.color = this.color;
      tag.style.float = 'none';
      tag.style.userSelect = 'none';
      tag.style.height = 'auto';
      tag.style.margin = '0';
      tag.title = `前往房间【${room.name}】`;
      tag.innerHTML = `
        <img src="${scriptSrc.origin}/logo.png" alt="♟️" style="width:1.2em;margin:0;margin-right:0.3em;height: auto" />
        <span style="font-weight:bold;margin:0;height:auto;">${gameName}</span>
        <span style="padding-left: 0.2em;margin:0;height:auto;" title="${roomPlayer.role == 'player' ? '游戏中...' : '围观中...'}">
          ${roomPlayer.role == 'player' ? '🎮' : '👀'}
        </span>
      `;
      tag.href=`${scriptSrc.origin}/#/r/${room.id}`;
      tag.target = '_blank';
      domOrRender.innerHTML = tag.outerHTML;
    }
    this.renders.forEach(item => {
      let oId = item.oId;
      if (oId.startsWith('$') && (item.src || item.render) instanceof HTMLElement) 
        oId = (item.src || item.render as HTMLElement)?.dataset[oId.slice(1)] || '';
      if (!oId) return; 
      const player = this.tiaoom.players.find(p => p.id === oId);
      const room = player && this.tiaoom.rooms.find(room => room.players.find(p => p.id === oId));
      render(item.render, { room, player});
    });
  }
}

export default GameEmbed;

function registerGameButton() {
  // 在 windows 注入游戏按钮样式
  const style = document.createElement('style');
  const rootSelector = `a[href*="${scriptSrc.hostname}/#/l"]`
  style.innerHTML = `
    ${rootSelector} {
      border-radius: 30px;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 8px 12px 0;
      color: white;
      text-decoration: none;
    }
    ${rootSelector}:hover {
      transform: scale(1.1);
    }
    ${rootSelector} img {
      width: 46px;
      height: 46px;
    }
    ${rootSelector}>span {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      line-height: 1.2;
      text-align: center;
    }
    ${rootSelector}>span abbr {
      text-decoration: none;
    }
    ${rootSelector}>span span {
      margin-top: 2px;
      padding: 3px 8px;
      cursor: pointer;
      background: #4CAF50;
      border-radius: 12px;
      font-weight: bold;
    }
    ${rootSelector} + span {
      margin-left: 8px;
      font-size: 12px;
      vertical-align: middle;
      color: #ddd5;
      font-style: italic;
      display: flex;
      text-align: center;
      align-items: center;
      justify-content: center;
    }
  `;
  document.head.appendChild(style);

  document.body.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    if (target.closest(rootSelector)) {
      event.preventDefault();
      let gameRoomUrl = (target.closest(rootSelector) as HTMLAnchorElement).href;
      gameRoomUrl = await addApiKey(gameRoomUrl);
      appendGameViewIframe(gameRoomUrl);
    }
  });
}

async function addApiKey(url: string) {
  if (location.hostname === 'fishpi.cn') {
    const { apiKey } = await fetch('https://fishpi.cn/getApiKeyInWeb').then((r) => r.json())
    if (apiKey) {
      const urlObj = new URL(url);
      urlObj.searchParams.set('apiKey', apiKey);
      return urlObj.toString();
    }
  }
  return url;
}
interface IRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// 创建一个浮动的可调整窗口大小的 iframe 来加载游戏房间， 默认大小为 800x600
function appendGameViewIframe(roomUrl: string) {
  let iframe = document.getElementById('game-view-iframe') as HTMLIFrameElement | null;
  let rect: IRect | null = JSON.parse(localStorage.getItem('game-view-iframe-rect') || 'null');

  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'game-view-iframe';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.src = roomUrl;

    const container = document.createElement('div');
    container.id = 'game-view-container';
    container.style.position = 'fixed';
    container.style.top =  (rect?.top ?? (window.innerHeight - 320) / 2) + 'px';
    container.style.left = (rect?.left ?? (window.innerWidth - 420) / 2) + 'px';
    container.style.width = (rect?.width || 300) + 'px';
    container.style.height = (rect?.height || 400) + 'px';
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    container.style.zIndex = '1001';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.resize = 'both';
    container.style.overflow = 'hidden';
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';

    // 关闭按钮
    const closeButton = document.createElement('button');
    closeButton.innerText = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '8px';
    closeButton.style.right = '8px';
    closeButton.style.background = 'transparent';
    closeButton.style.border = 'none';
    closeButton.style.color = 'white';
    closeButton.style.fontSize = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.zIndex = '1005';
    closeButton.addEventListener('click', () => {
      document.body.removeChild(container);
      localStorage.setItem('game-view-iframe-rect', JSON.stringify({
        top: container.offsetTop,
        left: container.offsetLeft,
        width: container.offsetWidth,
        height: container.offsetHeight
      }));
    });
    container.appendChild(closeButton);

    // 拖拽控制标签
    const dragHandle = document.createElement('div');
    dragHandle.style.position = 'absolute';
    dragHandle.style.top = '0';
    dragHandle.style.left = '0';
    dragHandle.style.width = '100%';
    dragHandle.style.height = '30px';
    dragHandle.style.cursor = 'grab';
    dragHandle.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    dragHandle.style.borderTopLeftRadius = '8px';
    dragHandle.style.borderTopRightRadius = '8px';
    dragHandle.style.zIndex = '1002';
    container.appendChild(dragHandle);

    // 打开新窗口按钮
    const openButton = document.createElement('button'); 
    openButton.innerText = '↗';
    openButton.style.position = 'absolute';
    openButton.style.top = '8px';
    openButton.style.right = '40px';
    openButton.style.background = 'transparent';
    openButton.style.border = 'none';
    openButton.style.color = 'white';
    openButton.style.fontSize = '18px';
    openButton.style.cursor = 'pointer';
    openButton.style.zIndex = '1003';
    openButton.title = '在新窗口打开游戏';
    openButton.addEventListener('click', () => {
      window.open(roomUrl, '_blank');
    });
    container.appendChild(openButton);

    // 允许拖动窗口
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    dragHandle.addEventListener('mousedown', (e) => {
      if (e.target === closeButton) return; // 不允许拖动关闭按钮
      isDragging = true;
      dragOffsetX = e.clientX - container.offsetLeft;
      dragOffsetY = e.clientY - container.offsetTop;
      container.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        container.style.left = (e.clientX - dragOffsetX) + 'px';
        container.style.top = (e.clientY - dragOffsetY) + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        container.style.cursor = 'default';
        localStorage.setItem('game-view-iframe-rect', JSON.stringify({
          top: container.offsetTop,
          left: container.offsetLeft,
          width: container.offsetWidth,
          height: container.offsetHeight
        }));
      }
    });

    container.appendChild(iframe);
    document.body.appendChild(container);
  }
  iframe.src = roomUrl;
}

document.addEventListener('DOMContentLoaded', () => {
  registerGameButton();
});
debugger;
// @ts-ignore
window.registerGameButton = registerGameButton;
registerGameButton();