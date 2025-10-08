/**
 * Get the Sunday-to-Sunday date range for data analysis
 * Returns last complete week (Sunday to Sunday)
 * This ensures analysis is available every Monday morning
 */
export function getSundayToSundayRange(): { from: string; to: string } {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate days back to last Sunday (end of last week)
  const daysBackToSunday = dayOfWeek === 0 ? 0 : dayOfWeek
  
  // Get last Sunday (end of last week)
  const lastSunday = new Date(now)
  lastSunday.setDate(now.getDate() - daysBackToSunday)
  lastSunday.setHours(23, 59, 59, 999)
  
  // Get the Sunday before that (start of last week)
  const previousSunday = new Date(lastSunday)
  previousSunday.setDate(lastSunday.getDate() - 7)
  previousSunday.setHours(0, 0, 0, 0)
  
  const from = previousSunday.toISOString().split('T')[0]
  const to = lastSunday.toISOString().split('T')[0]
  
  console.log(`📅 Sunday-to-Sunday range: ${from} to ${to}`)
  
  return { from, to }
}

/**
 * Backward compatibility alias for getSundayToSundayRange
 * @deprecated Use getSundayToSundayRange instead
 */
export function getMondayToMondayRange(): { startDate: string; endDate: string } {
  const { from, to } = getSundayToSundayRange()
  return { startDate: from, endDate: to }
}

/**
 * Get the most recent complete Sunday-to-Sunday week
 * This is always the 7 days ending on the most recent Sunday
 */
export function getLastCompleteWeek(): { startDate: string; endDate: string } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  
  // Calculate days back to last Sunday
  const daysBackToSunday = dayOfWeek === 0 ? 0 : dayOfWeek
  
  // Find the most recent Sunday (end of last week)
  const lastSunday = new Date(now)
  lastSunday.setDate(now.getDate() - daysBackToSunday)
  lastSunday.setHours(23, 59, 59, 999)
  
  // Go back 7 days for the start (previous Sunday)
  const weekStart = new Date(lastSunday)
  weekStart.setDate(lastSunday.getDate() - 7)
  weekStart.setHours(0, 0, 0, 0)
  
  const startDate = weekStart.toISOString().split('T')[0]
  const endDate = lastSunday.toISOString().split('T')[0]
  
  console.log(`📅 Last complete week: ${startDate} to ${endDate}`)
  
  return { startDate, endDate }
}
