import api from '../../api/axios'

/**
 * @typedef {Object} SyncLog
 * @property {number} id
 * @property {string} sync_key
 * @property {string} job_status
 * @property {Object} provider
 */

/**
 * @typedef {Object} PaginatedResponse
 * @property {boolean} success
 * @property {any[]} data
 * @property {Object} meta
 * @property {number} meta.page
 * @property {number} meta.per_page
 * @property {number} meta.total
 * @property {number} meta.last_page
 * @property {string} [meta.sort_by] - Current sort field
 * @property {string} [meta.sort_direction] - Current sort direction
 * @property {string} message
 */

/**
 * @typedef {Object} TriggerSyncParams
 * @property {number} [provider_id] - Optional provider ID, triggers all if omitted
 */

/**
 * @typedef {Object} SyncHistoryParams
 * @property {number} [page=1] - Page number
 * @property {number} [per_page=15] - Items per page (1-100)
 * @property {string} [sort_by] - Sort field (id, sync_key, provider_id, job_type, job_status, log_level, started_at, completed_at, created_at, updated_at)
 * @property {string} [sort_direction] - Sort direction (asc, desc)
 * @property {number} [provider_id] - Filter by provider ID
 * @property {string} [provider_type] - Filter by provider type
 * @property {string} [external_id] - Filter by external ID
 * @property {number} [product_id] - Filter by product ID
 */

/**
 * Trigger a sync job
 * @param {TriggerSyncParams} params
 * @returns {Promise<{success: boolean, data: any, message: string}>}
 */
export const triggerSync = async (params = {}) => {
  const response = await api.post('/sync/trigger', params)
  return response.data
}

/**
 * Get active sync status
 * @returns {Promise<{success: boolean, data: {active_syncs: SyncLog[], count: number}, message: string}>}
 */
export const getSyncStatus = async () => {
  const response = await api.get('/sync/status')
  return response.data
}

/**
 * Get sync history with pagination
 * @param {SyncHistoryParams} params
 * @returns {Promise<PaginatedResponse>}
 */
export const getSyncHistory = async (params = {}) => {
  const response = await api.get('/sync/history', { params })
  return response.data
}

/**
 * Get failed jobs
 * @param {{per_page?: number, page?: number, sort_by?: string, sort_direction?: string}} params
 * @returns {Promise<PaginatedResponse>}
 */
export const getFailedJobs = async (params = {}) => {
  const response = await api.get('/sync/failed-jobs', { params })
  return response.data
}

/**
 * Retry a failed job
 * @param {string} jobId - Job UUID
 * @returns {Promise<{success: boolean, data: {job_id: string}, message: string}>}
 */
export const retryJob = async (jobId) => {
  const response = await api.post(`/sync/retry/${jobId}`)
  return response.data
}

/**
 * Get sync log details by ID or sync key
 * @param {string} identifier - Sync log ID or sync key
 * @returns {Promise<{success: boolean, data: {sync_log: SyncLog, products: any[], missing_external_ids: string[], products_count: number, missing_count: number}, message: string}>}
 */
export const getSyncLog = async (identifier) => {
  const response = await api.get(`/sync/${identifier}`)
  return response.data
}
