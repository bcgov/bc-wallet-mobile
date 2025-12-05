import { Analytics } from './analytics/analytics-tracker'

export class BCError extends Error {
  id: string
  code: string
  description: string

  constructor(type: BCErrorType, message: string, cause?: unknown) {
    super(message, { cause })
    this.name = 'BCError'
    this.id = type.id
    this.code = type.code
    this.description = type.description

    if (Analytics.hasTracker()) {
      Analytics.trackErrorEvent(this)
    }
  }
}

const BCErrorType = {
  DEFAULT_E3000: {
    id: 'E3000',
    code: 'default_error',
    description: 'A general error occurred.',
  },
  UNKNOWN_E3005: {
    id: 'E3005',
    code: 'unknown_error',
    description: 'An unexpected or uncategorized error occurred. Use this as a last resort.',
  },
} as const

type BCErrorType = (typeof BCErrorType)[keyof typeof BCErrorType]

const getBCErrorGenerator = (type: BCErrorType) => {
  return (message: string, cause?: unknown) => new BCError(type, message, cause)
}

const BCErrors = {
  DEFAULT_E3000: getBCErrorGenerator(BCErrorType.DEFAULT_E3000),
  OTHER_E3005: getBCErrorGenerator(BCErrorType.UNKNOWN_E3005),
}

BCErrors.DEFAULT_E3000('BCError module loaded')
