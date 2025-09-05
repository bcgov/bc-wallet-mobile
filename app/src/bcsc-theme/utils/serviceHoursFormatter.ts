import { ServiceHours } from '../api/hooks/useVideoCallApi'

// TODO (bm): proper implementation
export const formatServiceHours = (serviceHours: ServiceHours): string => {
  if (!serviceHours?.regular_service_periods?.length) {
    return 'Monday to Friday\n7:30am - 5:00pm Pacific Time'
  }

  const timezone = serviceHours.time_zone || 'America/Vancouver'
  const timezoneDisplay = timezone === 'America/Vancouver' ? 'Pacific Time' : timezone
  
  const firstPeriod = serviceHours.regular_service_periods[0]
  if (firstPeriod) {
    const startTime = formatTime12Hour(firstPeriod.start_time)
    const endTime = formatTime12Hour(firstPeriod.end_time)
    return `Monday to Friday\n${startTime} - ${endTime} ${timezoneDisplay}`
  }
  
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
  if (!serviceHours?.regular_service_periods?.length) {
    return false
  }

  const timezone = serviceHours.time_zone || 'America/Vancouver'
  const now = new Date()
  let currentTime: Date
  if (timezone === 'America/Vancouver') {
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000)
    const pacificOffset = -8 * 60 * 60000
    currentTime = new Date(utcTime + pacificOffset)
  } else {
    currentTime = now
  }

  const currentDay = currentTime.getDay() // 0 = Sunday, 1 = Monday, etc.
  const currentHour = currentTime.getHours()
  const currentMinute = currentTime.getMinutes()
  const currentTimeInMinutes = currentHour * 60 + currentMinute

  const dayMap: { [key: string]: number } = {
    'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3,
    'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
  }

  for (const period of serviceHours.regular_service_periods) {
    const startDay = dayMap[period.start_day.toUpperCase()] ?? -1
    const endDay = dayMap[period.end_day.toUpperCase()] ?? -1
    
    if (startDay === -1 || endDay === -1) continue // Invalid day format
    
    const isWithinDayRange = startDay <= endDay 
      ? (currentDay >= startDay && currentDay <= endDay)
      : (currentDay >= startDay || currentDay <= endDay) // Handles week wrapping
    
    if (!isWithinDayRange) continue
    
    const [startHour, startMin] = period.start_time.split(':').map(Number)
    const [endHour, endMin] = period.end_time.split(':').map(Number)
    
    if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) continue
    
    const startTimeInMinutes = startHour * 60 + startMin
    const endTimeInMinutes = endHour * 60 + endMin
    
    if (currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes) {
      return true
    }
  }

  return false
}
