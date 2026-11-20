type FailureCause = { code?: string; message?: string; errors?: FailureCause[] }

// Connection attempts to several addresses fail as an AggregateError with an empty message and the codes on its members.
const failureCodes = (cause: FailureCause | undefined): string[] => {
  const codes = [cause?.code, ...(cause?.errors ?? []).map((inner) => inner.code)]
  return [...new Set(codes.filter((code): code is string => Boolean(code)))]
}

/** The error codes behind a failed fetch and a readable reason, falling back to the codes when the message is empty. */
export const failureReason = (error: unknown): { codes: string[]; text: string } => {
  const cause = (error as { cause?: FailureCause }).cause
  const codes = failureCodes(cause)
  return { codes, text: cause?.message || codes.join(', ') || (error as Error).message }
}
