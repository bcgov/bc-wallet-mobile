const SEX_VALUES = ['M', 'F', 'U', 'X'] as const

export type BCCardSex = (typeof SEX_VALUES)[number]

export interface BCCardBarcode {
  /**
   * The 9-character Document Control Number, e.g. `S00023254`. null when the security field holds
   * none, as on some older cards; their DCN is only in the 1D barcode.
   */
  dcn: string | null
  province: string
  /** Full city name, recovered from the address when the 13-character city field truncates it. */
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

type FieldRange = readonly [start: number, end: number]

const TRACK_1_START_SENTINEL = '%'
const TRACK_2_START_SENTINEL = ';'
const TRACK_3_START_SENTINEL = '_%'
const TRACK_END_SENTINEL = '?'
const FIELD_SEPARATOR = '^'
const SUBFIELD_SEPARATOR = '$'
const TRACK_2_FIELD_SEPARATOR = '='

// Track 1 opens with a fixed-width province, then variable-length city, name and address fields.
const TRACK_1_PROVINCE: FieldRange = [1, 3]
const CITY_MAX_LENGTH = 13
const NAME_MAX_LENGTH = 35

const YEARS_PER_CENTURY = 100

const ISO_IIN_LENGTH = 6
const CARD_NUMBER_MAX_LENGTH = 13
const CARD_NUMBER_OVERFLOW_MAX_LENGTH = 5

// ;<IIN><card number>=<expiry YYMM><birth date YYYYMMDD><card number overflow>?
const TRACK_2_PATTERN = new RegExp(
  `^${TRACK_2_START_SENTINEL}(\\d{${ISO_IIN_LENGTH}})(\\d{1,${CARD_NUMBER_MAX_LENGTH}})${TRACK_2_FIELD_SEPARATOR}` +
    `(\\d{2})(\\d{2})(\\d{4})(\\d{2})(\\d{2})` +
    `[^${TRACK_END_SENTINEL}]{1,${CARD_NUMBER_OVERFLOW_MAX_LENGTH}}\\${TRACK_END_SENTINEL}`
)

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
} as const satisfies Record<string, FieldRange>

/**
 * Parses a Document Control Number (the card serial number) from the 1D barcode or from the 2D
 * barcode's 11-character security field, which zero-pads the 9-character DCN.
 *
 * @returns the 9-character DCN, or null when the value is not one.
 */
export const parseDcn = (raw: string): string | null => {
  // B, D, I, O, Q and V are never used, as they don't laser-engrave legibly. The check digit isn't
  // validated: the spec says Modulus 10, but real cards satisfy no common variant.
  const match = /^0*([ACE-HJ-NPR-UW-Z]\d{8})$/.exec(raw.trim())

  return match ? match[1] : null
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
    ...track1.fields,
    city: resolveCity(track1.fields.city, track1.fields.addressLines, track3.postalCode),
    ...track2.fields,
    ...track3,
  }
}

// The city field truncates at 13 characters without a separator, so a full field may be cut short.
// The address's last line holds the whole name as `<city> <province>  <postal code>`.
const resolveCity = (fieldCity: string, addressLines: string[], postalCode: string): string => {
  const cityLine = addressLines.at(-1)
  if (fieldCity.length < CITY_MAX_LENGTH || !cityLine || !postalCode) {
    return fieldCity
  }

  const cityAndProvince = withoutTrailing(cityLine, postalCode)?.trim()
  const provinceSeparator = cityAndProvince?.lastIndexOf(' ') ?? -1
  if (!cityAndProvince || provinceSeparator === -1) {
    return fieldCity
  }

  const lineCity = cityAndProvince.slice(0, provinceSeparator).trim()
  return lineCity.startsWith(fieldCity) ? lineCity : fieldCity
}

// Removes `suffix` from the end of `line`, ignoring spaces in either; null when `line` doesn't end with it.
const withoutTrailing = (line: string, suffix: string): string | null => {
  const compactSuffix = suffix.replace(/ /g, '')
  let end = line.length

  for (let i = compactSuffix.length - 1; i >= 0; i--) {
    while (end > 0 && line[end - 1] === ' ') {
      end--
    }
    if (line[end - 1] !== compactSuffix[i]) {
      return null
    }
    end--
  }

  return line.slice(0, end)
}

// Variable-length track 1 fields end with `^` unless they fill their maximum length.
const readCaretField = (value: string, start: number, maxLength: number): { field: string; next: number } => {
  const separator = value.indexOf(FIELD_SEPARATOR, start)

  if (separator !== -1 && separator - start <= maxLength) {
    return { field: value.slice(start, separator), next: separator + FIELD_SEPARATOR.length }
  }

  return { field: value.slice(start, start + maxLength), next: start + maxLength }
}

const parseTrack1 = (value: string) => {
  if (!value.startsWith(TRACK_1_START_SENTINEL)) {
    return null
  }

  const [provinceStart, provinceEnd] = TRACK_1_PROVINCE
  const province = value.slice(provinceStart, provinceEnd)
  const city = readCaretField(value, provinceEnd, CITY_MAX_LENGTH)
  const name = readCaretField(value, city.next, NAME_MAX_LENGTH)

  const endSentinel = value.indexOf(TRACK_END_SENTINEL, name.next)
  if (endSentinel === -1) {
    return null
  }

  // The address omits its trailing `^` only when it fills the rest of track 1.
  const rawAddress = value.slice(name.next, endSentinel)
  const address = rawAddress.endsWith(FIELD_SEPARATOR) ? rawAddress.slice(0, -FIELD_SEPARATOR.length) : rawAddress
  const [rawSurname, ...rawGivenNames] = name.field.split(SUBFIELD_SEPARATOR)

  return {
    fields: {
      province,
      city: city.field.trim(),
      surname: rawSurname.trim().replace(/,$/, '').trim(),
      givenNames: rawGivenNames.join(' ').trim(),
      addressLines: address
        .split(SUBFIELD_SEPARATOR)
        .map((line) => line.trim())
        .filter(Boolean),
    },
    end: endSentinel + TRACK_END_SENTINEL.length,
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
      // YYMM expiry; a card read this century expires this century.
      expiry: `${currentCentury()}${expiryYY}-${expiryMM}`,
      birthDate: `${birthYYYY}-${birthMM}-${birthDD}`,
    },
    end: track.length,
  }
}

const parseTrack3 = (value: string) => {
  if (
    value.length !== TRACK_3_LENGTH ||
    !value.startsWith(TRACK_3_START_SENTINEL) ||
    !value.endsWith(TRACK_END_SENTINEL)
  ) {
    return null
  }

  const field = ([start, end]: FieldRange) => value.slice(start, end).trim()
  const optional = (range: FieldRange) => field(range) || null
  const optionalNumber = (range: FieldRange) => {
    const raw = field(range)
    return /^\d+$/.test(raw) ? Number(raw) : null
  }

  const sex = field(TRACK_3.sex)

  return {
    cdsVersion: field(TRACK_3.cdsVersion),
    jurisdictionVersion: field(TRACK_3.jurisdictionVersion),
    postalCode: field(TRACK_3.postalCode),
    sex: isSex(sex) ? sex : null,
    heightCm: optionalNumber(TRACK_3.height),
    weightKg: optionalNumber(TRACK_3.weight),
    hairColour: optional(TRACK_3.hairColour),
    eyeColour: optional(TRACK_3.eyeColour),
    phn: optional(TRACK_3.idNumber),
    dcn: parseDcn(field(TRACK_3.security)),
  }
}

const isSex = (value: string): value is BCCardSex => (SEX_VALUES as readonly string[]).includes(value)

const currentCentury = (): number => Math.floor(new Date().getFullYear() / YEARS_PER_CENTURY)

const isMonth = (mm: string): boolean => Number(mm) >= 1 && Number(mm) <= 12

const isDay = (dd: string): boolean => Number(dd) >= 1 && Number(dd) <= 31
