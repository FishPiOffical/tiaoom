# PlayerList 组件

`PlayerList` 组件用于显示房间内的玩家列表，区分参与游戏的玩家和旁观者。

## Props

| 属性名 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `players` | `RoomPlayer[]` | 必填 | 房间内的玩家列表数据。 |

## Slots

| 插槽名 | 参数 | 说明 |
| :--- | :--- | :--- |
| `default` | `{ player: RoomPlayer }` | 自定义每个玩家条目的显示内容。默认显示准备状态/围观状态和玩家名称。 |

## 功能

- **玩家分类**: 将玩家分为“参与者”（`role === 'player'`）和“旁观者”（`role !== 'player'`）两组显示。
- **状态显示**: 默认显示玩家是否已准备。
- **自定义渲染**: 提供默认插槽，允许父组件自定义玩家列表项的渲染方式。

## 依赖

- `tiaoom/client`: `RoomPlayer`

## 使用方法

```vue
<PlayerList :players="room.players" />

<!-- 自定义显示 -->
<PlayerList :players="room.players">
  <template #default="{ player }">
    <div class="font-bold">{{ player.name }} ({{ player.score }})</div>
  </template>
</PlayerList>
```

## 样式

- 使用无序列表 `ul` 展示。
- 列表项有悬停效果 `hover:bg-base-200/50`。
- 旁观者列表项颜色较淡 `text-base-content/60`。
