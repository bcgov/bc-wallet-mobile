type AttestationErrorLogContext = {
  errorName?: string
  errorMessage?: string
  errorCode?: string
  nativeStackAndroid?: unknown
  userInfo?: unknown
  stack?: string
}

/**
 * Extracts relevant information from an attestation error for logging purposes,
 * specifically for errors from the @bifold/react-native-attestation package
 *
 * @param error The error object to extract information from.
 * @returns An object containing relevant error details for logging.
 */
export const getAttestationErrorLogContext = (error: unknown): AttestationErrorLogContext => {
  if (!(error instanceof Error)) {
    return { errorMessage: String(error) }
  }

  // properties from @bifold/react-native-attestation errors
  const errorWithDetails = error as Error & {
    code?: string
    nativeStackAndroid?: unknown
    userInfo?: unknown
  }

  return {
    errorName: errorWithDetails.name,
    errorMessage: errorWithDetails.message,
    errorCode: errorWithDetails.code,
    nativeStackAndroid: errorWithDetails.nativeStackAndroid,
    userInfo: errorWithDetails.userInfo,
    stack: errorWithDetails.stack,
  }
}
