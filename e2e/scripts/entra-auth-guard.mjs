/**
 * A file-backed circuit breaker for the IDCheck Entra sign-in, so a broken config or a risk-flagged
 * account fails fast instead of hammering a shared account into Microsoft's bot-detection lockout.
 *
 * Semantics mirror the account-protection note (docs in ../.notes): only genuine Entra verdicts count
 * — a rejected credential, a rejected code, a risk page — never our own timeouts, aborts or network
 * faults, so an outage cannot latch the account out of the next healthy run. The ledger is a small
 * JSON file shared across processes (each wdio worker is its own process); a healthy sign-in, silent
 * SSO included, clears it.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * @param {string} stateDir - Directory the ledger lives in (must be writable; the caller ensures it).
 * @param {{ maxFailures?: number }} [options]
 */
export function createEntraAuthGuard(stateDir, { maxFailures = 3 } = {}) {
  const ledgerPath = path.join(stateDir, 'auth-guard.json')

  /** A corrupt or absent ledger reads as "no failures" — availability over a wedged file. */
  function readLedger() {
    try {
      const parsed = JSON.parse(readFileSync(ledgerPath, 'utf8'))
      return { failures: Number(parsed.failures) || 0, lastReason: parsed.lastReason }
    } catch {
      return { failures: 0 }
    }
  }

  /** Persist the ledger. A write failure hard-throws — a guard that cannot record is not a guard. */
  function writeLedger(ledger) {
    mkdirSync(stateDir, { recursive: true })
    writeFileSync(ledgerPath, JSON.stringify(ledger))
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
      const { failures, lastReason } = readLedger()
      if (failures >= maxFailures) {
        throw new Error(
          `[idcheck] Entra sign-in latched after ${failures} failure(s)` +
            `${lastReason ? ` (last: ${lastReason})` : ''} — fix the cause, then clear it with IDCHECK_AUTH_RESET=1`
        )
      }
    },

    /** Counts one Entra verdict. Callers pass ONLY genuine verdicts, never timeouts or network faults. */
    recordFailure(reason) {
      const { failures } = readLedger()
      writeLedger({ failures: failures + 1, lastReason: reason, lastAt: new Date().toISOString() })
    },

    /** A healthy sign-in (silent SSO included) clears the budget. */
    recordSuccess() {
      if (existsSync(ledgerPath) && readLedger().failures !== 0) {
        writeLedger({ failures: 0, clearedAt: new Date().toISOString() })
      }
    },

    /** For tests and diagnostics. */
    failureCount() {
      return readLedger().failures
    },
  }
}
