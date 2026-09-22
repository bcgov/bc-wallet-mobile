import { TestUsers } from '../constants.js'

/**
 * Keeps card-holder and one-time values out of everything that reaches a remote log — Sauce/CI
 * output, thrown errors, annotations, step summaries. Redacted at the source, so no caller has to.
 */

/** What a log names instead of a serial or a name: a `TestUsers` key, or `foreign` for anyone else's request. */
export type PersonaLabel = keyof typeof TestUsers | 'foreign'

/** Whatever names a card holder: the serial, or the name on a cardless card (its serial reads N/A). */
export interface HolderIdentity {
  cardSerialNumber: string
  surname?: string
  firstName?: string
}

const CARDLESS_SERIAL = 'N/A'

/** The persona an expected or claimed identity belongs to. */
export function personaLabel(identity: HolderIdentity): PersonaLabel {
  const serial = identity.cardSerialNumber.trim().toUpperCase()
  for (const [key, user] of Object.entries(TestUsers)) {
    const sameName =
      (identity.surname ?? '').toUpperCase() === user.lastName.toUpperCase() &&
      (identity.firstName ?? '').toUpperCase() === user.firstName.toUpperCase()
    const matches =
      serial === CARDLESS_SERIAL ? user.cardSerial === CARDLESS_SERIAL && sameName : serial === user.cardSerial
    if (matches) return key as keyof typeof TestUsers
  }
  return 'foreign'
}

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

/** The persona fields that identify a holder (the rest are asset paths and flow tags). */
const PERSONA_VALUE_KEYS = new Set([
  'username',
  'firstName',
  'lastName',
  'cardSerial',
  'dob',
  'documentNumber',
  'primaryDocumentNumber',
])

/** Every literal persona value, as one word-bounded pattern. */
const PERSONA_VALUES = new RegExp(
  String.raw`\b(?:${[
    ...new Set(
      Object.values(TestUsers).flatMap((user) =>
        Object.entries(user)
          .filter(([key, value]) => PERSONA_VALUE_KEYS.has(key) && value !== CARDLESS_SERIAL)
          .map(([, value]) => escapeRegExp(value))
      )
    ),
  ].join('|')})\b`,
  'gi'
)

/** Shape masks for values that are not ours to know — a foreign request's, or minted by the server. */
const MASKS: readonly (readonly [RegExp, string])[] = [
  [PERSONA_VALUES, '<persona>'],
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '<email>'],
  [/\b[A-Z]\d{8}\b/g, '<serial>'], // a BCSC card serial
  [/\b[A-Z0-9]{4}-[A-Z0-9]{4}\b/g, '<code>'], // an in-person confirmation code
  [/\d{6,}/g, '<digits>'], // birthdates, PINs, phone and document numbers
]

/** `text` with anything that identifies a card holder or unlocks a request masked. */
export function redactSensitiveText(text: string): string {
  return MASKS.reduce((out, [pattern, mask]) => out.replaceAll(pattern, mask), text)
}
