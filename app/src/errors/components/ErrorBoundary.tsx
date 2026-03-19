import { toBifoldError } from '@/bcsc-theme/utils/error-utils'
import { AbstractBifoldLogger } from '@bifold/core'
import React, { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ErrorInfoCard } from './ErrorInfoCard'

interface ErrorBoundaryProps {
  children: ReactNode
  t: (key: string) => string
  logger: AbstractBifoldLogger
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * React class error boundary that catches render errors in its subtree.
 *
 * Since this sits at the top of the component tree (above providers and
 * ErrorModal), it renders the shared ErrorInfoCard directly in its fallback
 * using hardcoded fallback colors. This avoids depending on ThemeProvider
 * or any other context that lives below it.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error): void {
    const { logger } = this.props
    logger.error('ErrorBoundary caught an error:', error)
  }

  handleDismiss = (): void => {
    this.setState({ hasError: false, error: null })
  }

  getReportError = (error: Error) => {
    return toBifoldError(this.props.t('Error.Problem'), this.props.t('Error.ProblemDescription'), error)
  }

  handleReport = (): void => {
    const { error } = this.state
    const { logger } = this.props
    if (error) {
      const reportError = this.getReportError(error)
      logger.error('ErrorBoundary reported:', error)
      logger.report(reportError)
    }
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
            message={reportError.message}
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
