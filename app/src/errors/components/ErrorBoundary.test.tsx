import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { Text } from 'react-native'
import { ErrorBoundaryWrapper } from './ErrorBoundary'

jest.mock('react-native-device-info', () => ({
  getVersion: () => '1.0.0',
  getBuildNumber: () => '42',
  getApplicationName: () => 'BCWallet',
  getSystemName: () => 'iOS',
  getSystemVersion: () => '17.0',
}))

jest.mock('react-native-safe-area-context', () => {
  const { createElement } = jest.requireActual('react')
  return {
    SafeAreaView: ({ children, ...props }: any) => createElement('SafeAreaView', props, children),
  }
})

jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon')

jest.mock('@bifold/core', () => ({
  AbstractBifoldLogger: class {},
  BifoldError: jest.requireActual('@bifold/core').BifoldError,
  testIdWithKey: (key: string) => `com.aries.bifold:id/${key}`,
}))

const createMockLogger = () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  trace: jest.fn(),
  report: jest.fn(),
})

let shouldThrow = false

const ThrowingComponent = () => {
  if (shouldThrow) {
    throw new Error('Test render error')
  }
  return <Text>Child content</Text>
}

describe('ErrorBoundaryWrapper', () => {
  let consoleErrorSpy: jest.SpyInstance
  let mockLogger: ReturnType<typeof createMockLogger>

  beforeEach(() => {
    jest.clearAllMocks()
    shouldThrow = false
    mockLogger = createMockLogger()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('normal rendering', () => {
    it('should render children when no error occurs', () => {
      const { getByText } = render(
        <ErrorBoundaryWrapper logger={mockLogger as any}>
          <Text>Safe content</Text>
        </ErrorBoundaryWrapper>
      )

      expect(getByText('Safe content')).toBeTruthy()
    })

    it('should not render ErrorInfoCard when there is no error', () => {
      const { queryByTestId } = render(
        <ErrorBoundaryWrapper logger={mockLogger as any}>
          <Text>Safe content</Text>
        </ErrorBoundaryWrapper>
      )

      expect(queryByTestId('com.aries.bifold:id/HeaderText')).toBeNull()
    })
  })

  describe('error catching', () => {
    it('should render ErrorInfoCard when a child throws', () => {
      shouldThrow = true

      const { getByTestId } = render(
        <ErrorBoundaryWrapper logger={mockLogger as any}>
          <ThrowingComponent />
        </ErrorBoundaryWrapper>
      )

      expect(getByTestId('com.aries.bifold:id/HeaderText')).toBeTruthy()
    })

    it('should display error name as title', () => {
      shouldThrow = true

      const { getByText } = render(
        <ErrorBoundaryWrapper logger={mockLogger as any}>
          <ThrowingComponent />
        </ErrorBoundaryWrapper>
      )

      expect(getByText('Error.Problem')).toBeTruthy()
    })

    it('should display error message as description', () => {
      shouldThrow = true

      const { getByText } = render(
        <ErrorBoundaryWrapper logger={mockLogger as any}>
          <ThrowingComponent />
        </ErrorBoundaryWrapper>
      )

      expect(getByText('Error.ProblemDescription')).toBeTruthy()
    })

    it('should not render children when in error state', () => {
      shouldThrow = true

      const { queryByText } = render(
        <ErrorBoundaryWrapper logger={mockLogger as any}>
          <ThrowingComponent />
        </ErrorBoundaryWrapper>
      )

      expect(queryByText('Child content')).toBeNull()
    })
  })

  describe('logging', () => {
    it('should log the error via logger.error', () => {
      shouldThrow = true

      render(
        <ErrorBoundaryWrapper logger={mockLogger as any}>
          <ThrowingComponent />
        </ErrorBoundaryWrapper>
      )

      expect(mockLogger.error).toHaveBeenCalledWith('ErrorBoundary caught an error:', expect.any(Error))
    })
  })

  describe('dismiss', () => {
    it('should re-render children after dismiss when error is fixed', () => {
      shouldThrow = true

      const { getByTestId, getByText, queryByTestId } = render(
        <ErrorBoundaryWrapper logger={mockLogger as any}>
          <ThrowingComponent />
        </ErrorBoundaryWrapper>
      )

      expect(getByTestId('com.aries.bifold:id/HeaderText')).toBeTruthy()

      shouldThrow = false
      fireEvent.press(getByTestId('com.aries.bifold:id/CloseButton'))

      expect(queryByTestId('com.aries.bifold:id/HeaderText')).toBeNull()
      expect(getByText('Child content')).toBeTruthy()
    })
  })

  describe('report', () => {
    it('should show the report button', () => {
      shouldThrow = true

      const { getByTestId } = render(
        <ErrorBoundaryWrapper logger={mockLogger as any}>
          <ThrowingComponent />
        </ErrorBoundaryWrapper>
      )

      expect(getByTestId('com.aries.bifold:id/ReportThisProblem')).toBeTruthy()
    })

    it('should log reported error via logger when report is pressed', () => {
      shouldThrow = true

      const { getByTestId } = render(
        <ErrorBoundaryWrapper logger={mockLogger as any}>
          <ThrowingComponent />
        </ErrorBoundaryWrapper>
      )

      mockLogger.error.mockClear()
      fireEvent.press(getByTestId('com.aries.bifold:id/ReportThisProblem'))

      expect(mockLogger.error).toHaveBeenCalledWith('ErrorBoundary reported:', expect.any(Error))
    })
  })

  describe('version footer', () => {
    it('should display version number in error state', () => {
      shouldThrow = true

      const { getByText } = render(
        <ErrorBoundaryWrapper logger={mockLogger as any}>
          <ThrowingComponent />
        </ErrorBoundaryWrapper>
      )

      expect(getByText('Settings.Version 1.0.0 (42)')).toBeTruthy()
    })
  })
})
