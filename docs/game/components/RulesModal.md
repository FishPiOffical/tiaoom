# RulesModal 组件

`RulesModal` 是一个通用的模态框组件，专门用于显示游戏规则。

## Slots

| 插槽名 | 说明 |
| :--- | :--- |
| `default` | 模态框的主要内容区域，通常用于放置游戏规则文本。 |

## Methods (Exposed)

| 方法名 | 说明 |
| :--- | :--- |
| `open()` | 打开模态框。 |
| `close()` | 关闭模态框。 |

## 功能

- **显示/隐藏**: 通过 `open` and `close` 方法控制显示状态。
- **点击遮罩关闭**: 点击模态框外部区域（遮罩层）会自动关闭模态框。
- **确认按钮**: 底部提供一个“知道了”按钮，点击后关闭模态框。

## 依赖

- `vue`: `ref`, `defineExpose`
- `@iconify/vue`: `Icon`

## 使用方法

```vue
<template>
  <button @click="rulesModal.open()">查看规则</button>
  
  <RulesModal ref="rulesModal">
    <p>1. 规则一...</p>
    <p>2. 规则二...</p>
  </RulesModal>
</template>

<script setup>
import { ref } from 'vue'
import RulesModal from '@/components/common/RulesModal.vue'

const rulesModal = ref(null)
</script>
```

## 样式

- 使用 `fixed inset-0` 创建全屏遮罩。
- 内容区域居中显示，最大宽度 `max-w-md`。
