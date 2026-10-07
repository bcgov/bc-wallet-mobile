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
    post: jest.fn(),
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

describe('useEvidenceApi - upload log context', () => {
  const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0])
  const mp4Bytes = Buffer.from([
    0,
    0,
    0,
    16,
    ...'ftyp'.split('').map((c) => c.charCodeAt(0)),
    ...'isom'.split('').map((c) => c.charCodeAt(0)),
    0,
    0,
    0,
    0,
  ])
  const unrecognizableBytes = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8])

  const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
  const mockStore: any = { bcsc: {}, bcscSecure: { deviceCode: 'test-device-code' } }

  const apiClient: any = {
    endpoints: { evidence: 'https://example.test/evidence' },
    get: jest.fn(),
    put: jest.fn().mockResolvedValue({ data: undefined }),
    post: jest.fn().mockResolvedValue({ data: undefined }),
    logger: mockLogger,
  }

  const renderApi = () => renderHook(() => useEvidenceApi(apiClient)).result

  beforeEach(() => {
    jest.clearAllMocks()
    apiClient.put.mockResolvedValue({ data: undefined })
    apiClient.post.mockResolvedValue({ data: undefined })
    ;(getAccount as jest.Mock).mockResolvedValue({ clientID: 'client-id', issuer: 'issuer' })
    jest.mocked(Bifold.useStore).mockReturnValue([mockStore as Bifold.State, jest.fn()])
  })

  it('attaches full binary context, sniffing the format from the buffer, for a document-kind photo binary upload', async () => {
    const result = renderApi()

    await act(async () => {
      await result.current.uploadPhotoEvidenceBinary('https://upload.test/photo', jpegBytes, 'document')
    })

    const [, , config] = apiClient.put.mock.calls[0]
    expect(config.uploadLogContext).toEqual({
      media_kind: 'document',
      media_stage: 'binary',
      media_bytes: jpegBytes.byteLength,
      media_format: 'image/jpeg',
    })
  })

  it('attaches media_kind "video" for a video binary upload', async () => {
    const result = renderApi()

    await act(async () => {
      await result.current.uploadVideoEvidenceBinary('https://upload.test/video', mp4Bytes)
    })

    const [, , config] = apiClient.put.mock.calls[0]
    expect(config.uploadLogContext).toEqual({
      media_kind: 'video',
      media_stage: 'binary',
      media_bytes: mp4Bytes.byteLength,
      media_format: 'video/mp4',
    })
  })

  it('omits media_format (not a placeholder) when the binary is unrecognizable, keeping the other fields', async () => {
    const result = renderApi()

    await act(async () => {
      await result.current.uploadPhotoEvidenceBinary('https://upload.test/photo', unrecognizableBytes, 'image')
    })

    const [, , config] = apiClient.put.mock.calls[0]
    expect(config.uploadLogContext).not.toHaveProperty('media_format')
    expect(config.uploadLogContext).toEqual({
      media_kind: 'image',
      media_stage: 'binary',
      media_bytes: unrecognizableBytes.byteLength,
    })
  })

  it('attaches metadata-stage context with content_length as media_bytes and a pass-through format for a photo', async () => {
    const result = renderApi()
    const payload = {
      label: 'front',
      content_type: 'image/jpeg',
      content_length: 12345,
      date: 0,
      sha256: 'sha',
    }

    await act(async () => {
      await result.current.uploadPhotoEvidenceMetadata(payload, 'image/heic')
    })

    const [, , config] = apiClient.post.mock.calls[0]
    expect(config.uploadLogContext).toEqual({
      media_kind: 'image',
      media_stage: 'metadata',
      media_bytes: 12345,
      media_format: 'image/heic',
    })
  })

  it('attaches metadata-stage context for a video', async () => {
    const result = renderApi()
    const payload = {
      content_type: 'video/mp4',
      content_length: 54321,
      date: 0,
      sha256: 'sha',
      duration: 10,
      prompts: [],
    }

    await act(async () => {
      await result.current.uploadVideoEvidenceMetadata(payload, 'video/mp4')
    })

    const [, , config] = apiClient.post.mock.calls[0]
    expect(config.uploadLogContext).toEqual({
      media_kind: 'video',
      media_stage: 'metadata',
      media_bytes: 54321,
      media_format: 'video/mp4',
    })
  })

  it('sums media_bytes across images and omits media_format for the multi-image document metadata call', async () => {
    const result = renderApi()
    const payload = {
      images: [
        { label: 'FRONT_SIDE', content_type: 'image/jpeg', content_length: 100, date: 0, sha256: 'a' },
        { label: 'BACK_SIDE', content_type: 'image/jpeg', content_length: 200, date: 0, sha256: 'b' },
      ],
    }

    await act(async () => {
      await result.current.sendEvidenceMetadata(payload)
    })

    const [, , config] = apiClient.post.mock.calls[0]
    expect(config.uploadLogContext).not.toHaveProperty('media_format')
    expect(config.uploadLogContext).toEqual({
      media_kind: 'document',
      media_stage: 'metadata',
      media_bytes: 300,
    })
  })
})
