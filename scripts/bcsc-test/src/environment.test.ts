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

describe('resolveToken', () => {
  it('returns BCSC_TEST_TOKEN, treating blank as unset', () => {
    assert.equal(resolveToken({ BCSC_TEST_TOKEN: 'abc' }), 'abc')
    assert.equal(resolveToken({ BCSC_TEST_TOKEN: ' ' }), undefined)
    assert.equal(resolveToken({}), undefined)
  })
})
