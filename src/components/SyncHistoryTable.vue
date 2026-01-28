<template>
  <section class="table-section">
    <Card>
      <template #title>Sync History</template>
      <template #content>
        <DataTable :value="syncHistory" :paginator="true" :rows="rowsPerPage" :rowsPerPageOptions="[5, 10, 20]"
          :totalRecords="totalRecords" :lazy="true" :sortField="sortField" :sortOrder="sortOrder"
          responsiveLayout="scroll" :loading="loading" scrollable scrollHeight="400px" class="p-datatable-sm"
          @page="onPageChange" @sort="onSort">
          <Column field="id" header="ID" :sortable="true" style="min-width: 80px" />
          <Column field="sync_key" header="Sync Key" style="min-width: 150px" />
          <Column field="provider_id" header="Provider" style="min-width: 120px">
            <template #body="slotProps">
              {{ slotProps.data.provider?.name || 'N/A' }}
            </template>
          </Column>
          <Column field="job_type" header="Job Type" style="min-width: 120px" />
          <Column field="job_status" header="Status" style="min-width: 100px">
            <template #body="slotProps">
              <Tag :value="slotProps.data.job_status" :severity="getJobStatusSeverity(slotProps.data.job_status)" />
            </template>
          </Column>
          <Column field="started_at" header="Started" :sortable="true" style="min-width: 150px">
            <template #body="slotProps">
              {{ formatDate(slotProps.data.started_at) }}
            </template>
          </Column>
          <Column field="completed_at" header="Completed" :sortable="true" style="min-width: 150px">
            <template #body="slotProps">
              {{ formatDate(slotProps.data.completed_at) || '-' }}
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
import Tag from 'primevue/tag'
import { getSyncHistory } from '@/services/api'

const loading = ref(false)
const syncHistory = ref([])
const totalRecords = ref(0)
const rowsPerPage = ref(10)
const currentPage = ref(1)
const sortField = ref('created_at')
const sortOrder = ref(-1) // -1 for desc, 1 for asc
let refreshInterval = null

const getJobStatusSeverity = (status) => {
  const statusMap = {
    'completed': 'success',
    'running': 'info',
    'pending': 'warning',
    'failed': 'danger'
  }
  return statusMap[status?.toLowerCase()] || 'secondary'
}

const formatDate = (dateString) => {
  if (!dateString) return null
  try {
    return new Date(dateString).toISOString()
  } catch {
    return dateString
  }
}

// No mapping needed since we're using provider_id directly now
const getBackendSortField = (field) => {
  return field
}

const loadSyncHistory = async (page = 1, perPage = 10, sortBy = null, sortDirection = null) => {
  loading.value = true
  try {
    const params = {
      per_page: perPage,
      page: page
    }

    if (sortBy) {
      params.sort_by = getBackendSortField(sortBy)
      params.sort_direction = sortDirection || 'desc'
    }

    const response = await getSyncHistory(params)
    if (response?.success) {
      if (Array.isArray(response.data)) {
        syncHistory.value = response.data
      } else {
        syncHistory.value = []
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
      syncHistory.value = []
      totalRecords.value = 0
    }
  } catch (error) {
    console.error('Error loading sync history:', error)
    syncHistory.value = []
    totalRecords.value = 0
  } finally {
    loading.value = false
  }
}

const onPageChange = (event) => {
  currentPage.value = event.page + 1 // PrimeVue uses 0-based index
  rowsPerPage.value = event.rows
  loadSyncHistory(
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
  loadSyncHistory(
    1,
    rowsPerPage.value,
    event.sortField,
    event.sortOrder === 1 ? 'asc' : 'desc'
  )
}

onMounted(() => {
  loadSyncHistory(
    currentPage.value,
    rowsPerPage.value,
    sortField.value,
    sortOrder.value === 1 ? 'asc' : 'desc'
  )
  
  // Auto-refresh every 5 seconds
  refreshInterval = setInterval(() => {
    loadSyncHistory(
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
