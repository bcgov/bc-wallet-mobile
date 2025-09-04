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

/**
 * Attempt to get the province code for a given string, returns null if not possible.
 *
 * @param {string} province - The name of the province, either fully typed or code ie: British Columbia or BC
 * @returns {*} {ProvinceCode}
 */
export function getProvinceCode(province: string): ProvinceCode | null {
  // remove all spaces and trim
  const squishedProvince = province.replace(' ', '').trim() as keyof typeof ProvinceCodeMap

  const provinceCode = ProvinceCodeMap[squishedProvince]

  if (!provinceCode) {
    return null
  }

  return provinceCode
}
