# AchievementTable 胜负展示组件

`AchievementTable` 用于展示玩家的胜负平战绩统计表格。

## Props

| 属性名 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `achievements` | `Record<string, { win: number; lost: number; draw?: number }>` | - | **必填**。战绩数据对象，键为玩家名称，值为战绩统计。 |
| `showDraw` | `boolean` | `false` | 是否显示平局列。 |

## 示例

```vue
<template>
  <AchievementTable 
    :achievements="achievements" 
    :show-draw="true" 
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AchievementTable from '@/components/common/AchievementTable.vue';

const achievements = ref({
  'PlayerA': { win: 10, lost: 5, draw: 2 },
  'PlayerB': { win: 5, lost: 10, draw: 2 },
});
</script>
```
