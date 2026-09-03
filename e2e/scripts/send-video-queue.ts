/**
 * Drain the SIT send-video review queue from the command line — locally and from CI:
 *
 *   yarn queue:drain [--scope all|e2e] [--max N] [--reason text] [--dry-run]
 *
 * `--dry-run` logs in and reports which queues hold work, claiming nothing. Needs SM_USER/SM_PASSWORD (e2e/.env.e2e locally, 1Password in CI) and an egress IP the IDcheck
 * portal allowlists. Prints what it did as markdown, appends it to $GITHUB_STEP_SUMMARY when set,
 * and exits non-zero only when the drain itself failed (login, network) — stopping with work still
 * queued is a warning, not a failure.
 */
import { appendFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { type DrainScope, drainSendVideoQueue, renderDrainSummary, resolveDrainScope } from '../src/helpers/approval.js'

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env.e2e') })

/** A manual drain may face a week's worth of queue; the in-journey budget is far tighter. */
const CLI_TIMEOUT_MS = 10 * 60_000

interface Args {
  scope?: DrainScope
  maxClaims?: number
  reason?: string
  dryRun?: boolean
}

function usage(message: string): never {
  console.error(`[queue] ${message}\nusage: yarn queue:drain [--scope all|e2e] [--max N] [--reason text] [--dry-run]`)
  process.exit(2)
}

function parseArgs(argv: string[]): Args {
  const [command, ...rest] = argv
  if (command !== 'drain') usage(`unknown command "${command ?? ''}" — only "drain" exists`)
  const args: Args = {}
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i]
    const value = rest[i + 1]
    switch (flag) {
      case '--scope':
        if (value !== 'all' && value !== 'e2e') usage(`--scope wants all|e2e, got "${value ?? ''}"`)
        args.scope = value
        i++
        break
      case '--max': {
        const max = Number(value)
        if (!Number.isInteger(max) || max < 1) usage(`--max wants a positive integer, got "${value ?? ''}"`)
        args.maxClaims = max
        i++
        break
      }
      case '--reason':
        if (!value) usage('--reason wants text')
        args.reason = value
        i++
        break
      case '--dry-run':
        args.dryRun = true
        break
      default:
        usage(`unknown flag "${flag}"`)
    }
  }
  return args
}

function appendStepSummary(markdown: string): void {
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n\n`)
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const scope = resolveDrainScope(args.scope)
  try {
    const result = await drainSendVideoQueue({
      scope,
      maxClaims: args.maxClaims,
      reason: args.reason,
      dryRun: args.dryRun,
      timeoutMs: CLI_TIMEOUT_MS,
    })
    const summary = renderDrainSummary(result, scope)
    console.log(`\n${summary}\n`)
    appendStepSummary(summary)
    if (result.stoppedReason) {
      console.log(`::warning::send-video queue drain stopped early: ${result.stoppedReason}`)
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[queue] ${message}`)
    appendStepSummary(`### Send-video review queue drain (scope: ${scope})\n\n❌ ${message}`)
    process.exit(1)
  }
}

await main()
