<template>
  <header class="dashboard-header">
    <h1>Dashboard</h1>
  </header>
</template>

<script setup>
// Component for dashboard header
</script>

<style scoped>
.dashboard-header {
  margin-bottom: 2rem;
}

.dashboard-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--p-text-color);
}

@media (max-width: 768px) {
  .dashboard-header h1 {
    font-size: 2rem;
  }
}

@media (max-width: 480px) {
  .dashboard-header h1 {
    font-size: 1.75rem;
  }
}
</style>
