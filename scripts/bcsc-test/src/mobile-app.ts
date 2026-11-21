import { contextHost } from './config.ts'
import { CliError, ExitCode } from './exit-codes.ts'
import { OUTCOME_UNKNOWN, readJson, sendApiRequest } from './request.ts'
import type { HandlerContext } from './spec.ts'

const EXPIRY_EXAMPLE = '2099-12-01T00:00:00-08:00'

// Stricter than IAS by design: it would silently clamp or roll impossible dates over. Format: yyyy-MM-dd'T'HH:mm:ssXXX.
const EXPIRY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:Z|([+-])(\d{2}):(\d{2}))$/
// The largest offset java.time.ZoneOffset accepts.
const MAX_OFFSET_MINUTES = 18 * 60
const MS_PER_MINUTE = 60_000

// Date rolls impossible fields over (Feb 30 becomes Mar 2), so a mismatch means the input was not a real date.
const wallClockMs = ([year, month, day, hour, minute, second]: number[]): number | undefined => {
  // IAS parses the year as year-of-era, which has no year 0.
  if (year < 1) return undefined
  const wallClock = new Date(0)
  wallClock.setUTCFullYear(year, month - 1, day)
  wallClock.setUTCHours(hour, minute, second, 0)
  const actual = [
    wallClock.getUTCFullYear(),
    wallClock.getUTCMonth() + 1,
    wallClock.getUTCDate(),
    wallClock.getUTCHours(),
    wallClock.getUTCMinutes(),
    wallClock.getUTCSeconds(),
  ]
  const expected = [year, month, day, hour, minute, second]
  return actual.every((field, index) => field === expected[index]) ? wallClock.getTime() : undefined
}

const offsetMinutes = (sign?: string, hours?: string, minutes?: string): number | undefined => {
  if (!sign) return 0
  const total = Number(hours) * 60 + Number(minutes)
  if (Number(minutes) >= 60 || total > MAX_OFFSET_MINUTES) return undefined
  return sign === '-' ? -total : total
}

/** The instant in epoch ms, or undefined unless the value is a real calendar date in the server's format. */
const expiryInstant = (value: unknown): number | undefined => {
  const match = typeof value === 'string' ? EXPIRY_PATTERN.exec(value) : null
  if (!match) return undefined
  const [sign, offsetHours, offsetMins] = match.slice(7)
  const wallClock = wallClockMs(match.slice(1, 7).map(Number))
  const offset = offsetMinutes(sign, offsetHours, offsetMins)
  if (wallClock === undefined || offset === undefined) return undefined
  return wallClock - offset * MS_PER_MINUTE
}

const checkExpiry = (value: string): string => {
  if (expiryInstant(value) === undefined) {
    throw new CliError(
      `"${value}" is not a valid expiry. Use an ISO-8601 date and time with whole seconds and a UTC offset, e.g. ${EXPIRY_EXAMPLE}. Nothing was sent.`
    )
  }
  return value
}

const expiryErrors = (host: string): Partial<Record<number, string>> => ({
  400: 'IAS rejected the expiry. It accepts one only for a usercode whose mobile app is Activated. The usercode may be unknown, not yet verified, already expired or suspended, or IAS may have refused the date.',
  404: `No mobile-app endpoint was found on ${host}. Check --hostname, and that the test API is deployed there.`,
  500: 'IAS failed with status 500 after the request was sent, so it may have saved the expiry. Check the credential state before retrying.',
})

// Only a 200 echoing the requested instant proves the expiry was stored; anything else is ambiguous.
const confirmedExpiry = async (response: Response, requested: string): Promise<string> => {
  const body = response.status === 200 ? await readJson(response) : undefined
  const stored = (body as { expiryDate?: unknown } | undefined)?.expiryDate
  if (typeof stored !== 'string' || expiryInstant(stored) !== expiryInstant(requested)) {
    throw new CliError(`IAS answered unexpectedly. ${OUTCOME_UNKNOWN}`)
  }
  return stored
}

export const setExpiry = async (ctx: HandlerContext): Promise<number> => {
  const expiryDate = checkExpiry(ctx.args['iso-date'])
  const host = contextHost(ctx)
  const usercode = ctx.args.usercode
  const response = await sendApiRequest(ctx, host, {
    method: 'POST',
    path: `/accounts/mobile-app/${encodeURIComponent(usercode)}/expiry`,
    body: { expiryDate },
    errors: expiryErrors(host),
  })
  if (response) {
    const stored = await confirmedExpiry(response, expiryDate)
    ctx.io.stdout(
      `Set the expiry of ${usercode} on ${host} to ${stored}.\nIf that date is already past on the IAS server, the mobile app is now Expired, and this command cannot change it again.\n`
    )
  }
  return ExitCode.ok
}
