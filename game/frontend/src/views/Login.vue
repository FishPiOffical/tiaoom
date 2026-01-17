<template>
  <div class="min-h-screen bg-base-100 flex">
    <!-- Left Side: Login Form -->
    <section class="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative z-10">
      <div class="w-full max-w-md space-y-8">
        <!-- Login Card -->
        <LoginCard />

        <!-- Footer -->
        <footer class="text-base-content/50 text-center font-serif italic text-sm pt-8">
          <p>
            Power By <a href="https://tiaoom.com" target="_blank" rel="noopener noreferrer" class="hover:text-primary transition-colors">Tiaoom</a>
            &copy; {{ new Date().getFullYear() }}
          </p>
        </footer>
      </div>
    </section>

    <!-- Right Side: Visuals (PC Only) -->
    <section class="hidden md:flex flex-1 bg-base-200 items-center justify-center relative overflow-hidden">
      <!-- Decorative Background -->
      <div class="absolute inset-0 bg-linear-to-br from-base-200 to-base-300 opacity-50"></div>
      
      <!-- Game Elements Visual -->
      <div class="relative z-10 grid grid-cols-2 gap-8 opacity-10 rotate-12 select-none">
         <div class="w-40 h-40 rounded-2xl bg-base-content/40 backdrop-blur-sm transform hover:scale-105 transition-transform duration-500 flex items-center justify-center">
            <Icon icon="fluent:chess-20-filled" class="text-6xl" />
         </div>
         <div class="w-40 h-40 rounded-full bg-primary/40 backdrop-blur-sm transform translate-y-12 hover:scale-105 transition-transform duration-500 flex items-center justify-center">
            <Icon icon="fluent:games-24-filled" class="text-6xl" />
         </div>
         <div class="w-40 h-40 rounded-full bg-secondary/40 backdrop-blur-sm transform -translate-y-12 hover:scale-105 transition-transform duration-500 flex items-center justify-center">
            <Icon icon="fluent:puzzle-piece-24-filled" class="text-6xl" />
         </div>
         <div class="w-40 h-40 rounded-2xl bg-accent/40 backdrop-blur-sm transform hover:scale-105 transition-transform duration-500 flex items-center justify-center">
            <Icon icon="fluent:trophy-24-filled" class="text-6xl" />
         </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
</script>
