import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SM_LOGIN_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../sm-login')

const cardSerialNumber = process.env.CARD_SERIAL || 'XXXXXX'
const cardBirthdate = process.env.BIRTH_DATE || 'YYYY/MM/DD'

/**
 * Approve an in-person verification request by calling the sm-login CLI.
 *
 * Strips the dash from the formatted code (e.g. "1234-5678" → "12345678")
 * before passing it to the script.
 *
 * node login.mjs <cardSerialNumber> <cardBirthdate(YYYY-MM-DD)> <userCode(XXXX-XXXX)>
 *
 * @param formattedCode - The confirmation code as displayed in the app (XXXX-XXXX)
 * @param timeoutMs - Max time to wait for the approval script (default 30s)
 */
export function approveInPersonRequest(formattedCode: string, timeoutMs = 30_000): void {
  const code = formattedCode.replace(/-/g, '')
  console.log(`[approval] Approving in-person request with code: ${code}`)

  try {
    const output = execSync(`node login.mjs ${cardSerialNumber} ${cardBirthdate} ${code}`, {
      cwd: SM_LOGIN_DIR,
      timeout: timeoutMs,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    console.log(`[approval] Script output:\n${output}`)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`In-person approval failed for code "${code}": ${message}`)
  }
}
