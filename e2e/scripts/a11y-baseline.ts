/**
 * Snapshot the accessibility findings in a report dir as the baseline the brief compares against.
 * Overwrites the file: the intent is "these findings are triaged; from now on flag only what is new".
 *
 *   yarn a11y:baseline --reports reports [--reports <dir>…] [--out a11y-baseline.json]
 */
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildBaseline, loadA11yReports } from '../src/brief/a11y-summary.js'
import { resolveReportDirs } from '../src/brief/build.js'
import { PLATFORMS } from '../src/brief/types.js'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))

const reports: string[] = []
let out = resolve(SCRIPT_DIR, '../a11y-baseline.json')
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i += 2) {
  const value = argv[i + 1]
  if (argv[i] === '--reports' && value) reports.push(value)
  else if (argv[i] === '--out' && value) out = resolve(value)
  else {
    console.error(`[a11y-baseline] unknown or incomplete option ${argv[i]}\nusage: yarn a11y:baseline --reports <dir> [--out file]`)
    process.exit(2)
  }
}
if (!reports.length) {
  console.error('[a11y-baseline] at least one --reports <dir> is required')
  process.exit(2)
}

const loaded = loadA11yReports(resolveReportDirs(reports))
const platforms = PLATFORMS.filter((platform) => loaded[platform])
if (!platforms.length) {
  console.error('[a11y-baseline] no a11y output under the given reports — nothing written')
  process.exit(1)
}
const baseline = buildBaseline(loaded)
writeFileSync(out, `${JSON.stringify(baseline, null, 2)}\n`)
for (const platform of platforms) {
  const screens = Object.keys(baseline[platform] ?? {}).length
  const signatures = Object.values(baseline[platform] ?? {}).reduce((n, list) => n + list.length, 0)
  console.error(`[a11y-baseline] ${platform}: ${screens} screens, ${signatures} signatures (from ${loaded[platform]?.source})`)
}
console.error(`[a11y-baseline] wrote ${out}`)
