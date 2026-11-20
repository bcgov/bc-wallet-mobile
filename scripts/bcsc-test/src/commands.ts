import { logout, switchClient, token } from './auth.ts'
import { login } from './login.ts'
import type { ArgSpec, FlagSpec, GroupSpec } from './spec.ts'
import { status, STATUS_JSON_FIELDS } from './status.ts'

const usercode: ArgSpec = {
  name: 'usercode',
  description: 'The device usercode shown in the app, e.g. NCNF-ZNTB. Case, spaces and hyphens are ignored.',
}

const hostname: FlagSpec = {
  name: 'hostname',
  short: 'h',
  value: 'string',
  description: 'The IAS host to use (default: $BCSC_TEST_HOST, the only saved host, then iddev.gov.bc.ca)',
}

const user: FlagSpec = { name: 'user', short: 'u', value: 'string', description: 'The client ID to act on' }
const dryRun: FlagSpec = { name: 'dry-run', description: 'Print the request without sending it' }
const yes: FlagSpec = { name: 'yes', short: 'y', description: 'Skip the confirmation prompt' }
const json: FlagSpec = { name: 'json', value: 'fields', description: 'Output JSON with the specified fields' }
const jq: FlagSpec = { name: 'jq', value: 'expression', description: 'Filter JSON output using a jq expression' }

export const groups: GroupSpec[] = [
  {
    name: 'auth',
    summary: 'Authenticate bcsc-test with the IAS test API',
    description: `Authenticate bcsc-test with the IAS test API.

A host is an IAS environment and an account is a client ID. Credentials are kept
in the OS keychain, a 1Password reference or an environment variable; the config
file never holds the secret.

Tokens come from https://<host>/oauth2/token using a client credentials grant
with HTTP Basic client authentication (client_secret_basic). IAS has not yet
confirmed that client authentication method for the test clients. A token lasts
about an hour; bcsc-test caches it and refreshes it when it is close to expiring.`,
    commands: [
      {
        name: 'login',
        summary: 'Log in to an IAS host with a client credential',
        description: `Log in to an IAS host with a client credential.

The credential is CLIENT_ID:CLIENT_SECRET, as with curl -u. On a terminal you are
prompted for the client ID and then the secret; otherwise pass the credential on
standard input with --with-secret. It is checked by fetching a token, and only
then is the host saved.

The secret stays where --secret-source says: the OS keychain (default, macOS
only), a 1Password reference read with \`op read\`, or an environment variable.
For op and env, the value may be CLIENT_ID:CLIENT_SECRET; a bare secret asks for
the client ID on a terminal. A value containing a colon is always read as
CLIENT_ID:CLIENT_SECRET. Clients that use private_key_jwt are not supported yet.`,
        args: [],
        flags: [
          hostname,
          {
            name: 'secret-source',
            value: 'string',
            description: 'Where the secret lives: {keychain|op|env} (default "keychain")',
          },
          { name: 'secret-ref', value: 'string', description: 'The 1Password reference, for --secret-source op' },
          { name: 'secret-env', value: 'string', description: 'The variable name, for --secret-source env' },
          {
            name: 'key-file',
            value: 'string',
            description: 'A private key for private_key_jwt clients (not supported yet; exits with an explanation)',
          },
          { name: 'with-secret', description: 'Read CLIENT_ID:CLIENT_SECRET from standard input' },
        ],
        handler: login,
        examples: [
          { comment: 'Log in interactively and keep the secret in the OS keychain', command: 'bcsc-test auth login' },
          {
            comment: 'Read the credential from standard input',
            command: 'echo "$CLIENT_ID:$CLIENT_SECRET" | bcsc-test auth login --with-secret',
          },
          {
            comment: 'Read CLIENT_ID:CLIENT_SECRET from 1Password each time a token is needed',
            command: 'bcsc-test auth login --secret-source op --secret-ref "op://Private/BCSC test client/credential"',
          },
          {
            comment: 'Read CLIENT_ID:CLIENT_SECRET from an environment variable',
            command: 'bcsc-test auth login --secret-source env --secret-env BCSC_TEST_CLIENT',
          },
        ],
      },
      {
        name: 'status',
        summary: 'Display the client, scopes and token expiry for each host',
        description: `Display the client, scopes and token expiry for each known host.

Fetches a token for each host's active client and reports the granted scopes, any
missing scopes, and when the token expires. Other clients are listed without a
check. Run this first when a command fails with an authentication error.`,
        args: [],
        flags: [hostname, json, jq],
        jsonFields: STATUS_JSON_FIELDS,
        handler: status,
        examples: [
          { comment: 'Check every known host', command: 'bcsc-test auth status' },
          { comment: 'Check dev only', command: 'bcsc-test auth status --hostname iddev.gov.bc.ca' },
          {
            comment: 'List the missing scopes of every client',
            command: "bcsc-test auth status --json hosts --jq '.hosts[][].missingScopes'",
          },
        ],
      },
      {
        name: 'token',
        summary: 'Print the bearer token bcsc-test uses for a host',
        description: `Print the bearer token bcsc-test uses for a host.

Useful for raw curl calls. The token carries the scopes the client was granted
and lasts about an hour. BCSC_TEST_TOKEN, when set, is printed as is.`,
        args: [],
        flags: [hostname],
        handler: token,
        examples: [
          {
            comment: 'Call the API with curl',
            command: 'curl -H "Authorization: Bearer $(bcsc-test auth token)" https://iddev.gov.bc.ca/test/idv/v1/...',
          },
        ],
      },
      {
        name: 'switch',
        summary: 'Switch the active client for a host',
        description: `Switch the active client for a host.

With two clients saved, switches to the other one. Otherwise name the client
with --user.`,
        args: [],
        flags: [hostname, user],
        handler: switchClient,
        examples: [
          { comment: 'Switch to another client on dev', command: 'bcsc-test auth switch --user my.other.client' },
        ],
      },
      {
        name: 'logout',
        summary: 'Remove a client from a host',
        description: `Remove a client from a host.

Deletes the saved client, its cached token and its keychain entry. A 1Password
item or environment variable is left alone. Without --user, removes the only
client; with several, name one.`,
        args: [],
        flags: [hostname, user],
        handler: logout,
        examples: [
          { comment: 'Log out of dev', command: 'bcsc-test auth logout --hostname iddev.gov.bc.ca' },
          { comment: 'Remove one of several clients', command: 'bcsc-test auth logout --user my.client' },
        ],
      },
    ],
  },
  {
    name: 'verification',
    summary: 'Approve or decline pending verification requests',
    description: `Approve or decline pending verification requests.

Needs the test-idv-verify scope. Only the counter channel is implemented on the
server; live-video and send-video are rejected without writing anything.`,
    commands: [
      {
        name: 'approve',
        summary: 'Approve a pending verification request',
        description: `Approve a pending verification request.

The approval is recorded as a counter visit: the registration type becomes
Counter, whatever channel the device used. Bear this in mind when testing logic
that branches on registration type or reads usage history.

Succeeds only when the usercode belongs to an unexpired registration that is
waiting for a decision. Asks for confirmation before writing.`,
        args: [usercode],
        flags: [
          {
            name: 'channel',
            value: 'string',
            description: 'The verification channel: {counter|live-video|send-video} (default "counter")',
          },
          yes,
          dryRun,
        ],
        examples: [
          { comment: 'Approve a device', command: 'bcsc-test verification approve NCNF-ZNTB' },
          {
            comment: 'Approve without the confirmation prompt',
            command: 'bcsc-test verification approve NCNF-ZNTB --yes',
          },
        ],
      },
      {
        name: 'decline',
        summary: 'Decline a pending verification request',
        description: `Decline a pending verification request.

Both the user message and the internal comment are required.
Succeeds only when the usercode belongs to an unexpired registration that is
waiting for a decision.`,
        args: [usercode],
        flags: [
          { name: 'user-message', value: 'string', description: 'The message for the user (required)' },
          { name: 'internal-comment', value: 'string', description: 'An internal comment on the decision (required)' },
          dryRun,
        ],
        examples: [
          {
            comment: 'Decline a device',
            command:
              'bcsc-test verification decline NCNF-ZNTB --user-message "Photo is blurry" --internal-comment "Test decline"',
          },
        ],
      },
    ],
  },
  {
    name: 'mobile-app',
    summary: 'Change the expiry or status of a mobile app registration',
    description: `Change the expiry or status of a mobile app registration.

Needs the test-idv-accounts scope.`,
    commands: [
      {
        name: 'set-expiry',
        summary: 'Set when a mobile app registration expires',
        description: `Set when a mobile app registration expires.

The date is ISO-8601 and must include a UTC offset. Past dates are allowed and
are how you force the expired state.`,
        args: [usercode, { name: 'iso-date', description: 'The new expiry, e.g. 2026-12-01T00:00:00-08:00' }],
        flags: [dryRun],
        examples: [
          {
            comment: 'Extend a registration',
            command: 'bcsc-test mobile-app set-expiry NCNF-ZNTB 2026-12-01T00:00:00-08:00',
          },
          {
            comment: 'Force the expired state with a past date',
            command: 'bcsc-test mobile-app set-expiry NCNF-ZNTB 2026-11-01T00:00:00-08:00',
          },
        ],
      },
      {
        name: 'set-status',
        summary: 'Change the status of a mobile app registration',
        description: 'Change the status of a mobile app registration.',
        args: [usercode],
        flags: [{ name: 'reason', value: 'string', description: 'Why the status changed (required)' }, dryRun],
        examples: [
          { comment: 'Change the status', command: 'bcsc-test mobile-app set-status NCNF-ZNTB --reason "Test"' },
        ],
      },
    ],
  },
  {
    name: 'card',
    summary: 'Suspend, unsuspend, cancel or renew a card',
    description: `Suspend, unsuspend, cancel or renew the card behind a device.

Needs the test-idv-accounts scope.`,
    commands: [
      {
        name: 'suspend',
        summary: 'Suspend a card',
        description: 'Suspend the card behind a device.',
        args: [usercode],
        flags: [dryRun],
        examples: [{ comment: 'Suspend a card', command: 'bcsc-test card suspend NCNF-ZNTB' }],
      },
      {
        name: 'unsuspend',
        summary: 'Lift a card suspension',
        description: 'Lift the suspension on the card behind a device.',
        args: [usercode],
        flags: [dryRun],
        examples: [{ comment: 'Unsuspend a card', command: 'bcsc-test card unsuspend NCNF-ZNTB' }],
      },
      {
        name: 'cancel',
        summary: 'Cancel a card',
        description: 'Cancel the card behind a device.',
        args: [usercode],
        flags: [yes, dryRun],
        examples: [{ comment: 'Cancel a card', command: 'bcsc-test card cancel NCNF-ZNTB' }],
      },
      {
        name: 'renew',
        summary: 'Renew or replace a card',
        description: `Renew or replace the card behind a device.

Passing the card's current expiry replaces the card; a later date renews it.`,
        args: [usercode],
        flags: [{ name: 'expiry', value: 'date', description: 'The card expiry date (required)' }, dryRun],
        examples: [{ comment: 'Renew a card', command: 'bcsc-test card renew NCNF-ZNTB --expiry 2031-12-01' }],
      },
    ],
  },
  {
    name: 'account',
    summary: 'Create test accounts',
    description: `Create test accounts.

Needs the test-idv-accounts scope.`,
    commands: [
      {
        name: 'create',
        summary: 'Create a test account',
        description: `Create a test account and print its CSN, birth date and transaction ID.

Identity attributes such as name and address are generated at random.`,
        args: [],
        flags: [
          {
            name: 'card-type',
            value: 'string',
            description: 'The card type: {COMBO|STANDALONE|NONPHOTO|NA} (required)',
          },
          dryRun,
          json,
          jq,
        ],
        jsonFields: ['csn', 'birthDate', 'transactionId'],
        examples: [
          { comment: 'Create a combo card account', command: 'bcsc-test account create --card-type COMBO' },
          { comment: 'Print only the CSN', command: 'bcsc-test account create --card-type COMBO --json csn --jq .csn' },
        ],
      },
    ],
  },
  {
    name: 'address',
    summary: 'Update the address on a card',
    description: `Update the address on a card.

Needs the test-idv-accounts scope. Keyed by CSN, not usercode.`,
    commands: [
      {
        name: 'update',
        summary: 'Update the address on a card',
        description: `Update the address on a card.

Takes a CSN, not a usercode. City and province must match what the address line
parses to; they are sent uppercase.`,
        args: [{ name: 'csn', description: 'The card serial number, e.g. from `bcsc-test account create`' }],
        flags: [
          { name: 'line1', value: 'string', description: 'The first address line (required)' },
          { name: 'city', value: 'string', description: 'The city (required)' },
          { name: 'province', value: 'string', description: 'The province code, e.g. BC (required)' },
          { name: 'postal-code', value: 'string', description: 'The postal code (required)' },
          dryRun,
        ],
        examples: [
          {
            comment: 'Move a card to Victoria',
            command:
              'bcsc-test address update "$CSN" --line1 "1 MAIN ST VICTORIA BC" --city VICTORIA --province BC --postal-code V8W1A1',
          },
        ],
      },
    ],
  },
]
