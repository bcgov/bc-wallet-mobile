import { ServiceHours } from '../api/hooks/useVideoCallApi'

// TODO (bm): full implementation that accounts for multiple service periods
// and unavailable periods
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

  let hours12: number
  if (hours === 0) {
    hours12 = 12
  } else if (hours > 12) {
    hours12 = hours - 12
  } else {
    hours12 = hours
  }

  const minutesStr = minutes === 0 ? '' : `:${minutes.toString().padStart(2, '0')}`

  return `${hours12}${minutesStr}${period}`
}

const getDayNumber = (dayName: string): number => {
  const dayMap: { [key: string]: number } = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
  }
  return dayMap[dayName.toUpperCase()] ?? -1
}

const getCurrentTimeInTimezone = (timezone: string): Date => {
  const now = new Date()
  if (timezone === 'America/Vancouver') {
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000
    const pacificOffset = -8 * 60 * 60000
    return new Date(utcTime + pacificOffset)
  }
  return now
}

const parseTimeToMinutes = (timeStr: string): number | null => {
  const [hour, minute] = timeStr.split(':').map(Number)
  if (isNaN(hour) || isNaN(minute)) return null
  return hour * 60 + minute
}

const isCurrentDayInRange = (currentDay: number, startDay: number, endDay: number): boolean => {
  return startDay <= endDay
    ? currentDay >= startDay && currentDay <= endDay
    : currentDay >= startDay || currentDay <= endDay // Handles week wrapping
}

const isCurrentTimeInRange = (
  currentTimeMinutes: number,
  startTimeMinutes: number,
  endTimeMinutes: number
): boolean => {
  return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes
}

export const checkIfWithinServiceHours = (serviceHours: ServiceHours): boolean => {
  if (!serviceHours?.regular_service_periods?.length) {
    return false
  }

  const timezone = serviceHours.time_zone || 'America/Vancouver'
  const currentTime = getCurrentTimeInTimezone(timezone)
  const currentDay = currentTime.getDay()
  const currentTimeInMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()

  for (const period of serviceHours.regular_service_periods) {
    const startDay = getDayNumber(period.start_day)
    const endDay = getDayNumber(period.end_day)

    if (startDay === -1 || endDay === -1) continue // Skip invalid day formats

    if (!isCurrentDayInRange(currentDay, startDay, endDay)) continue

    const startTimeMinutes = parseTimeToMinutes(period.start_time)
    const endTimeMinutes = parseTimeToMinutes(period.end_time)

    if (startTimeMinutes === null || endTimeMinutes === null) continue // Skip invalid times

    if (isCurrentTimeInRange(currentTimeInMinutes, startTimeMinutes, endTimeMinutes)) {
      return true
    }
  }

  return false
}
