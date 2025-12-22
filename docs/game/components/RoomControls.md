# RoomControls 组件

`RoomControls` 组件提供了一组用于控制游戏房间状态的按钮，包括准备、开始游戏、离开房间、离开座位等操作。

## Props

| 属性名 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `roomPlayer` | `RoomPlayer & { room: Room }` | 必填 | 当前玩家及其房间信息。 |
| `game` | `GameCore` | 必填 | 游戏核心实例，用于执行操作。 |
| `currentPlayer` | `Player \| null` | `undefined` | 当前行动的玩家（用于判断是否可以提和/认输）。 |
| `enableDrawResign` | `boolean` | `undefined` | 是否启用提和和认输功能。 |

## Slots

| 插槽名 | 说明 |
| :--- | :--- |
| `playing-actions` | 游戏进行时的自定义操作区域。默认包含“请求和棋”和“认输”按钮。 |
| `default` | 额外的自定义内容插槽。 |

## Events

| 事件名 | 说明 |
| :--- | :--- |
| `draw` | 触发请求和棋操作。 |
| `lose` | 触发认输操作。 |

## 功能

- **等待状态 (Waiting)**:
  - **玩家**: 离开房间、离开座位、准备/取消准备、开始游戏（仅当所有玩家准备好且人数满足要求时可用）。
  - **观众**: 离开房间、加入游戏（仅当房间未满且游戏未开始时可用）。
- **游戏进行中 (Playing)**:
  - **玩家**: 请求和棋、认输（需 `enableDrawResign` 为 true 且轮到自己行动）。

## 依赖

- `vue`: `computed`
- `tiaoom/client`: `RoomPlayer`, `Player`, `Room`, `PlayerRole`, `RoomStatus`
- `@/core/game`: `GameCore`

## 使用方法

```vue
<RoomControls 
  :roomPlayer="roomPlayer" 
  :game="game" 
  :currentPlayer="currentPlayer"
  enableDrawResign
  @draw="handleDraw"
  @lose="handleLose"
/>
```

## 逻辑细节

- **`isAllReady`**: 计算属性，判断是否所有玩家都已准备且人数达到最小开始人数。
- **`isRoomFull`**: 计算属性，判断房间是否已满。
- **`isPlaying`**: 计算属性，判断游戏是否正在进行中。

## 样式

- 使用 Flex 布局 `flex-col` 排列按钮组。
- 按钮使用了 DaisyUI 的 `btn`, `btn-primary`, `btn-accent` 等类。
