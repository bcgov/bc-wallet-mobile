import { z } from 'zod'

/**
 * Shared form field rules.
 *
 * Schema messages are i18n keys rather than copy: call sites translate the key returned by
 * {@link firstErrorKey}, which keeps `t` in the component/model layer where it belongs.
 *
 * Rules mirror the ias-ios validators except where noted.
 */

/**
 * Canada Post never issues D, F, I, O, Q or U in any position, nor W or Z as the leading
 * letter. Unlike ias-ios this stays case-insensitive, tolerates a space or hyphen separator,
 * and is anchored — ias-ios substring-matches, so it accepts a valid code embedded in junk.
 */
const POSTAL_CODE_PATTERN = /^[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJKLMNPRSTVWXYZ][ -]?\d[ABCEGHJKLMNPRSTVWXYZ]\d$/i

const SERIAL_PATTERN = /^[A-Za-z0-9]{3,15}$/

const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/

/** RFC 5321 maximum length of an email address, ias-ios doesn't have a max length check */
export const EMAIL_MAX_LENGTH = 254

/** Per-field caps from ias-ios */
export const NAME_MAX_LENGTH = { first: 15, middle: 30, last: 35 } as const

export const MAX_MIDDLE_NAMES = 2

export const postalCodeSchema = z.string().trim().regex(POSTAL_CODE_PATTERN, 'BCSC.Address.PostalCodeInvalid')

/**
 * Parses to the value that should be persisted and sent: email verification is
 * case-insensitive, so the address is trimmed and lower-cased here rather than at the call site.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX_LENGTH, 'BCSC.EmailConfirmation.EmailError')
  .regex(EMAIL_PATTERN, 'BCSC.EmailConfirmation.EmailError')

export const serialSchema = z
  .string()
  .trim()
  .min(1, 'BCSC.ManualSerial.EmptySerialError')
  .regex(SERIAL_PATTERN, 'BCSC.ManualSerial.FormatError')

/** Optional: mononyms are recorded in the last name, so a blank first name is valid. */
export const firstNameSchema = z
  .string()
  .trim()
  .max(NAME_MAX_LENGTH.first, 'BCSC.EvidenceIDCollection.FirstNameLengthError')

export const lastNameSchema = z
  .string()
  .trim()
  .min(1, 'BCSC.EvidenceIDCollection.LastNameError')
  .max(NAME_MAX_LENGTH.last, 'BCSC.EvidenceIDCollection.LastNameLengthError')

export const middleNamesSchema = z
  .string()
  .trim()
  .max(NAME_MAX_LENGTH.middle, 'BCSC.EvidenceIDCollection.MiddleNamesLengthError')
  .refine(
    (value) => value.split(/\s+/).filter(Boolean).length <= MAX_MIDDLE_NAMES,
    'BCSC.EvidenceIDCollection.MiddleNamesError'
  )

export type FieldResult<T> = { ok: true; value: T } | { ok: false; errorKey: string }

/**
 * Validates a value and, when valid, hands back the schema's normalized output — use this
 * for fields whose parsed value is submitted, so the validated and submitted values cannot drift.
 */
export const parseField = <T>(schema: z.ZodType<T>, value: unknown): FieldResult<T> => {
  const result = schema.safeParse(value)

  return result.success ? { ok: true, value: result.data } : { ok: false, errorKey: result.error.issues[0].message }
}

/**
 * Validates a value against a schema and returns the i18n key of the first failure,
 * or null when the value is valid.
 */
export const firstErrorKey = (schema: z.ZodType, value: unknown): string | null => {
  const result = parseField(schema, value)

  return result.ok ? null : result.errorKey
}
