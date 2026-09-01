#!/usr/bin/env node

/**
 * Folds pending `.changes/*.md` entries into CHANGELOG.md.
 *
 * Each entry has YAML frontmatter with a `type` (added/changed/fixed/removed)
 * and a plain-language body. `assemble` always opens a fresh dated heading
 * for whatever's pending — meant to run once, right before a release
 * candidate is cut, not on every build. Consumed entries are deleted.
 *
 * Usage:
 *   node scripts/changelog/index.mjs assemble [--allow-empty]
 *   node scripts/changelog/index.mjs preview
 *
 * Exit codes:
 *   0  success
 *   1  usage error
 *   2  an entry has missing/unknown `type` or bad frontmatter
 *   3  no entries and --allow-empty not passed (assemble only)
 */

import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { parse as parseYaml } from 'yaml'

// ─── Constants ──────────────────────────────────────────────────

// From cwd, not this file's location, so tests can point it at a fixture root.
const ROOT_DIR = process.cwd()
const CHANGES_DIR = join(ROOT_DIR, '.changes')

const VALID_TYPES = ['added', 'changed', 'fixed', 'removed']
const TYPE_LABELS = { added: 'Added', changed: 'Changed', fixed: 'Fixed', removed: 'Removed' }
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/
const DATE_HEADING_PATTERN = /^## (.+)$/gm

// ─── .changes/*.md parsing ──────────────────────────────────────

function parseChangeFile(filePath) {
  const raw = readFileSync(filePath, 'utf-8')
  const match = raw.match(FRONTMATTER_PATTERN)
  if (!match) {
    return { error: "missing YAML frontmatter (expected '---' delimiters)" }
  }

  const [, frontmatter, body] = match
  let parsed
  try {
    parsed = parseYaml(frontmatter)
  } catch (err) {
    return { error: `invalid YAML frontmatter: ${err.message}` }
  }

  const type = parsed?.type
  if (!type || !VALID_TYPES.includes(type)) {
    return { error: `type must be one of ${VALID_TYPES.join(', ')} (got ${JSON.stringify(type)})` }
  }

  return { type, body: body.trim() }
}

/**
 * Reads and validates every .changes/*.md file. Exits with code 2 on any
 * bad entry so a typo breaks CI rather than silently dropping the entry.
 */
function readChangeFiles(changesDir) {
  if (!existsSync(changesDir)) return []

  const files = readdirSync(changesDir)
    .filter((f) => f.endsWith('.md'))
    .sort()

  const entries = []
  const errors = []

  for (const file of files) {
    const filePath = join(changesDir, file)
    const result = parseChangeFile(filePath)
    if (result.error) {
      errors.push(`${file}: ${result.error}`)
    } else {
      entries.push({ file, filePath, type: result.type, body: result.body })
    }
  }

  if (errors.length > 0) {
    console.error('::error::Invalid .changes entries found:')
    for (const e of errors) {
      console.error(`  - ${e}`)
    }
    process.exit(2)
  }

  return entries
}

// ─── CHANGELOG.md rendering ─────────────────────────────────────

function renderChangelogSection(entries) {
  const lines = []

  for (const type of VALID_TYPES) {
    const group = entries.filter((e) => e.type === type)
    if (group.length === 0) continue

    lines.push(`**${TYPE_LABELS[type]}**`)
    for (const entry of group) {
      const bodyLine = entry.body
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .join(' ')
      lines.push(`- ${bodyLine}`)
    }
    lines.push('')
  }

  return lines.join('\n').trimEnd() + '\n'
}

function initialChangelogContent() {
  return `# Changelog

All notable changes to this project will be documented in this file.

For the pre-4.x release history, see [RELEASE.md](./RELEASE.md).
`
}

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Splits CHANGELOG.md into its intro header and an ordered list of
 * { date, body } sections, one per "## <date>" heading.
 */
function parseChangelog(content) {
  const matches = [...content.matchAll(DATE_HEADING_PATTERN)]
  if (matches.length === 0) {
    return { header: content, sections: [] }
  }

  const header = content.slice(0, matches[0].index)
  const sections = matches.map((m, i) => {
    const date = m[1].trim()
    const start = m.index + m[0].length
    const end = i + 1 < matches.length ? matches[i + 1].index : content.length
    return { date, body: content.slice(start, end) }
  })

  return { header, sections }
}

function stringifyChangelog({ header, sections }) {
  let out = header.trimEnd() + '\n'
  for (const s of sections) {
    const body = s.body.replace(/^\n*/, '\n').trimEnd()
    out += `\n## ${s.date}\n${body}\n`
  }
  return out.trimEnd() + '\n'
}

/**
 * Takes the current CHANGELOG.md content and returns it with a fresh dated
 * "## <date>" section prepended for the given entries. Always a new
 * section — this is meant to run once per release candidate, not once per
 * build, so there's nothing to detect or merge.
 */
function buildUpdatedChangelog({ existingContent, entries, date = todayDate() }) {
  const parsed = parseChangelog(existingContent ?? initialChangelogContent())
  const section = renderChangelogSection(entries)
  parsed.sections.unshift({ date, body: `\n${section}` })
  return stringifyChangelog(parsed)
}

// ─── Commands ───────────────────────────────────────────────────

function assembleChangelog({ changesDir, changelogPath, allowEmpty }) {
  const entries = readChangeFiles(changesDir)

  if (entries.length === 0) {
    if (!allowEmpty) {
      console.error(`::error::No entries found in ${changesDir}. Pass --allow-empty to release anyway.`)
      process.exit(3)
    }
    console.warn('No .changes entries found; skipping CHANGELOG.md update (--allow-empty).')
    return
  }

  const existingContent = existsSync(changelogPath) ? readFileSync(changelogPath, 'utf-8') : null
  const updated = buildUpdatedChangelog({ existingContent, entries })

  writeFileSync(changelogPath, updated)
  for (const entry of entries) {
    unlinkSync(entry.filePath)
  }

  console.log(
    `\n✓ Assembled ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} into CHANGELOG.md under ${todayDate()}`
  )
}

function previewChangelog({ changesDir, changelogPath }) {
  const entries = readChangeFiles(changesDir)

  if (entries.length === 0) {
    console.log(`No .changes entries found in ${changesDir}.`)
    return
  }

  const existingContent = existsSync(changelogPath) ? readFileSync(changelogPath, 'utf-8') : null
  console.log(buildUpdatedChangelog({ existingContent, entries }))
}

// ─── CLI Entry Point ────────────────────────────────────────────

function printUsageAndExit(message) {
  if (message) console.error(message)
  console.error('')
  console.error('Usage:')
  console.error('  node scripts/changelog/index.mjs assemble [--allow-empty]')
  console.error('  node scripts/changelog/index.mjs preview')
  process.exit(1)
}

function parseCliArgs(args) {
  const [command, ...rest] = args

  if (command !== 'assemble' && command !== 'preview') {
    printUsageAndExit(`Unknown command: ${command ?? '(none)'}`)
  }

  let allowEmpty = false

  for (const arg of rest) {
    if (arg === '--allow-empty') {
      allowEmpty = true
    } else {
      printUsageAndExit(`Unknown option: ${arg}`)
    }
  }

  return { command, allowEmpty }
}

function main() {
  const { command, allowEmpty } = parseCliArgs(process.argv.slice(2))
  const changelogPath = join(ROOT_DIR, 'CHANGELOG.md')

  if (command === 'assemble') {
    assembleChangelog({ changesDir: CHANGES_DIR, changelogPath, allowEmpty })
  } else {
    previewChangelog({ changesDir: CHANGES_DIR, changelogPath })
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export {
  TYPE_LABELS,
  VALID_TYPES,
  assembleChangelog,
  buildUpdatedChangelog,
  previewChangelog,
  readChangeFiles,
  renderChangelogSection,
}
