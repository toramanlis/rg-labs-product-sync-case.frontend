import api from '../../api/axios'

/**
 * @typedef {Object} Product
 * @property {number} id
 * @property {string} name
 * @property {string} description
 * @property {Object} provider
 */

/**
 * @typedef {Object} PaginatedResponse
 * @property {boolean} success
 * @property {Product[]} data
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
 * @typedef {Object} ProductListParams
 * @property {number} [page=1] - Page number
 * @property {number} [per_page=15] - Items per page (1-100)
 * @property {string} [sort_by] - Sort field (id, provider_id, external_id, name, price, stock, data_hash, last_synced_at, created_at, updated_at)
 * @property {string} [sort_direction] - Sort direction (asc, desc)
 * @property {number} [provider_id] - Filter by provider ID
 * @property {string} [search] - Search in name and description
 */

/**
 * Get paginated list of products
 * @param {ProductListParams} params
 * @returns {Promise<PaginatedResponse>}
 */
export const getProducts = async (params = {}) => {
  const response = await api.get('/products', { params })
  return response.data
}
