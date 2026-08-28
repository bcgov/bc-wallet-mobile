/**
 * Render the e2e brief: one page for a set of e2e reports — the UAT checklist per platform, every
 * failure, and the accessibility findings against the baseline. CI appends it to the run summary.
 *
 *   yarn brief --reports reports                                  # a local run
 *   yarn brief --reports artifacts --out brief.md --json brief.json   # downloaded e2e-reports-* artifacts
 *
 * Options: --reports <dir> (repeatable) · --out <file> (default: stdout) · --json <file> ·
 * --baseline <file> (default e2e/a11y-baseline.json) · --title <text> · --run-url <url> ·
 * --lane <name=result> (repeatable; the nightly's job results). A --reports dir holding junit/ or
 * a11y/ is one report dir; otherwise each child dir that does is one.
 *
 * Report-only: problems are rendered into the page; the exit code is 0 unless the arguments are wrong.
 */
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildBrief, resolveReportDirs } from '../src/brief/build.js'
import { renderMarkdown } from '../src/brief/render.js'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const DEFAULT_BASELINE = resolve(SCRIPT_DIR, '../a11y-baseline.json')

interface Args {
  reports: string[]
  out?: string
  json?: string
  baseline: string
  title: string
  runUrl?: string
  lanes: { name: string; result: string }[]
}

function usage(message: string): never {
  console.error(`[brief] ${message}\nusage: yarn brief --reports <dir> [--reports <dir>…] [--out brief.md] [--json brief.json] [--baseline file] [--title text] [--run-url url] [--lane name=result]…`)
  process.exit(2)
}

function parseArgs(argv: string[]): Args {
  const args: Args = { reports: [], baseline: DEFAULT_BASELINE, title: 'E2E brief', lanes: [] }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    const value = argv[i + 1]
    if (value === undefined) usage(`${flag} needs a value`)
    switch (flag) {
      case '--reports':
        args.reports.push(value)
        break
      case '--out':
        args.out = value
        break
      case '--json':
        args.json = value
        break
      case '--baseline':
        args.baseline = value
        break
      case '--title':
        args.title = value
        break
      case '--run-url':
        args.runUrl = value
        break
      case '--lane': {
        const [name, result] = value.split('=')
        if (!name || !result) usage(`--lane wants name=result, got "${value}"`)
        args.lanes.push({ name, result })
        break
      }
      default:
        usage(`unknown option ${flag}`)
    }
    i++
  }
  if (!args.reports.length) usage('at least one --reports <dir> is required')
  return args
}

const args = parseArgs(process.argv.slice(2))
const reportDirs = resolveReportDirs(args.reports)
console.error(`[brief] ${reportDirs.length} report dir(s): ${reportDirs.map((dir) => dir.name).join(', ') || '(none)'}`)

const model = buildBrief({ reportDirs, baselinePath: args.baseline, title: args.title, runUrl: args.runUrl, lanes: args.lanes })
const markdown = renderMarkdown(model)

if (args.json) writeFileSync(args.json, JSON.stringify(model, null, 2))
if (args.out) {
  writeFileSync(args.out, markdown)
  console.error(`[brief] wrote ${args.out}${args.json ? ` and ${args.json}` : ''}`)
} else {
  process.stdout.write(markdown)
}
