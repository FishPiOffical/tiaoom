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
  const rootSelector = `a[href*="${scriptSrc.hostname}/#/"]`;
  style.innerHTML = `
    ${rootSelector}, ${rootSelector}>span>span {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 0 8px;
      color: inherit;
      text-decoration: none;
    }
    ${rootSelector}:hover {
      transform: scale(1.1);
    }
    ${rootSelector} img {
      width: 50px;
      pointer-events: none;
    }
    ${rootSelector}>span {
      display: inline-flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      line-height: 1.2;
      text-align: center;
    }
    ${rootSelector}>span>span abbr {
      text-decoration: none;
    }
    ${rootSelector}>span>span span {
      margin-top: 2px;
      padding: 3px 8px;
      cursor: pointer;
      background: #4CAF50;
      border-radius: 12px;
      font-weight: bold;
    }
    ${rootSelector}>span + span {
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
    .game-embed-iframe {
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 8px;
    }
    .game-embed-container {
      position: fixed;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 1001;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      resize: both;
      overflow: hidden;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      min-width: 100px;
      min-height: 100px;
    }
    .game-embed-close-button {
      background: transparent;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      z-index: 1005;
    }
    .game-embed-drag-handle {
      position: relative;
      width: 100%;
      height: 30px;
      cursor: grab;
      background-color: rgba(0, 0, 0, 0.1);
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
      z-index: 1002;
      text-align: right;
      user-select: none;
    }
    .game-embed-open-button {
      background: transparent;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      z-index: 1003;
    }
  `;
  document.head.appendChild(style);

  document.body.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    if (target.closest(rootSelector)) {
      event.preventDefault();
      event.stopPropagation();
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
      url += (url.includes('?') ? '&' : '?') + `apiKey=${apiKey}`;
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

// 创建一个浮动的可调整窗口大小的 iframe 来加载游戏房间， 默认大小为 300 x 400
function appendGameViewIframe(roomUrl: string) {
  const minWidth = 100;
  const minHeight = 100;
  let iframe = document.getElementById('game-view-iframe') as HTMLIFrameElement | null;
  let rect: IRect | null = JSON.parse(localStorage.getItem('game-view-iframe-rect') || 'null');

  // 辅助函数：保存当前位置和尺寸到localStorage
  const saveRect = (container: HTMLElement) => {
    const currentRect: IRect = {
      top: parseFloat(container.style.top.replace('px', '')) || 0,
      left: parseFloat(container.style.left.replace('px', '')) || 0,
      width: Math.max(container.offsetWidth, minWidth),
      height: Math.max(container.offsetHeight, minHeight)
    };
    localStorage.setItem('game-view-iframe-rect', JSON.stringify(currentRect));
  };

  // 辅助函数：应用边界检查
  const applyBounds = (container: HTMLElement) => {
    const rect = container.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;
    const newLeft = Math.max(0, Math.min(parseFloat(container.style.left.replace('px', '')), maxX));
    const newTop = Math.max(0, Math.min(parseFloat(container.style.top.replace('px', '')), maxY));
    container.style.left = newLeft + 'px';
    container.style.top = newTop + 'px';
  };

  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'game-view-iframe';
    iframe.className = 'game-embed-iframe';
    iframe.src = roomUrl;

    const container = document.createElement('div');
    container.id = 'game-view-container';
    container.className = 'game-embed-container';
    // 保留动态样式（位置和尺寸）
    container.style.top = (rect?.top ?? (window.innerHeight - 320) / 2) + 'px';
    container.style.left = (rect?.left ?? (window.innerWidth - 420) / 2) + 'px';
    container.style.width = Math.max(rect?.width || 300, minWidth) + 'px';
    container.style.height = Math.max(rect?.height || 400, minHeight) + 'px';

    // 关闭按钮
    const closeButton = document.createElement('button');
    closeButton.className = 'game-embed-close-button';
    closeButton.innerText = '×';
    closeButton.addEventListener('click', () => {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
        saveRect(container);
      }
    });

    // 拖拽控制标签
    const dragHandle = document.createElement('div');
    dragHandle.className = 'game-embed-drag-handle';
    container.appendChild(dragHandle);

    // 打开新窗口按钮
    const openButton = document.createElement('button');
    openButton.className = 'game-embed-open-button';
    openButton.innerText = '↗';
    openButton.title = '在新窗口打开游戏';
    openButton.addEventListener('click', () => {
      window.open(roomUrl.replace(/\/l\//, '/r/'), '_blank');
    });
    dragHandle.appendChild(openButton);
    dragHandle.appendChild(closeButton);

    // 拖动状态变量
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    // 鼠标拖动事件（桌面端）
    const startDrag = (clientX: number, clientY: number) => {
      isDragging = true;
      dragOffsetX = clientX - container.offsetLeft;
      dragOffsetY = clientY - container.offsetTop;
      container.style.cursor = 'grabbing';
    };

    const doDrag = (clientX: number, clientY: number) => {
      if (isDragging) {
        container.style.left = (clientX - dragOffsetX) + 'px';
        container.style.top = (clientY - dragOffsetY) + 'px';
      }
    };

    const endDrag = () => {
      if (isDragging) {
        isDragging = false;
        container.style.cursor = 'default';
        applyBounds(container);
        saveRect(container);
      }
    };

    // 鼠标事件
    dragHandle.addEventListener('mousedown', (e) => {
      if (e.target === closeButton) return;
      startDrag(e.clientX, e.clientY);
    });

    document.addEventListener('mousemove', (e) => {
      doDrag(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', endDrag);

    // 触摸事件（移动端支持）
    dragHandle.addEventListener('touchstart', (e) => {
      if (e.target === closeButton) return;
      const touch = e.touches[0];
      startDrag(touch.clientX, touch.clientY);
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      if (isDragging) {
        e.preventDefault(); // 防止页面滚动
        const touch = e.touches[0];
        doDrag(touch.clientX, touch.clientY);
      }
    }, { passive: false });

    document.addEventListener('touchend', endDrag);

    container.appendChild(iframe);
    document.body.appendChild(container);
  }
  iframe.src = roomUrl;
}

document.addEventListener('DOMContentLoaded', () => {
  registerGameButton();
});