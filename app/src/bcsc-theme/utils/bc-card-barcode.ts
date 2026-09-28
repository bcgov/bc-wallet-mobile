/**
 * Card type encoded by the letter prefix of a BC card's Document Control Number (DCN).
 */
export enum BCCardType {
  DriversLicence = 'DriversLicence',
  LearnersLicence = 'LearnersLicence',
  NoviceLicence = 'NoviceLicence',
  ComboDriversLicence = 'ComboDriversLicence',
  ComboLearnersLicence = 'ComboLearnersLicence',
  ComboNoviceLicence = 'ComboNoviceLicence',
  BCID = 'BCID',
  BCSCNonPhoto = 'BCSCNonPhoto',
  BCSCPhoto = 'BCSCPhoto',
  Unknown = 'Unknown',
}

const CARD_TYPE_BY_DCN_PREFIX: Readonly<Record<string, BCCardType>> = {
  S: BCCardType.DriversLicence,
  R: BCCardType.LearnersLicence,
  U: BCCardType.NoviceLicence,
  K: BCCardType.ComboDriversLicence,
  P: BCCardType.ComboLearnersLicence,
  H: BCCardType.ComboNoviceLicence,
  Y: BCCardType.BCID,
  G: BCCardType.BCSCNonPhoto,
  C: BCCardType.BCSCPhoto,
}

const BC_SERVICES_CARD_TYPES: ReadonlySet<BCCardType> = new Set([
  BCCardType.ComboDriversLicence,
  BCCardType.ComboLearnersLicence,
  BCCardType.ComboNoviceLicence,
  BCCardType.BCSCNonPhoto,
  BCCardType.BCSCPhoto,
])

export type BCCardSex = 'M' | 'F' | 'U' | 'X'

const SEX_VALUES: ReadonlySet<string> = new Set<BCCardSex>(['M', 'F', 'U', 'X'])

export interface DocumentControlNumber {
  /** The 9-character DCN, e.g. `S00023254`. */
  value: string
  prefix: string
  cardType: BCCardType
  checkDigit: number
}

export interface BCCardBarcode {
  /** `Unknown` when the DCN is absent, unreadable, or has an unmapped prefix. */
  cardType: BCCardType
  dcn: DocumentControlNumber | null
  province: string
  city: string
  surname: string
  givenNames: string
  addressLines: string[]
  /** Issuer Identification Number; BC is `636028`. */
  isoIIN: string
  /** Licence number for a DL, ICBC client number or MoHS request number for a BCSC, BCID number for a BCID. */
  cardNumber: string
  /** `YYYY-MM`; the card encodes no expiry day. */
  expiry: string
  /** `YYYY-MM-DD` */
  birthDate: string
  postalCode: string
  sex: BCCardSex | null
  heightCm: number | null
  weightKg: number | null
  hairColour: string | null
  eyeColour: string | null
  /** Personal Health Number; present on BC Services Cards and combo cards only. */
  phn: string | null
  cdsVersion: string
  jurisdictionVersion: string
}

const CITY_MAX_LENGTH = 13
const NAME_MAX_LENGTH = 35

const TRACK_2_PATTERN = /^;(\d{6})(\d{1,13})=(\d{2})(\d{2})(\d{4})(\d{2})(\d{2})[^?]{1,5}\?/

// Track 3 is fixed-width; offsets are relative to its `_%` start sentinel.
const TRACK_3_LENGTH = 82
const TRACK_3 = {
  cdsVersion: [2, 3],
  jurisdictionVersion: [3, 4],
  postalCode: [4, 15],
  sex: [31, 32],
  height: [32, 35],
  weight: [35, 38],
  hairColour: [38, 41],
  eyeColour: [41, 44],
  idNumber: [44, 54],
  security: [70, 81],
} as const satisfies Record<string, readonly [number, number]>

/**
 * Whether the card type carries a BC Services Card, standalone or combined with a licence.
 */
export const hasBCServicesCard = (cardType: BCCardType): boolean => BC_SERVICES_CARD_TYPES.has(cardType)

/**
 * Parses a Document Control Number from the 1D barcode or from the 2D barcode's 11-character
 * security field. The spec doesn't define the 2 characters beyond the 9-character DCN; specimen
 * cards zero-pad them.
 *
 * @returns null when the value is not a DCN. A valid prefix letter with no known card type parses as `Unknown`.
 */
export const parseDcn = (raw: string): DocumentControlNumber | null => {
  // B, D, I, O, Q and V are never used, as they don't laser-engrave legibly.
  const match = /^0*([ACE-HJ-NPR-UW-Z])(\d{7})(\d)$/.exec(raw.trim())

  if (!match) {
    return null
  }

  const [, prefix, number, checkDigit] = match

  // Not validated: the spec says Modulus 10, but specimen cards satisfy neither Luhn nor common weighted variants.
  return {
    value: `${prefix}${number}${checkDigit}`,
    prefix,
    cardType: CARD_TYPE_BY_DCN_PREFIX[prefix] ?? BCCardType.Unknown,
    checkDigit: Number(checkDigit),
  }
}

/**
 * Decodes the PDF-417 barcode on a BC driver's licence, BCID, BC Services Card or combo card.
 * These use ICBC's 3-track magnetic stripe layout rather than the AAMVA 2016 PDF-417 format.
 *
 * @returns null when the value is not a well-formed BC card barcode.
 */
export const decodeBCCardBarcode = (value: string): BCCardBarcode | null => {
  const track1 = parseTrack1(value)
  if (!track1) {
    return null
  }

  const track2 = parseTrack2(value.slice(track1.end))
  if (!track2) {
    return null
  }

  const track3 = parseTrack3(value.slice(track1.end + track2.end))
  if (!track3) {
    return null
  }

  return {
    cardType: track3.dcn?.cardType ?? BCCardType.Unknown,
    ...track1.fields,
    ...track2.fields,
    ...track3,
  }
}

// Variable-length track 1 fields end with `^` unless they fill their maximum length.
const readCaretField = (value: string, start: number, maxLength: number): { field: string; next: number } => {
  const caret = value.indexOf('^', start)

  if (caret !== -1 && caret - start <= maxLength) {
    return { field: value.slice(start, caret), next: caret + 1 }
  }

  return { field: value.slice(start, start + maxLength), next: start + maxLength }
}

const parseTrack1 = (value: string) => {
  if (!value.startsWith('%')) {
    return null
  }

  const province = value.slice(1, 3)
  const city = readCaretField(value, 3, CITY_MAX_LENGTH)
  const name = readCaretField(value, city.next, NAME_MAX_LENGTH)

  const endSentinel = value.indexOf('?', name.next)
  if (endSentinel === -1) {
    return null
  }

  // The address omits its trailing `^` only when it fills the rest of track 1.
  const address = value.slice(name.next, endSentinel).replace(/\^$/, '')
  const [rawSurname, ...rawGivenNames] = name.field.split('$')

  return {
    fields: {
      province,
      city: city.field.trim(),
      surname: rawSurname.trim().replace(/,$/, '').trim(),
      givenNames: rawGivenNames.join(' ').trim(),
      addressLines: address
        .split('$')
        .map((line) => line.trim())
        .filter(Boolean),
    },
    end: endSentinel + 1,
  }
}

const parseTrack2 = (value: string) => {
  const match = TRACK_2_PATTERN.exec(value)
  if (!match) {
    return null
  }

  const [track, isoIIN, cardNumber, expiryYY, expiryMM, birthYYYY, birthMM, birthDD] = match

  if (!isMonth(expiryMM) || !isMonth(birthMM) || !isDay(birthDD)) {
    return null
  }

  return {
    fields: {
      isoIIN,
      cardNumber,
      // YYMM expiry; cards issued this century expire this century.
      expiry: `20${expiryYY}-${expiryMM}`,
      birthDate: `${birthYYYY}-${birthMM}-${birthDD}`,
    },
    end: track.length,
  }
}

const parseTrack3 = (value: string) => {
  if (value.length !== TRACK_3_LENGTH || !value.startsWith('_%') || !value.endsWith('?')) {
    return null
  }

  const field = ([start, end]: readonly [number, number]) => value.slice(start, end).trim()
  const optional = (range: readonly [number, number]) => field(range) || null
  const optionalNumber = (range: readonly [number, number]) => {
    const raw = field(range)
    return /^\d+$/.test(raw) ? Number(raw) : null
  }

  const sex = field(TRACK_3.sex)

  return {
    cdsVersion: field(TRACK_3.cdsVersion),
    jurisdictionVersion: field(TRACK_3.jurisdictionVersion),
    postalCode: field(TRACK_3.postalCode),
    sex: SEX_VALUES.has(sex) ? (sex as BCCardSex) : null,
    heightCm: optionalNumber(TRACK_3.height),
    weightKg: optionalNumber(TRACK_3.weight),
    hairColour: optional(TRACK_3.hairColour),
    eyeColour: optional(TRACK_3.eyeColour),
    phn: optional(TRACK_3.idNumber),
    dcn: parseDcn(field(TRACK_3.security)),
  }
}

const isMonth = (mm: string): boolean => Number(mm) >= 1 && Number(mm) <= 12

const isDay = (dd: string): boolean => Number(dd) >= 1 && Number(dd) <= 31
