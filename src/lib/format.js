const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const num = new Intl.NumberFormat('en-IN')

export const formatCurrency = (v) => inr.format(Number(v) || 0)
export const formatNumber = (v) => num.format(Number(v) || 0)

export function formatDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// 'out' = quantity is 0, 'low' = at/below threshold, 'ok' otherwise
export function stockStatus(quantity, threshold) {
  const q = Number(quantity)
  const t = Number(threshold)
  if (q <= 0) return 'out'
  if (q <= t) return 'low'
  return 'ok'
}

// Translate Postgres / PostgREST errors into messages a person can act on.
export function friendlyError(error) {
  if (!error) return 'Something went wrong. Please try again.'
  const msg = error.message || String(error)
  if (error.code === '23505' || /duplicate key/i.test(msg)) return 'That SKU or name already exists. Use a different one.'
  if (/Insufficient stock/i.test(msg)) return msg
  if (error.code === '42501' || /row-level security|permission denied|Only administrators/i.test(msg)) return 'You do not have permission to do that.'
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Cannot reach the server. Check your connection and try again.'
  return msg
}
