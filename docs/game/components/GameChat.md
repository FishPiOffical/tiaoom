# GameChat 组件

`GameChat` 组件提供了一个游戏内的聊天界面，支持发送消息、查看消息历史、以及管理员广播功能。它还集成了规则查看和弹出独立聊天窗口的功能。

## Props

| 属性名 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `canSend` | `boolean` | `true` | 是否允许发送消息。 |
| `placeholder` | `string` | `'随便聊聊'` | 输入框的占位符文本。 |

## Slots

| 插槽名 | 说明 |
| :--- | :--- |
| `rules` | 用于在 `RulesModal` 中显示的游戏规则内容。 |

## Events

| 事件名 | 参数 | 说明 |
| :--- | :--- | :--- |
| `send` | `text: string` | 当用户发送消息时触发（虽然组件内部主要通过 `gameStore` 发送消息，但也定义了这个事件）。 |

## 功能

- **消息列表**: 显示聊天记录，区分当前用户、其他玩家、观众和管理员的消息样式。
- **发送消息**: 支持按回车键或点击发送按钮发送消息。
- **广播消息**: 管理员在游戏进行中可以将消息广播给所有玩家和观众。
- **规则查看**: 点击信息图标可以打开规则模态框。
- **独立窗口**: 支持将聊天窗口弹出为独立的小窗口（Lite 模式）。
- **观众提示**: 如果当前用户是观众且游戏正在进行，提示消息仅观众可见。

## 依赖

- `vue`: `computed`, `ref`
- `tiaoom/client`: `PlayerRole`, `RoomPlayer`, `RoomStatus`
- `@/stores/game`: `useGameStore`
- `@/hook/useGameEvents`: `useGameEvents` (用于监听消息事件，虽然代码片段中未完全展示)
- `RulesModal`: 用于显示规则。
- `Icon`: 用于显示图标。

## 使用方法

```vue
<GameChat>
  <template #rules>
    <p>这里是游戏规则...</p>
  </template>
</GameChat>
```

## 样式

- 使用了 Tailwind CSS 进行布局和样式设置。
- 消息气泡根据发送者身份（自己、他人、管理员）有不同的背景色和对齐方式。
