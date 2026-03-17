import { AppError, ErrorCategory } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'

export const mockAppError = (code: string): AppError => {
  return new AppError('test error', 'This is a test error', {
    appEvent: code as AppEventCode,
    category: ErrorCategory.GENERAL,
    statusCode: 5000,
  })
}
