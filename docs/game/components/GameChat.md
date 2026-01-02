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

## 使用方法

```vue
<GameChat>
  <template #rules>
    <p>这里是游戏规则...</p>
  </template>
</GameChat>
```
