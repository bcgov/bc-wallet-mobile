import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const cardSerialNumber = process.env.CARD_SERIAL || 'XXXXXX'
const cardBirthdateRaw = process.env.BIRTH_DATE || 'YYYY-MM-DD'

/**
 * Normalizes BIRTH_DATE to YYYY-MM-DD regardless of input format.
 * Accepts "19840913", "1984/09/13", or "1984-09-13".
 */
function normalizeBirthdate(value: string): string {
  const digits = value.replaceAll(/\D/g, '')
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
  }
  return value
}

const cardBirthdate = normalizeBirthdate(cardBirthdateRaw)

const loginModuleUrl = pathToFileURL(resolve(dirname(fileURLToPath(import.meta.url)), '../../scripts/login.mjs')).href

/**
 * Approve an in-person verification request by running the SM login flow in-process.
 *
 * Strips dashes/spaces from the formatted code (e.g. "PEDD-RJUW" → "PEDDRJUW")
 * before passing it to the script.
 *
 * CLI equivalent: `node login.mjs <cardSerialNumber> <cardBirthdate(YYYY-MM-DD)> <userCode>`
 *
 * @param formattedCode - The confirmation code as displayed in the app (XXXX-XXXX)
 * @param timeoutMs - Max time to wait for the approval flow (default 30s)
 */
export async function approveInPersonRequest(formattedCode: string, timeoutMs = 30_000): Promise<void> {
  const code = formattedCode.replaceAll(/[\s-]/g, '')
  if (!/^[A-Za-z0-9]{8}$/.test(code)) {
    throw new Error('Invalid confirmation code: expected 8 alphanumeric characters (optionally formatted as XXXX-XXXX)')
  }
  console.log(`[approval] Approving in-person request with code: ${code}`)

  const { approveInPersonLogin } = (await import(loginModuleUrl)) as {
    approveInPersonLogin: (
      serial: string,
      birthdate: string,
      userCode: string,
      options?: { signal?: AbortSignal }
    ) => Promise<void>
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    await approveInPersonLogin(cardSerialNumber, cardBirthdate, code, { signal: controller.signal })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`In-person approval failed for code "${code}": ${message}`)
  } finally {
    clearTimeout(timeoutId)
  }
}
