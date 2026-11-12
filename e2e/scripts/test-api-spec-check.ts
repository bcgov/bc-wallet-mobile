/**
 * Compare the committed IAS E2E Test API contract (src/api/ias-test-api.yaml) with the spec each host
 * publishes: `yarn test-api:spec-check`. Public endpoints, no credentials.
 *
 * The types in src/api/ias-test.ts are written by hand from that file, which is DEV's spec. DEV
 * differing means the contract moved: refresh the file and review the types. Another host differing
 * means its build is not DEV's (not redeployed yet). Either way this warns and exits 0: a host on
 * another build is a state to know about, not a failure.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describeError } from '../src/api/http.js'

const SPEC_PATH = '/test/openapi/bcsc-mobile-e2e-test-api.yaml'
const COMMITTED_SPEC = resolve(dirname(fileURLToPath(import.meta.url)), '../src/api/ias-test-api.yaml')
/** The host the committed file is taken from goes first. */
const HOSTS = ['iddev.gov.bc.ca', 'idsit.gov.bc.ca'] as const
const SOURCE_HOST = HOSTS[0]
const FETCH_BUDGET_MS = 20_000

const log = (message: string): void => console.log(`[test-api-spec-check] ${message}`)
const warn = (message: string): void => {
  console.warn(`[test-api-spec-check] WARNING: ${message}`)
  if (process.env.GITHUB_ACTIONS) console.log(`::warning::Test API spec: ${message}`)
}

const lines = (spec: string): string[] => spec.replaceAll('\r\n', '\n').trimEnd().split('\n')

/** The route keys under `paths:`, which sit at a two-space indent in this spec. */
const routes = (spec: string): string[] => lines(spec).flatMap((line) => /^ {2}(\/\S*):\s*$/.exec(line)?.[1] ?? [])

const missingFrom = (items: string[], other: string[]): string[] => {
  const known = new Set(other)
  return items.filter((item) => !known.has(item))
}

async function fetchSpec(host: string): Promise<string> {
  const response = await fetch(`https://${host}${SPEC_PATH}`, { signal: AbortSignal.timeout(FETCH_BUDGET_MS) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
}

function compare(host: string, committed: string, fetched: PromiseSettledResult<string>): void {
  if (fetched.status === 'rejected') {
    warn(`${host}: could not read the published spec (${describeError(fetched.reason)})`)
    return
  }
  const published = fetched.value

  const [ours, theirs] = [lines(committed), lines(published)]
  if (ours.join('\n') === theirs.join('\n')) {
    log(`${host}: serves the committed spec`)
    return
  }

  const meaning =
    host === SOURCE_HOST
      ? 'the contract moved: refresh src/api/ias-test-api.yaml from it and review the types in src/api/ias-test.ts'
      : `its build is not the one ${SOURCE_HOST} serves`
  warn(`${host}: differs from the committed spec, so ${meaning}`)
  log(
    `  ${missingFrom(theirs, ours).length} line(s) only on ${host}, ` +
      `${missingFrom(ours, theirs).length} only in the committed spec`
  )
  const [ourRoutes, theirRoutes] = [routes(committed), routes(published)]
  const onlyTheirs = missingFrom(theirRoutes, ourRoutes)
  const onlyOurs = missingFrom(ourRoutes, theirRoutes)
  if (onlyTheirs.length > 0) log(`  routes only on ${host}: ${onlyTheirs.join(', ')}`)
  if (onlyOurs.length > 0) log(`  routes only in the committed spec: ${onlyOurs.join(', ')}`)
}

const committed = readFileSync(COMMITTED_SPEC, 'utf8')
// Every host is read at once; the report keeps the order of HOSTS.
const fetches = await Promise.allSettled(HOSTS.map((host) => fetchSpec(host)))
for (const [index, host] of HOSTS.entries()) {
  compare(host, committed, fetches[index])
}
