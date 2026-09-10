/**
 * A file-backed circuit breaker for the IDCheck Entra sign-in, so a broken config or a risk-flagged
 * account fails fast instead of hammering a shared account into Microsoft's bot-detection lockout.
 *
 * Semantics mirror the account-protection note (docs in ../.notes): only genuine Entra verdicts count
 * — a rejected credential, a rejected code, a risk page — never our own timeouts, aborts or network
 * faults, so an outage cannot latch the account out of the next healthy run. The ledger is a small
 * file shared across processes (each wdio worker is its own process): one line per verdict, appended
 * rather than rewritten so two workers rejected at once cannot lose each other's count; a healthy
 * sign-in, silent SSO included, removes it.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'

/**
 * @param {string} stateDir - Directory the ledger lives in (must be writable; the caller ensures it).
 * @param {{ maxFailures?: number }} [options]
 */
export function createEntraAuthGuard(stateDir, { maxFailures = 3 } = {}) {
  const ledgerPath = path.join(stateDir, 'auth-guard.log')

  /** The recorded verdicts, oldest first, as "<ISO time> <reason>" lines. An absent ledger reads as none. */
  function readLedger() {
    try {
      return readFileSync(ledgerPath, 'utf8').split('\n').filter(Boolean)
    } catch {
      return []
    }
  }

  return {
    /** Clears the ledger when IDCHECK_AUTH_RESET=1 — the escape hatch after the real cause is fixed. */
    resetIfRequested() {
      if (process.env.IDCHECK_AUTH_RESET === '1' && existsSync(ledgerPath)) {
        rmSync(ledgerPath, { force: true })
      }
    },

    /** Throws before the first keystroke once the budget is spent, so a bad config costs one sign-in, not one per process. */
    assertNotLatched() {
      const verdicts = readLedger()
      if (verdicts.length >= maxFailures) {
        throw new Error(
          `[idcheck] Entra sign-in latched after ${verdicts.length} failure(s) (last: ${reasonOf(verdicts.at(-1))})` +
            ' — fix the cause, then clear it with IDCHECK_AUTH_RESET=1'
        )
      }
    },

    /**
     * Counts one Entra verdict. Callers pass ONLY genuine verdicts, never timeouts or network faults.
     * A write failure hard-throws — a guard that cannot record is not a guard.
     */
    recordFailure(reason) {
      mkdirSync(stateDir, { recursive: true })
      appendFileSync(ledgerPath, `${new Date().toISOString()} ${reason.replaceAll(/\s+/g, ' ')}\n`)
    },

    /** A healthy sign-in (silent SSO included) clears the budget. */
    recordSuccess() {
      rmSync(ledgerPath, { force: true })
    },

    /** For tests and diagnostics. */
    failureCount() {
      return readLedger().length
    },
  }
}

/** The reason of a "<ISO time> <reason>" ledger line. */
function reasonOf(line) {
  return line.slice(line.indexOf(' ') + 1)
}
