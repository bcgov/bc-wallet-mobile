import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DEFAULT_HOST, resolveHost, resolveToken } from './environment.ts'

describe('resolveHost', () => {
  it('prefers --hostname over BCSC_TEST_HOST', () => {
    assert.equal(resolveHost({ hostname: 'a.example' }, { BCSC_TEST_HOST: 'b.example' }), 'a.example')
  })

  it('falls back to BCSC_TEST_HOST, then the default', () => {
    assert.equal(resolveHost({}, { BCSC_TEST_HOST: 'b.example' }), 'b.example')
    assert.equal(resolveHost({}, { BCSC_TEST_HOST: '  ' }), DEFAULT_HOST)
    assert.equal(resolveHost({}, {}), DEFAULT_HOST)
  })
})

describe('resolveHost with saved hosts', () => {
  it('uses the saved host only when exactly one is saved and nothing overrides it', () => {
    assert.equal(
      resolveHost({}, {}, () => ['saved.example']),
      'saved.example'
    )
    assert.equal(
      resolveHost({}, {}, () => ['a.example', 'b.example']),
      DEFAULT_HOST
    )
    assert.equal(
      resolveHost({}, { BCSC_TEST_HOST: 'b.example' }, () => ['saved.example']),
      'b.example'
    )
  })

  it('does not read saved hosts when --hostname decides', () => {
    const unreachable = () => {
      throw new Error('should not be read')
    }
    assert.equal(resolveHost({ hostname: 'a.example' }, {}, unreachable), 'a.example')
  })

  it('rejects a host that is not a plain hostname', () => {
    assert.throws(() => resolveHost({ hostname: 'a/b' }, {}), /not a valid host/)
  })
})

describe('resolveToken', () => {
  it('returns BCSC_TEST_TOKEN, treating blank as unset', () => {
    assert.equal(resolveToken({ BCSC_TEST_TOKEN: 'abc' }), 'abc')
    assert.equal(resolveToken({ BCSC_TEST_TOKEN: ' ' }), undefined)
    assert.equal(resolveToken({}), undefined)
  })
})
