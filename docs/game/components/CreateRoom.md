# CreateRoom 组件

`CreateRoom` 组件用于创建新的游戏房间。它提供了一个表单，允许用户输入房间名称、选择游戏类型、设置房间大小（如果适用）以及设置房间密码。

## 功能

- **房间名称输入**: 必填项，用于标识房间。
- **游戏类型选择**: 从 `gameStore` 中获取可用的游戏列表供用户选择。
- **房间大小设置**: 如果所选游戏支持可变人数（`minSize !== maxSize`），则允许用户选择玩家数量。
- **最小开始人数设置**: 允许设置游戏开始所需的最小玩家数量。
- **密码保护**: 可选设置房间密码，支持显示/隐藏密码。
- **创建按钮**: 提交表单以创建房间。如果用户已经在房间中，按钮将被禁用。

## 依赖

- `vue`: `ref`, `computed`
- `@/stores/game`: `useGameStore` 用于获取游戏列表和当前房间状态。
- `@/components/msg`: 用于显示错误消息。
- `Icon`: 用于显示密码可见性切换图标。

## 使用方法

该组件通常在游戏大厅或主页中使用，用于引导用户创建新游戏。

```vue
<template>
  <CreateRoom />
</template>

<script setup>
import CreateRoom from '@/components/common/CreateRoom.vue'
</script>
```

## 逻辑细节

- **`onTypeChange`**: 当游戏类型改变时，自动调整房间大小和最小人数以符合新游戏的限制。
- **`createRoom`**: 
  - 验证房间名称是否为空。
  - 验证房间名称是否已存在。
  - 调用 `gameStore.game.createRoom` 发送创建房间请求。
  - 创建成功后，自动加入房间并跳转到游戏页面。
  - 如果创建失败，显示错误消息。

## 样式

组件使用了 Tailwind CSS 类进行样式设置，包括 `input`, `select`, `btn` 等 DaisyUI 组件类。
