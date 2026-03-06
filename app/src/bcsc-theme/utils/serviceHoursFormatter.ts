import { DaysOfTheWeek, LIVE_CALL_UNAVILABLE_REASONS } from '@/constants'
import { ServiceHours, ServicePeriod, ServiceUnavailablePeriod } from '../api/hooks/useVideoCallApi'

const PACIFIC_TIMEZONE = 'America/Vancouver'

const normalizeAmPm = (time: string): string => time.replace('AM', 'am').replace('PM', 'pm')

const getTimezoneDisplay = (timezone: string): string => (timezone === PACIFIC_TIMEZONE ? 'Pacific Time' : timezone)

const formatTimeInTimezone = (epochSeconds: number, timezone: string): string => {
  const date = new Date(epochSeconds * 1000)
  const formatted = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  }).format(date)

  return normalizeAmPm(formatted)
}

const formatDateInTimezone = (epochSeconds: number, timezone: string): string => {
  const date = new Date(epochSeconds * 1000)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
  }).format(date)
}

const formatUnavailableMaintenance = (period: ServiceUnavailablePeriod, timezone: string): string => {
  const reasonText = (period.reason_description || period.reason || '').trim()
  const startTime = formatTimeInTimezone(period.start_date, timezone)
  const endTime = formatTimeInTimezone(period.end_date, timezone)
  const startDate = formatDateInTimezone(period.start_date, timezone)
  const timezoneDisplay = getTimezoneDisplay(timezone)

  const title = `<b>Closed for ${reasonText}</b>`
  const times = `Between ${startTime} - ${endTime} ${timezoneDisplay}`
  const dateLine = `On ${startDate}`

  return `${title}\n${times}\n${dateLine}`
}

export const formatServiceAndUnavailableHours = (serviceHours: ServiceHours): string =>
  `${formatServiceHours(serviceHours)}\n\n${formatUnavailableHours(serviceHours, serviceHours.time_zone || PACIFIC_TIMEZONE)}`

export const formatUnavailableHours = (serviceHours: ServiceHours, timezone: string = PACIFIC_TIMEZONE): string => {
  if (!serviceHours?.service_unavailable_periods?.length) {
    return ''
  }
  return serviceHours.service_unavailable_periods
    .map((period) => {
      if (period.reason === LIVE_CALL_UNAVILABLE_REASONS.MAINTANENCE) {
        return formatUnavailableMaintenance(period, timezone)
      }

      return formatUnavailableHoliday(period, timezone)
    })
    .join('\n\n')
}

const formatUnavailableHoliday = (period: ServiceUnavailablePeriod, timezone: string) => {
  const reasonText = (period.reason_description || period.reason || '').trim()
  const startDate = formatDateInTimezone(period.start_date, timezone)

  const title = `<b>Closed for ${reasonText}</b>`
  const dateLine = `On ${startDate}`

  return `${title}\n${dateLine}`
}

export const formatServiceHours = (serviceHours: ServiceHours): string => {
  if (!serviceHours?.regular_service_periods?.length) {
    return 'Monday to Friday\n7:30am - 5:00pm Pacific Time'
  }

  const timezone = serviceHours.time_zone || 'America/Vancouver'
  const timezoneDisplay = timezone === 'America/Vancouver' ? 'Pacific Time' : timezone

  const servicePeriodDictionary = {} as { [key: string]: ServicePeriod[] }

  serviceHours.regular_service_periods.forEach((item: ServicePeriod) => {
    // safe to assume start and end days are the same
    if (
      item.start_day.toUpperCase() === DaysOfTheWeek.SATURDAY ||
      item.start_day.toUpperCase() === DaysOfTheWeek.SUNDAY
    ) {
      // weekends are special cases and do not group
      servicePeriodDictionary[`${item.start_day}-${item.start_time}-${item.end_time}`] = [item]
    } else {
      const key = `${item.start_time}-${item.end_time}`
      if (servicePeriodDictionary[key]) {
        servicePeriodDictionary[key].push(item)
      } else {
        servicePeriodDictionary[key] = [item]
      }
    }
  })

  const finalMessage = Object.keys(servicePeriodDictionary).map((key) => {
    const servicePeriods = servicePeriodDictionary[key]
    let startDay = ''
    let endDay = ''

    servicePeriods.forEach((period) => {
      if (!startDay) {
        startDay = dayOfTheWeekFormatter(period.start_day)
      } else {
        endDay = `to ${dayOfTheWeekFormatter(period.start_day)}`
      }
    })

    return `${startDay} ${endDay}\n${formatTime12Hour(servicePeriods[0].start_time)} - ${formatTime12Hour(servicePeriods[0].end_time)} ${timezoneDisplay}`
  })

  return finalMessage.join('\n\n')
}

export const formatTime12Hour = (time24: string): string => {
  if (!time24) {
    return time24
  }

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
  if (isNaN(hour) || isNaN(minute)) {
    // maybe this just needs to throw an error
    // if these are un parsable, then we want to track the error and maybe display the default hours?
    return null
  }
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

export const isLiveCallAvailable = (serviceHours: ServiceHours): boolean => {
  return isCurrentTimeWithinServiceHours(serviceHours) && isCurrentTimeOutsideUnavailablePeriod(serviceHours)
}

export const isCurrentTimeWithinServiceHours = (serviceHours: ServiceHours): boolean => {
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

    if (startDay === -1 || endDay === -1) {
      continue
    } // Skip invalid day formats

    if (!isCurrentDayInRange(currentDay, startDay, endDay)) {
      continue
    }

    const startTimeMinutes = parseTimeToMinutes(period.start_time)
    const endTimeMinutes = parseTimeToMinutes(period.end_time)

    if (startTimeMinutes === null || endTimeMinutes === null) {
      continue
    } // Skip invalid times

    if (isCurrentTimeInRange(currentTimeInMinutes, startTimeMinutes, endTimeMinutes)) {
      return true
    }
  }

  return false
}

export const isCurrentTimeOutsideUnavailablePeriod = (serviceHours: ServiceHours): boolean => {
  if (!serviceHours?.service_unavailable_periods?.length) {
    return true
  }

  const currentTime = new Date().getTime() / 1000 // current time in seconds
  for (const period of serviceHours.service_unavailable_periods) {
    if (currentTime >= period.start_date && currentTime <= period.end_date) {
      return false
    }
  }

  return true
}

const dayOfTheWeekFormatter = (day: string): string => {
  const normalizedDay = day.trim().toLowerCase()
  if (!normalizedDay) {
    return ''
  }

  return normalizedDay.charAt(0).toUpperCase() + normalizedDay.slice(1)
}
