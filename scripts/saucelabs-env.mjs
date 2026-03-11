/**
 * Shared .env.saucelabs loader for SauceLabs scripts.
 *
 * Reads scripts/.env.saucelabs if present, populating process.env
 * without overwriting existing values. Supports # comments, blank
 * lines, and single/double-quoted values.
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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
    if (process.env[key] === undefined) {
      process.env[key] = val
    }
  }
}
