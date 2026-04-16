#!/usr/bin/env node
/**
 * SauceLabs Build Pruner
 *
 * Deletes SauceLabs storage builds for closed/merged pull requests.
 * Fetches all open PRs from GitHub, then removes any SauceLabs build
 * tagged with a PR number that is no longer open. Builds for open PRs
 * are always kept.
 *
 * Required environment variables:
 *   SAUCE_USERNAME      – SauceLabs username
 *   SAUCE_ACCESS_KEY    – SauceLabs access key
 *   GITHUB_TOKEN        – GitHub token with pull-requests:read scope
 *   GITHUB_REPOSITORY   – owner/repo (e.g. bcgov/bc-wallet-mobile)
 *
 * Usage:
 *   node scripts/saucelabs-prune-builds.mjs              # dry-run (default)
 *   node scripts/saucelabs-prune-builds.mjs --delete      # actually delete
 *
 * ── Local development ──────────────────────────────────────────────────
 * Reads scripts/.env.saucelabs if present (same as saucelabs-app-launch-test).
 * For GITHUB_TOKEN, use: GITHUB_TOKEN=$(gh auth token)
 * For GITHUB_REPOSITORY, use: GITHUB_REPOSITORY=bcgov/bc-wallet-mobile
 */

import './saucelabs-env.mjs'

// ── Config ─────────────────────────────────────────────────────────────

const SAUCE_REGION = 'us-west-1'
const API_BASE = `https://api.${SAUCE_REGION}.saucelabs.com/v1/storage`

const SAUCE_USERNAME = process.env.SAUCE_USERNAME
const SAUCE_ACCESS_KEY = process.env.SAUCE_ACCESS_KEY
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY

if (!SAUCE_USERNAME || !SAUCE_ACCESS_KEY) {
  console.error('Error: SAUCE_USERNAME and SAUCE_ACCESS_KEY must be set.')
  process.exit(1)
}

if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
  console.error('Error: GITHUB_TOKEN and GITHUB_REPOSITORY must be set.')
  process.exit(1)
}

const SAUCE_AUTH = Buffer.from(`${SAUCE_USERNAME}:${SAUCE_ACCESS_KEY}`).toString('base64')
const SAUCE_HEADERS = { Authorization: `Basic ${SAUCE_AUTH}`, 'Content-Type': 'application/json' }
const GITHUB_HEADERS = { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' }
const DRY_RUN = !process.argv.includes('--delete')
const DEBUG = process.argv.includes('--debug')

console.log(`SauceLabs Build Pruner`)
console.log(`  Region:     ${SAUCE_REGION}`)
console.log(`  Repository: ${GITHUB_REPOSITORY}`)
console.log(`  Mode:       ${DRY_RUN ? 'DRY RUN' : 'DELETE'}\n`)

// ── GitHub API helpers ────────────────────────────────────────────────

/** Fetch all open PR numbers from GitHub, handling pagination. */
const fetchOpenPRNumbers = async () => {
  const numbers = new Set()
  let page = 1
  const perPage = 100

  while (true) {
    process.stdout.write(`  Fetching open PRs (page ${page})...`)
    const url = `https://api.github.com/repos/${GITHUB_REPOSITORY}/pulls?state=open&per_page=${perPage}&page=${page}`
    const res = await fetch(url, { headers: GITHUB_HEADERS })

    if (!res.ok) {
      throw new Error(`GitHub API error ${res.status}`)
    }

    const prs = await res.json()
    for (const pr of prs) {
      numbers.add(pr.number)
    }
    console.log(` got ${Number(prs.length)} (${numbers.size} total)`)

    if (prs.length < perPage) break
    page++
  }

  console.log(`  Done: ${numbers.size} open PR(s) found.\n`)
  return numbers
}

// ── SauceLabs API helpers ──────────────────────────────────────────────

/** Fetch all files from SauceLabs storage for a given query, handling pagination. */
const fetchAllFiles = async (queryParams) => {
  const files = []
  let page = 1
  const perPage = 100
  const label = queryParams.tags ?? 'all'

  while (true) {
    process.stdout.write(`  Fetching ${label}-tagged files (page ${page})...`)
    const params = new URLSearchParams({ ...queryParams, per_page: String(perPage), page: String(page) })
    const url = `${API_BASE}/files?${params}`
    const res = await fetch(url, { headers: SAUCE_HEADERS })

    if (!res.ok) {
      throw new Error(`SauceLabs API error ${res.status}`)
    }

    const data = await res.json()
    const items = data.items ?? []
    const total = data.total_items ?? '?'
    files.push(...items)
    console.log(` got ${Number(items.length)} (${files.length}/${Number(total)} total)`)

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

/** Delete a single file from SauceLabs storage. Returns 'deleted' or 'not_found'. */
const deleteFile = async (fileId) => {
  const url = `${API_BASE}/files/${fileId}`
  if (DEBUG) {
    console.log(`\n  [DEBUG] DELETE ${url}`)
  }

  const res = await fetch(url, {
    method: 'DELETE',
    headers: SAUCE_HEADERS,
  })

  if (DEBUG) {
    const body = await res.clone().text()
    console.log(`  [DEBUG] Response ${res.status}: ${body}`)
  }

  if (res.status === 404) return 'not_found'

  if (!res.ok) {
    throw new Error(`Failed to delete ${fileId}: ${res.status}`)
  }

  return 'deleted'
}

/**
 * Extract the PR number from a file's tags.
 * Tags are stored as file.tags (array of strings).
 * Looks for a tag matching "pr-NNNN" and returns NNNN, or null.
 */
const extractPRNumber = (file) => {
  const tags = file.tags ?? []
  for (const tag of tags) {
    const match = tag.match(/^pr-(\d+)$/)
    if (match) return Number.parseInt(match[1], 10)
  }
  return null
}

// ── Main ───────────────────────────────────────────────────────────────

const main = async () => {
  console.log(
    DRY_RUN
      ? '🔍 DRY RUN — no files will be deleted. Pass --delete to actually prune.\n'
      : '🗑️  DELETE MODE — files will be permanently removed.\n'
  )

  // 1. Fetch all open PR numbers from GitHub
  console.log('Fetching open PRs from GitHub...')
  const openPRs = await fetchOpenPRNumbers()

  // 2. Fetch all pr-tagged builds from SauceLabs
  console.log('Fetching pr-tagged builds from SauceLabs...')
  const prFiles = await fetchAllFiles({ tags: 'pr' })

  // 3. Partition builds into keep (open PR) and delete (closed PR)
  const toDelete = []
  const toKeep = []
  const noTag = []

  for (const file of prFiles) {
    const prNumber = extractPRNumber(file)
    if (prNumber === null) {
      noTag.push(file)
    } else if (openPRs.has(prNumber)) {
      toKeep.push(file)
    } else {
      toDelete.push({ ...file, prNumber })
    }
  }

  console.log(`  Keeping:  ${toKeep.length} build(s) for ${openPRs.size} open PR(s)`)
  console.log(`  Deleting: ${toDelete.length} build(s) for closed PRs`)
  if (noTag.length > 0) {
    console.log(`  Skipped:  ${noTag.length} build(s) with no pr-NNNN tag`)
    if (DEBUG) {
      for (const file of noTag) {
        console.log(`    [DEBUG] No pr-NNNN tag: ${file.name} (id: ${file.id}, tags: ${(file.tags ?? []).join(', ')})`)
      }
    }
  }

  if (toDelete.length === 0) {
    console.log('\nNothing to prune.')
    return
  }

  // Group by PR number for readable output
  const byPR = new Map()
  for (const file of toDelete) {
    if (!byPR.has(file.prNumber)) byPR.set(file.prNumber, [])
    byPR.get(file.prNumber).push(file)
  }

  // 4. Delete builds for closed PRs
  let deleted = 0
  let failed = 0

  for (const [prNumber, files] of [...byPR.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`\n  PR #${prNumber} (closed) — ${files.length} build(s):`)
    for (const file of files) {
      if (DRY_RUN) {
        console.log(`    [DRY RUN] Would delete: ${file.name} (id: ${file.id})`)
      } else {
        process.stdout.write(`    Deleting: ${file.name}...`)
        try {
          const result = await deleteFile(file.id)
          console.log(result === 'not_found' ? ' already gone' : ' done')
          if (result !== 'not_found') {
            deleted++
          }
        } catch (err) {
          console.log(` FAILED: ${err.message}`)
          failed++
        }
      }
    }
  }

  // Summary
  console.log(`\n${'═'.repeat(60)}`)
  console.log('Summary')
  console.log('═'.repeat(60))
  console.log(`  Open PRs:     ${openPRs.size}`)
  console.log(`  Builds kept:  ${toKeep.length}`)
  const action = DRY_RUN ? 'would delete' : 'deleted'
  const count = DRY_RUN ? toDelete.length : deleted
  const failInfo = failed > 0 ? `, ${failed} failed` : ''
  console.log(`  Builds ${action}: ${count}${failInfo}`)

  if (DRY_RUN && toDelete.length > 0) {
    console.log(`\nRe-run with --delete to remove ${toDelete.length} file(s).`)
  }

  if (failed > 0) {
    console.error(`\n${failed} deletion(s) failed.`)
    process.exit(1)
  }
}

try {
  await main()
  process.exit(0)
} catch (err) {
  console.error('\nFatal error:', err.message)
  process.exit(1)
}
