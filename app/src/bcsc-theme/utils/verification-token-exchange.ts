import { isAppError } from '@/errors/appError'
import { AppEventCode } from '@/events/appEventCode'

// Unknown-status fallback: verified only when the exchange issues tokens. ALREADY_VERIFIED and other errors rethrow
export const isVerifiedByTokenExchange = async (exchange: () => Promise<unknown>): Promise<boolean> => {
  try {
    await exchange()
    return true
  } catch (error) {
    if (isAppError(error, AppEventCode.AUTHORIZATION_PENDING) || isAppError(error, AppEventCode.VERIFY_NOT_COMPLETE)) {
      return false
    }
    throw error
  }
}
