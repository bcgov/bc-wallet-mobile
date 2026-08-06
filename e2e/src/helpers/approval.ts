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
 * @param timeoutMs - Budget for the WHOLE chain (~10 sequential SIT round trips), not per request — so a
 *   thin budget always expires on the last one, `approve`, whatever was actually slow. The per-step
 *   `[sm-login]` timings tell them apart.
 */
export async function approveInPersonRequest(
  formattedCode: string,
  input: ApproveInPersonInput,
  timeoutMs = 60_000
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
  const startedAt = Date.now()

  try {
    await approveInPersonLogin(loginInput, { signal: controller.signal })
  } catch (error: unknown) {
    const elapsedMs = Date.now() - startedAt
    const message = error instanceof Error ? error.message : String(error)
    // Our own abort surfaces from undici as a bare "This operation was aborted" — name it as OUR budget
    // so it is never mistaken for an SM rejection.
    const detail = controller.signal.aborted
      ? `the ${timeoutMs}ms budget for the whole SM chain ran out (see the per-step [sm-login] timings for where it went)`
      : message
    throw new Error(`In-person approval failed after ${elapsedMs}ms (flow=${input.flow}, code="${code}"): ${detail}`)
  } finally {
    clearTimeout(timeoutId)
  }
}

export type SendVideoReviewInput =
  | {
      decision: 'approve'
      cardSerialNumber: string
    }
  | {
      decision: 'reject'
      cardSerialNumber: string
      /** Reason text the app shows the user on the cancelled-review screen — tests assert it verbatim. */
      verificationComment: string
      /** Internal portal note; defaults to verificationComment. */
      comment?: string
      /** Portal reject-reason id; defaults to '22' (additional person in photo or video). */
      typeReasonId?: string
    }

/**
 * Review (approve or reject) a queued send-video verification request by running the SM login flow
 * in-process.
 *
 * The portal's queue is a blind FIFO claim ("Open Next Request"), so the script polls until the
 * submission appears and refuses to review an item whose card serial does not match.
 *
 * @param input - Decision + expected card serial (reject adds the reason fields)
 * @param timeoutMs - Budget for the WHOLE chain — dominated by the claim polling (up to 120s in the
 *   script) plus SM login and three decision round trips, so a thin budget expires mid-poll.
 */
export async function reviewSendVideoRequest(input: SendVideoReviewInput, timeoutMs = 180_000): Promise<void> {
  console.log(`[approval] Reviewing send-video request (decision=${input.decision}, serial=${input.cardSerialNumber})`)

  const { reviewSendVideoLogin } = (await import(loginModuleUrl)) as {
    reviewSendVideoLogin: (
      input: SendVideoReviewInput,
      options?: { signal?: AbortSignal; claimTimeoutMs?: number }
    ) => Promise<{ requestIdentifier: string; claimedSerial: string; claimedName: string }>
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  try {
    await reviewSendVideoLogin(input, { signal: controller.signal })
  } catch (error: unknown) {
    const elapsedMs = Date.now() - startedAt
    const message = error instanceof Error ? error.message : String(error)
    // Our own abort surfaces from undici as a bare "This operation was aborted" — name it as OUR budget
    // so it is never mistaken for an SM rejection.
    const detail = controller.signal.aborted
      ? `the ${timeoutMs}ms budget for the whole SM chain ran out (see the per-step [sm-login] timings for where it went)`
      : message
    throw new Error(
      `Send-video ${input.decision} failed after ${elapsedMs}ms (serial=${input.cardSerialNumber}): ${detail}`
    )
  } finally {
    clearTimeout(timeoutId)
  }
}
