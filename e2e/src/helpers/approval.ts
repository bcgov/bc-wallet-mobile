import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

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

const loginModuleUrl = pathToFileURL(resolve(dirname(fileURLToPath(import.meta.url)), '../../scripts/login.mjs')).href

export interface RegistrationDocument {
  typeId: string
  number: string
}

export type ApproveInPersonInput =
  | {
      flow: 'photo'
      cardSerialNumber: string
      cardBirthdate: string
    }
  | {
      flow: 'non-photo'
      cardSerialNumber: string
      cardBirthdate: string
      document: RegistrationDocument
    }
  | {
      flow: 'non-bcsc'
      documents: RegistrationDocument[]
    }

type ApproveInPersonLoginInput = ApproveInPersonInput extends infer T
  ? T extends { flow: infer F }
    ? T & { flow: F; userCode: string }
    : never
  : never

/**
 * Approve an in-person verification request by running the SM login flow in-process.
 *
 * Strips dashes/spaces from the formatted code (e.g. "PEDD-RJUW" → "PEDDRJUW")
 * before passing it to the script. For card-tap flows ('photo', 'non-photo') the
 * birthdate is normalized to YYYY-MM-DD on the way through.
 *
 * @param formattedCode - The confirmation code as displayed in the app (XXXX-XXXX)
 * @param input - Flow selector + per-flow inputs
 * @param timeoutMs - Max time to wait for the approval flow (default 30s)
 */
export async function approveInPersonRequest(
  formattedCode: string,
  input: ApproveInPersonInput,
  timeoutMs = 30_000
): Promise<void> {
  const code = formattedCode.replaceAll(/[\s-]/g, '')
  if (!/^[A-Za-z0-9]{8}$/.test(code)) {
    throw new Error('Invalid confirmation code: expected 8 alphanumeric characters (optionally formatted as XXXX-XXXX)')
  }
  console.log(`[approval] Approving in-person request (flow=${input.flow}) with code: ${code}`)

  const loginInput: ApproveInPersonLoginInput =
    input.flow === 'non-bcsc'
      ? { ...input, userCode: code }
      : { ...input, cardBirthdate: normalizeBirthdate(input.cardBirthdate), userCode: code }

  const { approveInPersonLogin } = (await import(loginModuleUrl)) as {
    approveInPersonLogin: (input: ApproveInPersonLoginInput, options?: { signal?: AbortSignal }) => Promise<void>
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    await approveInPersonLogin(loginInput, { signal: controller.signal })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`In-person approval failed (flow=${input.flow}, code="${code}"): ${message}`)
  } finally {
    clearTimeout(timeoutId)
  }
}
