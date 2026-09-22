/**
 * The circuit breaker's contract: latch after N verdicts, a success or a reset clears, and verdicts
 * from parallel workers all count. No browser and no secret — a temp dir per test.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, test } from 'node:test'
import { createEntraAuthGuard } from './entra-auth-guard.mjs'

let stateDir = ''
beforeEach(() => {
  stateDir = mkdtempSync(path.join(tmpdir(), 'entra-auth-guard-'))
})
afterEach(() => {
  rmSync(stateDir, { recursive: true, force: true })
})

test('starts open with no ledger', () => {
  const guard = createEntraAuthGuard(stateDir, { maxFailures: 2 })
  assert.equal(guard.failureCount(), 0)
  guard.assertNotLatched()
})

test('latches after maxFailures verdicts and names the last one', () => {
  const guard = createEntraAuthGuard(stateDir, { maxFailures: 2 })
  guard.recordFailure('password rejected')
  guard.assertNotLatched()
  guard.recordFailure('code rejected\nsecond line') // one verdict stays one line, whatever the message holds
  assert.equal(guard.failureCount(), 2)
  assert.throws(
    () => guard.assertNotLatched(),
    /latched after 2 failure\(s\) \(last: code rejected second line\).*IDCHECK_AUTH_RESET=1/
  )
})

test('a healthy sign-in clears the budget', () => {
  const guard = createEntraAuthGuard(stateDir, { maxFailures: 1 })
  guard.recordFailure('password rejected')
  guard.recordSuccess()
  assert.equal(guard.failureCount(), 0)
  guard.assertNotLatched()
})

test('IDCHECK_AUTH_RESET=1 clears the latch and nothing else does', () => {
  const guard = createEntraAuthGuard(stateDir, { maxFailures: 1 })
  guard.recordFailure('password rejected')
  const previous = process.env.IDCHECK_AUTH_RESET
  try {
    delete process.env.IDCHECK_AUTH_RESET
    guard.resetIfRequested()
    assert.throws(() => guard.assertNotLatched(), /latched/)
    process.env.IDCHECK_AUTH_RESET = '1'
    guard.resetIfRequested()
    guard.assertNotLatched()
  } finally {
    if (previous === undefined) delete process.env.IDCHECK_AUTH_RESET
    else process.env.IDCHECK_AUTH_RESET = previous
  }
})

test('verdicts from parallel processes all count', async () => {
  const workers = 8
  const guardUrl = new URL('./entra-auth-guard.mjs', import.meta.url).href
  const script = `import('${guardUrl}').then((m) => m.createEntraAuthGuard(process.argv[1]).recordFailure('parallel'))`
  await Promise.all(
    Array.from(
      { length: workers },
      () =>
        new Promise((resolve, reject) => {
          const worker = spawn(process.execPath, ['-e', script, stateDir], { stdio: 'inherit' })
          worker.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`worker exited ${code}`))))
        })
    )
  )
  assert.equal(createEntraAuthGuard(stateDir).failureCount(), workers)
})
