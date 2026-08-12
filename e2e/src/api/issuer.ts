/**
 * Typed client for the e2e issuer/verifier — a tenant on BC Gov's DEV Traction (multi-tenant ACA-Py
 * behind a tenant proxy). Both its admin and DIDComm planes are public HTTPS, so local runs and
 * Sauce devices talk to the same issuer. See ../../issuer/README.md for the setup, and
 * ../../docs/SUPPORT-API.md for how this layer fits the wider suite.
 *
 * Auth is a tenant JWT minted from ISSUER_TENANT_ID + ISSUER_API_KEY (cached; one re-auth on 401
 * covers any token TTL). The proxy blocks /status/config, so the instance's auto_* flags are
 * unknowable — every exchange sets its own per-record overrides, and the waiters nudge the one
 * protocol step each side could otherwise park on.
 *
 * The `waitFor*` functions poll records (the runner takes no inbound traffic, so webhooks are not an
 * option) with `Timeouts.DIDCOMM_DELIVERY` as the default budget, and fail with the record's own
 * state when the exchange lands somewhere terminal-but-wrong (e.g. `abandoned` while waiting for
 * `done`) — the API-side counterpart of the UI's describeCurrentScreen() diagnosis.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Timeouts } from '../constants.js'
import { ApiError, apiFetch, pollUntil, type ApiFetchOptions } from './http.js'

/** The published schema's attributes — scripts/issuer-provision.ts imports this, so client and
 *  provisioning cannot drift. */
export const ISSUER_SCHEMA_ATTRIBUTES = ['given_name', 'family_name', 'issued_at'] as const

/** Public knowledge, not a secret — override with ISSUER_BASE_URL to point at another instance. */
const DEFAULT_BASE_URL = 'https://traction-tenant-proxy-dev.apps.silver.devops.gov.bc.ca'

const ISSUER_ENV_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../../issuer/.issuer-env')

export interface IssuerConfig {
  /** Traction tenant proxy, no trailing slash. */
  baseUrl: string
  tenantId: string
  apiKey: string
  /** Resolved lazily from the agent when neither env nor .issuer-env carries them. */
  credDefId?: string
  schemaId?: string
  did?: string
}

// --- record shapes (the fields this client reads; ACA-Py returns much more) ----------------------

export type CredExState =
  | 'offer-sent'
  | 'request-received'
  | 'credential-issued'
  | 'done'
  | 'abandoned'
  | (string & {})

export interface CredExRecord {
  cred_ex_id: string
  state: CredExState
  connection_id?: string
  error_msg?: string
}

export type PresExState = 'request-sent' | 'presentation-received' | 'done' | 'abandoned' | (string & {})

export interface PresExRecord {
  pres_ex_id: string
  state: PresExState
  connection_id?: string
  /** ACA-Py serializes the verification outcome as the STRING 'true' | 'false'. */
  verified?: 'true' | 'false'
  error_msg?: string
}

interface ConnectionRecord {
  connection_id: string
  state: string
  their_label?: string
}

// --- config ---------------------------------------------------------------------------------------

function readIssuerEnvFile(): Record<string, string> {
  let content: string
  try {
    content = readFileSync(ISSUER_ENV_FILE, 'utf8')
  } catch {
    return {}
  }
  const entries: Record<string, string> = {}
  for (const line of content.split('\n')) {
    if (line.trimStart().startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator > 0) entries[line.slice(0, separator).trim()] = line.slice(separator + 1).trim()
  }
  return entries
}

/**
 * Resolve the issuer config: tenant credentials come from env only (they are secrets — e2e/.env.e2e
 * locally, GitHub secrets in CI), the provisioned ids fall back to `issuer/.issuer-env` (written by
 * `yarn issuer:provision`). Throws with the fix spelled out when the tenant is not configured.
 */
export function getIssuerConfig(): IssuerConfig {
  const tenantId = process.env.ISSUER_TENANT_ID
  const apiKey = process.env.ISSUER_API_KEY
  if (!tenantId || !apiKey) {
    throw new Error(
      'No e2e issuer configured: set ISSUER_TENANT_ID + ISSUER_API_KEY in e2e/.env.e2e ' +
        '(from the Traction tenant UI — see e2e/issuer/README.md).'
    )
  }
  const fromFile = readIssuerEnvFile()
  return {
    baseUrl: (process.env.ISSUER_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, ''),
    tenantId,
    apiKey,
    credDefId: process.env.ISSUER_CRED_DEF_ID ?? fromFile.ISSUER_CRED_DEF_ID,
    schemaId: process.env.ISSUER_SCHEMA_ID ?? fromFile.ISSUER_SCHEMA_ID,
    did: process.env.ISSUER_DID ?? fromFile.ISSUER_DID,
  }
}

// --- auth -------------------------------------------------------------------------------------------

let cachedToken: { scope: string; token: string } | undefined

/** Mint (or reuse) the tenant JWT — cache is scoped to baseUrl|tenantId so an in-process config
 *  change can never reuse a foreign token. Never logs the key. */
async function getTenantToken(config: IssuerConfig): Promise<string> {
  const scope = `${config.baseUrl}|${config.tenantId}`
  if (cachedToken?.scope === scope) return cachedToken.token
  let response: { token?: string }
  try {
    response = await apiFetch<{ token?: string }>(
      `${config.baseUrl}/multitenancy/tenant/${encodeURIComponent(config.tenantId)}/token`,
      { method: 'POST', body: { api_key: config.apiKey } }
    )
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      throw new Error('Traction rejected the tenant id (404) — check ISSUER_TENANT_ID against the tenant UI')
    }
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      throw new Error(`Traction rejected the API key (${error.status}) — check ISSUER_API_KEY against the tenant UI`)
    }
    throw error
  }
  if (!response?.token) {
    throw new Error(`Traction token endpoint returned no token: ${JSON.stringify(response).slice(0, 300)}`)
  }
  cachedToken = { scope, token: response.token }
  return response.token
}

/**
 * Authenticated fetch against the tenant proxy — the primitive every issuer call (and
 * scripts/issuer-provision.ts) goes through. Re-auths once on 401 (token TTL is unknown); a 403 is
 * a proxy-blocked route, not expiry, and passes through.
 */
export async function adminFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const config = getIssuerConfig()
  const call = async () =>
    apiFetch<T>(`${config.baseUrl}${path}`, {
      ...options,
      headers: { authorization: `Bearer ${await getTenantToken(config)}`, ...options.headers },
    })
  try {
    return await call()
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      cachedToken = undefined
      return call()
    }
    throw error
  }
}

/**
 * The cred def to issue/verify against: config when present, otherwise looked up from the agent
 * (any cred def on the provisioned schema). Fails with the provisioning hint when the issuer has
 * never been provisioned.
 */
async function resolveCredDefId(): Promise<string> {
  const config = getIssuerConfig()
  if (config.credDefId) return config.credDefId
  const found = await adminFetch<{ credential_definition_ids?: string[] }>(
    `/credential-definitions/created${config.schemaId ? `?schema_id=${encodeURIComponent(config.schemaId)}` : ''}`
  )
  const credDefId = found.credential_definition_ids?.[0]
  if (!credDefId) {
    throw new Error(
      `Tenant at ${config.baseUrl} has no credential definition — run \`yarn issuer:provision\` against it first`
    )
  }
  return credDefId
}

// --- status ---------------------------------------------------------------------------------------

/** Traction's tenant self-record — the identity/ledger probe (and the /status fallback). */
export async function getTenantInfo(): Promise<{ tenantName: string; ledgerId: string }> {
  const tenant = await adminFetch<{ tenant_name?: string; curr_ledger_id?: string }>('/tenant')
  return { tenantName: tenant.tenant_name ?? '(unnamed tenant)', ledgerId: tenant.curr_ledger_id ?? '(unknown)' }
}

/** Fail-fast probe — call in a journey's before() so a missing/unreachable issuer costs seconds,
 *  not an Appium session. */
export async function getIssuerStatus(): Promise<{ label: string; version: string }> {
  try {
    const status = await adminFetch<{ label?: string; version?: string }>('/status')
    return { label: status.label ?? '(unknown)', version: status.version ?? '(unknown)' }
  } catch (error) {
    // The proxy nginx-blocks some admin routes — the tenant record is the fallback proof of life.
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      const tenant = await getTenantInfo()
      return { label: tenant.tenantName, version: `(status blocked by proxy; ledger ${tenant.ledgerId})` }
    }
    throw error
  }
}

// --- connection -----------------------------------------------------------------------------------

export type InvitationGoalCode = 'aries.vc.issue' | 'aries.vc.verify' | 'aries.vc.verify.once'

export interface CreatedInvitation {
  /** Full invitation URL (the issuer endpoint with an `oob=` param). */
  invitationUrl: string
  oobId: string
  /** The invitation message id — the key `waitForConnectionActive` correlates the connection by. */
  invitationMsgId: string
}

/**
 * Mint an out-of-band connection invitation. The `label` is what the wallet shows as the contact
 * name and in notification copy ("<label> is offering you ..."); the goal code decides where the
 * wallet lands after connecting (no goal code → chat; `aries.vc.issue` → waits and renders the
 * offer inline on the connection screen).
 */
export async function createInvitation(options: {
  label: string
  goalCode?: InvitationGoalCode
}): Promise<CreatedInvitation> {
  const created = await adminFetch<{ invitation_url?: string; oob_id?: string; invi_msg_id?: string }>(
    // auto_accept per invitation — the instance's auto-accept defaults are unknowable through the proxy.
    '/out-of-band/create-invitation?auto_accept=true',
    {
      method: 'POST',
      body: {
        handshake_protocols: ['https://didcomm.org/didexchange/1.1'],
        my_label: options.label,
        // ACA-Py's invitation model rejects goal_code without a goal (breaks its own oob-record
        // cleanup later) — always pair them.
        ...(options.goalCode ? { goal_code: options.goalCode, goal: 'e2e wallet journey' } : {}),
      },
    }
  )
  if (!created.invitation_url || !created.oob_id || !created.invi_msg_id) {
    throw new Error(`create-invitation returned an incomplete record: ${JSON.stringify(created).slice(0, 300)}`)
  }
  return { invitationUrl: created.invitation_url, oobId: created.oob_id, invitationMsgId: created.invi_msg_id }
}

/**
 * Rewrap an invitation URL as the deep link the app registers. The scheme itself is cosmetic — the
 * app detects invitations by the `oob=` param (and iOS dispatch retargets the scheme anyway); what
 * matters is that `bcwallet` is a registered scheme on both platforms in every variant.
 */
export function toWalletDeepLink(invitationUrl: string): string {
  const oob = new URL(invitationUrl).searchParams.get('oob')
  if (!oob) {
    throw new Error(`Invitation URL carries no oob= param: ${invitationUrl}`)
  }
  return `bcwallet://aries_connection_invitation?oob=${oob}`
}

/**
 * Wait until the connection made from an invitation is usable. ACA-Py spells the terminal state
 * 'active' (connections protocol naming) or 'completed' (didexchange) depending on version — both
 * mean "send offers now".
 */
export async function waitForConnectionActive(options: {
  invitationMsgId: string
  timeoutMs?: number
}): Promise<{ connectionId: string }> {
  let lastState: string | undefined
  const connection = await pollUntil(
    async () => {
      const found = await adminFetch<{ results?: ConnectionRecord[] }>(
        `/connections?invitation_msg_id=${encodeURIComponent(options.invitationMsgId)}`
      )
      const record = found.results?.[0]
      lastState = record ? record.state : '(no connection record yet — invitation not received?)'
      return record && ['active', 'completed'].includes(record.state) ? record : undefined
    },
    {
      timeoutMs: options.timeoutMs ?? Timeouts.DIDCOMM_DELIVERY,
      description: `the connection from invitation ${options.invitationMsgId} to become active`,
      lastObserved: () => lastState,
    }
  )
  return { connectionId: connection.connection_id }
}

// --- credential issuance --------------------------------------------------------------------------

/** Offer a credential on an established connection. Attribute names must match the provisioned
 *  schema ({@link ISSUER_SCHEMA_ATTRIBUTES}). */
export async function sendCredentialOffer(
  connectionId: string,
  attributes: Record<string, string>,
  options?: { comment?: string }
): Promise<{ credExId: string }> {
  const credDefId = await resolveCredDefId()
  const record = await adminFetch<CredExRecord>('/issue-credential-2.0/send-offer', {
    method: 'POST',
    body: {
      connection_id: connectionId,
      comment: options?.comment ?? 'e2e credential offer',
      // Per-exchange override for the instance's unknowable auto-respond flag (waiter nudge is the backstop).
      auto_issue: true,
      // Keep the exchange record after completion — revocation needs it.
      auto_remove: false,
      credential_preview: {
        '@type': 'issue-credential/2.0/credential-preview',
        attributes: Object.entries(attributes).map(([name, value]) => ({ name, value })),
      },
      filter: { indy: { cred_def_id: credDefId } },
    },
  })
  if (!record.cred_ex_id) {
    throw new Error(`send-offer returned no cred_ex_id: ${JSON.stringify(record).slice(0, 300)}`)
  }
  return { credExId: record.cred_ex_id }
}

/** By-id GET — note ACA-Py wraps the by-id response in a detail envelope. */
export async function getCredExRecord(credExId: string): Promise<CredExRecord> {
  const detail = await adminFetch<{ cred_ex_record?: CredExRecord }>(
    `/issue-credential-2.0/records/${encodeURIComponent(credExId)}`
  )
  if (!detail.cred_ex_record) {
    throw new Error(`cred-ex ${credExId} detail carried no cred_ex_record`)
  }
  return detail.cred_ex_record
}

/**
 * Wait for a credential exchange to reach `state`. Landing on `abandoned` while waiting for
 * anything else fails with the holder's problem report. When the exchange parks at
 * `request-received` (a non-auto-issuing instance), issues explicitly — once.
 */
export async function waitForCredExState(
  credExId: string,
  state: CredExState,
  timeoutMs: number = Timeouts.DIDCOMM_DELIVERY
): Promise<CredExRecord> {
  let lastState: string | undefined
  let nudged = false
  return pollUntil(
    async () => {
      const record = await getCredExRecord(credExId)
      lastState = record.state
      if (record.state === state) return record
      if (record.state === 'abandoned') {
        throw new Error(
          `cred-ex ${credExId} was abandoned while waiting for "${state}"${record.error_msg ? `: ${record.error_msg}` : ''}`
        )
      }
      if (!nudged && record.state === 'request-received' && (state === 'done' || state === 'credential-issued')) {
        nudged = true
        try {
          await adminFetch(`/issue-credential-2.0/records/${encodeURIComponent(credExId)}/issue`, {
            method: 'POST',
            body: { comment: 'e2e explicit issue' },
          })
        } catch (error) {
          // A 400 means the instance's own auto-issue won the race — keep polling.
          if (!(error instanceof ApiError && error.status === 400)) throw error
        }
      }
      return undefined
    },
    {
      timeoutMs,
      description: `cred-ex ${credExId} to reach "${state}"`,
      lastObserved: () => lastState,
    }
  )
}

// --- proof ----------------------------------------------------------------------------------------

/**
 * Request a proof of every schema attribute, restricted to our cred def, with a non-revocation
 * check at request time — so a share also exercises the holder's tails-file path.
 */
export async function sendProofRequest(
  connectionId: string,
  options?: { comment?: string }
): Promise<{ presExId: string }> {
  const credDefId = await resolveCredDefId()
  const record = await adminFetch<PresExRecord>('/present-proof-2.0/send-request', {
    method: 'POST',
    body: {
      connection_id: connectionId,
      comment: options?.comment ?? 'e2e proof request',
      // Per-exchange override for the instance's unknowable auto-verify flag (waiter nudge is the backstop).
      auto_verify: true,
      auto_remove: false,
      presentation_request: {
        indy: {
          name: 'e2e wallet proof',
          version: '1.0',
          requested_attributes: {
            e2e_attributes: {
              names: [...ISSUER_SCHEMA_ATTRIBUTES],
              restrictions: [{ cred_def_id: credDefId }],
            },
          },
          requested_predicates: {},
          non_revoked: { to: Math.floor(Date.now() / 1000) },
        },
      },
    },
  })
  if (!record.pres_ex_id) {
    throw new Error(`send-request returned no pres_ex_id: ${JSON.stringify(record).slice(0, 300)}`)
  }
  return { presExId: record.pres_ex_id }
}

export async function getPresExRecord(presExId: string): Promise<PresExRecord> {
  return adminFetch<PresExRecord>(`/present-proof-2.0/records/${encodeURIComponent(presExId)}`)
}

/**
 * Wait for the presentation to complete and report the agent's cryptographic verdict. `abandoned`
 * (holder declined) fails with the record's error message. When the exchange parks at
 * `presentation-received` (a non-auto-verifying instance), verifies explicitly — once.
 */
export async function waitForPresentationVerified(
  presExId: string,
  timeoutMs: number = Timeouts.DIDCOMM_DELIVERY
): Promise<{ verified: boolean; record: PresExRecord }> {
  let lastState: string | undefined
  let nudged = false
  const record = await pollUntil(
    async () => {
      const current = await getPresExRecord(presExId)
      lastState = current.state
      if (current.state === 'done') return current
      if (current.state === 'abandoned') {
        throw new Error(
          `pres-ex ${presExId} was abandoned (holder declined?)${current.error_msg ? `: ${current.error_msg}` : ''}`
        )
      }
      if (!nudged && current.state === 'presentation-received') {
        nudged = true
        try {
          await adminFetch(`/present-proof-2.0/records/${encodeURIComponent(presExId)}/verify-presentation`, {
            method: 'POST',
          })
        } catch (error) {
          // A 400 means the instance's own auto-verify won the race — keep polling.
          if (!(error instanceof ApiError && error.status === 400)) throw error
        }
      }
      return undefined
    },
    {
      timeoutMs,
      description: `pres-ex ${presExId} to reach "done"`,
      lastObserved: () => lastState,
    }
  )
  return { verified: record.verified === 'true', record }
}

// --- revocation -----------------------------------------------------------------------------------

/**
 * Revoke an issued credential and publish immediately. Per-call `notify: true` sends the revocation
 * notification over the connection regardless of the instance's --notify-revocation default — the
 * wallet only renders its revoked-details fields when that notification arrived.
 */
export async function revokeCredential(options: {
  credExId: string
  connectionId: string
  comment?: string
}): Promise<void> {
  await adminFetch<unknown>('/revocation/revoke', {
    method: 'POST',
    body: {
      cred_ex_id: options.credExId,
      connection_id: options.connectionId,
      publish: true,
      notify: true,
      notify_version: 'v1_0',
      comment: options.comment ?? 'e2e revocation',
    },
  })
}
