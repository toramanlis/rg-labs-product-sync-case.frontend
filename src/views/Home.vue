<template>
  <div class="dashboard">
    <DashboardHeader />
    <ChartsSection />
    <SyncHistoryTable />
    <FailedJobsTable />
  </div>
</template>

<script setup>
import DashboardHeader from '@/components/DashboardHeader.vue'
import ChartsSection from '@/components/ChartsSection.vue'
import FailedJobsTable from '@/components/FailedJobsTable.vue'
import SyncHistoryTable from '@/components/SyncHistoryTable.vue'
</script>

<style scoped>
.dashboard {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .dashboard {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .dashboard {
    padding: 0.75rem;
  }
}
</style>
