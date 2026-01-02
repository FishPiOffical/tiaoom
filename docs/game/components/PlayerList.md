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

## 使用方法 {#usage}

```vue
<PlayerList :players="room.players" />

<!-- 自定义显示 -->
<PlayerList :players="room.players">
  <template #default="{ player }">
    <div class="font-bold">{{ player.name }} ({{ player.score }})</div>
  </template>
</PlayerList>
```
