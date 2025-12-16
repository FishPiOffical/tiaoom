# Game Embed

游戏状态嵌入脚本，提供将游戏状态嵌入到网页中的能力。

## 安装

```bash
<script src="http://your.deployed.domain/embed.min.js"></script>
```

## 使用

```typescript
const gameEmbed = new GameEmbed();
// 监听所有 class 为 .game-badge 的元素，使用其 data-oid 属性作为玩家 ID
embed.listen('.game-badge', 'oid');
// 也可以直接添加指定元素和玩家 ID
embed.append(document.getElementById('specific-player')!, 'player-oId-12345');
// 或使用渲染函数，动态渲染内容（listen 方法同理：embed.listen('.game-badge', 'oid', (data) => {})）
embed.append((data) => {
  if (data.player && data.room) {
    console.log(`Player ${data.player.name} is in room ${data.room.name}`);
  } else {
   console.log('Player not in a room');
  }
}, 'player-oId-67890');
```

## `GameEmbed` 方法

### `listen(selector: string, playerIdAttr: string): WatchHandle` {#listen}

监听指定选择器的元素，并根据指定的属性获取玩家 ID 进行状态嵌入。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `selector` | `string` | CSS 选择器，用于选择要监听的元素。 |
| `playerIdAttr` | `string` | 元素属性名，用于获取玩家 ID。 |

**返回:** `WatchHandle` 监听句柄，可用于停止监听。

### `append(el: HTMLElement, playerId: string): void` {#append}

将指定元素添加到嵌入列表中，并使用指定的玩家 ID 进行状态嵌入。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `el` | `HTMLElement` | 要添加的元素。 |
| `playerId` | `string` | 玩家 ID。 |

### `append(render: (data: GameRenderData) => void, playerId: string): void` {#append-render}

将指定渲染函数添加到嵌入列表中，并使用指定的玩家 ID 进行状态嵌入。

| 参数 | 类型 | 描述 |
| :--- | :--- | :--- |
| `render` | `(data: GameRenderData) => void` | 渲染函数，接收游戏渲染数据。 |
| `playerId` | `string` | 玩家 ID。 |

### `GameRenderData`

游戏渲染数据接口，包含玩家和房间信息和 logo 等。

| 属性名 | 类型 | 描述 |
| :--- | :--- | :--- |
| `player` | `IRoomPlayer \| null` | 玩家信息，如果玩家不在房间中则为 null。 |
| `room` | `IRoom \| null` | 房间信息，如果玩家不在房间中则为 null。 |
| `logo` | `string` | 游戏的 Logo URL。 |
| `visitRoom` | `(roomId: string) => void` | 跳转至指定房间的函数。 |