export type ProvinceCode = 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NT' | 'NS' | 'NU' | 'ON' | 'PE' | 'QC' | 'SK' | 'YT'

// Maps province names to ProvinceCodes
//
// TODO (MD): Currently this map is used to coerce the user's address text input into a value which
// can be used by IAS to generate tokens. I think the better approach would be to use some type of
// react-native select/dropdown component which would have a pre-populated list of values.
// This would also make it easier to populate different localizations ie: french
const ProvinceCodeMap = {
  AB: 'AB',
  ALB: 'AB',
  ALBERTA: 'AB',

  BC: 'BC',
  BRITISHCOLUMBIA: 'BC',

  MB: 'MB',
  MAN: 'MB',
  MANITOBA: 'MB',

  NB: 'NB',
  NEWBRUNSWICK: 'NB',

  NL: 'NL',
  NEWFOUNDLANDANDLABRADOR: 'NL', // handle long and short version
  NEWFOUNDLAND: 'NL',

  NT: 'NT',
  NORTHWESTTERRITORIES: 'NT',

  NS: 'NS',
  NOVASCOTIA: 'NS',

  NU: 'NU',
  NVT: 'NU',
  NUNAVUT: 'NU',

  ON: 'ON',
  ONT: 'ON',
  ONTARIO: 'ON',

  PE: 'PE',
  PEI: 'PE',
  PRINCEEDWARDISLAND: 'PE',

  QC: 'QC',
  QUE: 'QC',
  QUEBEC: 'QC',

  SK: 'SK',
  SASK: 'SK',
  SASKATCHEWAN: 'SK',

  YT: 'YT',
  YUKON: 'YT',
} as const

type ResidentialAddress = {
  streetAddress: string
  city: string
  province: string
  postalCode: string
}

/**
 * Attempt to get the province code for a given string, returns null if not possible.
 *
 * @param {string} province - The name of the province, either fully typed or code ie: British Columbia or BC
 * @returns {*} {ProvinceCode}
 */
export function getProvinceCode(province: string): ProvinceCode | null {
  // unify casing, remove all spaces and trim
  const squishedProvince = province.toUpperCase().replace(/\s+/g, '').trim() as keyof typeof ProvinceCodeMap

  return ProvinceCodeMap[squishedProvince] ?? null
}

/**
 * Validates if a given string is a valid Canadian postal code.
 *
 * Note: This is not strict validation, it checks for the general format of Canadian postal codes.
 *
 * @param {string} postalCode - The postal code to validate.
 * @returns {*} {boolean} - True if the postal code is valid, false otherwise.
 */
export function isCanadianPostalCode(postalCode: string): boolean {
  const postalCodeRegex = new RegExp(/^(?:[A-Z]\d[A-Z][ -]?\d[A-Z]\d)$/, 'i')

  return postalCodeRegex.test(postalCode)
}

/**
 * Formats a ResidentialAddress object into a single string suitable for display.
 *
 * @param {ResidentialAddress} address - The address object to format.
 * @returns {*} {string} - The formatted address string in uppercase.
 */
export function formatAddressForDisplay(address: ResidentialAddress): string {
  return `${address.streetAddress}, ${address.city}, ${address.province} ${address.postalCode}`.toUpperCase()
}
