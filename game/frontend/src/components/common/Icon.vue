<script setup lang="ts">
  import { computed, RenderFunction } from 'vue';
  import { isObject, isFunction, isNumber } from '@/utils';
  import { Icon as IconifyIcon } from '@iconify/vue';

  const props = defineProps<{
    icon: string | RenderFunction;
    color?: string;
    size?: string | number;
  }>();

  const isRenderable = computed(
    () =>
      isObject(props.icon) ||
      isFunction(props.icon),
  );

  const getIconStyle = computed(() => {
    const { color, size } = props;
    return {
      fontSize: isNumber(size) ? `${size}px` : size,
      color,
    };
  });
</script>

<template>
  <i class="icon" :style="getIconStyle">
    <component v-if="isRenderable" :is="icon" />
    <IconifyIcon v-else :icon="(icon as string)" />
  </i>
</template>

<style lang="less" scoped>
  .icon {
    height: 1em;
    width: 1em;
    line-height: 1em;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    position: relative;
    fill: currentColor;
    font-size: inherit;

    svg {
      width: 1em;
      height: 1em;
      fill: currentColor;
    }
  }
</style>