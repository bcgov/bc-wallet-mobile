/**
 * Typed client for IAS's BCSC Mobile E2E Test API (`https://<host>/test/idv/v1`): the non-production
 * API that mints BC Services Card test identities and records the agent's side of a verification.
 * The contract is ./ias-test-api.yaml, the spec as DEV publishes it (`yarn test-api:spec-check` diffs
 * it against both hosts). See "Runner-side API clients" in ../../README.md.
 *
 * Auth is an OAuth 2.0 client-credentials token from the same host, cached until a minute before it
 * expires, with one re-auth on 401. A request that never connected is repeated within a short budget
 * (the runner's connects to SIT time out in bursts); nothing else is retried.
 *
 * Nothing here logs. Every failure is an {@link IasTestApiError} that names the route with its path
 * parameter masked and carries no secret, token or response body.
 */
import { ApiError, apiFetch, ApiTransportError, describeError, pollUntil, type ApiFetchOptions } from './http.js'

export const IAS_TEST_API_SCOPES = ['test-idv-accounts', 'test-idv-verify'] as const
export type IasTestApiScope = (typeof IAS_TEST_API_SCOPES)[number]

const API_ROOT = '/test/idv/v1'
const TOKEN_PATH = '/oauth2/token'

/** A token is dropped this long before it expires, so none is sent while it runs out. */
const TOKEN_EXPIRY_MARGIN_S = 60
/** Assumed when the token response names no lifetime; the 401 re-auth covers a shorter one. */
const DEFAULT_TOKEN_LIFETIME_S = 300

/** Socket errors that mean the request was never sent, so any call is safe to repeat. */
const NEVER_CONNECTED = new Set(['UND_ERR_CONNECT_TIMEOUT', 'EAI_AGAIN'])
/** Room for a few of undici's 10 s connect timeouts, inside Sauce's 90 s idle limit. */
const CONNECT_BUDGET_MS = 45_000
const CONNECT_RETRY_INTERVAL_MS = 3_000

/** The column both decline comments are stored in. */
const MAX_COMMENT_LENGTH = 500

// --- contract (./ias-test-api.yaml) ---------------------------------------------------------------

export type CardType = 'COMBO' | 'STANDALONE' | 'NONPHOTO' | 'NA'
export type Decision = 'APPROVE' | 'DECLINE'
export type VerificationChannel = 'COUNTER' | 'LIVE_VIDEO' | 'SEND_VIDEO'
export type VerificationStatus = 'VERIFIED' | 'DECLINED'
export type CardEventType = 'ACTIVATE' | 'SUSPEND' | 'UNSUSPEND' | 'CANCEL'
export type MobileAppStatus = 'ACTIVATED' | 'SUSPENDED' | 'DEACTIVATED'

/** Name, gender and address as the card carries them: the same fields mint a card and renew one. */
interface CardAttributes {
  surname?: string
  givenName1?: string
  givenName2?: string
  givenName3?: string
  /** ICBC gender code as on the card (M, F, X). */
  gender?: string
  cardAddressLine1?: string
  cardAddressLine2?: string
  cardAddressLine3?: string
  cardAddressLine4?: string
  postalCode?: string
}

/** Whatever is left out is generated and never echoed back: send what a journey will type or assert. */
export interface CreateCardIdentityRequest extends CardAttributes {
  cardType: CardType
  /** `YYYY-MM-DD`. Generated for an age within `ageFrom` to `ageTo` (16 to 80) when omitted. */
  birthDate?: string
  ageFrom?: number
  ageTo?: number
  /** Label for later lookup or cleanup. */
  groupingLabel?: string
}

export interface CreateCardIdentityResponse {
  /** Card serial number: what the app scans, or takes by hand. */
  csn: string
  /** `YYYY-MM-DD`. */
  birthDate: string
  transactionId?: string
}

/** A decline needs both, 500 characters at most each. The user is shown `userMessage`. */
export interface DecisionComments {
  userMessage?: string
  internalComment?: string
}

export interface CardRenewalRequest extends CardAttributes {
  /** `YYYY-MM-DD`. The card's current expiry replaces it; a later one renews it. */
  cardExpiryDate: string
}

export interface CardRenewalResponse {
  csn?: string
  registrationProcessType?: 'RENEW_SERVICES_CARD' | 'REPLACE_SERVICES_CARD'
}

export interface AddressUpdateRequest {
  cardAddressLine1: string
  cardAddressLine2?: string
  cardAddressLine3?: string
  cardAddressLine4?: string
  city: string
  province: string
  postalCode: string
  /** `YYYY-MM-DD`. Today when omitted. */
  cardAddressEffectiveDate?: string
}

export interface AddressUpdateResponse {
  csn?: string
  incomingAddressUpdateId?: number
  status?: string
}

/** How an email completion ended: the host answers 204, 404 or 409. */
export type EmailCompletion = 'completed' | 'not-found' | 'email-mismatch'

// --- errors ---------------------------------------------------------------------------------------

export type IasTestApiErrorKind =
  /** 501: the route is served, the operation is not built yet. */
  | 'not-implemented'
  /** 403 although the token holds the route's scope: this build has no such route. */
  | 'route-absent'
  /** 403 and the token lacks the route's scope. */
  | 'scope-missing'
  /** 400 with an empty body on a usercode route: unknown, or not in a state this call can act on. */
  | 'unknown-usercode'
  /** 401: the client credentials, or a fresh token the API still refused. */
  | 'unauthorized'
  /** No connection within the retry budget. */
  | 'unreachable'
  /** Any other status, a lost response, or a 2xx the contract does not allow. */
  | 'unexpected'

/** A failed call. The message is safe for a remote log: masked route, status, and what it means. */
export class IasTestApiError extends Error {
  constructor(
    readonly kind: IasTestApiErrorKind,
    message: string,
    /** The HTTP status, when the host answered. */
    readonly status?: number
  ) {
    super(message)
    this.name = 'IasTestApiError'
  }
}

// --- config ---------------------------------------------------------------------------------------

export interface IasTestApiConfig {
  /** `https://<host>`, no trailing slash. */
  origin: string
  clientId: string
  clientSecret: string
}

/** A bare host name or a URL, reduced to its origin. https only: the secret rides the token request. */
function toOrigin(host: string): string {
  let url: URL
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(host) ? host : `https://${host}`)
  } catch {
    throw new Error('IAS_TEST_API_HOST is not a host name or a URL')
  }
  if (url.protocol !== 'https:') {
    throw new Error('IAS_TEST_API_HOST must be an https host: the client secret travels in the token request')
  }
  return url.origin
}

/**
 * Resolve the client from env: e2e/.env.e2e locally, 1Password in CI (one item per environment).
 * Throws with the fix spelled out when a value is missing.
 */
export function getIasTestApiConfig(): IasTestApiConfig {
  const values = {
    IAS_TEST_API_HOST: process.env.IAS_TEST_API_HOST?.trim(),
    IAS_TEST_API_CLIENT_ID: process.env.IAS_TEST_API_CLIENT_ID?.trim(),
    IAS_TEST_API_CLIENT_SECRET: process.env.IAS_TEST_API_CLIENT_SECRET?.trim(),
  }
  const missing = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([name]) => name)
  if (missing.length > 0) {
    throw new Error(
      `No IAS test API configured: set ${missing.join(', ')} in e2e/.env.e2e ` +
        '(1Password bcsc-mobile-app-cd: ias-test-api-dev or ias-test-api-sit).'
    )
  }
  return {
    origin: toOrigin(values.IAS_TEST_API_HOST as string),
    clientId: values.IAS_TEST_API_CLIENT_ID as string,
    clientSecret: values.IAS_TEST_API_CLIENT_SECRET as string,
  }
}

// --- usercode -------------------------------------------------------------------------------------

/**
 * The usercode as the API takes it: the app shows `XXXX-XXXX`, the API wants the eight characters.
 * The value stays out of the error: it decides a verification, and logs are remote.
 */
export function normalizeUsercode(displayed: string): string {
  const usercode = displayed.replaceAll(/[\s-]/g, '')
  if (!/^[A-Za-z0-9]{8}$/.test(usercode)) {
    throw new Error('Invalid confirmation code: expected 8 alphanumeric characters (optionally formatted as XXXX-XXXX)')
  }
  return usercode
}

// --- transport ------------------------------------------------------------------------------------

/** A non-2xx answer. `body` is kept to classify the answer and never reaches an error. */
interface Rejection {
  status: number
  body: string
}

/** What the host said: a 2xx body, or a non-2xx. */
type Answer<T> = { value: T } | { rejection: Rejection }
/** An answer, or a request that was sent and brought none back. */
type Outcome<T> = Answer<T> | { lost: string }

/** One try. Throws only when the request never connected: the case `exchange` repeats. */
async function tryExchange<T>(label: string, url: string, options: ApiFetchOptions): Promise<Outcome<T>> {
  try {
    return { value: await apiFetch<T>(url, options) }
  } catch (error) {
    if (error instanceof ApiError) return { rejection: { status: error.status, body: error.bodySnippet } }
    const transport = error instanceof ApiTransportError ? error : undefined
    const detail = transport ? ` ${transport.detail}` : `: ${describeError(error)}`
    const failure = `${label} failed${detail}`.replaceAll(url, '<url>')
    if (NEVER_CONNECTED.has(transport?.code ?? '')) throw new Error(failure)
    return { lost: failure }
  }
}

/**
 * One round trip. `label` is the request as an error may print it; `url` stays out of every error.
 * A request that never connected is repeated until the connect budget runs out.
 */
async function exchange<T>(label: string, url: string, options: ApiFetchOptions): Promise<Answer<T>> {
  let outcome: Outcome<T>
  try {
    // pollUntil reads a throw as "not yet" and anything returned as the end of the wait.
    outcome = await pollUntil(() => tryExchange<T>(label, url, options), {
      timeoutMs: CONNECT_BUDGET_MS,
      intervalMs: CONNECT_RETRY_INTERVAL_MS,
      description: `${new URL(url).host} to accept a connection`,
    })
  } catch (error) {
    throw new IasTestApiError('unreachable', describeError(error))
  }
  if ('lost' in outcome) throw new IasTestApiError('unexpected', outcome.lost)
  return outcome
}

// --- auth -----------------------------------------------------------------------------------------

interface Token {
  value: string
  scopes: readonly string[]
  /** Epoch ms after which the token is no longer sent. */
  expiresAt: number
}

/** One token per host and client, so a config change in-process never reuses a foreign one. */
const tokens = new Map<string, Token>()

function tokenKey(config: IasTestApiConfig): string {
  return `${config.origin}|${config.clientId}`
}

/** The error codes RFC 6749 lets a token endpoint return: the only part of its body worth naming. */
const OAUTH_ERRORS = new Set([
  'invalid_request',
  'invalid_client',
  'invalid_grant',
  'unauthorized_client',
  'unsupported_grant_type',
  'invalid_scope',
])

function oauthErrorCode(body: string): string | undefined {
  try {
    const code = (JSON.parse(body) as { error?: unknown } | null)?.error
    return typeof code === 'string' && OAUTH_ERRORS.has(code) ? code : undefined
  } catch {
    return undefined
  }
}

function tokenError(label: string, { status, body }: Rejection): IasTestApiError {
  const code = oauthErrorCode(body)
  const codeSuffix = code ? ` ${code}` : ''
  const answer = `${label} → ${status}${codeSuffix}`
  if (status === 401 || code === 'invalid_client') {
    return new IasTestApiError(
      'unauthorized',
      `${answer}: IAS refused the client credentials. Check IAS_TEST_API_CLIENT_ID and IAS_TEST_API_CLIENT_SECRET against 1Password`,
      status
    )
  }
  return new IasTestApiError('unexpected', `${answer}: no token issued`, status)
}

/** Mint (or reuse) the client-credentials token. */
async function getToken(config: IasTestApiConfig): Promise<Token> {
  const key = tokenKey(config)
  const cached = tokens.get(key)
  if (cached && Date.now() < cached.expiresAt) return cached

  const label = `POST ${config.origin}${TOKEN_PATH}`
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')
  const reply = await exchange<{ access_token?: unknown; expires_in?: unknown; scope?: unknown }>(
    label,
    `${config.origin}${TOKEN_PATH}`,
    {
      method: 'POST',
      body: new URLSearchParams({ grant_type: 'client_credentials', scope: IAS_TEST_API_SCOPES.join(' ') }),
      headers: { authorization: `Basic ${credentials}` },
    }
  )
  if ('rejection' in reply) throw tokenError(label, reply.rejection)

  const { access_token: value, expires_in: lifetime, scope } = reply.value ?? {}
  if (typeof value !== 'string' || !value) {
    throw new IasTestApiError('unexpected', `${label} → 2xx without an access_token`)
  }
  const lifetimeS = typeof lifetime === 'number' && lifetime > 0 ? lifetime : DEFAULT_TOKEN_LIFETIME_S
  const token: Token = {
    value,
    // RFC 6749: a response without `scope` granted what was asked for.
    scopes: typeof scope === 'string' ? scope.split(/\s+/).filter(Boolean) : IAS_TEST_API_SCOPES,
    expiresAt: Date.now() + (lifetimeS - TOKEN_EXPIRY_MARGIN_S) * 1000,
  }
  tokens.set(key, token)
  return token
}

/** The scopes the configured client's token holds: the proof that the credentials work. */
export async function getGrantedScopes(): Promise<readonly string[]> {
  return (await getToken(getIasTestApiConfig())).scopes
}

// --- requests -------------------------------------------------------------------------------------

interface Route {
  /** Path under /test/idv/v1; `{name}` marks the path parameter. */
  path: string
  scope: IasTestApiScope
  /** The path parameter's value. It reaches the URL only. */
  parameter?: string
  /** A non-sensitive qualifier for errors, e.g. the channel and decision. */
  qualifier?: string
}

const PATH_PARAMETER = /\{(\w+)\}/

/** The request as an error may print it: the path parameter masked by its name. */
function describeRoute(config: IasTestApiConfig, route: Route): string {
  const qualifier = route.qualifier ? ` (${route.qualifier})` : ''
  return `POST ${config.origin}${API_ROOT}${route.path.replace(PATH_PARAMETER, '<$1>')}${qualifier}`
}

function rejectionError(label: string, route: Route, token: Token, { status, body }: Rejection): IasTestApiError {
  if (status === 501) {
    return new IasTestApiError('not-implemented', `${label} → 501: served, but not implemented on this build`, status)
  }
  if (status === 403) {
    return token.scopes.includes(route.scope)
      ? new IasTestApiError(
          'route-absent',
          `${label} → 403: the token holds ${route.scope}, so this build does not have the route`,
          status
        )
      : new IasTestApiError('scope-missing', `${label} → 403: the token lacks ${route.scope}`, status)
  }
  if (status === 400 && !body.trim() && route.path.includes('{usercode}')) {
    return new IasTestApiError(
      'unknown-usercode',
      `${label} → 400 (empty body): the usercode is unknown, or not in a state this call can act on`,
      status
    )
  }
  if (status === 401) {
    return new IasTestApiError('unauthorized', `${label} → 401, again with a fresh token`, status)
  }
  if (!body.trim()) return new IasTestApiError('unexpected', `${label} → ${status} (empty body)`, status)
  // A 400 with a body is the host's own error page: it could not accept the request as sent.
  const meaning = status === 400 ? ': the host rejected the request body' : ''
  return new IasTestApiError('unexpected', `${label} → ${status} (body withheld)${meaning}`, status)
}

/**
 * POST to a route with the bearer token; every route of this API is a POST. `answers` maps the
 * statuses that are an answer rather than a failure to the value returned for them.
 */
async function post<T>(route: Route, body: unknown, answers: Record<number, T> = {}): Promise<T> {
  const config = getIasTestApiConfig()
  const label = describeRoute(config, route)
  const path = route.path.replace(PATH_PARAMETER, () => encodeURIComponent(route.parameter ?? ''))
  const attempt = async () => {
    const token = await getToken(config)
    const reply = await exchange<T>(label, `${config.origin}${API_ROOT}${path}`, {
      method: 'POST',
      body,
      headers: { authorization: `Bearer ${token.value}` },
    })
    return { token, reply }
  }

  let { token, reply } = await attempt()
  if ('rejection' in reply && reply.rejection.status === 401) {
    // The API no longer honours the cached token (revoked, clock skew): one fresh token, one more try.
    tokens.delete(tokenKey(config))
    ;({ token, reply } = await attempt())
  }
  if ('value' in reply) return reply.value
  if (reply.rejection.status in answers) return answers[reply.rejection.status]
  throw rejectionError(label, route, token, reply.rejection)
}

/** A 2xx whose body breaks the contract. Names what is missing, never what arrived. */
function contractError(route: Route, problem: string): IasTestApiError {
  return new IasTestApiError('unexpected', `${describeRoute(getIasTestApiConfig(), route)} → 2xx ${problem}`)
}

function requirePathValue(value: string, name: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`The test API call needs a ${name}`)
  return trimmed
}

// --- operations -----------------------------------------------------------------------------------

/** Issue a BC Services Card to a new, unverified identity, as ICBC would. */
export async function mintIdentity(request: CreateCardIdentityRequest): Promise<CreateCardIdentityResponse> {
  const route: Route = { path: '/accounts', scope: 'test-idv-accounts' }
  const created = await post<Partial<CreateCardIdentityResponse> | undefined>(route, request)
  if (!created?.csn || !created.birthDate) throw contractError(route, 'without a csn and birthDate')
  return { csn: created.csn, birthDate: created.birthDate, transactionId: created.transactionId }
}

/** The contract's rule for comments, checked here so a breach is named before the host's bare 400. */
function assertDecisionComments(decision: Decision, { userMessage, internalComment }: DecisionComments): void {
  if (decision === 'APPROVE') {
    if (userMessage !== undefined || internalComment !== undefined) {
      throw new Error('An APPROVE decision takes no comments')
    }
    return
  }
  if (!userMessage || !internalComment) throw new Error('A DECLINE decision needs userMessage and internalComment')
  if (userMessage.length > MAX_COMMENT_LENGTH || internalComment.length > MAX_COMMENT_LENGTH) {
    throw new Error(`A DECLINE comment holds ${MAX_COMMENT_LENGTH} characters at most`)
  }
}

/**
 * Record the agent's decision on the verification behind a usercode, as shown by the app or already
 * stripped. An approval takes no comments; a decline requires both. The app does not move on its own.
 */
export async function decideVerification(
  usercode: string,
  channel: VerificationChannel,
  decision: Decision,
  comments: DecisionComments = {}
): Promise<VerificationStatus> {
  const { userMessage, internalComment } = comments
  assertDecisionComments(decision, comments)
  const route: Route = {
    path: '/verifications/{usercode}/decision',
    scope: 'test-idv-verify',
    parameter: normalizeUsercode(usercode),
    qualifier: `${channel} ${decision}`,
  }
  const expected: VerificationStatus = decision === 'APPROVE' ? 'VERIFIED' : 'DECLINED'
  const recorded = await post<{ status?: unknown } | undefined>(route, {
    channel,
    decision,
    userMessage,
    internalComment,
  })
  if (recorded?.status !== expected) throw contractError(route, `without the status ${expected}`)
  return expected
}

/**
 * Complete the pending email verification of a registration. `expectedEmailAddress` is a match guard
 * (the address typed into the app), not a new value.
 */
export async function completeRegistrationEmail(
  usercode: string,
  expectedEmailAddress: string
): Promise<EmailCompletion> {
  const route: Route = {
    path: '/registrations/{usercode}/email-verification/complete',
    scope: 'test-idv-verify',
    parameter: normalizeUsercode(usercode),
  }
  const answer = await post<EmailCompletion | undefined>(
    route,
    { expectedEmailAddress },
    { 404: 'not-found', 409: 'email-mismatch' }
  )
  return answer ?? 'completed'
}

/**
 * Set the expiry of the app instance registered under a usercode; it must be Activated. A moment
 * strictly in the past also sets it Expired. Returns the stored expiry.
 */
export async function setMobileAppExpiry(usercode: string, expiryDate: string | Date): Promise<string> {
  const when = new Date(expiryDate)
  if (Number.isNaN(when.getTime())) throw new Error('setMobileAppExpiry needs an ISO 8601 date-time')
  // The host refuses fractional seconds as a malformed request.
  const toTheSecond = when.toISOString().replace(/\.\d{3}Z$/, 'Z')
  const route: Route = {
    path: '/accounts/mobile-app/{usercode}/expiry',
    scope: 'test-idv-accounts',
    parameter: normalizeUsercode(usercode),
  }
  const stored = await post<{ expiryDate?: unknown } | undefined>(route, { expiryDate: toTheSecond })
  if (typeof stored?.expiryDate !== 'string') throw contractError(route, 'without an expiryDate')
  return stored.expiryDate
}

/** Change the status of an app instance, keyed by the client id it registered with. */
export async function setMobileAppStatus(clientId: string, status: MobileAppStatus, reason: string): Promise<void> {
  const route: Route = {
    path: '/accounts/mobile-app/{client_id}/status',
    scope: 'test-idv-accounts',
    parameter: requirePathValue(clientId, 'client id'),
    qualifier: status,
  }
  await post<unknown>(route, { status, reason })
}

/** Activate, suspend, unsuspend or cancel a physical card. */
export async function setCardStatus(csn: string, cardEventType: CardEventType, reason: string): Promise<void> {
  const route: Route = {
    path: '/accounts/{csn}/card-status',
    scope: 'test-idv-accounts',
    parameter: requirePathValue(csn, 'card serial number'),
    qualifier: cardEventType,
  }
  await post<unknown>(route, { cardEventType, reason })
}

/** Issue a renewal or replacement of a card, optionally with changed name, gender or address. */
export async function renewCard(csn: string, request: CardRenewalRequest): Promise<CardRenewalResponse> {
  const route: Route = {
    path: '/accounts/{csn}/card-renewal',
    scope: 'test-idv-accounts',
    parameter: requirePathValue(csn, 'card serial number'),
  }
  return (await post<CardRenewalResponse | undefined>(route, request)) ?? {}
}

/** Feed an address-only update for a card; no new card is issued. */
export async function updateAddress(csn: string, request: AddressUpdateRequest): Promise<AddressUpdateResponse> {
  const route: Route = {
    path: '/accounts/{csn}/address-update',
    scope: 'test-idv-accounts',
    parameter: requirePathValue(csn, 'card serial number'),
  }
  return (await post<AddressUpdateResponse | undefined>(route, request)) ?? {}
}
