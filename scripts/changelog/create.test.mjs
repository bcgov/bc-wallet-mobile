import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ADJECTIVES, NOUNS, randomSlug } from './create.mjs'

test('randomSlug: produces an "adjective-noun" pair from the curated lists', () => {
  const slug = randomSlug(() => false)
  const [adjective, noun] = slug.split('-')
  assert.ok(ADJECTIVES.includes(adjective), `expected a known adjective, got ${adjective}`)
  assert.ok(NOUNS.includes(noun), `expected a known noun, got ${noun}`)
})

test('randomSlug: retries when a slug already exists', () => {
  let calls = 0
  const slugExists = () => {
    calls += 1
    return calls <= 3 // first 3 attempts "collide", 4th is free
  }
  const slug = randomSlug(slugExists)
  assert.equal(calls, 4)
  const [adjective, noun] = slug.split('-')
  assert.ok(ADJECTIVES.includes(adjective))
  assert.ok(NOUNS.includes(noun))
})

test('randomSlug: word lists contain no duplicates or blanks', () => {
  for (const list of [ADJECTIVES, NOUNS]) {
    assert.equal(new Set(list).size, list.length, 'expected no duplicate words')
    assert.ok(
      list.every((w) => /^[a-z]+$/.test(w)),
      'expected every word to be lowercase letters only'
    )
  }
})
