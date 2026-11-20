// Matches `gh help exit-codes` so scripts written against gh behave the same here.
export const ExitCode = {
  ok: 0,
  failure: 1,
  cancelled: 2,
  authRequired: 4,
} as const
