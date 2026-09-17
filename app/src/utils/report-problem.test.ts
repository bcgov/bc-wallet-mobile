import { AppError, ErrorCategory } from '@/errors'
import { AppEventCode } from '@/events/appEventCode'
import { RemoteLogger } from '@bifold/remote-logs'
import axios from 'axios'
import { getApplicationName, getBuildNumber, getDeviceId, getModel, getSystemName, getVersion } from 'react-native-device-info'
import { ReportProblem } from './logger'
import { createReportProblemLokiPayload, reportProblemLokiTransport } from './report-problem'

jest.mock('react-native-device-info', () => ({
  getApplicationName: jest.fn(() => 'TestApp'),
  getVersion: jest.fn(() => '1.2.3'),
  getBuildNumber: jest.fn(() => '77'),
  getSystemName: jest.fn(() => 'iOS'),
  getDeviceId: jest.fn(() => 'iPhone15,2'),
  getModel: jest.fn(() => 'iPhone 15 Pro'),
}))

jest.mock('axios', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}))

const axiosPostMock = axios.post as jest.Mock

// Lets pending .then/.catch handlers on the axios mock's promise chain settle before assertions run.
const flushPromises = () => Promise.resolve().then(() => Promise.resolve())

const baseProblem: ReportProblem = {
  title: 'Something went wrong',
  description: 'The app crashed when I tried to do X',
  code: 2800,
  installId: 'f3e2c1d4-5b6a-7c8d-9e0f-1a2b3c4d5e6f',
  sessionId: 1234567890,
}

describe('report-problem', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('reportProblemLokiTransport', () => {
    const payload = createReportProblemLokiPayload('7K2P-9XQF', baseProblem)
    const lokiLogger = { error: jest.fn() } as unknown as RemoteLogger

    it('posts the payload to the derived Loki URL with basic auth and a JSON content type', async () => {
      axiosPostMock.mockResolvedValueOnce({ status: 204 })

      reportProblemLokiTransport('https://loki-user:loki-pass@loki.example.com/loki/api/v1/push', payload, lokiLogger)
      await flushPromises()

      expect(axiosPostMock).toHaveBeenCalledWith('https://loki.example.com/loki/api/v1/push', payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from('loki-user:loki-pass').toString('base64')}`,
        },
      })
    })

    it('does not log an error when Loki responds with 204', async () => {
      axiosPostMock.mockResolvedValueOnce({ status: 204 })

      reportProblemLokiTransport('https://loki-user:loki-pass@loki.example.com', payload, lokiLogger)
      await flushPromises()

      expect(lokiLogger.error).not.toHaveBeenCalled()
    })

    it('logs an error when Loki responds with a non-204 status', async () => {
      axiosPostMock.mockResolvedValueOnce({ status: 500, data: 'server error' })

      reportProblemLokiTransport('https://loki-user:loki-pass@loki.example.com', payload, lokiLogger)
      await flushPromises()

      expect(lokiLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to report problem to Loki. Status: 500'),
        'server error'
      )
    })

    it('logs an error when the request rejects', async () => {
      const requestError = new Error('network down')
      axiosPostMock.mockRejectedValueOnce(requestError)

      reportProblemLokiTransport('https://loki-user:loki-pass@loki.example.com', payload, lokiLogger)
      await flushPromises()

      expect(lokiLogger.error).toHaveBeenCalledWith('[LokiTransport] Failed to report problem to Loki.', requestError)
    })
  })

  describe('createReportProblemLokiPayload', () => {

    it('builds a Loki streams payload with the expected stream labels', () => {
      const result = createReportProblemLokiPayload('7K2P-9XQF', baseProblem)

      expect(result.streams).toHaveLength(1)
      expect(result.streams[0].stream).toEqual({
        job: 'incident-report',
        level: 'error',
        environment: 'development',
        application: 'testapp',
        version: '1.2.3',
        build: '77',
        version_build: '1.2.3-77',
        system: 'ios',
        device: 'iPhone15,2',
        model: 'iPhone 15 Pro',
      })

      expect(getApplicationName).toHaveBeenCalled()
      expect(getVersion).toHaveBeenCalled()
      expect(getBuildNumber).toHaveBeenCalled()
      expect(getSystemName).toHaveBeenCalled()
      expect(getDeviceId).toHaveBeenCalled()
      expect(getModel).toHaveBeenCalled()
    })

    it('produces a single value entry with a nanosecond timestamp and JSON-encoded body', () => {
      jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00.000Z'))

      const result = createReportProblemLokiPayload('7K2P-9XQF', baseProblem)

      jest.useRealTimers()

      const [[timestamp, line]] = result.streams[0].values

      expect(result.streams[0].values).toHaveLength(1)
      expect(timestamp).toBe(`${Date.parse('2024-01-01T00:00:00.000Z')}000000`)
      expect(() => JSON.parse(line)).not.toThrow()
    })

    it('includes the report id, install id, session id, and problem details in the payload body', () => {
      const result = createReportProblemLokiPayload('7K2P-9XQF', baseProblem)
      const body = JSON.parse(result.streams[0].values[0][1])

      expect(body).toMatchObject({
        report_id: '7K2P-9XQF',
        install_id: 'f3e2c1d4-5b6a-7c8d-9e0f-1a2b3c4d5e6f',
        session_id: 1234567890,
        message: 'Something went wrong',
        description: 'The app crashed when I tried to do X',
        code: 2800,
      })
    })

    it('omits error fields from the body when no error is provided', () => {
      const result = createReportProblemLokiPayload('7K2P-9XQF', baseProblem)
      const body = JSON.parse(result.streams[0].values[0][1])

      expect(body).not.toHaveProperty('error_code')
      expect(body).not.toHaveProperty('error_json')
    })

    it('flattens the allow-listed context keys and error fields onto the top level when an error is provided', () => {
      const error = new AppError(
        'Failed to fetch resource',
        { category: ErrorCategory.NETWORK, appEvent: 'test-event' as AppEventCode, statusCode: 2100 },
        {
          track: false,
          context: {
            screen: 'HomeScreen',
            http_route: '/api/things',
            http_method: 'GET',
            http_status: 500,
            http_response_size: 42,
            http_request_size: 0,
            not_allow_listed: 'should be dropped',
          },
        }
      )

      const result = createReportProblemLokiPayload('7K2P-9XQF', { ...baseProblem, error })
      const body = JSON.parse(result.streams[0].values[0][1])

      expect(body).toMatchObject({
        error_code: error.code,
        error_status_code: 2100,
        error_app_event: 'test-event',
        error_message: 'Failed to fetch resource',
        screen: 'HomeScreen',
        http_route: '/api/things',
        http_method: 'GET',
        http_status: 500,
        http_response_size: 42,
        http_request_size: 0,
      })
      expect(body).not.toHaveProperty('not_allow_listed')
      expect(body.error_json).toEqual(error.toJSON())
    })

    it('omits an allow-listed context key from the flattened body when it is absent on the error', () => {
      const error = new AppError(
        'Failed to fetch resource',
        { category: ErrorCategory.NETWORK, appEvent: 'test-event' as AppEventCode, statusCode: 2100 },
        { track: false, context: { screen: 'HomeScreen' } }
      )

      const result = createReportProblemLokiPayload('7K2P-9XQF', { ...baseProblem, error })
      const body = JSON.parse(result.streams[0].values[0][1])

      expect(body).toHaveProperty('screen', 'HomeScreen')
      expect(body).not.toHaveProperty('http_route')
      expect(body).not.toHaveProperty('http_status')
    })
  })
})
