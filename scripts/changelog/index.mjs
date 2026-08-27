#!/usr/bin/env node

/**
 * Folds pending `.changes/*.md` entries into CHANGELOG.md when publishing a new build
 *
 * Each entry has YAML frontmatter with a `type` (added/changed/fixed/removed)
 * and a plain-language body. `assemble` matches the variant's APP_VERSION
 * against the newest CHANGELOG.md heading: a new version opens a new heading,
 * a match appends a build section under it. Consumed entries are deleted.
 *
 * Usage:
 *   node scripts/changelog/index.mjs assemble <build> [--variant <name>] [--allow-empty]
 *   node scripts/changelog/index.mjs preview  <build> [--variant <name>]
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
const DEFAULT_VARIANT = 'bcsc-prod'

const VALID_TYPES = ['added', 'changed', 'fixed', 'removed']
const TYPE_LABELS = { added: 'Added', changed: 'Changed', fixed: 'Fixed', removed: 'Removed' }
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/
const VERSION_HEADING_PATTERN = /^## (.+)$/gm

// ─── variant.env parsing ────────────────────────────────────────

/** Parse a variant.env file into a key-value object */
function parseVariantEnv(envPath) {
  const content = readFileSync(envPath, 'utf-8')
  const env = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Z_]+)=(.*)$/)
    if (match) {
      let value = match[2].trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      env[match[1]] = value
    }
  }
  return env
}

function readVariantVersion(variantEnvPath) {
  if (!existsSync(variantEnvPath)) {
    console.error(`variant.env not found: ${variantEnvPath}`)
    process.exit(1)
  }
  const env = parseVariantEnv(variantEnvPath)
  if (!env.APP_VERSION) {
    console.error(`APP_VERSION not set in ${variantEnvPath}`)
    process.exit(1)
  }
  return env.APP_VERSION
}

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

function renderChangelogSection(entries, buildNumber) {
  const lines = [`### Build ${buildNumber}`, '']

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

/**
 * Splits CHANGELOG.md into its intro header and an ordered list of
 * { version, body } sections, one per "## <version>" heading.
 */
function parseChangelog(content) {
  const matches = [...content.matchAll(VERSION_HEADING_PATTERN)]
  if (matches.length === 0) {
    return { header: content, versions: [] }
  }

  const header = content.slice(0, matches[0].index)
  const versions = matches.map((m, i) => {
    const version = m[1].trim()
    const start = m.index + m[0].length
    const end = i + 1 < matches.length ? matches[i + 1].index : content.length
    return { version, body: content.slice(start, end) }
  })

  return { header, versions }
}

function stringifyChangelog({ header, versions }) {
  let out = header.trimEnd() + '\n'
  for (const v of versions) {
    const body = v.body.replace(/^\n*/, '\n').trimEnd()
    out += `\n## ${v.version}\n${body}\n`
  }
  return out.trimEnd() + '\n'
}

/**
 * Takes the current CHANGELOG.md content and
 * returns it with the new build section folded in. A new version opens a
 * "## <version>" heading; a match appends the build under the existing one.
 */
function buildUpdatedChangelog({ existingContent, version, buildNumber, entries }) {
  const parsed = parseChangelog(existingContent ?? initialChangelogContent())
  const section = renderChangelogSection(entries, buildNumber)
  const top = parsed.versions[0]

  if (!top || top.version !== version) {
    parsed.versions.unshift({ version, body: `\n${section}` })
  } else {
    top.body = `\n${section}\n${top.body.replace(/^\n+/, '')}`
  }

  return stringifyChangelog(parsed)
}

// ─── Commands ───────────────────────────────────────────────────

function assembleChangelog({ changesDir, changelogPath, variantEnvPath, buildNumber, allowEmpty }) {
  const entries = readChangeFiles(changesDir)

  if (entries.length === 0) {
    if (!allowEmpty) {
      console.error(`::error::No entries found in ${changesDir}. Pass --allow-empty to release anyway.`)
      process.exit(3)
    }
    console.warn('No .changes entries found; skipping CHANGELOG.md update (--allow-empty).')
    return
  }

  const version = readVariantVersion(variantEnvPath)
  const existingContent = existsSync(changelogPath) ? readFileSync(changelogPath, 'utf-8') : null
  const updated = buildUpdatedChangelog({ existingContent, version, buildNumber, entries })

  writeFileSync(changelogPath, updated)
  for (const entry of entries) {
    unlinkSync(entry.filePath)
  }

  console.log(
    `\n✓ Assembled ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} into CHANGELOG.md under ${version} / Build ${buildNumber}`
  )
}

function previewChangelog({ changesDir, changelogPath, variantEnvPath, buildNumber }) {
  const entries = readChangeFiles(changesDir)

  if (entries.length === 0) {
    console.log(`No .changes entries found in ${changesDir}.`)
    return
  }

  const version = readVariantVersion(variantEnvPath)
  const existingContent = existsSync(changelogPath) ? readFileSync(changelogPath, 'utf-8') : null
  console.log(buildUpdatedChangelog({ existingContent, version, buildNumber, entries }))
}

// ─── CLI Entry Point ────────────────────────────────────────────

function printUsageAndExit(message) {
  if (message) console.error(message)
  console.error('')
  console.error('Usage:')
  console.error('  node scripts/changelog/index.mjs assemble <build> [--variant <name>] [--allow-empty]')
  console.error('  node scripts/changelog/index.mjs preview  <build> [--variant <name>]')
  console.error('')
  console.error('Examples:')
  console.error('  node scripts/changelog/index.mjs assemble 2801')
  console.error('  node scripts/changelog/index.mjs preview 2801 --variant bcsc-prod')
  process.exit(1)
}

function parseCliArgs(args) {
  const [command, buildNumber, ...rest] = args

  if (command !== 'assemble' && command !== 'preview') {
    printUsageAndExit(`Unknown command: ${command ?? '(none)'}`)
  }
  if (!buildNumber || !/^\d+$/.test(buildNumber)) {
    printUsageAndExit(`Invalid build number: ${buildNumber ?? '(none)'} (expected a positive integer)`)
  }

  let variant = DEFAULT_VARIANT
  let allowEmpty = false

  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--variant') {
      variant = rest[++i]
    } else if (rest[i] === '--allow-empty') {
      allowEmpty = true
    } else {
      printUsageAndExit(`Unknown option: ${rest[i]}`)
    }
  }

  return { command, buildNumber, variant, allowEmpty }
}

function main() {
  const { command, buildNumber, variant, allowEmpty } = parseCliArgs(process.argv.slice(2))
  const changelogPath = join(ROOT_DIR, 'CHANGELOG.md')
  const variantEnvPath = join(ROOT_DIR, 'variants', variant, 'variant.env')

  if (command === 'assemble') {
    assembleChangelog({ changesDir: CHANGES_DIR, changelogPath, variantEnvPath, buildNumber, allowEmpty })
  } else {
    previewChangelog({ changesDir: CHANGES_DIR, changelogPath, variantEnvPath, buildNumber })
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
  readVariantVersion,
  renderChangelogSection,
}
