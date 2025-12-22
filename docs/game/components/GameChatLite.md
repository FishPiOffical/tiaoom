# GameChatLite 组件

`GameChatLite` 是 `GameChat` 组件的轻量级版本，专为独立窗口或小屏幕设备设计。它保留了核心的聊天功能，但布局更加紧凑。

## Events

| 事件名 | 参数 | 说明 |
| :--- | :--- | :--- |
| `send` | `text: string` | 当用户发送消息时触发。 |

## 功能

- **消息列表**: 显示聊天记录，支持自动滚动到底部。
- **发送消息**: 支持发送消息到房间或全局（代码中有 `sendToRoom` 和 `sendToGlobal`，具体使用取决于上下文）。
- **广播消息**: 管理员支持广播功能。
- **紧凑布局**: 适合嵌入在狭小空间或作为独立窗口使用。
- **时间戳**: 鼠标悬停在消息上时显示发送时间。

## 依赖

- `vue`: `ref`, `computed`, `watch`, `nextTick`, `onMounted`
- `tiaoom/client`: `PlayerRole`, `RoomPlayer`, `RoomStatus`
- `@/stores/game`: `useGameStore`
- `Icon`: 用于显示图标。

## 使用方法

通常在独立窗口路由中使用，或者在需要节省空间的布局中使用。

```vue
<GameChatLite />
```

## 逻辑细节

- **`send`**: 处理发送逻辑，防止输入法组合过程中触发发送。
- **`roomMessages`**: 本地维护的消息列表，通过监听游戏事件更新。

## 样式

- 使用了半透明背景和模糊效果 (`backdrop-blur`)。
- 消息气泡样式与 `GameChat` 类似，但布局更为紧凑。
