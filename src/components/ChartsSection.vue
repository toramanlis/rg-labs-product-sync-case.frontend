<template>
  <section class="stats-section">
    <div class="stats-grid">
      <Card class="sync-summary-card">
        <template #title>Most Recent Sync Job</template>
        <template #content>
          <div v-if="loading" class="loading-state">
            <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
            <p>Loading...</p>
          </div>
          <div v-else-if="recentSync" class="sync-summary">
            <div class="summary-row">
              <span class="label">Status:</span>
              <Tag :value="recentSync.job_status" :severity="getJobStatusSeverity(recentSync.job_status)" />
            </div>
            <div class="summary-row">
              <span class="label">Provider:</span>
              <span class="value">{{ recentSync.provider?.name || 'N/A' }}</span>
            </div>
            <div class="summary-row">
              <span class="label">Started At:</span>
              <span class="value">{{ formatDate(recentSync.started_at) || '-' }}</span>
            </div>
            <div class="summary-row">
              <span class="label">Duration:</span>
              <span class="value">{{ calculateDuration(recentSync) }}</span>
            </div>
            <div v-if="recentSync.completed_at" class="summary-row">
              <span class="label">Completed At:</span>
              <span class="value">{{ formatDate(recentSync.completed_at) }}</span>
            </div>
            <div v-if="getReportMetadata(recentSync)" class="summary-stats">
              <div class="summary-row">
                <span class="label">Created:</span>
                <span class="value">{{ getReportMetadata(recentSync)?.created ?? 0 }}</span>
              </div>
              <div class="summary-row">
                <span class="label">Updated:</span>
                <span class="value">{{ getReportMetadata(recentSync)?.updated ?? 0 }}</span>
              </div>
              <div class="summary-row">
                <span class="label">Soft Deleted:</span>
                <span class="value">{{ getReportMetadata(recentSync)?.soft_deleted ?? 0 }}</span>
              </div>
            </div>
          </div>
          <div v-else class="no-sync">
            <p>No sync jobs found</p>
          </div>
        </template>
      </Card>

      <Card class="trigger-sync-card">
        <template #title>Trigger Sync</template>
        <template #content>
          <div class="trigger-sync-form">
            <div class="form-group">
              <label for="provider-select">Select Provider:</label>
              <Select
                id="provider-select"
                v-model="selectedProvider"
                :options="providerOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select a provider (or leave empty for all)"
                :loading="loadingProviders"
                class="provider-select"
              />
            </div>
            <Button
              label="Trigger Sync"
              icon="pi pi-play"
              :loading="triggering"
              :disabled="triggering"
              @click="handleTriggerSync"
              class="trigger-button"
            />
          </div>
        </template>
      </Card>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import { getSyncStatus, triggerSync, getSyncHistory } from '@/services/api'

const toast = useToast()

const loading = ref(false)
const loadingProviders = ref(false)
const triggering = ref(false)
const recentSync = ref(null)
const selectedProvider = ref(null)
const providerOptions = ref([
  { label: 'All Providers', value: null }
])
let refreshInterval = null

const getJobStatusSeverity = (status) => {
  const statusMap = {
    'Completed': 'success',
    'Running': 'info',
    'Pending': 'warning',
    'Failed': 'danger',
    'Cancelled': 'secondary'
  }
  return statusMap[status] || 'secondary'
}

const formatDate = (dateString) => {
  if (!dateString) return null
  try {
    return new Date(dateString).toISOString()
  } catch {
    return dateString
  }
}

const calculateDuration = (sync) => {
  if (!sync.started_at) return '-'
  
  const start = new Date(sync.started_at)
  const end = sync.completed_at ? new Date(sync.completed_at) : new Date()
  const diffMs = end - start
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  
  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes % 60}m ${diffSeconds % 60}s`
  } else if (diffMinutes > 0) {
    return `${diffMinutes}m ${diffSeconds % 60}s`
  } else {
    return `${diffSeconds}s`
  }
}

const getReportMetadata = (sync) => {
  if (!sync?.metadata) {
    return null
  }
  
  // Handle aggregated metadata array (from JSON_AGG)
  let metadataArray = []
  if (Array.isArray(sync.metadata)) {
    // Filter out null values and flatten if needed
    metadataArray = sync.metadata.filter(m => m !== null && m !== undefined)
  } else if (typeof sync.metadata === 'object') {
    metadataArray = [sync.metadata]
  } else {
    return null
  }
  
  if (metadataArray.length === 0) {
    return null
  }
  
  // Find the most recent report with stats (from completed syncs)
  // Reverse to check most recent first
  for (const meta of [...metadataArray].reverse()) {
    if (!meta || typeof meta !== 'object') {
      continue
    }
    
    // Check if metadata has a report object with the stats
    if (meta.report && typeof meta.report === 'object') {
      const report = meta.report
      if ('created' in report || 'updated' in report || 'soft_deleted' in report) {
        return report
      }
    }
    
    // Also check if metadata itself has the stats directly
    if ('created' in meta || 'updated' in meta || 'soft_deleted' in meta) {
      return meta
    }
  }
  
  return null
}

const loadRecentSync = async () => {
  loading.value = true
  try {
    const response = await getSyncStatus()
    if (response?.success && response.data?.active_syncs?.length > 0) {
      recentSync.value = response.data.active_syncs[0]
    } else {
      recentSync.value = null
    }
  } catch (error) {
    console.error('Error loading recent sync:', error)
    recentSync.value = null
  } finally {
    loading.value = false
  }
}

const loadProviders = async () => {
  loadingProviders.value = true
  try {
    // Fetch sync history to get unique providers
    const response = await getSyncHistory({ per_page: 100 })
    if (response?.success && Array.isArray(response.data)) {
      const providersMap = new Map()
      
      response.data.forEach(sync => {
        if (sync.provider && sync.provider.id && !providersMap.has(sync.provider.id)) {
          providersMap.set(sync.provider.id, {
            label: sync.provider.name || sync.provider.type,
            value: sync.provider.id
          })
        }
      })
      
      const providers = Array.from(providersMap.values())
      providerOptions.value = [
        { label: 'All Providers', value: null },
        ...providers
      ]
    }
  } catch (error) {
    console.error('Error loading providers:', error)
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail: 'Could not load providers list',
      life: 3000
    })
  } finally {
    loadingProviders.value = false
  }
}

const handleTriggerSync = async () => {
  triggering.value = true
  try {
    const params = selectedProvider.value ? { provider_id: selectedProvider.value } : {}
    const response = await triggerSync(params)
    
    if (response?.success) {
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: response.message || 'Sync job triggered successfully',
        life: 3000
      })
      
      // Reload recent sync after a short delay
      setTimeout(() => {
        loadRecentSync()
      }, 1000)
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: response?.message || 'Failed to trigger sync',
        life: 3000
      })
    }
  } catch (error) {
    console.error('Error triggering sync:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.response?.data?.message || 'Failed to trigger sync',
      life: 3000
    })
  } finally {
    triggering.value = false
  }
}

onMounted(() => {
  loadRecentSync()
  loadProviders()
  
  // Auto-refresh every 5 seconds
  refreshInterval = setInterval(() => {
    loadRecentSync()
  }, 5000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.stats-section {
  margin-bottom: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.sync-summary-card,
.trigger-sync-card {
  height: 100%;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 1rem;
}

.no-sync {
  padding: 2rem;
  text-align: center;
  color: var(--p-text-muted-color);
}

.sync-summary {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.5rem 0;
}

.summary-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.summary-row .label {
  font-weight: 600;
  min-width: 120px;
  color: var(--p-text-muted-color);
}

.summary-row .value {
  flex: 1;
  color: var(--p-text-color);
}

.summary-stats {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--p-surface-border);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.summary-stats .summary-row {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
}

.trigger-sync-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0.5rem 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 600;
  color: var(--p-text-color);
}

.provider-select {
  width: 100%;
}

.trigger-button {
  width: 100%;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .summary-stats {
    grid-template-columns: 1fr;
  }

  .summary-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .summary-row .label {
    min-width: auto;
  }
}

@media (max-width: 480px) {
  .sync-summary {
    gap: 0.75rem;
  }

  .trigger-sync-form {
    gap: 1rem;
  }
}
</style>
