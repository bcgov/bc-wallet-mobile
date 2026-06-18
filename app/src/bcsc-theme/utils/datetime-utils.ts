/**
 * Format a timestamp in a user-friendly way (e.g., "Just now", "5 minutes ago", "3:45 PM",
 * "June 4, 3:45 PM"), as used by the home screen notification cards.
 *
 * @param {Date} date The timestamp to format
 * @return {*}  {string}
 */
export function formatTimestamp(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) {
    return 'Just now'
  }
  if (diffMin < 60) {
    return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  }

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  return date.toLocaleDateString([], { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/**
 * Format an expiry time as a short badge label counting down until the item expires
 * (e.g., "Expires in 5 min", "Expires in 3 hours", "Expired").
 *
 * @param {Date} expiresTime When the item expires
 * @return {*}  {string}
 */
export function formatExpiryBadge(expiresTime: Date): string {
  const diffMs = expiresTime.getTime() - Date.now()
  if (diffMs <= 0) {
    return 'Expired'
  }
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 60) {
    return `Expires in ${diffMin} min`
  }
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) {
    return `Expires in ${diffHours} hour${diffHours === 1 ? '' : 's'}`
  }
  const diffDays = Math.floor(diffHours / 24)
  return `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`
}
