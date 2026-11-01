export const makeJwt = (payload: Record<string, unknown>): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.signature`
}

export const EXPIRED_JWT = makeJwt({ exp: 1 })

// exp is the year 2100
export const UNEXPIRED_JWT = makeJwt({ exp: 4102444800 })
