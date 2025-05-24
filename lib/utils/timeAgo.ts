export function formatTimeAgo(date: Date | null): string {
  if (!date) return 'Never'
  
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  
  if (diffMs < 0) return 'Just now'
  
  const minutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) {
    return 'Just now'
  } else if (minutes < 60) {
    return `${minutes} min${minutes !== 1 ? 's' : ''} ago`
  } else if (hours < 24) {
    return `${hours} hr${hours !== 1 ? 's' : ''} ago`
  } else {
    return `${days} day${days !== 1 ? 's' : ''} ago`
  }
}

export function formatLastUpdated(date: Date | null): string {
  if (!date) return 'Never updated'
  return `Updated ${formatTimeAgo(date)}`
} 