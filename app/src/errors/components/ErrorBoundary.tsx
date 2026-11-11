/* eslint-disable react/prop-types */
import { reportProblem } from '@/utils/logger'
import { AbstractBifoldLogger } from '@bifold/core'
import React, { ErrorInfo, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppError } from '../appError'
import { ErrorRegistry } from '../errorRegistry'
import { ErrorInfoCard } from './ErrorInfoCard'

// Innermost frames name the failing component and its screen; outer frames are the same provider shell every time
const MAX_COMPONENT_STACK_FRAMES = 50

// One string, not an array: Loki's `| json` parser skips arrays
export const trimComponentStack = (componentStack?: string | null): string | undefined => {
  const frames = (componentStack ?? '')
    .split('\n')
    .map((frame) => frame.trim())
    .filter(Boolean)
    .slice(0, MAX_COMPONENT_STACK_FRAMES)

  return frames.length ? frames.join('\n') : undefined
}

interface ErrorBoundaryProps {
  children: ReactNode
  t: (key: string) => string
  logger: AbstractBifoldLogger
}

interface ErrorBoundaryState {
  hasError: boolean
  error: AppError | null
}

/**
 * React class error boundary that catches render errors in its subtree.
 *
 * Since this sits at the top of the component tree (above providers and
 * ErrorModal), it renders the shared ErrorInfoCard directly in its fallback
 * using hardcoded fallback colors. This avoids depending on ThemeProvider
 * or any other context that lives below it.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const appError = AppError.fromErrorDefinition(ErrorRegistry.UNKNOWN_ERROR_BOUNDARY_ERROR, {
      cause: error,
      track: false,
    })

    return { hasError: true, error: appError }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { logger } = this.props
    const { error: appError } = this.state
    const componentStack = trimComponentStack(errorInfo.componentStack)

    // Report-only context: track() sends analytics just the code and message
    if (componentStack) {
      appError?.addContext({ component_stack: componentStack })
    }

    logger.error('ErrorBoundary caught an error:', { component_stack: componentStack }, error)
    appError?.track()
  }

  handleDismiss = (): void => {
    this.setState({ hasError: false, error: null })
  }

  getReportError = (error: AppError) => ({
    title: this.props.t('Error.Problem'),
    description: this.props.t('Error.ProblemDescription'),
    code: error.statusCode,
    error,
  })

  /**
   * @returns the report ID the user can share with support, or undefined if there is no error
   */
  handleReport = (): string | undefined => {
    const { error } = this.state
    const { logger } = this.props

    if (!error) {
      return
    }

    logger.error('ErrorBoundary reported:', error)

    // Use the shared pipeline rather than logger.report() so the report carries a report_id that
    // ErrorInfoCard can surface — logger.report() sends to Loki but returns nothing to show the user.
    return reportProblem(this.getReportError(error))
  }

  render(): React.ReactNode {
    const { hasError, error } = this.state

    if (hasError && error) {
      const reportError = this.getReportError(error)
      return (
        <SafeAreaView style={styles.overlay}>
          <ErrorInfoCard
            title={reportError.title}
            description={reportError.description}
            message={reportError.error.message}
            code={reportError.code}
            onDismiss={this.handleDismiss}
            onReport={this.handleReport}
            enableReport
          />
        </SafeAreaView>
      )
    }

    return this.props.children
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
})

interface ErrorBoundaryWrapperProps {
  children: ReactNode
  logger: AbstractBifoldLogger
}

/**
 * Functional wrapper that provides useTranslation to the class-based
 * ErrorBoundary. Place at the top of the component tree so it acts as
 * the last-resort catch-all for unhandled render errors.
 */
export const ErrorBoundaryWrapper: React.FC<ErrorBoundaryWrapperProps> = ({ children, logger }) => {
  const { t } = useTranslation()
  return (
    <ErrorBoundary t={t} logger={logger}>
      {children}
    </ErrorBoundary>
  )
}

export default ErrorBoundaryWrapper
