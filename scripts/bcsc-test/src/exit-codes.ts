// Matches `gh help exit-codes` so scripts written against gh behave the same here.
export const ExitCode = {
  ok: 0,
  failure: 1,
  cancelled: 2,
  authRequired: 4,
} as const

/** A failure the user can act on. `run` prints the message to stderr and exits with `exitCode`. */
export class CliError extends Error {
  readonly exitCode: number

  constructor(message: string, exitCode: number = ExitCode.failure) {
    super(message)
    this.exitCode = exitCode
  }
}
