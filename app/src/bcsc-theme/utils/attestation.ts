/**
 * Extracts relevant information from an attestation error for logging purposes,
 * specifically for errors from the @bifold/react-native-attestation package
 *
 * @param error The error object to extract information from.
 * @returns An object containing relevant error details for logging.
 */
export const getAttestationErrorLogContext = (error: unknown) => {
  if (!(error instanceof Error)) {
    return { error: String(error) }
  }

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
  }
}
