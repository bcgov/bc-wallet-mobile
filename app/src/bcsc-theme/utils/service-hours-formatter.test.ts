import { ServiceHours } from '../api/hooks/useVideoCallApi'
import {
  formatServiceAndUnavailableHours,
  formatServiceHours,
  formatTime12Hour,
  formatUnavailableHours,
  isCurrentTimeOutsideUnavailablePeriod,
  isCurrentTimeWithinServiceHours,
  isLiveCallAvailable,
} from './service-hours-formatter'

jest.mock('@/utils/analytics/analytics-singleton', () => ({
  Analytics: { trackErrorEvent: jest.fn() },
}))

// 2024-01-15 (Monday) 4:00 PM Pacific = 2024-01-16T00:00:00Z
const JAN_15_2024_4PM_PACIFIC_EPOCH = 1705363200
// 2024-01-15 (Monday) 6:00 PM Pacific = 2024-01-16T02:00:00Z
const JAN_15_2024_6PM_PACIFIC_EPOCH = 1705370400

const makeWeekdayPeriods = (startTime: string, endTime: string) =>
  ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((day) => ({
    start_day: day,
    end_day: day,
    start_time: startTime,
    end_time: endTime,
  }))

describe('formatTime12Hour', () => {
  it('formats midnight as 12am', () => {
    expect(formatTime12Hour('00:00')).toBe('12:00am')
  })

  it('formats noon as 12pm', () => {
    expect(formatTime12Hour('12:00')).toBe('12:00pm')
  })

  it('formats afternoon hours with minutes', () => {
    expect(formatTime12Hour('13:30')).toBe('1:30pm')
  })

  it('formats morning hours with minutes', () => {
    expect(formatTime12Hour('07:30')).toBe('7:30am')
  })

  it('omits minutes when zero', () => {
    expect(formatTime12Hour('17:00')).toBe('5:00pm')
  })

  it('returns empty string unchanged', () => {
    expect(formatTime12Hour('')).toBe('')
  })

  it('throws on non-numeric time string', () => {
    expect(() => formatTime12Hour('abc')).toThrow()
  })

  it('throws on time string without colon separator', () => {
    expect(() => formatTime12Hour('1234')).toThrow()
  })

  it('throws on partially valid time string', () => {
    expect(() => formatTime12Hour('12:xx')).toThrow()
  })

  it('throws on extra colon segments', () => {
    expect(() => formatTime12Hour('12:34:56')).toThrow()
  })

  it('throws on out-of-range hours', () => {
    expect(() => formatTime12Hour('25:00')).toThrow()
  })

  it('throws on out-of-range minutes', () => {
    expect(() => formatTime12Hour('12:60')).toThrow()
  })
})

describe('formatServiceHours', () => {
  it('returns default hours when no service periods are provided', () => {
    const result = formatServiceHours({
      time_zone: 'America/Vancouver',
      regular_service_periods: [],
      service_unavailable_periods: [],
    })
    expect(result).toEqual([{ title: 'Monday to Friday', hours: '7:30am - 5:00pm Pacific Time' }])
  })

  it('groups weekdays with the same hours into one entry', () => {
    const serviceHours: ServiceHours = {
      time_zone: 'America/Vancouver',
      regular_service_periods: makeWeekdayPeriods('07:30', '17:00'),
      service_unavailable_periods: [],
    }

    const result = formatServiceHours(serviceHours)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      title: 'Monday to Friday',
      hours: '7:30am - 5:00pm Pacific Time',
    })
    expect(result[0].isUnavailable).toBeFalsy()
  })

  it('creates separate entries for different weekday hour ranges', () => {
    const serviceHours: ServiceHours = {
      time_zone: 'America/Vancouver',
      regular_service_periods: [
        { start_day: 'MONDAY', end_day: 'MONDAY', start_time: '07:30', end_time: '17:00' },
        { start_day: 'TUESDAY', end_day: 'TUESDAY', start_time: '09:00', end_time: '18:00' },
      ],
      service_unavailable_periods: [],
    }

    const result = formatServiceHours(serviceHours)

    expect(result).toHaveLength(2)
  })

  it('does not group weekend days with weekdays', () => {
    const serviceHours: ServiceHours = {
      time_zone: 'America/Vancouver',
      regular_service_periods: [
        { start_day: 'MONDAY', end_day: 'MONDAY', start_time: '07:30', end_time: '17:00' },
        { start_day: 'SATURDAY', end_day: 'SATURDAY', start_time: '07:30', end_time: '17:00' },
      ],
      service_unavailable_periods: [],
    }

    const result = formatServiceHours(serviceHours)

    expect(result).toHaveLength(2)
    expect(result.some((r) => r.title.includes('Saturday'))).toBe(true)
  })

  it('displays non-Pacific timezone name as-is', () => {
    const serviceHours: ServiceHours = {
      time_zone: 'America/Toronto',
      regular_service_periods: makeWeekdayPeriods('07:30', '17:00'),
      service_unavailable_periods: [],
    }

    const result = formatServiceHours(serviceHours)

    expect(result[0].hours).toContain('America/Toronto')
  })

  it('throws when a service period has a malformed time string', () => {
    const serviceHours: ServiceHours = {
      time_zone: 'America/Vancouver',
      regular_service_periods: [
        { start_day: 'MONDAY', end_day: 'MONDAY', start_time: 'invalid', end_time: '17:00' },
      ],
      service_unavailable_periods: [],
    }
    expect(() => formatServiceHours(serviceHours)).toThrow()
  })
})

describe('formatUnavailableHours', () => {
  it('returns empty array when no unavailable periods', () => {
    const result = formatUnavailableHours({
      time_zone: 'America/Vancouver',
      regular_service_periods: [],
      service_unavailable_periods: [],
    })
    expect(result).toEqual([])
  })

  it('formats a maintenance period with hours and dateLine', () => {
    const serviceHours: ServiceHours = {
      time_zone: 'America/Vancouver',
      regular_service_periods: [],
      service_unavailable_periods: [
        {
          start_date: JAN_15_2024_4PM_PACIFIC_EPOCH,
          end_date: JAN_15_2024_6PM_PACIFIC_EPOCH,
          reason: 'MAINTENANCE',
          reason_description: 'Scheduled maintenance',
        },
      ],
    }

    const result = formatUnavailableHours(serviceHours)

    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Closed for Scheduled maintenance')
    expect(result[0].hours).toContain('Pacific Time')
    expect(result[0].dateLine).toContain('Monday, January 15, 2024')
    expect(result[0].isUnavailable).toBe(true)
  })

  it('formats a holiday period with only title and dateLine (no hours)', () => {
    const serviceHours: ServiceHours = {
      time_zone: 'America/Vancouver',
      regular_service_periods: [],
      service_unavailable_periods: [
        {
          start_date: JAN_15_2024_4PM_PACIFIC_EPOCH,
          end_date: JAN_15_2024_6PM_PACIFIC_EPOCH,
          reason: 'HOLIDAY',
          reason_description: 'Thanksgiving',
        },
      ],
    }

    const result = formatUnavailableHours(serviceHours)

    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Closed for Thanksgiving')
    expect(result[0].hours).toBeUndefined()
    expect(result[0].dateLine).toContain('Monday, January 15, 2024')
    expect(result[0].isUnavailable).toBe(true)
  })

  it('falls back to reason when reason_description is empty', () => {
    const serviceHours: ServiceHours = {
      time_zone: 'America/Vancouver',
      regular_service_periods: [],
      service_unavailable_periods: [
        {
          start_date: JAN_15_2024_4PM_PACIFIC_EPOCH,
          end_date: JAN_15_2024_6PM_PACIFIC_EPOCH,
          reason: 'HOLIDAY',
          reason_description: '',
        },
      ],
    }

    const result = formatUnavailableHours(serviceHours)

    expect(result[0].title).toBe('Closed for HOLIDAY')
  })
})

describe('formatServiceAndUnavailableHours', () => {
  it('combines service hours and unavailable periods', () => {
    const serviceHours: ServiceHours = {
      time_zone: 'America/Vancouver',
      regular_service_periods: makeWeekdayPeriods('07:30', '17:00'),
      service_unavailable_periods: [
        {
          start_date: JAN_15_2024_4PM_PACIFIC_EPOCH,
          end_date: JAN_15_2024_6PM_PACIFIC_EPOCH,
          reason: 'HOLIDAY',
          reason_description: 'Thanksgiving',
        },
      ],
    }

    const result = formatServiceAndUnavailableHours(serviceHours)

    expect(result.length).toBeGreaterThan(1)
    expect(result.some((r) => r.title.includes('Monday'))).toBe(true)
    expect(result.some((r) => r.title.includes('Thanksgiving'))).toBe(true)
  })
})

describe('isCurrentTimeOutsideUnavailablePeriod', () => {
  it('returns true when there are no unavailable periods', () => {
    const serviceHours: ServiceHours = {
      time_zone: 'America/Vancouver',
      regular_service_periods: [],
      service_unavailable_periods: [],
    }
    expect(isCurrentTimeOutsideUnavailablePeriod(serviceHours)).toBe(true)
  })

  it('returns false when current time is within an unavailable period', () => {
    const now = Math.floor(Date.now() / 1000)
    const serviceHours: ServiceHours = {
      time_zone: 'America/Vancouver',
      regular_service_periods: [],
      service_unavailable_periods: [
        {
          start_date: now - 3600,
          end_date: now + 3600,
          reason: 'MAINTENANCE',
          reason_description: 'Test',
        },
      ],
    }
    expect(isCurrentTimeOutsideUnavailablePeriod(serviceHours)).toBe(false)
  })

  it('returns true when current time is outside all unavailable periods', () => {
    const now = Math.floor(Date.now() / 1000)
    const serviceHours: ServiceHours = {
      time_zone: 'America/Vancouver',
      regular_service_periods: [],
      service_unavailable_periods: [
        {
          start_date: now + 3600,
          end_date: now + 7200,
          reason: 'MAINTENANCE',
          reason_description: 'Future maintenance',
        },
      ],
    }
    expect(isCurrentTimeOutsideUnavailablePeriod(serviceHours)).toBe(true)
  })
})

describe('isCurrentTimeWithinServiceHours', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns false when there are no service periods', () => {
    const serviceHours: ServiceHours = {
      time_zone: 'America/Vancouver',
      regular_service_periods: [],
      service_unavailable_periods: [],
    }
    expect(isCurrentTimeWithinServiceHours(serviceHours)).toBe(false)
  })

  it('returns true when current Pacific time is within a service period', () => {
    // Set time to Monday 2024-01-15 at 16:00 UTC = 8:00 AM Pacific (UTC-8)
    jest.setSystemTime(new Date('2024-01-15T16:00:00.000Z'))

    const serviceHours: ServiceHours = {
      time_zone: 'America/Vancouver',
      regular_service_periods: [{ start_day: 'MONDAY', end_day: 'MONDAY', start_time: '07:30', end_time: '17:00' }],
      service_unavailable_periods: [],
    }
    expect(isCurrentTimeWithinServiceHours(serviceHours)).toBe(true)
  })

  it('returns false when current Pacific time is outside service hours', () => {
    // Set time to Tuesday 2024-01-16 at 02:00 UTC = Monday 6:00 PM Pacific (after 5pm close)
    jest.setSystemTime(new Date('2024-01-16T02:00:00.000Z'))

    const serviceHours: ServiceHours = {
      time_zone: 'America/Vancouver',
      regular_service_periods: [{ start_day: 'MONDAY', end_day: 'MONDAY', start_time: '07:30', end_time: '17:00' }],
      service_unavailable_periods: [],
    }
    expect(isCurrentTimeWithinServiceHours(serviceHours)).toBe(false)
  })

  it('returns false on a weekend when only weekday periods are defined', () => {
    // Set time to Saturday 2024-01-20 at 16:00 UTC = 8:00 AM Pacific
    jest.setSystemTime(new Date('2024-01-20T16:00:00.000Z'))

    const serviceHours: ServiceHours = {
      time_zone: 'America/Vancouver',
      regular_service_periods: makeWeekdayPeriods('07:30', '17:00'),
      service_unavailable_periods: [],
    }
    expect(isCurrentTimeWithinServiceHours(serviceHours)).toBe(false)
  })

  it('throws when a service period has a malformed start_time', () => {
    // Monday 8am Pacific — day check passes, then hits malformed time
    jest.setSystemTime(new Date('2024-01-15T16:00:00.000Z'))

    const serviceHours: ServiceHours = {
      time_zone: 'America/Vancouver',
      regular_service_periods: [
        { start_day: 'MONDAY', end_day: 'MONDAY', start_time: 'invalid', end_time: '17:00' },
      ],
      service_unavailable_periods: [],
    }
    expect(() => isCurrentTimeWithinServiceHours(serviceHours)).toThrow()
  })

  it('throws when a service period has a malformed end_time', () => {
    jest.setSystemTime(new Date('2024-01-15T16:00:00.000Z'))

    const serviceHours: ServiceHours = {
      time_zone: 'America/Vancouver',
      regular_service_periods: [
        { start_day: 'MONDAY', end_day: 'MONDAY', start_time: '07:30', end_time: 'bad' },
      ],
      service_unavailable_periods: [],
    }
    expect(() => isCurrentTimeWithinServiceHours(serviceHours)).toThrow()
  })
})

describe('isLiveCallAvailable', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns false when outside service hours', () => {
    // Saturday morning Pacific — no weekend service
    jest.setSystemTime(new Date('2024-01-20T16:00:00.000Z'))

    const serviceHours: ServiceHours = {
      time_zone: 'America/Vancouver',
      regular_service_periods: makeWeekdayPeriods('07:30', '17:00'),
      service_unavailable_periods: [],
    }
    expect(isLiveCallAvailable(serviceHours)).toBe(false)
  })

  it('returns false when within service hours but during an unavailable period', () => {
    // Monday 8am Pacific = within service hours
    jest.setSystemTime(new Date('2024-01-15T16:00:00.000Z'))
    const now = Math.floor(new Date('2024-01-15T16:00:00.000Z').getTime() / 1000)

    const serviceHours: ServiceHours = {
      time_zone: 'America/Vancouver',
      regular_service_periods: makeWeekdayPeriods('07:30', '17:00'),
      service_unavailable_periods: [
        { start_date: now - 3600, end_date: now + 3600, reason: 'MAINTENANCE', reason_description: 'Test' },
      ],
    }
    expect(isLiveCallAvailable(serviceHours)).toBe(false)
  })

  it('returns true when within service hours and no unavailable period', () => {
    // Monday 8am Pacific
    jest.setSystemTime(new Date('2024-01-15T16:00:00.000Z'))

    const serviceHours: ServiceHours = {
      time_zone: 'America/Vancouver',
      regular_service_periods: makeWeekdayPeriods('07:30', '17:00'),
      service_unavailable_periods: [],
    }
    expect(isLiveCallAvailable(serviceHours)).toBe(true)
  })

  it('throws when service period contains malformed time', () => {
    // Monday 8am Pacific
    jest.setSystemTime(new Date('2024-01-15T16:00:00.000Z'))

    const serviceHours: ServiceHours = {
      time_zone: 'America/Vancouver',
      regular_service_periods: [
        { start_day: 'MONDAY', end_day: 'MONDAY', start_time: 'not:valid', end_time: '17:00' },
      ],
      service_unavailable_periods: [],
    }
    expect(() => isLiveCallAvailable(serviceHours)).toThrow()
  })
})
