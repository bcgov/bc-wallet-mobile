import { Analytics } from '@/utils/analytics/analytics-singleton'
import { reportProblem } from '@/utils/logger'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { Text } from 'react-native'
import { AppError } from '../appError'
import { ErrorBoundary, ErrorBoundaryWrapper, trimComponentStack } from './ErrorBoundary'

jest.mock('@/utils/logger', () => {
  const actual = jest.requireActual('@/utils/logger')
  return { __esModule: true, ...actual, reportProblem: jest.fn(() => 'TEST-CODE') }
})

jest.mock('@/contexts/NavigationContainerContext', () => ({
  navigationRef: { isReady: () => false, getCurrentRoute: () => undefined },
}))

jest.mock('react-native-device-info', () => ({
  getVersion: () => '1.0.0',
  getBuildNumber: () => '42',
  getApplicationName: () => 'BCWallet',
  getSystemName: () => 'iOS',
  getSystemVersion: () => '17.0',
  getDeviceId: () => 'iPhone15,2',
}))

jest.mock('react-native-safe-area-context', () => {
  const { createElement } = jest.requireActual('react')
  return {
    SafeAreaView: ({ children, ...props }: any) => createElement('SafeAreaView', props, children),
  }
})

jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon')

jest.mock('@bifold/core', () => ({
  ...jest.requireActual('@bifold/core'),
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
  let mockLogger: ReturnType<typeof createMockLogger>

  beforeEach(() => {
    jest.clearAllMocks()
    shouldThrow = false
    mockLogger = createMockLogger()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
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

      expect(mockLogger.error).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        { component_stack: expect.stringContaining('ThrowingComponent') },
        expect.any(Error)
      )
    })
  })

  describe('component stack', () => {
    const renderThrowing = (child: React.ReactNode = <ThrowingComponent />) => {
      shouldThrow = true
      return render(<ErrorBoundaryWrapper logger={mockLogger as any}>{child}</ErrorBoundaryWrapper>)
    }

    it('attaches the component stack to the reported error', () => {
      const addContextSpy = jest.spyOn(AppError.prototype, 'addContext')

      const { getByTestId } = renderThrowing()
      fireEvent.press(getByTestId('com.aries.bifold:id/ReportThisProblem'))

      const reported = (reportProblem as jest.Mock).mock.calls[0][0].error as AppError
      expect(reported.context.component_stack).toEqual(expect.stringContaining('ThrowingComponent'))
      expect(reported.toJSON().context.component_stack).toBe(reported.context.component_stack)
      expect(addContextSpy.mock.contexts[0]).toBe(reported)
    })

    it('adds the component stack before tracking', () => {
      const addContextSpy = jest.spyOn(AppError.prototype, 'addContext')
      const trackSpy = jest.spyOn(AppError.prototype, 'track')

      renderThrowing()

      expect(addContextSpy.mock.invocationCallOrder[0]).toBeLessThan(trackSpy.mock.invocationCallOrder[0])
    })

    it('keeps only the innermost frames of a deep tree', () => {
      const Nest = ({ depth }: { depth: number }) => (depth > 0 ? <Nest depth={depth - 1} /> : <ThrowingComponent />)

      const { getByTestId } = renderThrowing(<Nest depth={150} />)
      fireEvent.press(getByTestId('com.aries.bifold:id/ReportThisProblem'))

      const reported = (reportProblem as jest.Mock).mock.calls[0][0].error as AppError
      const stack = reported.context.component_stack as string
      const frames = stack.split('\n')
      // Jest frames carry absolute file paths, so the 8000-character cap can bind before the 100-frame cap
      expect(frames.length).toBeLessThanOrEqual(100)
      expect(frames.length).toBeLessThan(150)
      expect(stack.length).toBeLessThanOrEqual(8000)
      expect(frames[0]).toContain('ThrowingComponent')
    })

    it('does not send the component stack to analytics', () => {
      const trackErrorEventSpy = jest.spyOn(Analytics, 'trackErrorEvent').mockImplementation(() => {})

      renderThrowing()

      expect(trackErrorEventSpy).toHaveBeenCalledTimes(1)
      expect(JSON.stringify(trackErrorEventSpy.mock.calls[0][0])).not.toContain('ThrowingComponent')
    })

    it.each([[''], [null], [undefined]])('skips addContext but still logs and tracks when React gives %p', (stack) => {
      const addContextSpy = jest.spyOn(AppError.prototype, 'addContext')
      const trackSpy = jest.spyOn(AppError.prototype, 'track')
      const boundary = new ErrorBoundary({ children: null, t: (key: string) => key, logger: mockLogger as any })
      boundary.state = {
        hasError: true,
        error: ErrorBoundary.getDerivedStateFromError(new Error('boom')).error ?? null,
      }

      boundary.componentDidCatch(new Error('boom'), { componentStack: stack } as any)

      expect(addContextSpy).not.toHaveBeenCalled()
      expect(trackSpy).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        { component_stack: undefined },
        expect.any(Error)
      )
    })
  })

  describe('trimComponentStack', () => {
    it.each([
      ['empty string', ''],
      ['blank lines', '  \n  '],
      ['null', null],
      ['undefined', undefined],
    ])('returns undefined for %s', (_label, input) => {
      expect(trimComponentStack(input)).toBeUndefined()
    })

    it('trims indentation and joins frames with newlines', () => {
      expect(trimComponentStack('\n    at A (a.js:1)\n    at B (b.js:2)\n')).toBe('at A (a.js:1)\nat B (b.js:2)')
    })

    it('keeps the innermost 100 of 150 short frames', () => {
      const frames = Array.from({ length: 150 }, (_, i) => `at Frame${i}`)

      expect(trimComponentStack(frames.join('\n'))).toBe(frames.slice(0, 100).join('\n'))
    })

    it('cuts an oversized single frame to 8000 characters', () => {
      expect(trimComponentStack(`at ${'X'.repeat(20000)}`)).toHaveLength(8000)
    })

    it('cuts many medium frames on a frame boundary, keeping the innermost', () => {
      const frames = Array.from({ length: 90 }, (_, i) => `at Frame${i} ${'y'.repeat(200)}`)

      const result = trimComponentStack(frames.join('\n')) as string

      expect(result.length).toBeLessThanOrEqual(8000)
      const kept = result.split('\n')
      expect(kept.length).toBeLessThan(90)
      expect(kept[0]).toBe(frames[0])
      expect(kept).toEqual(frames.slice(0, kept.length))
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

    // handleReport must return the code, not just fire-and-forget, or the card has nothing to show.
    it('should surface the report ID returned by reportProblem when report is pressed', () => {
      shouldThrow = true

      const { getByTestId, getByText } = render(
        <ErrorBoundaryWrapper logger={mockLogger as any}>
          <ThrowingComponent />
        </ErrorBoundaryWrapper>
      )

      fireEvent.press(getByTestId('com.aries.bifold:id/ReportThisProblem'))

      expect(reportProblem).toHaveBeenCalledTimes(1)
      expect(getByTestId('com.aries.bifold:id/ReportId')).toBeTruthy()
      expect(getByText('TEST-CODE')).toBeTruthy()
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
