<template>
  <section class="table-section">
    <Card>
      <template #title>Failed Jobs</template>
      <template #content>
        <DataTable :value="failedJobs" :paginator="true" :rows="rowsPerPage" :rowsPerPageOptions="[5, 10, 20]"
          :totalRecords="totalRecords" :lazy="true" :sortField="sortField" :sortOrder="sortOrder"
          responsiveLayout="scroll" :loading="loading" scrollable scrollHeight="400px" class="p-datatable-sm"
          @page="onPageChange" @sort="onSort">
          <Column field="id" header="ID" :sortable="true" style="min-width: 80px" />
          <Column field="uuid" header="UUID" style="min-width: 200px">
            <template #body="slotProps">
              <span class="uuid-text">{{ slotProps.data.uuid }}</span>
            </template>
          </Column>
          <Column field="job_class" header="Job Class" style="min-width: 200px">
            <template #body="slotProps">
              {{ slotProps.data.job_class || '-' }}
            </template>
          </Column>
          <Column field="queue" header="Queue" style="min-width: 100px" />
          <Column field="connection" header="Connection" style="min-width: 100px" />
          <Column field="exception" header="Exception" style="min-width: 250px">
            <template #body="slotProps">
              <span class="exception-text" :title="slotProps.data.exception">
                {{ truncateText(slotProps.data.exception, 50) }}
              </span>
            </template>
          </Column>
          <Column field="failed_at" header="Failed At" :sortable="true" style="min-width: 150px">
            <template #body="slotProps">
              {{ formatDate(slotProps.data.failed_at) }}
            </template>
          </Column>
          <Column header="Actions" style="min-width: 100px">
            <template #body="slotProps">
              <Button label="Retry" icon="pi pi-refresh" size="small" severity="warning"
                :loading="retryingJobs[slotProps.data.uuid]" @click="retryJob(slotProps.data.uuid)"
                :disabled="!!retryingJobs[slotProps.data.uuid]" />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { getFailedJobs, retryJob as retryJobApi } from '@/services/api'

const toast = useToast()

const loading = ref(false)
const failedJobs = ref([])
const totalRecords = ref(0)
const rowsPerPage = ref(10)
const currentPage = ref(1)
const sortField = ref('failed_at')
const sortOrder = ref(-1) // -1 for desc, 1 for asc
const retryingJobs = ref({})
let refreshInterval = null

const truncateText = (text, maxLength) => {
  if (!text) return '-'
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

const formatDate = (dateString) => {
  if (!dateString) return null
  try {
    return new Date(dateString).toISOString()
  } catch {
    return dateString
  }
}

const loadFailedJobs = async (page = 1, perPage = 10, sortBy = null, sortDirection = null) => {
  loading.value = true
  try {
    const params = {
      per_page: perPage,
      page: page
    }

    if (sortBy) {
      params.sort_by = sortBy
      params.sort_direction = sortDirection || 'desc'
    }

    const response = await getFailedJobs(params)
    if (response?.success) {
      if (Array.isArray(response.data)) {
        failedJobs.value = response.data
      } else {
        failedJobs.value = []
      }
      if (response.meta) {
        totalRecords.value = response.meta.total || 0
        // Update sort state from API response if available
        if (response.meta.sort_by) {
          sortField.value = response.meta.sort_by
          sortOrder.value = response.meta.sort_direction === 'asc' ? 1 : -1
        }
      }
    } else {
      failedJobs.value = []
      totalRecords.value = 0
    }
  } catch (error) {
    console.error('Error loading failed jobs:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load failed jobs',
      life: 3000
    })
    failedJobs.value = []
    totalRecords.value = 0
  } finally {
    loading.value = false
  }
}

const retryJob = async (jobUuid) => {
  retryingJobs.value[jobUuid] = true
  try {
    const response = await retryJobApi(jobUuid)
    if (response?.success) {
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Job queued for retry',
        life: 3000
      })
      // Reload the failed jobs list after a short delay
      setTimeout(() => {
        loadFailedJobs(
          currentPage.value,
          rowsPerPage.value,
          sortField.value,
          sortOrder.value === 1 ? 'asc' : 'desc'
        )
      }, 1000)
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: response?.message || 'Failed to retry job',
        life: 3000
      })
    }
  } catch (error) {
    console.error('Error retrying job:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to retry job',
      life: 3000
    })
  } finally {
    retryingJobs.value[jobUuid] = false
  }
}

const onPageChange = (event) => {
  currentPage.value = event.page + 1 // PrimeVue uses 0-based index
  rowsPerPage.value = event.rows
  loadFailedJobs(
    currentPage.value,
    rowsPerPage.value,
    sortField.value,
    sortOrder.value === 1 ? 'asc' : 'desc'
  )
}

const onSort = (event) => {
  sortField.value = event.sortField
  sortOrder.value = event.sortOrder
  // Reset to first page when sorting changes
  currentPage.value = 1
  loadFailedJobs(
    1,
    rowsPerPage.value,
    event.sortField,
    event.sortOrder === 1 ? 'asc' : 'desc'
  )
}

onMounted(() => {
  loadFailedJobs(
    currentPage.value,
    rowsPerPage.value,
    sortField.value,
    sortOrder.value === 1 ? 'asc' : 'desc'
  )
  
  // Auto-refresh every 5 seconds
  refreshInterval = setInterval(() => {
    loadFailedJobs(
      currentPage.value,
      rowsPerPage.value,
      sortField.value,
      sortOrder.value === 1 ? 'asc' : 'desc'
    )
  }, 5000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.table-section {
  margin-bottom: 2rem;
}

.uuid-text {
  font-family: monospace;
  font-size: 0.875rem;
}

.exception-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .table-section :deep(.p-datatable) {
    font-size: 0.875rem;
  }
}

@media (max-width: 480px) {
  .table-section :deep(.p-datatable) {
    font-size: 0.75rem;
  }

  .table-section :deep(.p-datatable-header) {
    padding: 0.5rem;
  }

  .table-section :deep(.p-datatable-tbody > tr > td) {
    padding: 0.5rem;
  }
}
</style>
