import { throwNativeBcscError } from '@/bcsc-theme/utils/native-error-map'
import { AppError } from '@/errors/appError'
import { ErrorRegistry } from '@/errors/errorRegistry'
import { BCSCEventTypes } from '@/events/eventTypes'
import { RemoteLogger } from '@bifold/remote-logs'
import { getUserAgentString } from '@utils/user-agent'
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { jwtDecode } from 'jwt-decode'
import merge from 'lodash.merge'
import { DeviceEventEmitter } from 'react-native'
import { getRefreshTokenRequestBody, getToken, TokenType } from 'react-native-bcsc-core'
import {
  formatAxiosErrorForLogger as formatIASAxiosErrorForLogger,
  formatIasAxiosResponseError,
  getAppErrorFromAxiosError,
  isNetworkError,
} from '../utils/axios-error-utils'
import { AxiosAppError, ErrorMatcherContext } from './clientErrorPolicies'
import { JWK, JWKResponseData } from './hooks/useJwksApi'
import { TokenResponse } from './hooks/useTokens'
import { withAccount } from './hooks/withAccountGuard'
import { loadPersistedJwk, persistJwk } from './jwk-cache'

// Refresh tokens 30 seconds before they actually expire to avoid
// expiry-on-the-wire races when multiple requests fire near the boundary.
const TOKEN_EXPIRY_BUFFER_MS = 30 * 1000

// Bounded retry for the JWKS fetch: 3 attempts total, with linear backoff delays of
// 500ms then 1000ms between attempts. Only transient errors (network / 5xx) are retried —
// see isRetryableJwkFetchError. Deliberately small and bounded: this is a background warm-up
// and an inline verification-path call, not a user-facing loading state.
const JWK_FETCH_MAX_ATTEMPTS = 3
const JWK_FETCH_RETRY_BASE_DELAY_MS = 500

// The retryable JWKS failure shapes (see isRetryableJwkFetchError): 0 for a network error (no HTTP
// response — see the response interceptor's `error.response?.status ?? 0`), and the full 5xx range.
// Passed as suppressStatusCodeLogs on the JWKS request so the interceptor's own log line + analytics
// tracking (see getAppErrorFromAxiosError) don't fire on every retry attempt — fetchJwk already logs
// a warn per retry and a single error on total exhaustion, so a transient outage isn't amplified 3x
// across dashboards. A deterministic 4xx is a single, non-retried attempt and is left to log/track
// normally, since it may indicate a real configuration problem worth surfacing distinctly.
const JWK_FETCH_RETRYABLE_STATUS_CODES = [0, ...Array.from({ length: 100 }, (_, index) => 500 + index)]

// Extend AxiosRequestConfig to include skipBearerAuth
declare module 'axios' {
  export interface AxiosRequestConfig {
    skipBearerAuth?: boolean
    // Internal: marks a request to skip the onError callback, so the caller can handle it themselves
    skipOnErrorHandler?: boolean
    // Note: Useful for endpoints that return expected error codes
    suppressStatusCodeLogs?: number[]
    // Internal: marks a request already retried once after a 401, to prevent refresh/retry loops
    _retriedAfter401?: boolean
  }
}

type BCSCClientOnErrorCallback = (appError: AxiosAppError, context: ErrorMatcherContext) => void

interface BCSCConfig {
  pairDeviceWithQRCodeSupported: boolean
  maximumAccountsPerDevice: number
  allowedIdentificationProcesses: string[]
  credentialFlowsSupported: string
  multipleAccountsSupported: boolean
  attestationTimeToLive: number
}

export interface BCSCEndpoints {
  attestation: string
  issuer: string
  authorization: string
  userInfo: string
  deviceAuthorization: string
  jwksURI: string
  registration: string
  clientMetadata: string
  savedServices: string
  token: string
  credential: string
  evidence: string
  video: string
  cardTap: string
  barcodes: string
  accountDevices: string
  account: string
}

class BCSCApiClient {
  readonly client: AxiosInstance
  readonly logger: RemoteLogger
  endpoints: BCSCEndpoints
  config: BCSCConfig
  baseURL: string
  tokens?: TokenResponse // this token will be used to interact and access data from IAS servers
  tokensPromise: Promise<TokenResponse> | null // to prevent multiple simultaneous token fetches
  onError?: BCSCClientOnErrorCallback
  private cachedJwk: JWK | null = null // in-memory JWK cache, invalidated when baseURL changes
  private cachedJwkBaseUrl: string | null = null
  private jwkFetchPromise: Promise<JWK | null> | null = null // single-flight in-progress JWK fetch
  private jwkFetchPromiseBaseUrl: string | null = null // baseURL the in-flight fetch was started for

  constructor(baseURL: string, logger: RemoteLogger) {
    this.baseURL = baseURL
    this.logger = logger
    this.client = axios.create({
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': getUserAgentString(),
      },
    })

    if (this.baseURL) {
      this.logger.info(`[BCSCApiClient] initialized with URL: ${this.baseURL}`)
    } else {
      this.logger.error('[BCSCApiClient] initialized with empty URL.')
    }

    this.tokensPromise = null

    // fallback config
    this.config = {
      pairDeviceWithQRCodeSupported: true,
      maximumAccountsPerDevice: 0,
      allowedIdentificationProcesses: [
        'IDIM L3 Remote BCSC Photo Identity Verification',
        'IDIM L3 Remote BCSC Non-Photo Identity Verification',
        'IDIM L3 Remote Non-BCSC Identity Verification',
      ],
      credentialFlowsSupported: 'default_web_flow, bcwallet_initiated, bcsc_initiated',
      multipleAccountsSupported: false,
      attestationTimeToLive: 60,
    }

    // fallback endpoints
    this.endpoints = {
      attestation: `${this.baseURL}/device/attestations`,
      issuer: `${this.baseURL}/device/`,
      authorization: `${this.baseURL}/device/authorize`,
      userInfo: `${this.baseURL}/device/userinfo`,
      deviceAuthorization: `${this.baseURL}/device/devicecode`,
      jwksURI: `${this.baseURL}/device/jwk`,
      registration: `${this.baseURL}/device/register`,
      clientMetadata: `${this.baseURL}/device/clients/metadata`,
      savedServices: `${this.baseURL}/device/services`,
      token: `${this.baseURL}/device/token`,
      credential: `${this.baseURL}/credentials/v1/person`,
      evidence: `${this.baseURL}/evidence`,
      video: `${this.baseURL}/video`,
      cardTap: `${this.baseURL}/cardtap`,
      barcodes: `${this.baseURL}/device/barcodes`,
      accountDevices: `${this.baseURL}/account/embedded/devices`,
      account: `${this.baseURL}/account`,
    }

    // Add interceptors
    this.client.interceptors.request.use(this.handleRequest.bind(this))
    this.client.interceptors.response.use(undefined, async (_error: unknown) => {
      // Pass through errors that are already AppErrors (e.g. from request interceptor)
      if (_error instanceof AppError) {
        throw _error
      }

      // Only handle AxiosErrors here; pass through all other error types unchanged
      if (!axios.isAxiosError(_error)) {
        throw _error
      }

      // 401 recovery: a bearer-authed request can fail with 401 when its access token is rejected
      // server-side despite still looking valid locally (revoked token, or device clock skew). Refresh
      // the tokens once and retry the request a single time before surfacing the error. Guards: only
      // bearer requests (skipBearerAuth is excluded so the refresh call itself can't loop) and only once.
      const originalConfig = _error.config
      if (
        _error.response?.status === 401 &&
        originalConfig &&
        !originalConfig.skipBearerAuth &&
        !originalConfig._retriedAfter401
      ) {
        originalConfig._retriedAfter401 = true
        this.logger.info('[BCSCApiClient] Access token rejected (401); refreshing tokens and retrying once')
        // On refresh failure the error is already handled by its own interceptor pass and propagates;
        // on success the retry's own interceptor pass handles any further failure (no double-handling).
        await this.forceRefreshTokens()
        return this.client.request(originalConfig)
      }

      // 1. Format the error - update error code and message properties from IAS response
      const error = formatIasAxiosResponseError(_error)

      // 2. Convert the axios error into an AppError
      const appError = getAppErrorFromAxiosError(error)

      const suppressStatusCodeLogs = error.config?.suppressStatusCodeLogs ?? []
      const statusCode = error.response?.status ?? 0

      // 3. Log if the status code is not in the suppress list
      if (!suppressStatusCodeLogs.includes(statusCode)) {
        const simpleAppError = appError.toJSON()
        const { message, ...details } = simpleAppError
        this.logger.error(`[BCSCApiClient] ${message}`, {
          ...details,
          cause: formatIASAxiosErrorForLogger({ error: error, suppressStackTrace: true }),
        })
      }

      // 4. Invoke onError callback if provided which marks as handled
      if (error.config?.skipOnErrorHandler !== true) {
        try {
          this.onError?.(appError as AxiosAppError, {
            endpoint: String(error.config?.url),
            statusCode: error.response?.status ?? 0,
            apiEndpoints: this.endpoints,
          })
        } catch (handlerError) {
          this.logger.error('[BCSCApiClient] Error handler threw', handlerError as Error)
        }
      }

      throw appError
    })
  }

  setErrorHandler(callback: BCSCClientOnErrorCallback) {
    this.onError = callback
  }

  clearTokens() {
    this.tokens = undefined
    this.tokensPromise = null
  }

  async fetchEndpointsAndConfig() {
    const response = await this.get<any>(`${this.baseURL}/device/.well-known/openid-configuration`, {
      skipBearerAuth: true,
    })

    this.config = merge(this.config, {
      pairDeviceWithQRCodeSupported: response.data['pair_device_with_qrcode_supported'],
      maximumAccountsPerDevice: response.data['maximum_accounts_per_device'],
      allowedIdentificationProcesses: response.data['allowed_identification_processes'],
      credentialFlowsSupported: response.data['credential_flows_supported'],
      multipleAccountsSupported: response.data['multiple_accounts_supported'],
      attestationTimeToLive: response.data['attestation_time_to_live'],
    })

    // Use values from response, otherwise fallback to existing endpoints
    this.endpoints = merge(this.endpoints, {
      attestation: response.data['attestation_endpoint'],
      issuer: response.data['issuer'],
      authorization: response.data['authorization_endpoint'],
      userInfo: response.data['userinfo_endpoint'],
      deviceAuthorization: response.data['device_authorization_endpoint'],
      jwksURI: response.data['jwks_uri'],
      registration: response.data['registration_endpoint'],
      clientMetadata: response.data['client_metadata_endpoint'],
      savedServices: response.data['saved_services_endpoint'],
      token: response.data['token_endpoint'],
      credential: response.data['credential_endpoint'],
      evidence: response.data['evidence_endpoint'],
      video: response.data['video_call_endpoint'],
      cardTap: response.data['cardtap_endpoint'],
      barcodes: response.data['barcodes_endpoint'],
      accountDevices: response.data['account_devices_endpoint'],
      account: response.data['account_endpoint'],
    })
  }

  private async ensureValidTokens(): Promise<TokenResponse> {
    return withAccount(async () => {
      if (this.tokensPromise) {
        // return the existing promise if currently refreshing
        return this.tokensPromise
      }

      // Rebuild the in-memory cache from secure storage if it's empty (e.g. the
      // startup hydration refresh failed transiently or ran before the client
      // was ready). Throws TOKEN_NULL only when no refresh token is recoverable.
      const tokens = this.tokens ?? (await this.recoverTokens())

      if (this.isTokenExpired(tokens.refresh_token)) {
        // refresh tokens should not expire
        this.logger.error('[BCSCApiClient] Refresh token expired - fatal error detected')
        throw new Error('Refresh token expired')
      }

      if (!this.isTokenExpired(tokens.access_token)) {
        // access token is still valid, don't refresh
        return tokens
      }

      // access token is expired or about to expire, fetch new tokens using refresh token
      // Set tokensPromise immediately to prevent concurrent callers from starting duplicate refreshes
      this.tokensPromise = this.fetchTokens(tokens.refresh_token)
      try {
        this.tokens = await this.tokensPromise
      } finally {
        this.tokensPromise = null
      }
      return this.tokens
    })
  }

  /**
   * Forces a token refresh regardless of the local access-token expiry, then returns the new tokens.
   * Used to recover from a server-side 401 on an access token that still looked valid locally (revoked
   * token, or device clock skew). Concurrent callers share the in-flight refresh via `tokensPromise`.
   */
  private async forceRefreshTokens(): Promise<TokenResponse> {
    return withAccount(async () => {
      if (this.tokensPromise) {
        // share the in-flight refresh if one is already running
        return this.tokensPromise
      }

      if (!this.tokens) {
        this.logger.error('[BCSCApiClient] Cannot refresh after 401 - no tokens present')
        throw AppError.fromErrorDefinition(ErrorRegistry.TOKEN_NULL)
      }

      if (this.isTokenExpired(this.tokens.refresh_token)) {
        this.logger.error('[BCSCApiClient] Cannot refresh after 401 - refresh token expired')
        throw new Error('Refresh token expired')
      }

      this.tokensPromise = this.fetchTokens(this.tokens.refresh_token)
      try {
        this.tokens = await this.tokensPromise
      } finally {
        this.tokensPromise = null
      }
      return this.tokens
    })
  }

  private isTokenExpired(token?: string): boolean {
    let isExpired = true
    // if no token is present, or within the buffer limit of expiring, return that token is "expired" and fetch a new one
    if (token) {
      const decodedToken = jwtDecode(token)
      const exp = decodedToken.exp ?? 0
      isExpired = Date.now() >= exp * 1000 - TOKEN_EXPIRY_BUFFER_MS
    }
    return isExpired
  }

  private async handleRequest(config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> {
    this.logger.info(`[${config.method?.toUpperCase()}] ${String(config.url)}`)

    // skip processing if skipBearerAuth is set in the config
    if (config.skipBearerAuth) {
      return config
    }

    const tokens = await this.ensureValidTokens()
    config.headers.set('Authorization', `Bearer ${tokens.access_token}`)

    return config
  }

  private fetchTokens(refreshToken: string): Promise<TokenResponse> {
    return withAccount(async (account) => {
      const tokenBody = await getRefreshTokenRequestBody(account.issuer, account.clientID, refreshToken).catch(
        (error) => throwNativeBcscError(error)
      )

      const tokensResponse = await this.post<TokenResponse>(this.endpoints.token, tokenBody, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        skipBearerAuth: true,
      })

      return tokensResponse.data
    })
  }

  async getTokensForRefreshToken(refreshToken: string): Promise<TokenResponse> {
    if (this.tokensPromise) {
      // Return the existing promise if currently refreshing
      return this.tokensPromise
    }

    try {
      this.tokensPromise = this.fetchTokens(refreshToken)
      this.tokens = await this.tokensPromise
    } finally {
      // Clear the promise cache regardless of success or failure
      this.tokensPromise = null
    }

    return this.tokens
  }

  /**
   * Returns the in-memory token cache, rebuilding it from secure storage when it
   * is empty.
   *
   * The cache (`this.tokens`) is ephemeral and is normally populated at startup
   * by `hydrateSecureState`. That path can leave it empty without surfacing an
   * error — for example when the startup refresh fails on a flaky network, or
   * runs before the client finished configuring. In those cases a valid refresh
   * token still lives in secure storage, so we lazily rebuild the cache instead
   * of forcing the user to reinstall the app.
   *
   * @returns the populated tokens
   * @throws AppError TOKEN_NULL when the cache is empty and no refresh token
   *   exists in secure storage — the only genuinely unrecoverable case.
   */
  async recoverTokens(): Promise<TokenResponse> {
    if (this.tokens) {
      return this.tokens
    }

    const storedRefreshToken = (await getToken(TokenType.Refresh).catch((error) => throwNativeBcscError(error)))?.token
    if (!storedRefreshToken) {
      this.logger.error('[BCSCApiClient] Token cache empty and no refresh token in secure storage')
      throw AppError.fromErrorDefinition(ErrorRegistry.TOKEN_NULL, {
        cause: new Error('Token cache empty and no stored refresh token to recover from'),
      })
    }

    this.logger.warn('[BCSCApiClient] Token cache empty; rebuilding from stored refresh token')
    const tokens = await this.getTokensForRefreshToken(storedRefreshToken)

    // Tokens went from missing to available (e.g. connectivity returned after a
    // failed startup refresh) — notify listeners so data providers can reload
    // state that failed while tokens were unavailable.
    DeviceEventEmitter.emit(BCSCEventTypes.TOKENS_REFRESHED)

    return tokens
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config)
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config)
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config)
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config)
  }

  /**
   * Single network attempt to fetch the first JWK from the server's JWKS endpoint.
   *
   * Returns `null` on a well-formed but empty/absent `keys` response (not an error — the server
   * genuinely has no key to offer, so retrying won't help); throws on a request failure so the
   * caller can decide whether that failure is retryable.
   *
   * `skipOnErrorHandler` keeps the global alert policy from firing on every retry attempt.
   * `suppressStatusCodeLogs` additionally silences the interceptor's own log line + analytics
   * tracking for the retryable failure shapes (network / 5xx, see JWK_FETCH_RETRYABLE_STATUS_CODES)
   * so a transient outage isn't amplified across the retry loop — fetchJwk's own logging (a warn per
   * retry, one error on total exhaustion, one warn if a fallback is used) is the sole signal for
   * those. A deterministic 4xx is a single, non-retried attempt and still logs/tracks normally via
   * the interceptor, same as any other endpoint.
   */
  private async fetchJwkFromNetwork(): Promise<JWK | null> {
    const response = await this.get<JWKResponseData>(this.endpoints.jwksURI, {
      skipBearerAuth: true,
      skipOnErrorHandler: true,
      suppressStatusCodeLogs: JWK_FETCH_RETRYABLE_STATUS_CODES,
    })

    if (response.data.keys && response.data.keys.length > 0) {
      return response.data.keys[0]
    }

    return null
  }

  /**
   * Gates the JWK fetch retry loop to transient failures only: a network error, or an HTTP >= 500
   * read from the AxiosError the response interceptor attaches as `AppError.cause`. A deterministic
   * 4xx (or any other error shape) is not retryable — retrying it would just waste the attempt budget
   * on a request that will fail the same way every time.
   */
  private isRetryableJwkFetchError(error: unknown): boolean {
    if (isNetworkError(error)) {
      return true
    }

    const status = (error as Partial<AxiosAppError>)?.cause?.response?.status
    return typeof status === 'number' && status >= 500
  }

  /**
   * Fetches the first JWK from the server's JWKS endpoint. Used for JWT signature verification.
   *
   * Resolution order:
   * 1. In-memory cache hit (reused while the environment / baseURL is unchanged).
   * 2. An in-flight fetch for the same baseURL (single-flight — see jwkFetchPromise below).
   *    Concurrent callers — e.g. BCSCApiClientContext's fire-and-forget warm-up landing alongside
   *    an early verification call at startup — join the same retry loop instead of each racing
   *    their own, which would otherwise multiply network requests (up to JWK_FETCH_MAX_ATTEMPTS per
   *    caller) during an outage.
   * 3. Network fetch, retried up to JWK_FETCH_MAX_ATTEMPTS times with linear backoff — but only for
   *    transient errors (see isRetryableJwkFetchError); a deterministic failure or an empty key set
   *    goes straight to step 4.
   * 4. On network exhaustion/empty, the last-known-good persisted key (survives cold starts) — this
   *    is network-first: the fallback never hydrates the in-memory cache, so the next call retries
   *    the network rather than trusting a potentially-rotated key indefinitely. The in-flight
   *    promise is cleared as soon as it settles regardless of outcome, so a fallback result is only
   *    ever shared by callers that joined it while it was in flight — the next call always starts a
   *    fresh attempt.
   * 5. `null` — the caller fails closed (ERR_111).
   *
   * A successful network fetch is cached in-memory and persisted for future fallback use.
   *
   * TODO: This should probably not be in the client, move logic elsewhere.
   */
  async fetchJwk(): Promise<JWK | null> {
    if (this.cachedJwk && this.cachedJwkBaseUrl === this.baseURL) {
      return this.cachedJwk
    }

    // Join an in-flight fetch for the same baseURL rather than starting a parallel retry loop. A
    // fetch in flight for a since-changed baseURL is never joined — mirrors the baseURL check the
    // in-memory cache above already uses.
    if (this.jwkFetchPromise && this.jwkFetchPromiseBaseUrl === this.baseURL) {
      return this.jwkFetchPromise
    }

    const requestBaseUrl = this.baseURL
    this.jwkFetchPromiseBaseUrl = requestBaseUrl
    this.jwkFetchPromise = this.fetchJwkWithRetry(requestBaseUrl).finally(() => {
      // Only clear if this settled fetch is still the one being tracked for requestBaseUrl — guards
      // against a late-settling fetch for an old baseURL clobbering a newer in-flight fetch that
      // replaced it after a baseURL change.
      if (this.jwkFetchPromiseBaseUrl === requestBaseUrl) {
        this.jwkFetchPromise = null
        this.jwkFetchPromiseBaseUrl = null
      }
    })

    return this.jwkFetchPromise
  }

  /**
   * The retry loop + persisted fallback behind fetchJwk's cache/single-flight gate above. Always
   * resolves, never rejects — fetchJwkFromNetwork's thrown errors are caught here, and
   * persistJwk/loadPersistedJwk never throw — so fetchJwk's shared promise is always safe to await
   * or fire-and-forget.
   *
   * @param baseURL - The baseURL this fetch was started for (captured by fetchJwk at call time, not
   *   re-read from `this.baseURL`, so a baseURL change mid-flight can't misattribute the result).
   */
  private async fetchJwkWithRetry(baseURL: string): Promise<JWK | null> {
    let jwk: JWK | null = null
    let lastError: unknown

    for (let attempt = 1; attempt <= JWK_FETCH_MAX_ATTEMPTS; attempt++) {
      try {
        jwk = await this.fetchJwkFromNetwork()
        lastError = undefined
        break
      } catch (error) {
        lastError = error

        if (attempt >= JWK_FETCH_MAX_ATTEMPTS || !this.isRetryableJwkFetchError(error)) {
          break
        }

        this.logger.warn(`[BCSCApiClient] JWK fetch attempt ${attempt} failed, retrying: ${error}`)
        await new Promise((resolve) => setTimeout(resolve, JWK_FETCH_RETRY_BASE_DELAY_MS * attempt))
      }
    }

    if (jwk) {
      this.cachedJwk = jwk
      this.cachedJwkBaseUrl = baseURL
      await persistJwk(baseURL, jwk, this.logger)
      return jwk
    }

    if (lastError) {
      this.logger.error(`Failed to fetch JWK: ${lastError}`)
    } else {
      this.logger.warn('[BCSCApiClient] JWKS endpoint returned no keys')
    }

    const persistedJwk = await loadPersistedJwk(baseURL, this.logger)
    if (persistedJwk) {
      this.logger.warn('[BCSCApiClient] last-known-good JWK used; JWKS unreachable')
      return persistedJwk
    }

    return null
  }
}

export default BCSCApiClient
