import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'

import { buildUpdatedChangelog, renderChangelogSection } from './index.mjs'

const SCRIPT_PATH = resolve(import.meta.dirname, 'index.mjs')
const FIXTURES_DIR = resolve(import.meta.dirname, '__fixtures__')

function useFixture(name) {
  const dir = mkdtempSync(join(tmpdir(), `changelog-${name}-`))
  cpSync(join(FIXTURES_DIR, name), dir, { recursive: true })
  return dir
}

function runCli(cwd, args) {
  return spawnSync('node', [SCRIPT_PATH, ...args], { cwd, encoding: 'utf-8' })
}

// ─── Pure function tests ────────────────────────────────────────

test('renderChangelogSection groups entries by type in a fixed order', () => {
  const entries = [
    { type: 'removed', body: 'Removed the old thing.' },
    { type: 'added', body: 'Added the new thing.' },
    { type: 'fixed', body: 'Fixed a bug.' },
  ]

  const section = renderChangelogSection(entries, 2801)

  assert.match(section, /^### Build 2801/)
  const addedIndex = section.indexOf('**Added**')
  const fixedIndex = section.indexOf('**Fixed**')
  const removedIndex = section.indexOf('**Removed**')
  assert.ok(addedIndex < fixedIndex && fixedIndex < removedIndex, 'expected Added, Fixed, Removed order')
  assert.match(section, /- Added the new thing\./)
})

test('buildUpdatedChangelog opens a new version heading when the version differs', () => {
  const existingContent = `# Changelog

For the pre-4.x release history, see [RELEASE.md](./RELEASE.md).

## 4.0.2

### Build 2700

**Fixed**
- An old fix.
`
  const updated = buildUpdatedChangelog({
    existingContent,
    version: '4.1.0',
    buildNumber: 2801,
    entries: [{ type: 'added', body: 'A new thing.' }],
  })

  const headings = [...updated.matchAll(/^## (.+)$/gm)].map((m) => m[1])
  assert.deepEqual(headings, ['4.1.0', '4.0.2'], 'new version heading should be inserted above the old one')
  assert.match(updated, /## 4.0.2[\s\S]*### Build 2700[\s\S]*An old fix\./, 'old version section preserved untouched')
})

test('buildUpdatedChangelog appends a build section under a matching existing heading', () => {
  const existingContent = `# Changelog

## 4.1.0

### Build 2700

**Fixed**
- An earlier fix.
`
  const updated = buildUpdatedChangelog({
    existingContent,
    version: '4.1.0',
    buildNumber: 2801,
    entries: [{ type: 'added', body: 'A new thing.' }],
  })

  const headings = [...updated.matchAll(/^## (.+)$/gm)].map((m) => m[1])
  assert.deepEqual(headings, ['4.1.0'], 'no duplicate heading should be created')

  const build2801Index = updated.indexOf('### Build 2801')
  const build2700Index = updated.indexOf('### Build 2700')
  assert.ok(build2801Index < build2700Index, 'newest build should appear above older builds within the version')
})

// ─── CLI / assemble integration tests ───────────────────────────

test('assemble: empty .changes/ without --allow-empty exits 3 and writes nothing', () => {
  const dir = useFixture('empty')
  try {
    const result = runCli(dir, ['assemble', '2801', '--variant', 'bcsc-prod'])
    assert.equal(result.status, 3)
    assert.equal(existsSync(join(dir, 'CHANGELOG.md')), false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('assemble: empty .changes/ with --allow-empty exits 0 and writes nothing', () => {
  const dir = useFixture('empty')
  try {
    const result = runCli(dir, ['assemble', '2801', '--variant', 'bcsc-prod', '--allow-empty'])
    assert.equal(result.status, 0)
    assert.equal(existsSync(join(dir, 'CHANGELOG.md')), false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('assemble: version-changed fixture opens a new heading and consumes the entry', () => {
  const dir = useFixture('version-changed')
  try {
    const result = runCli(dir, ['assemble', '2801', '--variant', 'bcsc-prod'])
    assert.equal(result.status, 0, result.stderr)

    const changelog = readFileSync(join(dir, 'CHANGELOG.md'), 'utf-8')
    const headings = [...changelog.matchAll(/^## (.+)$/gm)].map((m) => m[1])
    assert.deepEqual(headings, ['4.1.0', '4.0.2'])
    assert.match(changelog, /### Build 2801[\s\S]*Fixed the card list scrolling/)

    const remaining = readdirSync(join(dir, '.changes')).filter((f) => f.endsWith('.md'))
    assert.deepEqual(remaining, [], 'consumed .changes/*.md files should be deleted')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('assemble: same-version fixture appends a build section and keeps older versions', () => {
  const dir = useFixture('same-version')
  try {
    const result = runCli(dir, ['assemble', '2810', '--variant', 'bcsc-prod'])
    assert.equal(result.status, 0, result.stderr)

    const changelog = readFileSync(join(dir, 'CHANGELOG.md'), 'utf-8')
    const headings = [...changelog.matchAll(/^## (.+)$/gm)].map((m) => m[1])
    assert.deepEqual(headings, ['4.1.0', '4.0.2'], 'no duplicate 4.1.0 heading should be created')
    assert.match(changelog, /### Build 2810[\s\S]*### Build 2801/, 'new build should sit above the older one')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('assemble: malformed type exits 2 and leaves CHANGELOG.md and .changes/ untouched', () => {
  const dir = useFixture('malformed')
  try {
    const result = runCli(dir, ['assemble', '2801', '--variant', 'bcsc-prod'])
    assert.equal(result.status, 2)
    assert.match(result.stderr, /bad\.md/)
    assert.equal(existsSync(join(dir, 'CHANGELOG.md')), false)
    assert.equal(readdirSync(join(dir, '.changes')).filter((f) => f.endsWith('.md')).length, 1)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
