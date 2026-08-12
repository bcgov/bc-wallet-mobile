/**
 * Ensure the e2e issuer (a Traction dev tenant — see ../issuer/README.md) is ready to issue:
 * posted public DID, schema, revocable cred def with an active revocation registry.
 *
 * Every step is an idempotent "ensure", so the same script serves two jobs:
 *   - local: one-time bootstrap of the tenant (the only run that writes to the ledger)
 *   - CI:    fast preflight — validates tenant/creds reachability and resolves ids
 *
 * The tenant is an endorser AUTHOR: schema/cred-def POSTs return a pending transaction, not an id,
 * and the dev endorser auto-signs within seconds — so "created" is confirmed by polling the
 * created-lists, with /transactions states dumped on timeout.
 *
 * Progress logs go to STDERR; the only STDOUT output is dotenv-style `KEY=VALUE` lines, so CI can
 * append them directly: `./node_modules/.bin/tsx scripts/issuer-provision.ts >> "$GITHUB_ENV"`.
 * The id lines (never the tenant creds) are also written to e2e/issuer/.issuer-env for
 * src/api/issuer.ts to pick up locally.
 */
import dotenv from 'dotenv'
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  adminFetch,
  describeError,
  getIssuerConfig,
  getTenantInfo,
  ISSUER_SCHEMA_ATTRIBUTES,
  pollUntil,
  type IssuerConfig,
} from '../src/api/index.js'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
// Standalone script: load e2e/.env.e2e ourselves (wdio does this for journeys); real env always wins.
dotenv.config({ path: resolve(SCRIPT_DIR, '../.env.e2e') })

/** The one schema the wallet journey issues against. Stable name+version+DID ⇒ stable schema id. */
const SCHEMA_NAME = 'e2e_wallet_test'
const SCHEMA_VERSION = '1.0'
const CREDDEF_TAG = process.env.ISSUER_CREDDEF_TAG ?? 'e2e'
/** Small enough that tails generation stays quick, big enough that a shared issuer never fills it
 *  mid-run (ACA-Py rotates to a fresh registry when one fills). */
const REVOCATION_REGISTRY_SIZE = 1000

const ENDORSER_WRITE_BUDGET_MS = 120_000
const REV_REG_BUDGET_MS = 180_000

const OUTPUT_FILE = resolve(SCRIPT_DIR, '../issuer/.issuer-env')

const log = (message: string): void => console.error(`[issuer-provision] ${message}`)

// --- diagnostics ------------------------------------------------------------------------------------

/** Best-effort: `request_sent` stuck = the endorser is not signing; `transaction_acked` without a
 *  created-list entry = ledger write/read lag. */
async function dumpTransactionDiagnostics(): Promise<void> {
  try {
    const found = await adminFetch<{ results?: { state?: string; created_at?: string; updated_at?: string }[] }>(
      '/transactions'
    )
    const recent = (found.results ?? [])
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .slice(0, 5)
    log('recent endorser transactions:')
    for (const txn of recent) log(`  state=${txn.state} created=${txn.created_at} updated=${txn.updated_at}`)
  } catch (error) {
    log(`(transaction diagnostics unavailable: ${error instanceof Error ? error.message : error})`)
  }
}

async function withTransactionDiagnostics<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    await dumpTransactionDiagnostics()
    throw error
  }
}

// --- ensure steps -----------------------------------------------------------------------------------

async function assertTenant(): Promise<void> {
  const tenant = await getTenantInfo()
  log(`tenant "${tenant.tenantName}" writes to ledger ${tenant.ledgerId}`)
  if (tenant.ledgerId !== 'bcovrin-test') {
    log(
      `WARNING: write ledger is not bcovrin-test — the app only resolves the ledgers pinned in ` +
        `app/src/configs/ledgers/indy/ledgers.json`
    )
  }
}

async function assertPublicDid(): Promise<string> {
  const current = await adminFetch<{ result?: { did?: string; posture?: string } }>('/wallet/did/public')
  const did = current.result?.did
  if (!did) {
    throw new Error(
      'tenant has no public DID — finish issuer setup in the Traction tenant UI (endorser connection ' +
        '+ public DID registration); provisioning cannot do that step'
    )
  }
  log(`public DID: ${did} (${current.result?.posture})`)
  return did
}

async function ensureSchema(issuerDid: string): Promise<string> {
  const query = `schema_name=${SCHEMA_NAME}&schema_version=${SCHEMA_VERSION}&schema_issuer_did=${issuerDid}`
  const findSchemaId = async (): Promise<string | undefined> => {
    const found = await adminFetch<{ schema_ids?: string[] }>(`/schemas/created?${query}`)
    return found.schema_ids?.[0]
  }

  let schemaId = await findSchemaId()
  if (!schemaId) {
    log(`publishing schema ${SCHEMA_NAME} ${SCHEMA_VERSION} ...`)
    await adminFetch('/schemas', {
      method: 'POST',
      body: { schema_name: SCHEMA_NAME, schema_version: SCHEMA_VERSION, attributes: [...ISSUER_SCHEMA_ATTRIBUTES] },
    })
    schemaId = await withTransactionDiagnostics(() =>
      pollUntil(findSchemaId, {
        timeoutMs: ENDORSER_WRITE_BUDGET_MS,
        description: `schema ${SCHEMA_NAME} ${SCHEMA_VERSION} to appear in /schemas/created (endorser write)`,
      })
    )
  }

  // The wallet record (and even the POST's returned id) can precede the LEDGER write while the
  // endorser is in flight — and the cred-def POST resolves the schema from the ledger. Confirm it
  // there, asserting the attributes while at it (published schemas are immutable — drift means
  // bumping SCHEMA_VERSION, not editing).
  const onLedger = await withTransactionDiagnostics(() =>
    pollUntil(
      async () => {
        const found = await adminFetch<{ schema?: { attrNames?: string[] } } | undefined>(
          `/schemas/${encodeURIComponent(schemaId as string)}`,
          { allowStatuses: [404] }
        )
        return found?.schema?.attrNames ? found.schema : undefined
      },
      { timeoutMs: ENDORSER_WRITE_BUDGET_MS, description: `schema ${schemaId} to be resolvable from the ledger` }
    )
  )
  const actual = onLedger.attrNames ?? []
  const wanted = [...ISSUER_SCHEMA_ATTRIBUTES]
  if (actual.length !== wanted.length || !wanted.every((attribute) => actual.includes(attribute))) {
    throw new Error(
      `schema ${schemaId} has attributes [${actual.join(', ')}] but the client expects ` +
        `[${wanted.join(', ')}] — bump SCHEMA_VERSION to publish a new schema`
    )
  }
  log(`schema on ledger: ${schemaId}`)
  return schemaId
}

/** Returns the id on a direct write, undefined when the write went to the endorser. */
async function publishCredDef(schemaId: string, tag: string): Promise<string | undefined> {
  log(`publishing revocable cred def (tag ${tag}, registry size ${REVOCATION_REGISTRY_SIZE}) ...`)
  const created = await adminFetch<{
    credential_definition_id?: string
    sent?: { credential_definition_id?: string }
  }>('/credential-definitions', {
    method: 'POST',
    body: { schema_id: schemaId, tag, support_revocation: true, revocation_registry_size: REVOCATION_REGISTRY_SIZE },
  })
  return created.credential_definition_id ?? created.sent?.credential_definition_id
}

async function ensureCredDef(schemaId: string): Promise<string> {
  const listCredDefIds = async (): Promise<string[]> => {
    const found = await adminFetch<{ credential_definition_ids?: string[] }>(
      `/credential-definitions/created?schema_id=${encodeURIComponent(schemaId)}`
    )
    return found.credential_definition_ids ?? []
  }

  // The created-list is WALLET-scoped: anything it returns has usable private keys. Prefer the
  // configured tag, else any cred def on our schema (an earlier generation's suffixed tag).
  const ids = await listCredDefIds()
  const existing = ids.find((id) => id.endsWith(`:${CREDDEF_TAG}`)) ?? ids[0]
  if (existing) {
    log(`cred def exists: ${existing}`)
    return existing
  }

  let tag = CREDDEF_TAG
  let direct: string | undefined
  try {
    direct = await publishCredDef(schemaId, tag)
  } catch (error) {
    // Same schema seq + same tag = same cred-def id — if the ledger entry outlived the wallet keys,
    // ACA-Py refuses to recreate it. A fresh tag mints a fresh id; consumers resolve ids from our
    // output, never the tag, so this is invisible to tests.
    if (!(error instanceof Error) || !/on ledger .* but not in wallet/.test(error.message)) throw error
    tag = `${CREDDEF_TAG}-${Date.now().toString(36)}`
    log(`cred def id collides with a previous wallet generation — retagging as ${tag}`)
    direct = await publishCredDef(schemaId, tag)
  }
  if (direct) {
    log(`cred def published: ${direct}`)
    return direct
  }
  // Endorser path: poll for the tag we just published.
  const credDefId = await withTransactionDiagnostics(() =>
    pollUntil(async () => (await listCredDefIds()).find((id) => id.endsWith(`:${tag}`)), {
      timeoutMs: ENDORSER_WRITE_BUDGET_MS,
      description: `cred def tag ${tag} to appear in /credential-definitions/created (endorser write)`,
    })
  )
  log(`cred def published: ${credDefId}`)
  return credDefId
}

/** The registry (endorser txns + tails upload) is created asynchronously after the cred def —
 *  issuance fails until one is active, so provisioning is not "done" before this resolves. */
async function waitForActiveRevocationRegistry(credDefId: string): Promise<void> {
  log('waiting for an active revocation registry (endorser txns + tails upload) ...')
  const registry = await withTransactionDiagnostics(() =>
    pollUntil(
      async () => {
        const found = await adminFetch<{ result?: { revoc_reg_id?: string } } | undefined>(
          `/revocation/active-registry/${encodeURIComponent(credDefId)}`,
          { allowStatuses: [404] }
        )
        return found?.result
      },
      { timeoutMs: REV_REG_BUDGET_MS, description: `an active revocation registry for ${credDefId}` }
    )
  )
  log(`active revocation registry: ${registry.revoc_reg_id}`)
}

// --- main -------------------------------------------------------------------------------------------

function emit(config: IssuerConfig, did: string, schemaId: string, credDefId: string): void {
  const idLines = [`ISSUER_DID=${did}`, `ISSUER_SCHEMA_ID=${schemaId}`, `ISSUER_CRED_DEF_ID=${credDefId}`]
  writeFileSync(OUTPUT_FILE, `# generated by issuer-provision — ids only, no secrets\n${idLines.join('\n')}\n`)
  log(`wrote ${OUTPUT_FILE}`)
  // Redirected stdout (CI: >> $GITHUB_ENV) carries everything the test step needs, creds included.
  // On a TTY the cred lines stay off the terminal — a local run already has them in .env.e2e.
  const credLines = process.stdout.isTTY
    ? []
    : [`ISSUER_TENANT_ID=${config.tenantId}`, `ISSUER_API_KEY=${config.apiKey}`]
  console.log([`ISSUER_BASE_URL=${config.baseUrl}`, ...credLines, ...idLines].join('\n'))
}

async function main(): Promise<void> {
  const config = getIssuerConfig()
  log(`tenant proxy: ${config.baseUrl}`)
  await assertTenant()
  const did = await assertPublicDid()
  const schemaId = await ensureSchema(did)
  const credDefId = await ensureCredDef(schemaId)
  await waitForActiveRevocationRegistry(credDefId)
  emit(config, did, schemaId, credDefId)
}

try {
  await main()
} catch (error) {
  console.error(`[issuer-provision] FAILED: ${describeError(error)}`)
  process.exit(1)
}
