import { createInterface } from 'node:readline/promises'
import type { Io } from './spec.ts'

export type ConfirmResult = 'confirmed' | 'declined' | 'needs-yes'

/**
 * Asks before a write, like gh. `--yes` skips the prompt; without a TTY it
 * returns `needs-yes` instead of blocking on stdin, so callers can fail fast.
 */
export const confirm = async (io: Io, question: string, yes: boolean): Promise<ConfirmResult> => {
  if (yes) return 'confirmed'
  if (!io.isTTY) return 'needs-yes'
  const rl = createInterface({ input: process.stdin, output: process.stderr })
  try {
    const answer = await rl.question(`? ${question} (y/N) `)
    return /^y(es)?$/i.test(answer.trim()) ? 'confirmed' : 'declined'
  } finally {
    rl.close()
  }
}
