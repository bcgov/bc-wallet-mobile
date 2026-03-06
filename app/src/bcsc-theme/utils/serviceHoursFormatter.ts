import { DaysOfTheWeek } from '@/constants'
import { ServiceHours } from '../api/hooks/useVideoCallApi'

type NumberServicePeriod = {
  day: string
  start: number
  end: number
}

export const formatServiceHours = (serviceHours: ServiceHours): string => {
  console.log('FORMAT SERVICE HOURS')
  serviceHours.service_unavailable_periods = [
    {
      start_day: 'MONDAY',
      end_day: 'MONDAY',
      start_time: '12:00',
      end_time: '13:00',
    },
    {
      start_day: 'FRIDAY',
      end_day: 'FRIDAY',
      start_time: '05:00',
      end_time: '23:00',
    },
  ]
  if (!serviceHours?.regular_service_periods?.length) {
    return 'Monday to Friday\n7:30am - 5:00pm Pacific Time'
  }
  console.log('service hours', serviceHours)
  const timezone = serviceHours.time_zone || 'America/Vancouver'
  const timezoneDisplay = timezone === 'America/Vancouver' ? 'Pacific Time' : timezone

  const regularSeriviceHours = serviceHours.regular_service_periods
  const unavailableHours = serviceHours.service_unavailable_periods

  // should these be grouped? just run against each other in the most horrific way ever
  const regularServiceHourTimes: NumberServicePeriod[] = regularSeriviceHours.map((period) => ({
    day: period.start_day,
    start: parseTimeToMinutes(period.start_time) || 0,
    end: parseTimeToMinutes(period.end_time) || 0,
    period,
  }))

  const unavailableHourTimes: NumberServicePeriod[] = unavailableHours.map((period) => ({
    day: period.start_day,
    start: parseTimeToMinutes(period.start_time) || 0,
    end: parseTimeToMinutes(period.end_time) || 0,
    period,
  }))

  console.log('Regular service hours in minutes', regularServiceHourTimes)
  console.log('Unavailable service hours in minutes', unavailableHourTimes)

  let finalServicePeriods: NumberServicePeriod[] = []
  if (unavailableHourTimes.length) {
    regularServiceHourTimes.forEach((regular) => {
      let shouldUseRegularPeriod = true
      unavailableHourTimes.forEach((unavailable) => {
        // this assumes there will be unavailable hours... if there aren't any it's going to
        // we only want to compare periods on the same day
        if (regular.day === unavailable.day) {
          shouldUseRegularPeriod = false
          finalServicePeriods.push(...splitServicePeriod(regular, unavailable))
        }
      })

      if (shouldUseRegularPeriod) {
        finalServicePeriods.push(regular)
      }
    })
  } else {
    // no unavailable hours, use regular hours
    finalServicePeriods = regularServiceHourTimes
  }

  console.log(finalServicePeriods)

  // ok so now I've got the days sorted, I think, now we map them

  const servicePeriodDictionary = {} as { [key: string]: NumberServicePeriod[] }

  finalServicePeriods.forEach((item: NumberServicePeriod) => {
    if (item.day.toUpperCase() === DaysOfTheWeek.SATURDAY || item.day.toUpperCase() === DaysOfTheWeek.SUNDAY) {
      // special cases, these don't combine
      servicePeriodDictionary[`${item.day}-${item.start}-${item.end}`] = [item]
    } else {
      const key = `${item.start}-${item.end}`
      if (servicePeriodDictionary[key]) {
        servicePeriodDictionary[key].push(item)
      } else {
        servicePeriodDictionary[key] = [item]
      }
    }
  })

  console.log(servicePeriodDictionary)

  Object.keys(servicePeriodDictionary).forEach((key) => {
    const servicePeriods = servicePeriodDictionary[key]
    servicePeriods
  })
  /*
  Regular Service hours: 
    M: 730am -6pm
    T: 730am -6pm
    W: 730am -6pm
    Th: 730am -6pm
    F: 730am -6pm

    Sa: 10am - 4pm
    Su: 9am - 3pm
  unavailable hours:
    M: 12pm - 1pm
    F: 730am - 6pm (closed all day for a holiday)

  output:
    Monday: 730 - 12pm
    Monday: 1pm - 6pm
    Tuesdayto Thursday: 730am - 6:00pm

    Saturday: 10am - 4pm
    Sunday: 9am - 3pm
  */

  // convert each period to have time ranges
  // do the same for unavailable hours
  // compare each unavailable time range to the regular service hours and split them if they overlap
  // group consecutive days with the same hours together

  return ''
}

const splitServicePeriod = (regular: NumberServicePeriod, unavailable: NumberServicePeriod): NumberServicePeriod[] => {
  // no intersection, return regular hours as is
  if (unavailable.end <= regular.start || unavailable.start >= regular.end) {
    return [regular]
  }

  // unavilable hours cover regular hours, return empty
  if (unavailable.start <= regular.start && unavailable.end >= regular.end) {
    return []
  }

  const remainingPeriods: NumberServicePeriod[] = []

  if (unavailable.start > regular.start) {
    remainingPeriods.push({
      day: regular.day,
      start: regular.start,
      end: Math.min(regular.end, unavailable.start),
    })
  }

  if (unavailable.end < regular.end) {
    remainingPeriods.push({
      day: regular.day,
      start: Math.max(regular.start, unavailable.end),
      end: regular.end,
    })
  }

  return remainingPeriods
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

const dayOfTheWeekFormatter = (day: string): string => {
  const normalizedDay = day.trim().toLowerCase()
  if (!normalizedDay) {
    return ''
  }

  return normalizedDay.charAt(0).toUpperCase() + normalizedDay.slice(1)
}
