type RegionCode = 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NT' | 'NS' | 'NU' | 'ON' | 'PE' | 'QC' | 'SK' | 'YT'
const RegionCodeMap = {
  AB: 'AB',
  ALBERTA: 'AB',
  BC: 'BC',
  BRITISHCOLUMBIA: 'BC',
  MB: 'MB',
  MANITOBA: 'MB',
  NB: 'NB',
  NEWBRUNSWICK: 'NB',
  NL: 'NL',
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

export interface DeviceAuthTokenHint {
  clientId: string
  audience: string
  address: {
    streetAddress: string
    locality: string
    region: string
    postalCode: string
    country: 'CA'
  }
  firstName: string
  lastName: string
  birthDate: string // YYYY-MM-DD
  middleNames?: string[]
  gender?: 'male' | 'female' | 'unknown'
}

interface DeviceAuthTokenHintJWT {
  iss: string
  aud: string
  sub: string
  iat: number
  exp: number
  given_name: string
  family_name: string
  birthDate: string
  gender: 'male' | 'female' | 'unknown'
  middle_names?: string
  address: {
    street_address: string
    locality: string
    region: RegionCode
    postal_code: string
    country: 'CA'
  }
}

/**
 * Creates a JWT payload for a device authorization token hint.
 *
 * @see https://citz-cdt.atlassian.net/wiki/spaces/BMS/pages/301574688/5.1+System+Interfaces#Device-Authorization-Request
 *
 * @param {DeviceAuthTokenHint} config - Configuration object containing necessary details.
 * @returns {*} {object} The JWT payload.
 *
 */
export function createDeviceAuthTokenHintJWT(config: DeviceAuthTokenHint): DeviceAuthTokenHintJWT {
  const nowEpoch = new Date(1970, 1, 1).getTime() / 1000 // Current time in seconds since epoch
  const expiresEpoch = nowEpoch + 10 * 60 // 10 minutes from now
  const formattedRegion = config.address.region.replace(/\s+/g, '').toUpperCase() // Remove spaces and uppercase

  const regionCode = RegionCodeMap[formattedRegion as keyof typeof RegionCodeMap]

  if (!regionCode) {
    throw new Error('Invalid region value, unable to map to region code.')
  }

  if (config.address.country !== 'CA') {
    throw new Error('Invalid country value, only "CA" is supported.')
  }

  return {
    iss: config.clientId,
    aud: config.audience,
    sub: config.clientId,
    iat: nowEpoch,
    exp: expiresEpoch,
    given_name: config.firstName,
    family_name: config.lastName,
    birthDate: config.birthDate,
    middle_names: config.middleNames?.join(' '),
    gender: config.gender ?? 'unknown',
    address: {
      street_address: config.address.streetAddress,
      locality: config.address.locality,
      region: regionCode,
      postal_code: config.address.postalCode,
      country: config.address.country,
    },
  }
}
