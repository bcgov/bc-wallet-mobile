import useEvidenceApi from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { cancelVerificationReminders } from '@/services/notifications/verificationReminders'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import { getAccount } from 'react-native-bcsc-core'

jest.mock('react-native-bcsc-core')
jest.mock('@/services/notifications/verificationReminders', () => ({
  cancelVerificationReminders: jest.fn(),
  scheduleVerificationReminders: jest.fn(),
}))

const mockUpdateDeviceCodes = jest.fn().mockResolvedValue(undefined)
const mockUpdateVerificationRequest = jest.fn()
jest.mock('@/bcsc-theme/hooks/useSecureActions', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    updateDeviceCodes: mockUpdateDeviceCodes,
    updateVerificationRequest: mockUpdateVerificationRequest,
  })),
}))

jest.mock('@bifold/core', () => {
  const actual = jest.requireActual('@bifold/core')
  return { ...actual, useStore: jest.fn() }
})

describe('useEvidenceApi - verification deadline reconciliation', () => {
  const CURRENT_EXPIRY = new Date('2026-06-08T12:00:00Z')
  const TWO_DAYS = 172800

  const submitPayload = { upload_uris: ['u1'], sha256: 'sha' }

  const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
  const mockDispatch = jest.fn()
  const mockStore: any = {
    bcsc: {},
    bcscSecure: { deviceCode: 'test-device-code', deviceCodeExpiresAt: CURRENT_EXPIRY },
  }

  const apiClient: any = {
    endpoints: { evidence: 'https://example.test/evidence' },
    get: jest.fn(),
    put: jest.fn(),
    logger: mockLogger,
  }

  const renderApi = () => renderHook(() => useEvidenceApi(apiClient)).result

  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdateDeviceCodes.mockResolvedValue(undefined)
    ;(getAccount as jest.Mock).mockResolvedValue({ clientID: 'client-id', issuer: 'issuer' })
    jest.mocked(Bifold.useStore).mockReturnValue([mockStore as Bifold.State, mockDispatch])
  })

  it('cancels reminders when status is verified and does not touch the deadline', async () => {
    apiClient.get.mockResolvedValue({ data: { id: 'v1', status: 'verified' } })
    const result = renderApi()

    await act(async () => {
      await result.current.getVerificationRequestStatus('v1')
    })

    expect(cancelVerificationReminders).toHaveBeenCalledWith(mockLogger)
    expect(mockUpdateDeviceCodes).not.toHaveBeenCalled()
  })

  it('cancels reminders when status is cancelled', async () => {
    apiClient.get.mockResolvedValue({ data: { id: 'v1', status: 'cancelled' } })
    const result = renderApi()

    await act(async () => {
      await result.current.getVerificationRequestStatus('v1')
    })

    expect(cancelVerificationReminders).toHaveBeenCalledWith(mockLogger)
    expect(mockUpdateDeviceCodes).not.toHaveBeenCalled()
  })

  it('extends the deadline (existing expiry + expiry_extended_by, pinned to end of day) on the submit PUT', async () => {
    apiClient.put.mockResolvedValue({ data: { id: 'v1', status: 'pending', expiry_extended_by: TWO_DAYS } })
    const result = renderApi()

    await act(async () => {
      await result.current.sendVerificationRequest('v1', submitPayload)
    })

    const expected = new Date(CURRENT_EXPIRY.getTime() + TWO_DAYS * 1000)
    expected.setHours(23, 59, 59, 0)
    expect(mockUpdateDeviceCodes).toHaveBeenCalledWith({ deviceCodeExpiresAt: expected })
    expect(cancelVerificationReminders).not.toHaveBeenCalled()
  })

  it('never extends the deadline from a status GET, even if the response carries an extension field', async () => {
    // The status GET carries no expiry field on the wire; polling it must not compound the deadline.
    apiClient.get.mockResolvedValue({ data: { id: 'v1', status: 'pending', expiry_extended_by: TWO_DAYS } })
    const result = renderApi()

    await act(async () => {
      await result.current.getVerificationRequestStatus('v1')
      await result.current.getVerificationRequestStatus('v1')
    })

    expect(mockUpdateDeviceCodes).not.toHaveBeenCalled()
  })

  it('does nothing when the submit response carries no expiry_extended_by', async () => {
    apiClient.put.mockResolvedValue({ data: { id: 'v1', status: 'pending' } })
    const result = renderApi()

    await act(async () => {
      await result.current.sendVerificationRequest('v1', submitPayload)
    })

    expect(mockUpdateDeviceCodes).not.toHaveBeenCalled()
  })

  it.each([['not-a-number'], [Number.NaN], [Number.POSITIVE_INFINITY], [0], [-1]])(
    'does nothing when expiry_extended_by is %p',
    async (expiryExtendedBy) => {
      apiClient.put.mockResolvedValue({ data: { id: 'v1', status: 'pending', expiry_extended_by: expiryExtendedBy } })
      const result = renderApi()

      await act(async () => {
        await result.current.sendVerificationRequest('v1', submitPayload)
      })

      expect(mockUpdateDeviceCodes).not.toHaveBeenCalled()
    }
  )

  it('does not move the deadline earlier when the extension would not push it later', async () => {
    // Existing expiry already near end-of-day; a tiny extension pins back to the same day's 23:59:59,
    // which is not later, so the only-ever-extend guard leaves it untouched.
    jest.mocked(Bifold.useStore).mockReturnValue([
      {
        ...mockStore,
        bcscSecure: { deviceCode: 'test-device-code', deviceCodeExpiresAt: new Date('2026-06-08T23:59:59.500Z') },
      } as Bifold.State,
      mockDispatch,
    ])
    apiClient.put.mockResolvedValue({ data: { id: 'v1', status: 'pending', expiry_extended_by: 0.4 } })
    const result = renderApi()

    await act(async () => {
      await result.current.sendVerificationRequest('v1', submitPayload)
    })

    expect(mockUpdateDeviceCodes).not.toHaveBeenCalled()
  })

  it('does nothing when there is no existing expiry to extend', async () => {
    jest.mocked(Bifold.useStore).mockReturnValue([
      {
        ...mockStore,
        bcscSecure: { deviceCode: 'test-device-code', deviceCodeExpiresAt: undefined },
      } as Bifold.State,
      mockDispatch,
    ])
    apiClient.put.mockResolvedValue({ data: { id: 'v1', status: 'pending', expiry_extended_by: TWO_DAYS } })
    const result = renderApi()

    await act(async () => {
      await result.current.sendVerificationRequest('v1', submitPayload)
    })

    expect(mockUpdateDeviceCodes).not.toHaveBeenCalled()
  })

  it('cancels reminders and skips the extension when the submit response is terminal', async () => {
    apiClient.put.mockResolvedValue({ data: { id: 'v1', status: 'cancelled', expiry_extended_by: TWO_DAYS } })
    const result = renderApi()

    await act(async () => {
      await result.current.sendVerificationRequest('v1', submitPayload)
    })

    expect(cancelVerificationReminders).toHaveBeenCalledWith(mockLogger)
    expect(mockUpdateDeviceCodes).not.toHaveBeenCalled()
  })

  it('logs and does not throw when persisting the extended expiry fails', async () => {
    mockUpdateDeviceCodes.mockRejectedValueOnce(new Error('storage boom'))
    apiClient.put.mockResolvedValue({ data: { id: 'v1', status: 'pending', expiry_extended_by: TWO_DAYS } })
    const result = renderApi()

    await act(async () => {
      await expect(result.current.sendVerificationRequest('v1', submitPayload)).resolves.toMatchObject({
        status: 'pending',
      })
    })

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to persist extended expiry'),
      expect.objectContaining({ error: expect.any(Error) })
    )
  })
})
