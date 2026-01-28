<template>
  <div id="app">
    <RouterView />
    <Toast />
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import Toast from 'primevue/toast'
</script>

<style>
#app {
  min-height: 100vh;
}
</style>
