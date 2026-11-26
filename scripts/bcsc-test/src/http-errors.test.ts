import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { explainHttpFailure } from './http-errors.ts'

describe('explainHttpFailure', () => {
  it('treats 401 as authentication required (exit 4)', () => {
    const { exitCode, message } = explainHttpFailure({ status: 401 })
    assert.equal(exitCode, 4)
    assert.match(message, /auth login/)
  })

  it('separates a Spring scope 403 from a proxy 403', () => {
    const scope = explainHttpFailure({ status: 403, wwwAuthenticate: 'Bearer error="insufficient_scope"' })
    const proxy = explainHttpFailure({ status: 403, wwwAuthenticate: null })
    assert.match(scope.message, /lacks the scope/)
    assert.match(proxy.message, /SiteMinder/)
  })

  it('prefers a command-specific override', () => {
    const { message } = explainHttpFailure({ status: 400 }, { 400: 'No pending registration for that usercode.' })
    assert.equal(message, 'No pending registration for that usercode.')
  })

  it('never forwards a bare status for 5xx', () => {
    assert.match(explainHttpFailure({ status: 503 }).message, /Retry/)
  })
})
