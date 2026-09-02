import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'

import { buildUpdatedChangelog, renderChangelogSection } from './index.mjs'

const SCRIPT_PATH = resolve(import.meta.dirname, 'index.mjs')
const TODAY = new Date().toISOString().slice(0, 10)

/** A throwaway repo root with an empty .changes/ dir, for CLI tests to build on. */
function makeTempRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'changelog-'))
  mkdirSync(join(dir, '.changes'), { recursive: true })
  return dir
}

function writeChangeFile(dir, name, content) {
  writeFileSync(join(dir, '.changes', name), content)
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

  const section = renderChangelogSection(entries)

  const addedIndex = section.indexOf('**Added**')
  const fixedIndex = section.indexOf('**Fixed**')
  const removedIndex = section.indexOf('**Removed**')
  assert.ok(addedIndex < fixedIndex && fixedIndex < removedIndex, 'expected Added, Fixed, Removed order')
  assert.match(section, /- Added the new thing\./)
})

test('buildUpdatedChangelog always opens a new dated heading above any existing ones', () => {
  const existingContent = `# Changelog

For the pre-4.x release history, see [RELEASE.md](./RELEASE.md).

## 2026-08-01

**Fixed**
- An old fix.
`
  const updated = buildUpdatedChangelog({
    existingContent,
    date: '2026-09-01',
    entries: [{ type: 'added', body: 'A new thing.' }],
  })

  const headings = [...updated.matchAll(/^## (.+)$/gm)].map((m) => m[1])
  assert.deepEqual(headings, ['2026-09-01', '2026-08-01'], 'new dated heading should be inserted above the old one')
  assert.match(updated, /## 2026-08-01[\s\S]*An old fix\./, 'old section preserved untouched')
})

test('buildUpdatedChangelog opens a separate new heading even for the same date', () => {
  // Deliberately no merging: this is meant to run once per release
  // candidate, so two runs the same day are two separate, real events.
  const existingContent = `# Changelog

## 2026-09-01

**Fixed**
- An earlier fix.
`
  const updated = buildUpdatedChangelog({
    existingContent,
    date: '2026-09-01',
    entries: [{ type: 'added', body: 'A new thing.' }],
  })

  const headings = [...updated.matchAll(/^## (.+)$/gm)].map((m) => m[1])
  assert.deepEqual(headings, ['2026-09-01', '2026-09-01'])

  const newIndex = updated.indexOf('A new thing.')
  const oldIndex = updated.indexOf('An earlier fix.')
  assert.ok(newIndex < oldIndex, 'newest section should appear above the older one')
})

// ─── CLI / assemble integration tests ───────────────────────────

test('assemble: empty .changes/ without --allow-empty exits 3 and writes nothing', () => {
  const dir = makeTempRepo()
  try {
    const result = runCli(dir, ['assemble'])
    assert.equal(result.status, 3)
    assert.equal(existsSync(join(dir, 'CHANGELOG.md')), false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('assemble: empty .changes/ with --allow-empty exits 0 and writes nothing', () => {
  const dir = makeTempRepo()
  try {
    const result = runCli(dir, ['assemble', '--allow-empty'])
    assert.equal(result.status, 0)
    assert.equal(existsSync(join(dir, 'CHANGELOG.md')), false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('assemble: opens a new dated heading above existing history and consumes the entry', () => {
  const dir = makeTempRepo()
  try {
    writeChangeFile(
      dir,
      'fix-example.md',
      '---\ntype: fixed\n---\n\nFixed the card list scrolling past the last item on smaller screens.\n'
    )
    writeFileSync(
      join(dir, 'CHANGELOG.md'),
      '# Changelog\n\nFor the pre-4.x release history, see [RELEASE.md](./RELEASE.md).\n\n## 2026-08-01\n\n**Fixed**\n- Fixed an old bug from a prior release.\n'
    )

    const result = runCli(dir, ['assemble'])
    assert.equal(result.status, 0, result.stderr)

    const changelog = readFileSync(join(dir, 'CHANGELOG.md'), 'utf-8')
    const headings = [...changelog.matchAll(/^## (.+)$/gm)].map((m) => m[1])
    assert.deepEqual(headings, [TODAY, '2026-08-01'])
    assert.match(changelog, new RegExp(`## ${TODAY}[\\s\\S]*Fixed the card list scrolling`))
    assert.match(changelog, /## 2026-08-01[\s\S]*Fixed an old bug/, 'old section preserved untouched')

    const remaining = readdirSync(join(dir, '.changes')).filter((f) => f.endsWith('.md'))
    assert.deepEqual(remaining, [], 'consumed .changes/*.md files should be deleted')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('assemble: malformed type exits 2 and leaves CHANGELOG.md and .changes/ untouched', () => {
  const dir = makeTempRepo()
  try {
    writeChangeFile(
      dir,
      'bad.md',
      '---\ntype: bogus\n---\n\nThis entry has an invalid type and should fail the gate.\n'
    )

    const result = runCli(dir, ['assemble'])
    assert.equal(result.status, 2)
    assert.match(result.stderr, /bad\.md/)
    assert.equal(existsSync(join(dir, 'CHANGELOG.md')), false)
    assert.equal(readdirSync(join(dir, '.changes')).filter((f) => f.endsWith('.md')).length, 1)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
