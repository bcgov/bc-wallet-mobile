import notifee, { AndroidImportance, TimestampTrigger, TriggerType } from '@notifee/react-native'
import { Platform } from 'react-native'

/**
 * Local reminder notifications for an in-progress identity verification.
 *
 * A verification holds a short-lived `device_code` with a server-set expiry (~7 days, and possibly
 * extended by the server for video submissions / agent approval). These reminders nudge the user to
 * finish before that deadline lapses. Mirrors ias-ios: two reminders, fired at 10:00 local time on
 * the day 3 days before expiry and the day 1 day before expiry. A candidate reminder whose fire time
 * is already in the past is simply skipped, which reproduces the iOS cadence (only the 1-day reminder
 * survives once fewer than 3 days remain, none once fewer than 1).
 *
 * Scheduling/cancellation are best-effort: a notifee failure must never break the verification flow,
 * so everything is wrapped and only logged.
 */

const CHANNEL_ID = 'verification-reminders'
const REMINDER_HOUR = 10 // 10:00 local, mirrors ias-ios
const DAY_MS = 24 * 60 * 60 * 1000

// Days-before-expiry for each reminder. Stable ids so a reschedule overwrites the prior trigger.
const REMINDER_OFFSETS_DAYS = [3, 1]
const reminderId = (daysBefore: number) => `verification-reminder-${daysBefore}-day`

/** Minimal logger surface so callers can pass the app's logger (BifoldLogger) without coupling to its type. */
interface ReminderLogger {
  info: (message: string, data?: Record<string, unknown>) => void
  warn: (message: string, data?: Record<string, unknown>) => void
}

export interface VerificationReminderCopy {
  title: string
  body: string
}

/**
 * Cancels any pending verification reminder notifications.
 *
 * Call when the verification reaches a terminal state (completed, cancelled, abandoned/reset) so a
 * stale "verify by ..." reminder never fires after the session is over.
 */
export async function cancelVerificationReminders(logger?: ReminderLogger): Promise<void> {
  try {
    await notifee.cancelTriggerNotifications(REMINDER_OFFSETS_DAYS.map(reminderId))
    logger?.info('[verificationReminders] Cancelled pending verification reminders')
  } catch (error) {
    logger?.warn('[verificationReminders] Failed to cancel verification reminders', { error })
  }
}

/**
 * (Re)schedules the verification reminders for the given expiry. Existing reminders are cleared first,
 * so this is safe to call repeatedly — e.g. whenever the server extends the deadline.
 *
 * @param expiry The verification (device_code) expiry.
 * @param copy The reminder title/body (localized by the caller).
 * @param logger Optional logger for best-effort diagnostics.
 */
export async function scheduleVerificationReminders(
  expiry: Date,
  copy: VerificationReminderCopy,
  logger?: ReminderLogger
): Promise<void> {
  try {
    // Clear first so a shorter/extended deadline never leaves an outdated trigger behind.
    await cancelVerificationReminders(logger)

    const now = Date.now()

    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: CHANNEL_ID,
        name: 'Verification reminders',
        importance: AndroidImportance.DEFAULT,
      })
    }

    let scheduled = 0
    for (const daysBefore of REMINDER_OFFSETS_DAYS) {
      const fireDate = new Date(expiry.getTime() - daysBefore * DAY_MS)
      fireDate.setHours(REMINDER_HOUR, 0, 0, 0)

      // Skip reminders whose 10:00 fire time has already passed
      if (fireDate.getTime() <= now) {
        continue
      }

      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: fireDate.getTime(),
      }

      await notifee.createTriggerNotification(
        {
          id: reminderId(daysBefore),
          title: copy.title,
          body: copy.body,
          android: {
            channelId: CHANNEL_ID,
            pressAction: { id: 'default' },
          },
        },
        trigger
      )
      scheduled += 1
    }

    logger?.info('[verificationReminders] Scheduled verification reminders', {
      expiry: expiry.toISOString(),
      scheduled,
    })
  } catch (error) {
    logger?.warn('[verificationReminders] Failed to schedule verification reminders', { error })
  }
}
