export type ProvinceCode = 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NT' | 'NS' | 'NU' | 'ON' | 'PE' | 'QC' | 'SK' | 'YT'

/**
 * List of Canadian provinces and territories with their codes and display names.
 * Used for dropdown selection in address forms.
 */
export const PROVINCE_OPTIONS: { label: string; value: ProvinceCode }[] = [
  { label: 'Alberta (AB)', value: 'AB' },
  { label: 'British Columbia (BC)', value: 'BC' },
  { label: 'Manitoba (MB)', value: 'MB' },
  { label: 'New Brunswick (NB)', value: 'NB' },
  { label: 'Newfoundland and Labrador (NL)', value: 'NL' },
  { label: 'Northwest Territories (NT)', value: 'NT' },
  { label: 'Nova Scotia (NS)', value: 'NS' },
  { label: 'Nunavut (NU)', value: 'NU' },
  { label: 'Ontario (ON)', value: 'ON' },
  { label: 'Prince Edward Island (PE)', value: 'PE' },
  { label: 'Quebec (QC)', value: 'QC' },
  { label: 'Saskatchewan (SK)', value: 'SK' },
  { label: 'Yukon (YT)', value: 'YT' },
]

// Maps province names to ProvinceCodes (kept for backwards compatibility with text input validation)
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
  streetAddress2?: string
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
  const streetLine = address.streetAddress2
    ? `${address.streetAddress}, ${address.streetAddress2}`
    : address.streetAddress
  return `${streetLine}, ${address.city}, ${address.province} ${address.postalCode}`.toUpperCase()
}
