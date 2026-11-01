const base64url = (input: string): string =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export const makeJwt = (payload: Record<string, unknown>): string => {
  const header = base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const body = base64url(JSON.stringify(payload))
  return `${header}.${body}.signature`
}

export const EXPIRED_JWT = makeJwt({ exp: 1 })

// exp is the year 2100
export const UNEXPIRED_JWT = makeJwt({ exp: 4102444800 })
