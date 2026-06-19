<script setup lang="ts">
const appName = "meadows"
</script>

<template>
  <main class="min-h-screen bg-base-200 flex items-center justify-center p-6">
    <div class="card w-full max-w-md bg-base-100 shadow-xl">
      <div class="card-body items-center text-center">
        <img src="/favicon.svg" alt="" class="size-12" />
        <h1 class="card-title text-3xl font-semibold">{{ appName }}</h1>
        <p class="text-base-content/70">
          A canvas for thinking in systems — stocks, flows, faucets, and feedback loops.
        </p>
        <div class="card-actions mt-4">
          <button class="btn btn-primary" disabled>Start a system</button>
        </div>
        <p class="text-xs text-base-content/40 mt-2">Scaffold ready. Editor coming next.</p>
      </div>
    </div>
  </main>
</template>
