// ====== Display formatters shared by every page

export const money = (value, digits = 0) => {
  const n = Number(value || 0)
  const text = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  return `${n < 0 ? '−' : ''}$${text}`
}

export const pct = (value, digits = 0) => `${(Number(value || 0) * 100).toFixed(digits)}%`

export const signedPct = (value) => {
  if (value === null || value === undefined || !isFinite(value)) return '–'
  const n = Math.round(value * 100)
  return `${n > 0 ? '+' : ''}${n}%`
}

export const change = (now, before) => (before ? (now - before) / before : null)

export const fmtDate = (date, timeZone = 'UTC') =>
  new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone })

export const fmtShortDate = (date) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

export const fmtTime = (date, timeZone) =>
  new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone })

export const fmtDateTime = (date, timeZone) =>
  new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone })

export const minutesSince = (date) => Math.max(0, Math.round((Date.now() - new Date(date)) / 60000))

export const timeAgo = (date) => {
  const m = minutesSince(date)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  if (m < 48 * 60) return `${Math.round(m / 60)} h ago`
  return `${Math.round(m / 1440)} d ago`
}

export const label = (value = '') => value.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

// ====== Image URL: absolute (Cloudinary later) or served by the API (/uploads/...)
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
export const imgUrl = (src) => (!src ? '' : src.startsWith('http') ? src : `${API_BASE}${src}`)

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
