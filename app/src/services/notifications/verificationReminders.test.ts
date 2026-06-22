import notifee from '@notifee/react-native'
import { cancelVerificationReminders, scheduleVerificationReminders } from './verificationReminders'

// TZ is pinned to GMT for the test run (see package.json test script), so local-time hour math is GMT.
const NOW = new Date('2026-06-01T08:00:00Z')
const DAY_MS = 24 * 60 * 60 * 1000
const COPY = { title: 'Finish verifying your identity', body: 'Verify by June 8, 2026.' }

const createTrigger = notifee.createTriggerNotification as jest.Mock
const cancelTriggers = notifee.cancelTriggerNotifications as jest.Mock

const scheduledTimestamps = () => createTrigger.mock.calls.map(([, trigger]) => trigger.timestamp).sort()

describe('verificationReminders', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers().setSystemTime(NOW)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('schedules both the 3-day and 1-day reminders at 10:00 when more than 3 days remain', async () => {
    const expiry = new Date(NOW.getTime() + 7 * DAY_MS)

    await scheduleVerificationReminders(expiry, COPY)

    expect(createTrigger).toHaveBeenCalledTimes(2)
    expect(scheduledTimestamps()).toEqual([
      new Date('2026-06-05T10:00:00Z').getTime(), // expiry - 3 days, pinned to 10:00
      new Date('2026-06-07T10:00:00Z').getTime(), // expiry - 1 day, pinned to 10:00
    ])
  })

  it('schedules only the 1-day reminder once the 3-day fire time has passed', async () => {
    const expiry = new Date(NOW.getTime() + 2 * DAY_MS)

    await scheduleVerificationReminders(expiry, COPY)

    expect(createTrigger).toHaveBeenCalledTimes(1)
    expect(scheduledTimestamps()).toEqual([new Date('2026-06-02T10:00:00Z').getTime()])
  })

  it('schedules nothing when less than a day remains', async () => {
    const expiry = new Date(NOW.getTime() + 12 * 60 * 60 * 1000)

    await scheduleVerificationReminders(expiry, COPY)

    expect(createTrigger).not.toHaveBeenCalled()
  })

  it('clears existing reminders before scheduling new ones (safe to reschedule on extension)', async () => {
    const expiry = new Date(NOW.getTime() + 7 * DAY_MS)

    await scheduleVerificationReminders(expiry, COPY)

    expect(cancelTriggers).toHaveBeenCalledWith(['verification-reminder-3-day', 'verification-reminder-1-day'])
  })

  it('cancelVerificationReminders cancels both reminder ids', async () => {
    await cancelVerificationReminders()

    expect(cancelTriggers).toHaveBeenCalledWith(['verification-reminder-3-day', 'verification-reminder-1-day'])
  })

  it('never throws when notifee fails (best-effort)', async () => {
    createTrigger.mockRejectedValueOnce(new Error('notifee boom'))
    const expiry = new Date(NOW.getTime() + 7 * DAY_MS)

    await expect(scheduleVerificationReminders(expiry, COPY)).resolves.toBeUndefined()
  })
})
