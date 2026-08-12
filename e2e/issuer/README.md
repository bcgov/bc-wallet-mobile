# E2E issuer/verifier

The wallet credential journey (`test/bcsc/main/wallet.journey.ts`) needs a DIDComm counterparty the
test runner controls: an agent that mints connection invitations, sends credential offers and proof
requests, and revokes credentials — driven over its admin REST API by `src/api/issuer.ts`.

That counterparty is a **tenant on BC Gov's DEV Traction** (multi-tenant ACA-Py behind a tenant
proxy — <https://github.com/bcgov/traction>), named `e2e-issuer`. Its write ledger is
**bcovrin-test**, one of the four networks pinned in the app's
`app/src/configs/ledgers/indy/ledgers.json`, and the instance supplies the endorser and tails
server. Both the admin plane (tenant proxy) and the DIDComm endpoint are public HTTPS, so **local
runs, real devices, and Sauce devices all use the same issuer** — nothing to run, no tunnels.

Traffic shape:

- runner → **tenant proxy** (`ISSUER_BASE_URL`): bearer JWT from
  `POST /multitenancy/tenant/{tenant_id}/token` (the client mints and caches it); invitations,
  offers, proofs, revocation, polling
- device → Traction's **DIDComm endpoint**: the wallet POSTs its replies to the https URL baked
  into every invitation
- issuer → wallet: via the app's mediator (public HTTPS/WSS) — no inbound requirement on the
  wallet side

## Setup

1. Put the tenant credentials (Traction dev tenant UI, or a teammate) into `e2e/.env.e2e`:

   ```sh
   ISSUER_TENANT_ID=<tenant id>
   ISSUER_API_KEY=<api key>
   # ISSUER_BASE_URL only when not using the dev tenant proxy default (see src/api/issuer.ts)
   ```

2. Provision (idempotent — safe to re-run any time):

   ```sh
   yarn issuer:provision   # ensure schema + revocable cred def + active revocation registry
   yarn issuer:smoke       # optional: exercise the API client without a device
   ```

Only the first provision writes to the ledger; afterwards it is a fast lookup that re-emits the
ids. They land in `issuer/.issuer-env` (ids only, no secrets); explicit `ISSUER_SCHEMA_ID` /
`ISSUER_CRED_DEF_ID` env vars override it.

## CI

The credentials live in the `bcsc-mobile-app-cd` 1Password vault — item `traction`, `username` =
tenant id, `credential` = API key — loaded in-workflow by `1password/load-secrets-action` with the
`OP_SERVICE_ACCOUNT_TOKEN` GitHub secret as the only bootstrap. The e2e workflow runs the same
provisioning script as an idempotent preflight for the `main`/`regression` suites — it validates
the tenant before any Sauce session is paid for and feeds the resolved `ISSUER_*` env to the test
step, so CI never hardcodes schema/cred-def ids.

## The endorser model (why provisioning polls)

The tenant is an endorser *author*: `POST /schemas` and `POST /credential-definitions` return a
pending transaction, and the dev endorser auto-signs and writes within seconds. Provisioning treats
the created-lists as the truth and polls them; on a timeout it dumps recent `/transactions` states —
`request_sent` stuck means the endorser is not signing, `transaction_acked` without a created-list
entry means ledger write/read lag.

## Recovery notes

- **BCovrin test resets** (it happens): the tenant's DID/schema/cred def vanish from the ledger.
  Re-register the public DID in the Traction tenant UI, then `yarn issuer:provision` — a cred-def
  id collision from a previous generation is auto-retagged; consumers resolve ids from provision
  output, never the tag.
- **New tenant**: update the two env vars/secrets and provision — everything else follows.
- Traction tenants keep the legacy `askar` admin endpoints (`/schemas`, `/credential-definitions`,
  `/revocation/*`) that `src/api/issuer.ts` speaks. If the instance ever migrates tenants to
  `askar-anoncreds` (`/anoncreds/*`), the client and provisioning must move together.
- Instance flags (`/status/config`) are proxy-blocked, so the client never relies on them: each
  exchange sets its own `auto_*` overrides, and the waiters nudge `/issue` /
  `/verify-presentation` if an exchange parks.
- Concurrency: parallel CI jobs share the tenant safely — connections/exchanges are per-record,
  and the revocation registry (size 1000, auto-rotated by ACA-Py) has ample headroom.
