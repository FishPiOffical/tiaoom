<template>
  <section v-if="Object.keys(achievements).length" class="overflow-auto rounded-box border border-base-content/5 bg-base-100 max-h-50 min-h-30">
    <table class="table table-pin-rows table-pin-cols text-center">
      <thead>
        <tr>
          <th class="bg-base-300">玩家</th>
          <th class="bg-base-300">胜</th>
          <th class="bg-base-300">负</th>
          <th class="bg-base-300" v-if="showDraw">和</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(achievement, playerName) in achievements" :key="playerName">
          <td class="">{{ playerName }}</td>
          <td class="">{{ achievement.win }}</td>
          <td class="">{{ achievement.lost }}</td>
          <td class="" v-if="showDraw">{{ achievement.draw }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  achievements: Record<string, { win: number; lost: number; draw?: number }>;
  showDraw?: boolean;
}>();
</script>
