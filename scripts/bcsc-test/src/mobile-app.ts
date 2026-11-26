import { contextHost } from './config.ts'
import { CliError, ExitCode } from './exit-codes.ts'
import { OUTCOME_UNKNOWN, readJson, sendApiRequest } from './request.ts'
import type { FlagValue, HandlerContext } from './spec.ts'

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

const endpointMissing = (host: string): string =>
  `No mobile-app endpoint was found on ${host}. Check --hostname, and that the test API is deployed there.`

const expiryErrors = (host: string): Partial<Record<number, string>> => ({
  400: 'IAS rejected the expiry. It accepts one only for a usercode whose mobile app is Activated. The usercode may be unknown, not yet verified, already expired or suspended, or IAS may have refused the date.',
  404: endpointMissing(host),
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

const REASON_EXAMPLE = 'E2E1'
// Mirrors the check IAS applies to the trimmed reason; anything else gets a 400 with no explanation.
const REASON_PATTERN = /^[A-Za-z0-9]{1,25}$/

const checkReason = (flag: FlagValue): string => {
  const reason = typeof flag === 'string' ? flag.trim() : ''
  if (!reason) throw new CliError('--reason is required.')
  if (!REASON_PATTERN.test(reason)) {
    throw new CliError(
      `"${reason}" is not a valid reason. IAS takes a ticket reference of 1 to 25 letters or digits, with no spaces or punctuation, e.g. ${REASON_EXAMPLE}. Nothing was sent.`
    )
  }
  return reason
}

// A second run switches the status back, so every failure that may have reached IAS says to check first.
const mayHaveChanged = (status: number): string =>
  `IAS answered with status ${status} after the request was sent, so it may or may not have changed the status. Check the device before running the command again, because a second run switches it back.`

// 501 keeps its own message: IAS says it does not implement the operation, so nothing was changed.
const serverErrors = (): Partial<Record<number, string>> =>
  Object.fromEntries(
    Array.from({ length: 100 }, (_, offset) => 500 + offset)
      .filter((status) => status !== 501)
      .map((status) => [status, mayHaveChanged(status)])
  )

const statusErrors = (host: string): Partial<Record<number, string>> => ({
  400: 'IAS rejected the status change. It accepts one only for a usercode whose mobile app is Activated or Suspended. The usercode may be unknown, not yet verified, expired or deactivated.',
  404: endpointMissing(host),
  ...serverErrors(),
})

const STATUS_OUTCOME_UNKNOWN =
  'The outcome is unknown; check the device before running the command again, because a second run switches the status back.'

// IAS answers a change with 200 and no body; any other success, a body or a failed read cannot be trusted as that.
const confirmedStatusChange = async (response: Response): Promise<void> => {
  let body: string | undefined
  try {
    body = response.status === 200 ? await response.text() : undefined
  } catch {
    body = undefined
  }
  if (body !== '') throw new CliError(`IAS answered unexpectedly. ${STATUS_OUTCOME_UNKNOWN}`)
}

export const setStatus = async (ctx: HandlerContext): Promise<number> => {
  const reason = checkReason(ctx.flags.reason)
  const host = contextHost(ctx)
  const usercode = ctx.args.usercode
  const response = await sendApiRequest(ctx, host, {
    method: 'POST',
    path: `/accounts/mobile-app/${encodeURIComponent(usercode)}/status`,
    body: { reason },
    errors: statusErrors(host),
    redirect: 'manual',
    outcomeUnknown: STATUS_OUTCOME_UNKNOWN,
  })
  if (!response) return ExitCode.ok
  await confirmedStatusChange(response)
  ctx.io.stdout(
    `Changed the status of ${usercode} on ${host}: an Activated mobile app is now Suspended, and a Suspended one is now Activated. Run the command again to reverse it.\n`
  )
  return ExitCode.ok
}
