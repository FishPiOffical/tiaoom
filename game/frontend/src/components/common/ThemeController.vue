<template>
  <div title="切换主题" class="dropdown dropdown-center block">
    <div
      tabindex="0"
      role="button"
      class="btn group btn-sm gap-1.5 px-1.5 btn-ghost"
      aria-label="切换主题"
    >
      <div
        class="bg-base-100 group-hover:border-base-content/20 border-base-content/10 grid shrink-0 grid-cols-2 gap-0.5 rounded-md border p-1 transition-colors"
      >
        <div class="bg-base-content size-1 rounded-full"></div>
        <div class="bg-primary size-1 rounded-full"></div>
        <div class="bg-secondary size-1 rounded-full"></div>
        <div class="bg-accent size-1 rounded-full"></div>
      </div>
      <Icon icon="mingcute:down-fill" />
    </div>
    <div
      tabindex="0"
      class="dropdown-content bg-base-200 text-base-content rounded-box top-px h-122 max-h-[calc(100vh-8.6rem)] overflow-auto border-(length:--border) border-white/5 shadow-2xl outline-(length:--border) outline-black/5 mt-16"
    >
      <ul class="menu w-46">
        <li class="menu-title text-xs">主题</li>
        <!--[-->
        <li v-for="t in themes" :key="t">
          <button
            class="gap-3 px-2"
            :data-set-theme="t"
            data-act-class="[&_svg]:visible"
            @click="setTheme(t)"
          >
            <div
              :data-theme="t"
              class="bg-base-100 grid shrink-0 grid-cols-2 gap-0.5 rounded-md p-1 shadow-sm"
            >
              <div class="bg-base-content size-1 rounded-full"></div>
              <div class="bg-primary size-1 rounded-full"></div>
              <div class="bg-secondary size-1 rounded-full"></div>
              <div class="bg-accent size-1 rounded-full"></div>
            </div>
            <div class="w-20 truncate">{{ t }}</div>
            <Icon icon="iconamoon:check-bold" v-if="theme === t" />
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from "@/hook/useTheme";

const { theme, themes, setTheme } = useTheme();
</script>
