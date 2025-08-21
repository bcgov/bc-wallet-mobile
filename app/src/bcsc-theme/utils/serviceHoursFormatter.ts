import { ServiceHours } from '../api/hooks/useVideoCallApi'

export const formatServiceHours = (serviceHours: ServiceHours): string => {
  if (!serviceHours?.regular_service_periods?.length) {
    return 'Monday to Friday\n7:30am - 5:00pm Pacific Time'
  }

  // For now, hardcode the user-friendly format since we know it's Monday-Friday
  // In the future, this could be enhanced to dynamically parse the API response
  const timezone = serviceHours.time_zone || 'America/Vancouver'
  const timezoneDisplay = timezone === 'America/Vancouver' ? 'Pacific Time' : timezone
  
  // Get the first period to extract times (assuming consistent hours Monday-Friday)
  const firstPeriod = serviceHours.regular_service_periods[0]
  if (firstPeriod) {
    const startTime = formatTime12Hour(firstPeriod.start_time)
    const endTime = formatTime12Hour(firstPeriod.end_time)
    return `Monday to Friday\n${startTime} - ${endTime} ${timezoneDisplay}`
  }
  
  // Fallback to hardcoded format
  return 'Monday to Friday\n7:30am - 5:00pm Pacific Time'
}

export const formatTime12Hour = (time24: string): string => {
  if (!time24) return time24
  
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'pm' : 'am'
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  const minutesStr = minutes === 0 ? '' : `:${minutes.toString().padStart(2, '0')}`
  
  return `${hours12}${minutesStr}${period}`
}

export const checkIfWithinServiceHours = (serviceHours: ServiceHours): boolean => {
  // Simplified check - in production you'd want proper timezone handling
  const now = new Date()
  const currentHour = now.getHours()
  const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.

  // Basic check for Monday-Friday, 7:30 AM - 5:00 PM
  if (currentDay === 0 || currentDay === 6) return false // Weekend
  if (currentHour < 7 || currentHour >= 17) return false // Outside hours

  return true
}
