/**
 * Get the Monday-to-Monday date range for data analysis
 * If today is Monday-Sunday, return last Monday to this Monday
 * This ensures consistent weekly windows
 */
export function getMondayToMondayRange(): { startDate: string; endDate: string } {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate this week's Monday (or today if it's Monday)
  const thisMonday = new Date(now)
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // If Sunday, go back 6 days
  thisMonday.setDate(now.getDate() - daysFromMonday)
  thisMonday.setHours(0, 0, 0, 0)
  
  // Calculate last Monday (7 days before this Monday)
  const lastMonday = new Date(thisMonday)
  lastMonday.setDate(thisMonday.getDate() - 7)
  
  const startDate = lastMonday.toISOString().split('T')[0]
  const endDate = thisMonday.toISOString().split('T')[0]
  
  console.log(`📅 Monday-to-Monday range: ${startDate} to ${endDate}`)
  
  return { startDate, endDate }
}

/**
 * Get the most recent complete Monday-to-Monday week
 * This is always the 7 days ending on the most recent Monday
 */
export function getLastCompleteWeek(): { startDate: string; endDate: string } {
  const now = new Date()
  const dayOfWeek = now.getDay()
  
  // Find the most recent Monday (could be today)
  const lastMonday = new Date(now)
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  lastMonday.setDate(now.getDate() - daysFromMonday)
  lastMonday.setHours(0, 0, 0, 0)
  
  // Go back 7 days for the start
  const weekStart = new Date(lastMonday)
  weekStart.setDate(lastMonday.getDate() - 7)
  
  const startDate = weekStart.toISOString().split('T')[0]
  const endDate = lastMonday.toISOString().split('T')[0]
  
  console.log(`📅 Last complete week: ${startDate} to ${endDate}`)
  
  return { startDate, endDate }
}
