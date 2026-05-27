# Person Credential — IAS issuer never completes the connection (SIT)

**Audience:** IAS / IDIM backend + agent team
**Reporter:** BC Wallet / BCSC v4 mobile team
**Environment:** SIT
**Status:** Blocked on issuer side; all mobile-client causes ruled out (details below)

---

## TL;DR

In the v4 single app we call `POST /credentials/v1/person`, receive a valid out-of-band
invitation, and the wallet sends a `didexchange/1.1/request` to the issuer agent. The issuer
endpoint returns **HTTP 200 with an empty body but never sends back a `didexchange/1.1/response`**.
The connection stays at `request-sent` forever, so no credential offer is ever made.

We need the issuer-side logs for this connection to understand why it accepts the request but
does not respond. Our leading suspicion is that the issuer cannot complete a DID Exchange whose
requester DID is a `did:peer` (we tested both numalgo 2 and numalgo 4), but we can't confirm that
without the agent logs.

---

## Components involved

| Component | URL |
|---|---|
| Credential API | `POST https://idsit.gov.bc.ca/credentials/v1/person` |
| Issuer agent (from invitation `services[].serviceEndpoint`) | `https://idim-sit-agent-dev.apps.silver.devops.gov.bc.ca` |
| Wallet mediator | `https://mediator-test.digitaltrust.gov.bc.ca` |

The mobile wallet is **Credo (credo-ts) v0.6.x**, mediated (it has no public inbound endpoint of
its own; the issuer must deliver its response to the wallet **through the mediator above**).

---

## What the wallet does

1. `POST /credentials/v1/person` (authenticated with the user's bearer token), body:
   ```json
   { "source_os": "iOS", "source_application": "ca.bc.gov.BCWallet" }
   ```
2. Response includes `invitation_url`. Parsing it yields this OOB invitation:
   ```json
   {
     "@type": "https://didcomm.org/out-of-band/1.1/invitation",
     "@id": "16a8ce2e-5ecf-4b17-9086-69c01d01a4d3",
     "label": "Service BC (SIT)",
     "handshake_protocols": ["https://didcomm.org/didexchange/1.1"],
     "services": [{
       "id": "#inline",
       "serviceEndpoint": "https://idim-sit-agent-dev.apps.silver.devops.gov.bc.ca",
       "type": "did-communication",
       "recipientKeys": ["did:key:z6MktELBwCHL5bgRRyBke1HJ4MiMCt6dKu9t4MHLabuS3gW6#..."]
     }],
     "goal_code": "aries.vc.issue"
   }
   ```
   Note the invitation advertises **only** `didexchange/1.1` — there is no `connections/1.0`
   fallback, so the wallet must use DID Exchange.
3. The wallet registers its new recipient key with the mediator (`keylist-update` → `success`).
4. The wallet sends the connection request to the issuer endpoint:
   ```json
   {
     "@type": "https://didcomm.org/didexchange/1.1/request",
     "@id": "c8250498-9df8-44f0-bd50-45f60eb3c7dc",
     "label": "THE KJARTAN",
     "did": "did:peer:2.Vz6Mk...SeyJzIjoiaHR0cHM6Ly9tZWRpYXRvci10ZXN0...",
     "~thread": { "pthid": "9bbec097-534a-498a-a77c-a547483df0ec" }
   }
   ```
   The requester `did` resolves to the wallet's mediator endpoint
   (`https://mediator-test.digitaltrust.gov.bc.ca`) plus recipient/routing keys — i.e. where the
   issuer should deliver its `didexchange/1.1/response`.

## What we observe

- The POST of the connection request to `https://idim-sit-agent-dev...` returns **HTTP 200 with an
  empty body** ("No response received" in our logs — expected, since we're mediated and rely on the
  response coming back via the mediator).
- **No `didexchange/1.1/response` ever arrives** at the wallet (no further inbound messages on the
  thread). The connection record stays at `state: "request-sent"` indefinitely.

## Questions for the issuer/agent team

1. For the connection request above (thread/`pthid` `9bbec097-534a-498a-a77c-a547483df0ec`,
   invitation `@id` `16a8ce2e-5ecf-4b17-9086-69c01d01a4d3`), what do the **issuer agent logs**
   show — was the request received, decrypted, and accepted? Was a response generated and attempted?
2. Does the issuer agent support a DID Exchange request whose **requester DID is a `did:peer`**
   (numalgo 2 or 4)? We confirmed the symptom is identical with both.
3. Is the OOB invitation created with **auto-accept enabled** for the connection request? If not,
   it would explain a permanent `request-sent` (waiting for a manual/auto accept that never happens).
4. When the issuer sends its response, does it successfully **forward it to the wallet's mediator**
   (`https://mediator-test.digitaltrust.gov.bc.ca`) using the requester DID's service endpoint?
   Any forward/delivery errors on that hop?
5. Is `POST /credentials/v1/person` expected to support a wallet **directly receiving** this OOB
   invitation and completing DID Exchange? Or is it only intended for the app-to-app deeplink hand-off
   (BCSC → BC Wallet)? If the issuer requires a legacy `connections/1.0` / `did:sov` connection,
   the invitation should advertise `connections/1.0` in `handshake_protocols`.

## What we already ruled out on the mobile client

- **`source_application`** — tested both `ca.bc.gov.BCWallet` and the build's own bundle id; no change.
- **Requester DID format** — tested `did:peer:2` and `did:peer:4` (verified the request DID actually
  changed after a cold start); identical hang both ways.
- **Invitation receipt/parsing** — the fully parsed invitation (with `goal_code`, `services`,
  `recipientKeys`) appears in our logs, so the URL is resolved and parsed correctly.
- **Mediator / message pickup** — scanning an unrelated credential QR and receiving that credential
  works end-to-end on the same build, mediator, and agent, so inbound delivery and the connection→
  offer handling are healthy. The failure is specific to this issuer not responding.

## Context: the path that currently works

The previous BC Wallet person-credential flow does **not** receive this `/credentials/v1/person`
OOB invitation directly. It connects to a **static IAS agent via a legacy `connections/1.0`
invitation** (yielding a legacy `did:sov` connection DID), runs a device-attestation proof
exchange, then triggers issuance via web-portal auth or an app-to-app deeplink. That difference
(legacy connection vs. OOB DID Exchange with `did:peer`) is the basis for question 2/5 above.
