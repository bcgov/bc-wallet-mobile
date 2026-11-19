import { randomInt } from 'node:crypto'
import { userInfo } from 'node:os'
import { getIasTestApiConfig, mintIdentity, type CardType } from '../api/ias-test.js'
import { TestUsers, type TestUser } from '../constants.js'
import { registerMintedHolder } from '../helpers/redact.js'
import { recordMintedIdentity } from '../helpers/session-record.js'

/**
 * A journey's card holder. `arrangeTestUser(kind)` hands out the fixed SIT persona of that kind, or,
 * with E2E_IDENTITY_SOURCE=api, a holder of its own for the session: a card minted through the IAS
 * test API (src/api/ias-test.ts), so no two sessions share one. A retry is a new session and mints again.
 */

/** The holders a journey can ask for, named as the personas are. */
export type IdentityKind = keyof typeof TestUsers

export type IdentitySource = 'api' | 'personas'

/** Where this run's holders come from: E2E_IDENTITY_SOURCE, `personas` unless it says `api`. */
export function identitySource(): IdentitySource {
  const value = process.env.E2E_IDENTITY_SOURCE?.trim().toLowerCase()
  if (!value || value === 'personas') return 'personas'
  if (value === 'api') return 'api'
  throw new Error('Unknown E2E_IDENTITY_SOURCE: use api or personas')
}

interface Recipe {
  cardType: CardType
  givenName: string
  /** ICBC gender code. */
  gender: 'M' | 'F' | 'X'
  /** `YYYY-MM-DD`. */
  birthDate: () => string
}

/** Young enough for the under-12 rules whatever the day, old enough to hold a card. */
const UNDER_12_AGE = 6

/** Today, `years` ago, as `YYYY-MM-DD`. */
function yearsAgo(years: number): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10)
}

/**
 * What is sent for each kind. Nothing is echoed back and whatever is left out is generated, so the
 * name, gender and birthdate a journey types or asserts are always sent.
 */
const RECIPES: Record<IdentityKind, Recipe> = {
  photo: { cardType: 'STANDALONE', givenName: 'SHAGGY', gender: 'M', birthDate: () => '1998-11-14' },
  combined: { cardType: 'COMBO', givenName: 'VELMA', gender: 'F', birthDate: () => '1995-12-17' },
  nonPhoto: { cardType: 'NONPHOTO', givenName: 'DAPHNE', gender: 'F', birthDate: () => '1980-09-22' },
  na: { cardType: 'NA', givenName: 'FRED', gender: 'M', birthDate: () => '1968-09-18' },
  // Left to itself the API picks an age of 16 to 80.
  u12: { cardType: 'STANDALONE', givenName: 'SCRAPPY', gender: 'M', birthDate: () => yearsAgo(UNDER_12_AGE) },
}

/** The verify path a card type takes. */
const FLOW: Record<CardType, TestUser['flow']> = {
  STANDALONE: 'photo',
  COMBO: 'photo',
  NONPHOTO: 'non-photo',
  NA: 'non-bcsc',
}

/** The photos each card type captures as evidence. */
const EVIDENCE: Record<CardType, Pick<TestUser, 'cardScanImage' | 'selfieImage'>> = {
  STANDALONE: { cardScanImage: 'images/dl_shaggy.jpg', selfieImage: 'images/id_shaggy.jpg' },
  COMBO: { cardScanImage: 'images/dl_velma.jpg', selfieImage: 'images/id_velma.jpg' },
  NONPHOTO: { cardScanImage: 'images/dl_daphne.jpg', selfieImage: 'images/id_daphne.jpg' },
  NA: { cardScanImage: 'images/dl_fred.jpg', selfieImage: 'images/id_fred.jpg' },
}

/** What the app shows, and the portal reads, for a holder without a card. */
const CARDLESS_SERIAL = 'N/A'

/** The IDIM evidence types the portal files the two documents under. */
const BC_DRIVERS_LICENCE = '18'
const CANADIAN_PASSPORT = '12'

const SURNAME_PREFIX = 'AUTOTEST'

const letters = (count: number): string =>
  Array.from({ length: count }, () => String.fromCodePoint(65 + randomInt(26))).join('')
const digits = (count: number): string => Array.from({ length: count }, () => randomInt(10)).join('')

/** New on every call, so the identity match never meets an earlier session's holder. Letters only, as on a card. */
const uniqueSurname = (): string => `${SURNAME_PREFIX}${letters(8)}`
/** Fits the mask the evidence metadata serves for a B.C. driver's licence (`^[0-9]{5,10}$`). */
const licenceNumber = (): string => digits(8)
/** Fits the mask it serves for a Canadian passport (`^[A-Z0-9]{5,10}$`). */
const passportNumber = (): string => `${letters(2)}${digits(8)}`

function sessionPlatform(): 'ios' | 'android' | undefined {
  if (typeof driver === 'undefined') return undefined
  return driver.isIOS ? 'ios' : 'android'
}

function localUser(): string {
  let name = process.env.USER ?? ''
  try {
    name = userInfo().username
  } catch {
    // No account entry for this uid (a container): the env value stands.
  }
  return name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-') || 'unknown'
}

/** `e2e-<workflow run id, or local-<user>>-<platform>`: what a run's identities can be looked up by. */
function groupingLabel(): string {
  const run = process.env.GITHUB_RUN_ID ?? `local-${localUser()}`
  return ['e2e', run, sessionPlatform()].filter(Boolean).join('-')
}

/** The holder as the flows take it, with the documents its flow types generated for this session. */
function toTestUser(recipe: Recipe, holder: { surname: string; cardSerial: string; birthDate: string }): TestUser {
  const common = {
    username: `e2e_${recipe.givenName.toLowerCase()}`,
    firstName: recipe.givenName,
    lastName: holder.surname,
    dob: holder.birthDate.replaceAll('-', ''),
    cardSerial: holder.cardSerial,
    ...EVIDENCE[recipe.cardType],
  }
  const flow = FLOW[recipe.cardType]
  if (flow === 'photo') return { ...common, flow }
  const passport = { documentNumber: passportNumber(), documentTypeId: CANADIAN_PASSPORT }
  if (flow === 'non-photo') return { ...common, flow, ...passport }
  return {
    ...common,
    flow,
    primaryDocumentNumber: licenceNumber(),
    primaryDocumentTypeId: BC_DRIVERS_LICENCE,
    ...passport,
  }
}

/** The document numbers a holder types, by flow. */
function documentNumbersOf(user: TestUser): string[] {
  if (user.flow === 'photo') return []
  if (user.flow === 'non-photo') return [user.documentNumber]
  return [user.primaryDocumentNumber, user.documentNumber]
}

/** Issue the recipe's card under `surname`; returns its serial. */
async function issueCard(kind: IdentityKind, recipe: Recipe, surname: string, birthDate: string): Promise<string> {
  const label = groupingLabel()
  const issued = await mintIdentity({
    cardType: recipe.cardType,
    surname,
    givenName1: recipe.givenName,
    gender: recipe.gender,
    birthDate,
    groupingLabel: label,
  })
  // The journey types the birthdate it asked for; a card issued under another one would never authorize.
  if (issued.birthDate !== birthDate) {
    throw new Error(`The test API issued the ${kind} card under another birthdate than the one requested`)
  }
  recordMintedIdentity()
  const host = new URL(getIasTestApiConfig().origin).host
  console.log(`[identity] Minted a ${recipe.cardType} card for the ${kind} journey on ${host} (${label})`)
  return issued.csn
}

/**
 * A holder that exists for this session only. A card is minted for every kind that has one; the API
 * issues none to a holder without a card (it refuses card type NA), who exists only as what the
 * journey types.
 */
async function mintTestUser(kind: IdentityKind): Promise<TestUser> {
  const recipe = RECIPES[kind]
  const surname = uniqueSurname()
  const birthDate = recipe.birthDate()
  let cardSerial = CARDLESS_SERIAL
  if (recipe.cardType === 'NA') {
    console.log(`[identity] Generated the ${kind} holder: there is no card to mint`)
  } else {
    cardSerial = await issueCard(kind, recipe, surname, birthDate)
  }
  const user = toTestUser(recipe, { surname, cardSerial, birthDate })
  registerMintedHolder({ cardSerialNumber: cardSerial, surname, firstName: user.firstName }, [
    user.dob,
    ...documentNumbersOf(user),
  ])
  return user
}

/** The holder a journey drives: `setTestUser(await arrangeTestUser('photo'))` in its root `before()`. */
export async function arrangeTestUser(kind: IdentityKind): Promise<TestUser> {
  return identitySource() === 'api' ? mintTestUser(kind) : TestUsers[kind]
}
