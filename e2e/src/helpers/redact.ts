import { TestUsers } from '../constants.js'

/**
 * Keeps card-holder and one-time values out of everything that reaches a remote log — Sauce/CI
 * output, thrown errors, annotations, step summaries. Redacted at the source, so no caller has to.
 */

/**
 * What a log names instead of a serial or a name: a `TestUsers` key, `minted` for an identity this
 * session minted, or `foreign` for anyone else's request.
 */
export type PersonaLabel = keyof typeof TestUsers | 'minted' | 'foreign'

/** Whatever names a card holder: the serial, or the name on a cardless card (its serial reads N/A). */
export interface HolderIdentity {
  cardSerialNumber: string
  surname?: string
  firstName?: string
}

const CARDLESS_SERIAL = 'N/A'

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

/** `values` as one word-bounded, case-insensitive pattern. */
function literalPattern(values: Iterable<string>): RegExp {
  return new RegExp(String.raw`\b(?:${[...new Set(values)].map(escapeRegExp).join('|')})\b`, 'gi')
}

/** Holders minted for this session: unknown at import, so each is registered as it is minted. */
const mintedHolders: HolderIdentity[] = []
const mintedValues = new Set<string>()
let mintedPattern: RegExp | undefined

/**
 * Mask a holder minted for this session the way a persona is masked. `alsoMask` takes whatever else
 * identifies the holder (a birthdate, a document number).
 */
export function registerMintedHolder(holder: HolderIdentity, alsoMask: readonly string[] = []): void {
  mintedHolders.push(holder)
  for (const value of [holder.cardSerialNumber, holder.surname, holder.firstName, ...alsoMask]) {
    if (value && value !== CARDLESS_SERIAL) mintedValues.add(value)
  }
  if (mintedValues.size > 0) mintedPattern = literalPattern(mintedValues)
}

const sameText = (a = '', b = ''): boolean => a.trim().toUpperCase() === b.trim().toUpperCase()

/** Whether `identity` names `holder`: by serial, or by name where neither has a card. */
function isHolder(identity: HolderIdentity, holder: HolderIdentity): boolean {
  if (!sameText(identity.cardSerialNumber, CARDLESS_SERIAL)) {
    return sameText(identity.cardSerialNumber, holder.cardSerialNumber)
  }
  return (
    sameText(holder.cardSerialNumber, CARDLESS_SERIAL) &&
    sameText(identity.surname, holder.surname) &&
    sameText(identity.firstName, holder.firstName)
  )
}

/** The persona an expected or claimed identity belongs to. */
export function personaLabel(identity: HolderIdentity): PersonaLabel {
  if (mintedHolders.some((holder) => isHolder(identity, holder))) return 'minted'
  for (const [key, user] of Object.entries(TestUsers)) {
    const persona = { cardSerialNumber: user.cardSerial, surname: user.lastName, firstName: user.firstName }
    if (isHolder(identity, persona)) return key as keyof typeof TestUsers
  }
  return 'foreign'
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

/** Every literal persona value. */
const PERSONA_VALUES = literalPattern(
  Object.values(TestUsers).flatMap((user) =>
    Object.entries(user)
      .filter(([key, value]) => PERSONA_VALUE_KEYS.has(key) && value !== CARDLESS_SERIAL)
      .map(([, value]) => value)
  )
)

const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December'

/** Shape masks for values that are not ours to know — a foreign request's, or minted by the server. */
const MASKS: readonly (readonly [RegExp, string])[] = [
  [PERSONA_VALUES, '<persona>'],
  [/\b[A-Z]\d{8}\b/g, '<serial>'], // a BCSC card serial
  [/\b[A-Z0-9]{4}-[A-Z0-9]{4}\b/g, '<code>'], // an in-person confirmation code
  [/\b\d{4}[-/]\d{2}[-/]\d{2}\b/g, '<date>'], // a birthdate as the API and the birthdate field write it
  [new RegExp(String.raw`\b(?:${MONTHS}) \d{1,2}, \d{4}\b`, 'gi'), '<date>'], // and as the app spells it out
  [/\d{6,}/g, '<digits>'], // birthdates, PINs, phone and document numbers
]

/** Any word with an `@` inside it; a stricter shape buys nothing a diagnostic needs. */
function isEmailLike(token: string): boolean {
  const at = token.indexOf('@')
  return at > 0 && at < token.length - 1
}

/** `text` with anything that identifies a card holder or unlocks a request masked. */
export function redactSensitiveText(text: string): string {
  const withoutMinted = mintedPattern ? text.replaceAll(mintedPattern, '<minted>') : text
  const masked = MASKS.reduce((out, [pattern, mask]) => out.replaceAll(pattern, mask), withoutMinted)
  // Emails go by token: an unanchored `local+@domain` regex rescans the local part from every position.
  return masked.replaceAll(/\S+/g, (token) => (isEmailLike(token) ? '<email>' : token))
}
