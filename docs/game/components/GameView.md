# GameView 组件

`GameView` 是一个通用的游戏视图布局组件，它提供了游戏区域（左侧）和侧边栏（右侧）的布局结构。侧边栏集成了玩家列表、战绩表、聊天室以及自定义 Tab 功能。

## Props

| 属性名 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `roomPlayer` | `RoomPlayer & { room: Room }` | **必填** | 当前房间玩家对象，包含房间信息。 |
| `game` | `GameCore` | **必填** | 游戏核心实例。 |
| `playerStatus` | `(player: RoomPlayer) => string` | - | 自定义玩家状态显示函数。 |
| `watcherStatus` | `(player: RoomPlayer) => string` | - | 自定义观众状态显示函数。 |
| `achievements` | `boolean` | `true` | 是否显示战绩 Tab。 |
| `chat` | `boolean` | `true` | 是否显示聊天组件。 |
| `activeTab` | `string` | `'players'` | 默认激活的 Tab 名称。 |
| `tabs` | `Record<string, { name: string; icon: string }>` | - | 自定义 Tab 配置。 |
| `showDraw` | `boolean` | `true` | 战绩表是否显示平局。 |
| `lite` | `boolean` | `false` | 是否为精简模式（不显示侧边栏）。 |

## Slots

| 插槽名 | 参数 | 说明 |
| :--- | :--- | :--- |
| `default` | - | 左侧游戏主区域的内容。 |
| `player` | `{ player: RoomPlayer }` | 自定义玩家列表项的显示内容。 |
| `player-badge` | `{ player: RoomPlayer }` | 玩家徽章插槽，显示在状态之后。 |
| `tab-{name}` | - | 自定义 Tab 的内容，`{name}` 对应 `tabs` prop 中的 key。 |
| `actions` | `{ isPlaying: boolean }` | 侧边栏底部的操作按钮区域。 |
| `rules` | - | 传递给 `GameChat` 组件的规则内容。 |

## Events

| 事件名 | 参数 | 说明 |
| :--- | :--- | :--- |
| `command` | `msg: { type: string; data: any }` | 当接收到 `player.command` 或 `room.command` 时触发。 |

## 功能

- **响应式布局**: 在桌面端显示为左右结构，在移动端侧边栏会调整。
- **Tab 切换**: 支持在玩家列表、战绩表和自定义 Tab 之间切换。
- **玩家列表**: 自动显示房间内的玩家，支持自定义状态和徽章。
- **战绩显示**: 自动处理 `status` 命令中的 `achievements` 数据并显示。
- **聊天集成**: 内置 `GameChat` 组件。
- **事件转发**: 自动监听并转发游戏命令事件。

## 使用示例

```vue
<template>
  <GameView 
    :room-player="roomPlayer" 
    :game="game" 
    @command="onCommand"
  >
    <!-- 游戏主区域 -->
    <div class="game-board">
      <!-- ... -->
    </div>

    <!-- 自定义操作按钮 -->
    <template #actions="{ isPlaying }">
      <button class="btn" @click="startGame" :disabled="isPlaying">开始游戏</button>
    </template>

    <!-- 游戏规则 -->
    <template #rules>
      <p>这是游戏规则...</p>
    </template>
  </GameView>
</template>

<script setup lang="ts">
// ... setup code
</script>
```
