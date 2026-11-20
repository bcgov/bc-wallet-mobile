import { DEFAULT_HOST } from './environment.ts'
import type { HelpTopic } from './spec.ts'

export const topics: HelpTopic[] = [
  {
    name: 'environment',
    summary: 'Environment variables that can be used with bcsc-test',
    body: `BCSC_TEST_HOST: the IAS host to send requests to. Takes precedence over the host
saved by \`bcsc-test auth login\` when exactly one host is saved. Defaults to
${DEFAULT_HOST} (dev), the only deployment of the test API today.

BCSC_TEST_TOKEN: a bearer token to use instead of the stored credential. Takes
precedence over \`bcsc-test auth login\`. The token must carry the scope the command
needs: test-idv-accounts for account, card, mobile-app and address commands, and
test-idv-verify for verification commands. Request both scopes to cover everything.

XDG_CONFIG_HOME: where bcsc-test keeps its files, in a bcsc-test directory.
Defaults to ~/.config. hosts.json lists the saved hosts and where each secret
lives, never the secret; tokens.json caches access tokens. Both are readable only
by you.

OP_ACCOUNT: the 1Password account \`op\` reads from, for a --secret-source op
reference in an account other than the default.

The variable named by --secret-env: for --secret-source env, holds the client
secret, or CLIENT_ID:CLIENT_SECRET. It is read each time a token is needed.
`,
  },
  {
    name: 'exit-codes',
    summary: 'Exit codes used by bcsc-test',
    body: `bcsc-test follows the same exit code conventions as gh.

- If a command completes successfully, the exit code will be 0

- If a command fails for any reason, the exit code will be 1

- If a command is running but gets cancelled, the exit code will be 2

- If a command requires authentication, the exit code will be 4

A command that is not implemented yet prints "not implemented" and exits 1.
`,
  },
  {
    name: 'formatting',
    summary: 'Formatting options for JSON output',
    body: `Commands that return data print human-readable text by default. To get JSON
instead, pass --json with a comma-separated list of fields. Each command's help
lists the fields it supports under JSON FIELDS.

  --json fields      Output JSON with the specified fields
  --jq expression    Filter JSON output using a jq expression (requires --json)

--jq runs the jq binary, which must be on your PATH, and prints strings without
quotes (jq -r).

EXAMPLES
  # Create an account and print only its CSN
  $ bcsc-test account create --card-type COMBO --json csn --jq .csn

  # Report granted scopes as JSON
  $ bcsc-test auth status --json hosts
`,
  },
]
