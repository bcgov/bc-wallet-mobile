import { AppError, ErrorCategory } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { RemoteLogger } from '@bifold/remote-logs'
import { LogLevel } from '@credo-ts/core'
import Config from 'react-native-config'
import { autoDisableRemoteLoggingIntervalInMinutes } from '../constants'
import { appLogger, createAppLogger, reportProblem } from './logger'
import { createReportProblemLokiPayload, reportProblemLokiTransport } from './report-problem'

type ConfigModule = {
  REMOTE_LOGGING_URL: string
  LOG_LEVEL?: string
}

jest.mock('react-native-device-info', () => ({
  getApplicationName: jest.fn(() => 'TestApp'),
  getVersion: jest.fn(() => '1.2.3'),
  getBuildNumber: jest.fn(() => '77'),
  getSystemName: jest.fn(() => 'iOS'),
  getSystemVersion: jest.fn(() => '17.0'),
  getDeviceId: jest.fn(() => 'iPhone15,2'),
  getModel: jest.fn(() => 'iPhone 15 Pro'),
}))

jest.mock('react-native-config', () => ({
  REMOTE_LOGGING_URL: 'https://logs.example',
  LOG_LEVEL: 'warn',
}))

jest.mock('@bifold/remote-logs', () => {
  return {
    RemoteLogger: jest.fn().mockImplementation((options) => ({ options, warn: jest.fn(), error: jest.fn() })),
  }
})

// reportProblem's own payload-building and transport are unit-tested in report-problem.test.ts;
// mocked here so these tests only assert on reportProblem's orchestration (ID generation, URL
// check, delegation) without making a real network call.
jest.mock('./report-problem', () => ({
  createReportProblemLokiPayload: jest.fn(),
  reportProblemLokiTransport: jest.fn(),
}))

const mockedConfig = Config as ConfigModule
const RemoteLoggerMock = RemoteLogger as unknown as jest.Mock
const createReportProblemLokiPayloadMock = createReportProblemLokiPayload as jest.Mock
const reportProblemLokiTransportMock = reportProblemLokiTransport as jest.Mock

// Matches the ambiguity-free alphabet used by generateReferenceCode
// (digits 2-9 and A-Z excluding I, L, O, U), grouped as XXXX-XXXX.
const REFERENCE_CODE_PATTERN = /^[2-9A-HJKMNP-TV-Z]{4}-[2-9A-HJKMNP-TV-Z]{4}$/

describe('createAppLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedConfig.LOG_LEVEL = 'warn'
  })

  it('exports a singleton logger using env log level', () => {
    expect(appLogger).toBeDefined()
    expect((appLogger as unknown as { options: { logLevel: LogLevel } }).options.logLevel).toBe(LogLevel.Warn)
  })

  it('merges base labels, extra labels, and env-derived log level', () => {
    mockedConfig.LOG_LEVEL = 'info'
    RemoteLoggerMock.mockClear()
    createAppLogger({ subsystem: 'demo' })

    expect(RemoteLoggerMock).toHaveBeenCalledTimes(1)
    expect(RemoteLoggerMock).toHaveBeenCalledWith({
      lokiUrl: 'https://logs.example',
      lokiLabels: {
        application: 'testapp',
        version: '1.2.3-77',
        system: 'iOS v17.0',
        model: 'iPhone15,2',
        subsystem: 'demo',
      },
      autoDisableRemoteLoggingIntervalInMinutes,
      logLevel: LogLevel.Info,
    })
  })

  it('falls back to debug when env log level is missing or invalid', () => {
    delete mockedConfig.LOG_LEVEL
    RemoteLoggerMock.mockClear()
    createAppLogger()

    expect(RemoteLoggerMock).toHaveBeenCalledWith(expect.objectContaining({ logLevel: LogLevel.Debug }))
  })

  it('prefers explicit log level parameter over env config', () => {
    mockedConfig.LOG_LEVEL = 'fatal'
    RemoteLoggerMock.mockClear()
    createAppLogger({}, LogLevel.Error)

    expect(RemoteLoggerMock).toHaveBeenCalledWith(expect.objectContaining({ logLevel: LogLevel.Error }))
  })

  it('allows extra labels to override defaults', () => {
    RemoteLoggerMock.mockClear()

    createAppLogger({ application: 'custom-app' })

    expect(RemoteLoggerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lokiLabels: expect.objectContaining({ application: 'custom-app' }),
      })
    )
  })

  it.each([
    ['fatal', LogLevel.Fatal],
    ['error', LogLevel.Error],
    ['warning', LogLevel.Warn],
    ['trace', LogLevel.Debug],
    ['test', LogLevel.Debug],
    ['unknown', LogLevel.Debug],
  ])('maps env value %s to correct log level', (envValue, expectedLevel) => {
    mockedConfig.LOG_LEVEL = envValue
    RemoteLoggerMock.mockClear()

    createAppLogger()

    expect(RemoteLoggerMock).toHaveBeenCalledWith(expect.objectContaining({ logLevel: expectedLevel }))
  })
})

describe('reportProblem', () => {
  // Payload construction (device/stream labels, error flattening, stack-less errors, etc.) is
  // covered by report-problem.test.ts against the real createReportProblemLokiPayload. These
  // tests only exercise reportProblem's own orchestration: it generates an ID, checks the
  // configured Loki URL, and delegates to report-problem.ts — mocked here to isolate that.
  const appError = new AppError('stack trace details', {
    appEvent: 'test-event' as AppEventCode,
    statusCode: 2800,
    category: ErrorCategory.GENERAL,
  })

  const fakeError = {
    title: 'Boom',
    description: 'It exploded',
    code: 2800,
    error: appError,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    createReportProblemLokiPayloadMock.mockReturnValue({ streams: [{ stream: {}, values: [['0', '{}']] }] })
  })

  it('returns a reference code matching the expected format', () => {
    expect(reportProblem(fakeError)).toMatch(REFERENCE_CODE_PATTERN)
  })

  it('builds the Loki payload with the reference code and sends it via the configured transport', () => {
    const refCode = reportProblem(fakeError)

    expect(createReportProblemLokiPayloadMock).toHaveBeenCalledWith(refCode, fakeError)
    expect(reportProblemLokiTransportMock).toHaveBeenCalledWith(
      'https://logs.example',
      createReportProblemLokiPayloadMock.mock.results[0].value,
      appLogger
    )
  })

  it('never throws and still returns a code when payload construction fails synchronously', () => {
    createReportProblemLokiPayloadMock.mockImplementationOnce(() => {
      throw new Error('bad payload')
    })

    let refCode: string | undefined
    expect(() => {
      refCode = reportProblem(fakeError)
    }).not.toThrow()
    expect(refCode).toMatch(REFERENCE_CODE_PATTERN)
    expect(reportProblemLokiTransportMock).not.toHaveBeenCalled()
  })

  it('never throws and still returns a code when the transport throws synchronously', () => {
    reportProblemLokiTransportMock.mockImplementationOnce(() => {
      throw new Error('network down')
    })

    let refCode: string | undefined
    expect(() => {
      refCode = reportProblem(fakeError)
    }).not.toThrow()
    expect(refCode).toMatch(REFERENCE_CODE_PATTERN)
  })
})
