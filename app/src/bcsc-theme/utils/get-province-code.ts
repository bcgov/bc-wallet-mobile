export type ProvinceCode = 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NT' | 'NS' | 'NU' | 'ON' | 'PE' | 'QC' | 'SK' | 'YT'

// Maps province names to ProvinceCodes
const ProvinceCodeMap = {
  AB: 'AB',
  ALBERTA: 'AB',
  BC: 'BC',
  BRITISHCOLUMBIA: 'BC',
  MB: 'MB',
  MANITOBA: 'MB',
  NB: 'NB',
  NEWBRUNSWICK: 'NB',
  NL: 'NL',
  // handle long and short version
  NEWFOUNDLANDANDLABRADOR: 'NL',
  NEWFOUNDLAND: 'NL',
  NT: 'NT',
  NORTHWESTTERRITORIES: 'NT',
  NS: 'NS',
  NOVASCOTIA: 'NS',
  NU: 'NU',
  NUNAVUT: 'NU',
  ON: 'ON',
  ONTARIO: 'ON',
  PE: 'PE',
  PRINCEEDWARDISLAND: 'PE',
  QC: 'QC',
  QUEBEC: 'QC',
  SK: 'SK',
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
