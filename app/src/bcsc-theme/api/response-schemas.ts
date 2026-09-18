import { AppError, ErrorRegistry } from '@/errors'
import type { BifoldLogger } from '@bifold/core'
import { z } from 'zod'
import type { RegistrationResponseData } from './hooks/useRegistrationApi'
import type { TokenResponse } from './hooks/useTokens'
import type { UserInfoResponseData } from './hooks/useUserApi'

export const tokenResponseSchema = z.looseObject({
  access_token: z.string(),
  refresh_token: z.string(),
  id_token: z.string(),
  expires_in: z.number().optional(),
  scope: z.string().optional(),
  token_type: z.string().optional(),
}) satisfies z.ZodType<TokenResponse>

export const registrationResponseSchema = z.looseObject({
  client_id: z.string(),
  registration_access_token: z.string(),
  jwks: z.looseObject({ keys: z.array(z.looseObject({ n: z.string().optional() })).optional() }).optional(),
}) satisfies z.ZodType<RegistrationResponseData>

export const userInfoResponseSchema = z.looseObject({
  card_expiry: z.string(),
  given_names: z.string().optional(),
  family_name: z.string().optional(),
  birthdate: z.string().optional(),
  email: z.string().optional(),
  address: z.looseObject({ formatted: z.string().optional() }).optional(),
  picture: z.string().optional(),
  card_type: z.string().optional(),
}) satisfies z.ZodType<UserInfoResponseData>

export type ApiResponseEndpoint = 'token' | 'registration' | 'userinfo'

/**
 * Validates a service response against its schema before the caller uses or saves it (#3581).
 *
 * On a mismatch, logs and attaches to the thrown error only the failing field paths and Zod issue
 * codes — never the received value, the request/response body, or `issue.message` — so PII and
 * tokens never reach logs or analytics.
 *
 * @throws AppError with code ERR_206_MISSING_OR_NULL_VALUES_IN_JSON_RESPONSE when `data` fails the schema.
 */
export const parseApiResponse = <T>(
  schema: z.ZodType<T>,
  data: unknown,
  endpoint: ApiResponseEndpoint,
  logger: BifoldLogger
): T => {
  const result = schema.safeParse(data)
  if (result.success) {
    return result.data
  }

  const issues = result.error.issues.map((issue) => ({ path: issue.path.map(String).join('.'), code: issue.code }))
  logger.error(`[ApiResponse] ${endpoint} response failed schema validation`, { endpoint, issues })
  throw AppError.fromErrorDefinition(ErrorRegistry.MISSING_JSON_VALUES, { context: { endpoint, issues } })
}
