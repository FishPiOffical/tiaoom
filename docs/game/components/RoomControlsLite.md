# RoomControlsLite 组件

`RoomControlsLite` 是 `RoomControls` 组件的轻量级/覆盖层版本。它通常以全屏覆盖或悬浮按钮的形式出现，提供与 `RoomControls` 类似的功能，但使用了图标按钮以节省空间。

## Props

| 属性名 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `roomPlayer` | `RoomPlayer & { room: Room }` | 必填 | 当前玩家及其房间信息。 |
| `game` | `GameCore` | 必填 | 游戏核心实例。 |
| `currentPlayer` | `Player \| null` | `undefined` | 当前行动的玩家。 |
| `enableDrawResign` | `boolean` | `undefined` | 是否启用提和和认输功能。 |

## Slots

| 插槽名 | 说明 |
| :--- | :--- |
| `playing-actions` | 游戏进行时的自定义操作区域。 |
| `default` | 额外的自定义内容插槽。 |

## Events

| 事件名 | 说明 |
| :--- | :--- |
| `draw` | 触发请求和棋操作。 |
| `lose` | 触发认输操作。 |

## 功能

- **覆盖层显示**: 当游戏不在进行中，或者用户主动激活控制面板时，显示全屏半透明覆盖层。
- **图标按钮**: 使用 `Icon` 组件显示操作按钮，配合 `tooltip` 显示提示文字。
- **快捷键**: 支持 `Esc` 键切换控制面板的显示/隐藏（仅在游戏中有效）。
- **操作逻辑**: 与 `RoomControls` 一致，包括准备、开始、离开、加入、提和、认输等。

## 依赖

- `vue`: `computed`, `ref`
- `hotkeys-js`: 用于监听键盘快捷键。
- `Icon`: 用于显示图标。
- `tiaoom/client`: 相关类型定义。
- `@/core/game`: `GameCore`

## 使用方法

```vue
<RoomControlsLite 
  :roomPlayer="roomPlayer" 
  :game="game" 
/>
```

## 样式

- 使用 `fixed z-100` 全屏覆盖。
- 按钮为圆形 `btn-circle`。
- 包含提示文字 `tooltip`。
