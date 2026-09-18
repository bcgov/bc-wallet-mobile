import { AppError, ErrorRegistry } from '@/errors'
import type { BifoldLogger } from '@bifold/core'
import { z } from 'zod'

// expires_in/scope/token_type are unread by the app (#3581 review) — left untyped via looseObject passthrough.
export const tokenResponseSchema = z.looseObject({
  access_token: z.string(),
  refresh_token: z.string(),
  id_token: z.string(),
})

export const registrationResponseSchema = z.looseObject({
  client_id: z.string(),
  registration_access_token: z.string(),
  jwks: z.looseObject({ keys: z.array(z.looseObject({ n: z.string().optional() })).optional() }).optional(),
})

export const userInfoResponseSchema = z.looseObject({
  card_expiry: z.string(),
  given_names: z.string().optional(),
  family_name: z.string().optional(),
  birthdate: z.string().optional(),
  email: z.string().optional(),
  address: z.looseObject({ formatted: z.string().optional() }).optional(),
  picture: z.string().optional(),
  card_type: z.string().optional(),
})

export type ApiResponseEndpoint = 'token' | 'registration' | 'userinfo'

// The schema checks only the fields the app reads; the interface remains the declared server
// contract until Stage 2 reconciles it from log evidence — so this returns an unvalidated cast.
export const parseApiResponse = <T>(
  schema: z.ZodType,
  data: unknown,
  endpoint: ApiResponseEndpoint,
  logger: BifoldLogger
): T => {
  const result = schema.safeParse(data)
  if (result.success) {
    return result.data as T
  }

  const issues = result.error.issues.map((issue) => ({ path: issue.path.map(String).join('.'), code: issue.code }))
  logger.error(`[ApiResponse] ${endpoint} response failed schema validation`, { endpoint, issues })
  throw AppError.fromErrorDefinition(ErrorRegistry.MISSING_JSON_VALUES, { context: { endpoint, issues } })
}
