import type { BifoldError } from '@bifold/core'
import { RemoteLogger, lokiTransport } from '@bifold/remote-logs'
import { LogLevel } from '@credo-ts/core'
import Config from 'react-native-config'
import { autoDisableRemoteLoggingIntervalInMinutes } from '../constants'
import { appLogger, createAppLogger, reportProblem } from './logger'

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
}))

jest.mock('react-native-config', () => ({
  REMOTE_LOGGING_URL: 'https://logs.example',
  LOG_LEVEL: 'warn',
}))

jest.mock('@bifold/remote-logs', () => {
  return {
    RemoteLogger: jest.fn().mockImplementation((options) => ({ options })),
    lokiTransport: jest.fn(),
  }
})

const mockedConfig = Config as ConfigModule
const RemoteLoggerMock = RemoteLogger as unknown as jest.Mock
const lokiTransportMock = lokiTransport as unknown as jest.Mock

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
    expect((appLogger as unknown as { options: { logLevel: LogLevel } }).options.logLevel).toBe(LogLevel.warn)
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
        subsystem: 'demo',
      },
      autoDisableRemoteLoggingIntervalInMinutes,
      logLevel: LogLevel.info,
    })
  })

  it('falls back to debug when env log level is missing or invalid', () => {
    delete mockedConfig.LOG_LEVEL
    RemoteLoggerMock.mockClear()
    createAppLogger()

    expect(RemoteLoggerMock).toHaveBeenCalledWith(expect.objectContaining({ logLevel: LogLevel.debug }))
  })

  it('prefers explicit log level parameter over env config', () => {
    mockedConfig.LOG_LEVEL = 'fatal'
    RemoteLoggerMock.mockClear()
    createAppLogger({}, LogLevel.error)

    expect(RemoteLoggerMock).toHaveBeenCalledWith(expect.objectContaining({ logLevel: LogLevel.error }))
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
    ['fatal', LogLevel.fatal],
    ['error', LogLevel.error],
    ['warning', LogLevel.warn],
    ['trace', LogLevel.debug],
    ['test', LogLevel.debug],
    ['unknown', LogLevel.debug],
  ])('maps env value %s to correct log level', (envValue, expectedLevel) => {
    mockedConfig.LOG_LEVEL = envValue
    RemoteLoggerMock.mockClear()

    createAppLogger()

    expect(RemoteLoggerMock).toHaveBeenCalledWith(expect.objectContaining({ logLevel: expectedLevel }))
  })
})

describe('reportProblem', () => {
  const fakeError = {
    title: 'Boom',
    description: 'It exploded',
    code: 2800,
    message: 'stack trace details',
    stack: 'Error: Boom\n    at somewhere (file.ts:1:1)',
  } as unknown as BifoldError

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns a reference code matching the expected format', () => {
    expect(reportProblem(fakeError)).toMatch(REFERENCE_CODE_PATTERN)
  })

  it('sends an incident-report to Loki with the reference code as report_id', () => {
    const refCode = reportProblem(fakeError)

    expect(lokiTransportMock).toHaveBeenCalledTimes(1)
    const payload = lokiTransportMock.mock.calls[0][0]
    expect(payload.options.job).toBe('incident-report')
    expect(payload.options.lokiUrl).toBe('https://logs.example')
    expect(payload.rawMsg[0].message).toBe('Boom')
    expect(payload.rawMsg[0].data).toMatchObject({
      description: 'It exploded',
      code: 2800,
      message: 'stack trace details',
      stack: 'Error: Boom\n    at somewhere (file.ts:1:1)',
      report_id: refCode,
    })
  })

  it('never throws and still returns a code when the transport fails', () => {
    lokiTransportMock.mockImplementationOnce(() => {
      throw new Error('network down')
    })

    let refCode: string | undefined
    expect(() => {
      refCode = reportProblem(fakeError)
    }).not.toThrow()
    expect(refCode).toMatch(REFERENCE_CODE_PATTERN)
  })
})
