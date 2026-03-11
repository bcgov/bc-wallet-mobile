#!/usr/bin/env node
/**
 * SauceLabs Build Pruner
 *
 * Discovers all apps in SauceLabs storage automatically. For each app it
 * finds the latest `rc`-tagged build, then deletes all `pr`-tagged builds
 * with a lower build number. No hardcoded app names or bundle IDs — the
 * script works entirely from SauceLabs storage metadata.
 *
 * Required environment variables:
 *   SAUCE_USERNAME    – SauceLabs username
 *   SAUCE_ACCESS_KEY  – SauceLabs access key
 *
 * Usage:
 *   node scripts/saucelabs-prune-builds.mjs              # dry-run (default)
 *   node scripts/saucelabs-prune-builds.mjs --delete      # actually delete
 *
 * ── Local development ──────────────────────────────────────────────────
 * Reads scripts/.env.saucelabs if present (same as saucelabs-app-launch-test).
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// ── Load local .env file if present ────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOCAL_ENV_PATH = resolve(__dirname, '.env.saucelabs')

if (existsSync(LOCAL_ENV_PATH)) {
  console.log(`Loading local env from ${LOCAL_ENV_PATH}\n`)
  const lines = readFileSync(LOCAL_ENV_PATH, 'utf-8').split('\n')
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = val
    }
  }
}

// ── Config ─────────────────────────────────────────────────────────────

const SAUCE_REGION = 'us-west-1'
const API_BASE = `https://api.${SAUCE_REGION}.saucelabs.com/v1/storage`

const SAUCE_USERNAME = process.env.SAUCE_USERNAME
const SAUCE_ACCESS_KEY = process.env.SAUCE_ACCESS_KEY

if (!SAUCE_USERNAME || !SAUCE_ACCESS_KEY) {
  console.error('Error: SAUCE_USERNAME and SAUCE_ACCESS_KEY must be set.')
  process.exit(1)
}

const AUTH = Buffer.from(`${SAUCE_USERNAME}:${SAUCE_ACCESS_KEY}`).toString('base64')
const HEADERS = { Authorization: `Basic ${AUTH}`, 'Content-Type': 'application/json' }
const DRY_RUN = !process.argv.includes('--delete')
const DEBUG = process.argv.includes('--debug')

console.log(`SauceLabs Build Pruner`)
console.log(`  Region:   ${SAUCE_REGION}`)
console.log(`  User:     [hidden - from SAUCE_USERNAME env var]`)
console.log(`  API base: ${API_BASE}`)
console.log(`  Mode:     ${DRY_RUN ? 'DRY RUN' : 'DELETE'}\n`)

// ── SauceLabs API helpers ──────────────────────────────────────────────

/**
 * Fetch all files from SauceLabs storage for a given query,
 * handling pagination automatically.
 */
const fetchAllFiles = async (queryParams) => {
  const files = []
  let page = 1
  const perPage = 100
  const label = queryParams.tags ?? 'all'

  while (true) {
    process.stdout.write(`  Fetching ${label}-tagged files (page ${page})...`)
    const params = new URLSearchParams({ ...queryParams, per_page: String(perPage), page: String(page) })
    const url = `${API_BASE}/files?${params}`
    const res = await fetch(url, { headers: HEADERS })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`SauceLabs API error ${res.status}: ${body}`)
    }

    const data = await res.json()
    const items = data.items ?? []
    const total = data.total_items ?? '?'
    files.push(...items)
    console.log(` got ${items.length} (${files.length}/${total} total)`)

    if (items.length < perPage || files.length >= (data.total_items ?? Infinity)) {
      break
    }
    page++
  }

  console.log(`  Done: ${files.length} ${label}-tagged file(s) found.\n`)

  if (DEBUG && files.length > 0) {
    console.log('  [DEBUG] Sample file object keys:', Object.keys(files[0]).join(', '))
    console.log('  [DEBUG] Sample file object:', JSON.stringify(files[0], null, 2), '\n')
  }

  return files
}

/**
 * Parse a SauceLabs filename into its prefix and build number.
 * Expects pattern: PREFIX-NUMBER.ext (e.g. BCSC-Dev-123.ipa, BCWallet-456.aab)
 * The prefix is everything before the last dash-digits-dot-extension.
 * Returns { prefix, buildNumber } or null if the name doesn't match.
 */
const parseFilename = (filename) => {
  const match = filename.match(/^(.+)-(\d+)\.[a-z]+$/i)
  if (!match) return null
  return { prefix: match[1], buildNumber: parseInt(match[2], 10) }
}

/** Delete a single file from SauceLabs storage. Returns 'deleted' or 'not_found'. */
const deleteFile = async (fileId) => {
  const url = `${API_BASE}/files/${fileId}`
  if (DEBUG) {
    console.log(`\n  [DEBUG] DELETE ${url}`)
  }

  const res = await fetch(url, {
    method: 'DELETE',
    headers: HEADERS,
  })

  if (DEBUG) {
    const body = await res.clone().text()
    console.log(`  [DEBUG] Response ${res.status}: ${body}`)
  }

  if (res.status === 404) return 'not_found'

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to delete ${fileId}: ${res.status} ${body}`)
  }

  return 'deleted'
}

// ── Main ───────────────────────────────────────────────────────────────

const main = async () => {
  console.log(
    DRY_RUN
      ? '🔍 DRY RUN — no files will be deleted. Pass --delete to actually prune.\n'
      : '🗑️  DELETE MODE — files will be permanently removed.\n'
  )

  // 1. Fetch all rc-tagged builds and discover prefixes automatically
  console.log('Fetching rc-tagged builds...')
  const rcFiles = await fetchAllFiles({ tags: 'rc' })
  const rcParsed = rcFiles.map((f) => ({ ...f, ...parseFilename(f.name) })).filter((f) => f.prefix != null)

  // Group rc builds by prefix, keep the highest build number per prefix
  const latestRcByPrefix = new Map()
  for (const f of rcParsed) {
    const existing = latestRcByPrefix.get(f.prefix)
    if (!existing || f.buildNumber > existing.buildNumber) {
      latestRcByPrefix.set(f.prefix, f)
    }
  }

  const prefixes = [...latestRcByPrefix.keys()].sort()
  console.log(`Discovered ${prefixes.length} app prefix(es): ${prefixes.join(', ')}\n`)

  if (prefixes.length === 0) {
    console.log('No rc-tagged builds found in storage. Nothing to prune.')
    return
  }

  // 2. Fetch all pr-tagged builds
  console.log('Fetching pr-tagged builds...')
  const prFiles = await fetchAllFiles({ tags: 'pr' })
  const prParsed = prFiles.map((f) => ({ ...f, ...parseFilename(f.name) })).filter((f) => f.prefix != null)

  // Group pr builds by prefix
  const prByPrefix = new Map()
  for (const f of prParsed) {
    if (!prByPrefix.has(f.prefix)) prByPrefix.set(f.prefix, [])
    prByPrefix.get(f.prefix).push(f)
  }

  // 3. For each discovered prefix, prune pr builds older than latest rc
  const results = []
  for (const prefix of prefixes) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`Processing: ${prefix}`)
    console.log('─'.repeat(60))

    const latestRc = latestRcByPrefix.get(prefix)
    console.log(`  Latest rc build: ${latestRc.name} (build #${latestRc.buildNumber})`)

    const prBuilds = prByPrefix.get(prefix) ?? []
    const toDelete = prBuilds.filter((f) => f.buildNumber < latestRc.buildNumber)
    const toKeep = prBuilds.filter((f) => f.buildNumber >= latestRc.buildNumber)

    if (toDelete.length === 0) {
      console.log(`  No pr builds older than rc build #${latestRc.buildNumber}. Nothing to prune.`)
      results.push({ deleted: 0, failed: 0, skipped: toKeep.length, prefix })
      continue
    }

    console.log(`  Found ${toDelete.length} pr build(s) to prune, ${toKeep.length} to keep.`)
    toDelete.sort((a, b) => a.buildNumber - b.buildNumber)

    let deleted = 0
    let failed = 0

    for (const file of toDelete) {
      if (DRY_RUN) {
        console.log(`  [DRY RUN] Would delete: ${file.name} (build #${file.buildNumber}, id: ${file.id})`)
      } else {
        process.stdout.write(`  Deleting: ${file.name} (build #${file.buildNumber})...`)
        try {
          const result = await deleteFile(file.id)
          console.log(result === 'not_found' ? ' already gone' : ' done')
          deleted++
        } catch (err) {
          console.log(` FAILED: ${err.message}`)
          failed++
        }
      }
    }

    results.push({
      deleted: DRY_RUN ? toDelete.length : deleted,
      failed,
      skipped: toKeep.length,
      prefix,
    })
  }

  // Summary
  console.log(`\n${'═'.repeat(60)}`)
  console.log('Summary')
  console.log('═'.repeat(60))
  for (const r of results) {
    const action = DRY_RUN ? 'would delete' : 'deleted'
    const failInfo = r.failed > 0 ? `, ${r.failed} failed` : ''
    console.log(`  ${r.prefix}: ${r.deleted} ${action}${failInfo}, ${r.skipped} kept`)
  }

  const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0)
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)

  if (DRY_RUN && totalDeleted > 0) {
    console.log(`\nRe-run with --delete to remove ${totalDeleted} file(s).`)
  }

  if (totalFailed > 0) {
    console.error(`\n${totalFailed} deletion(s) failed.`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('\nFatal error:', err.message)
  process.exit(1)
})
