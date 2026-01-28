import api from '../../api/axios'

/**
 * @typedef {Object} HealthResponse
 * @property {boolean} success
 * @property {Object} data
 * @property {string} data.status
 * @property {string} data.timestamp
 * @property {Object<string, string>} data.services
 * @property {string} message
 */

/**
 * Get system health status
 * @returns {Promise<HealthResponse>}
 */
export const getHealth = async () => {
  const response = await api.get('/health')
  return response.data
}
