<script setup lang="ts">
  import { useRouter } from 'vue-router';

  const router = useRouter();
  function back() {
    return history.state.back ? router.back() : router.replace('/')
  }
</script>
<template>
  <button class="btn btn-ghost" @click="back">
    <Icon icon="meteor-icons:arrow-left" />
    <slot></slot>
  </button>
</template>