import useApi from '@/bcsc-theme/api/hooks/useApi'
import useSetupStepsModel from '@/bcsc-theme/features/verify/_models/useSetupStepsModel'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useSetupSteps } from '@/hooks/useSetupSteps'
import { BCDispatchAction } from '@/store'
import * as Bifold from '@bifold/core'
import { act, renderHook } from '@testing-library/react-native'
import { Alert } from 'react-native'

jest.mock('@/bcsc-theme/api/hooks/useApi')
jest.mock('@/hooks/useSetupSteps')
jest.mock('@bifold/core', () => {
  const actual = jest.requireActual('@bifold/core')
  return {
    ...actual,
    useStore: jest.fn(),
    useServices: jest.fn(),
  }
})

describe('useSetupStepsModel', () => {
  const mockDispatch = jest.fn()
  const mockLogger = {
    error: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }
  const mockNavigation = {
    navigate: jest.fn(),
  } as any

  const mockStore: any = {
    bcsc: {
      verificationRequestId: 'test-verification-id',
      deviceCode: 'test-device-code',
      userCode: 'test-user-code',
      cardType: 'combined',
    },
  }

  const mockEvidenceApi = {
    getVerificationRequestStatus: jest.fn(),
    cancelVerificationRequest: jest.fn(),
  }

  const mockTokenApi = {
    checkDeviceCodeStatus: jest.fn(),
  }

  const mockSteps = {
    nickname: { completed: true, focused: false, subtext: ['Account: Test'] },
    id: {
      completed: true,
      focused: false,
      subtext: ['BCSC: 12345'],
      nonBcscNeedsAdditionalCard: false,
      nonPhotoBcscNeedsAdditionalCard: false,
    },
    address: { completed: true, focused: false, subtext: ['123 Main St'] },
    email: { completed: true, focused: false, subtext: [] },
    verify: { completed: false, focused: true, subtext: ['Complete by Jan 1'] },
    currentStep: 'verify' as const,
    allCompleted: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()

    const useApiMock = jest.mocked(useApi)
    useApiMock.mockReturnValue({
      evidence: mockEvidenceApi,
      token: mockTokenApi,
    } as any)

    const useSetupStepsMock = jest.mocked(useSetupSteps)
    useSetupStepsMock.mockReturnValue(mockSteps)

    const bifoldMock = jest.mocked(Bifold)
    bifoldMock.useStore.mockReturnValue([mockStore, mockDispatch])
    bifoldMock.useServices.mockReturnValue([mockLogger] as any)
  })

  describe('Initial state', () => {
    it('should return steps and step actions', () => {
      const { result } = renderHook(() => useSetupStepsModel(mockNavigation))

      expect(result.current.steps).toEqual(mockSteps)
      expect(result.current.stepActions).toBeDefined()
      expect(result.current.handleCheckStatus).toBeDefined()
      expect(result.current.handleCancelVerification).toBeDefined()
    })
  })

  describe('stepActions.nickname', () => {
    it('should navigate to NicknameAccount screen', () => {
      const { result } = renderHook(() => useSetupStepsModel(mockNavigation))

      result.current.stepActions.nickname()

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.NicknameAccount)
    })
  })

  describe('stepActions.id', () => {
    it('should navigate to IdentitySelection when id step is not completed', () => {
      const useSetupStepsMock = jest.mocked(useSetupSteps)
      useSetupStepsMock.mockReturnValue({
        ...mockSteps,
        id: {
          ...mockSteps.id,
          completed: false,
          nonBcscNeedsAdditionalCard: false,
          nonPhotoBcscNeedsAdditionalCard: false,
        },
      })

      const { result } = renderHook(() => useSetupStepsModel(mockNavigation))

      result.current.stepActions.id()

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.IdentitySelection)
    })

    it('should navigate to EvidenceTypeList when nonBcscNeedsAdditionalCard is true', () => {
      const useSetupStepsMock = jest.mocked(useSetupSteps)
      useSetupStepsMock.mockReturnValue({
        ...mockSteps,
        id: {
          ...mockSteps.id,
          completed: false,
          nonBcscNeedsAdditionalCard: true,
          nonPhotoBcscNeedsAdditionalCard: false,
        },
      })

      const { result } = renderHook(() => useSetupStepsModel(mockNavigation))

      result.current.stepActions.id()

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.EvidenceTypeList)
    })

    it('should navigate to AdditionalIdentificationRequired when nonPhotoBcscNeedsAdditionalCard is true', () => {
      const useSetupStepsMock = jest.mocked(useSetupSteps)
      useSetupStepsMock.mockReturnValue({
        ...mockSteps,
        id: {
          ...mockSteps.id,
          completed: false,
          nonBcscNeedsAdditionalCard: false,
          nonPhotoBcscNeedsAdditionalCard: true,
        },
      })

      const { result } = renderHook(() => useSetupStepsModel(mockNavigation))

      result.current.stepActions.id()

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.AdditionalIdentificationRequired)
    })

    it('should not navigate when id step is completed', () => {
      const useSetupStepsMock = jest.mocked(useSetupSteps)
      useSetupStepsMock.mockReturnValue({
        ...mockSteps,
        id: {
          ...mockSteps.id,
          completed: true,
          nonBcscNeedsAdditionalCard: false,
          nonPhotoBcscNeedsAdditionalCard: false,
        },
      })

      const { result } = renderHook(() => useSetupStepsModel(mockNavigation))

      result.current.stepActions.id()

      expect(mockNavigation.navigate).not.toHaveBeenCalled()
    })
  })

  describe('stepActions.address', () => {
    it('should navigate to ResidentialAddress screen', () => {
      const { result } = renderHook(() => useSetupStepsModel(mockNavigation))

      result.current.stepActions.address()

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.ResidentialAddress)
    })
  })

  describe('stepActions.email', () => {
    it('should navigate to EnterEmail screen with cardType', () => {
      const { result } = renderHook(() => useSetupStepsModel(mockNavigation))

      result.current.stepActions.email()

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.EnterEmail, {
        cardType: mockStore.bcsc.cardType,
      })
    })
  })

  describe('stepActions.verify', () => {
    it('should navigate to VerificationMethodSelection screen', () => {
      const { result } = renderHook(() => useSetupStepsModel(mockNavigation))

      result.current.stepActions.verify()

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerificationMethodSelection)
    })
  })

  describe('handleCheckStatus', () => {
    it('should navigate to VerificationSuccess when status is verified and refresh_token is returned', async () => {
      mockEvidenceApi.getVerificationRequestStatus.mockResolvedValue({ status: 'verified' })
      mockTokenApi.checkDeviceCodeStatus.mockResolvedValue({ refresh_token: 'new-refresh-token' })

      const { result } = renderHook(() => useSetupStepsModel(mockNavigation))

      await act(async () => {
        await result.current.handleCheckStatus()
      })

      expect(mockEvidenceApi.getVerificationRequestStatus).toHaveBeenCalledWith('test-verification-id')
      expect(mockTokenApi.checkDeviceCodeStatus).toHaveBeenCalledWith('test-device-code', 'test-user-code')
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_REFRESH_TOKEN,
        payload: ['new-refresh-token'],
      })
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerificationSuccess)
    })

    it('should navigate to VerificationSuccess without updating refresh_token when not returned', async () => {
      mockEvidenceApi.getVerificationRequestStatus.mockResolvedValue({ status: 'verified' })
      mockTokenApi.checkDeviceCodeStatus.mockResolvedValue({})

      const { result } = renderHook(() => useSetupStepsModel(mockNavigation))

      await act(async () => {
        await result.current.handleCheckStatus()
      })

      expect(mockDispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: BCDispatchAction.UPDATE_REFRESH_TOKEN })
      )
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerificationSuccess)
    })

    it('should navigate to PendingReview when status is not verified', async () => {
      mockEvidenceApi.getVerificationRequestStatus.mockResolvedValue({ status: 'pending' })

      const { result } = renderHook(() => useSetupStepsModel(mockNavigation))

      await act(async () => {
        await result.current.handleCheckStatus()
      })

      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.PendingReview)
    })

    it('should throw error when verificationRequestId is missing', async () => {
      const storeWithoutRequestId = {
        bcsc: {
          verificationRequestId: null,
          deviceCode: 'test-device-code',
          userCode: 'test-user-code',
        },
      } as any
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([storeWithoutRequestId, mockDispatch])

      const { result } = renderHook(() => useSetupStepsModel(mockNavigation))

      await expect(result.current.handleCheckStatus()).rejects.toThrow()
    })

    it('should throw error when deviceCode is missing and status is verified', async () => {
      const storeWithoutDeviceCode = {
        bcsc: {
          verificationRequestId: 'test-verification-id',
          deviceCode: null,
          userCode: 'test-user-code',
        },
      } as any
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([storeWithoutDeviceCode, mockDispatch])
      mockEvidenceApi.getVerificationRequestStatus.mockResolvedValue({ status: 'verified' })

      const { result } = renderHook(() => useSetupStepsModel(mockNavigation))

      await expect(result.current.handleCheckStatus()).rejects.toThrow()
    })
  })

  describe('handleCancelVerification', () => {
    let alertSpy: jest.SpyInstance

    beforeEach(() => {
      alertSpy = jest.spyOn(Alert, 'alert')
    })

    it('should show confirmation alert when called', () => {
      const { result } = renderHook(() => useSetupStepsModel(mockNavigation))

      result.current.handleCancelVerification()

      expect(alertSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ text: expect.any(String), onPress: expect.any(Function) }),
          expect.objectContaining({ text: expect.any(String), style: 'cancel' }),
        ])
      )
    })

    it('should cancel verification request and navigate when confirmed', async () => {
      mockEvidenceApi.cancelVerificationRequest.mockResolvedValue(undefined)

      const { result } = renderHook(() => useSetupStepsModel(mockNavigation))

      result.current.handleCancelVerification()

      // Get the onPress handler for the delete button
      const alertCall = alertSpy.mock.calls[0]
      const deleteButton = alertCall[2][0]

      await act(async () => {
        await deleteButton.onPress()
      })

      expect(mockEvidenceApi.cancelVerificationRequest).toHaveBeenCalledWith('test-verification-id')
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_PENDING_VERIFICATION,
        payload: [false],
      })
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerificationMethodSelection)
    })

    it('should not call cancelVerificationRequest when verificationRequestId is missing', async () => {
      const storeWithoutRequestId = {
        bcsc: {
          verificationRequestId: null,
        },
      } as any
      const bifoldMock = jest.mocked(Bifold)
      bifoldMock.useStore.mockReturnValue([storeWithoutRequestId, mockDispatch])

      const { result } = renderHook(() => useSetupStepsModel(mockNavigation))

      result.current.handleCancelVerification()

      const alertCall = alertSpy.mock.calls[0]
      const deleteButton = alertCall[2][0]

      await act(async () => {
        await deleteButton.onPress()
      })

      expect(mockEvidenceApi.cancelVerificationRequest).not.toHaveBeenCalled()
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_PENDING_VERIFICATION,
        payload: [false],
      })
    })

    it('should log error and still dispatch and navigate when cancelVerificationRequest fails', async () => {
      const mockError = new Error('Network error')
      mockEvidenceApi.cancelVerificationRequest.mockRejectedValue(mockError)

      const { result } = renderHook(() => useSetupStepsModel(mockNavigation))

      result.current.handleCancelVerification()

      const alertCall = alertSpy.mock.calls[0]
      const deleteButton = alertCall[2][0]

      await act(async () => {
        await deleteButton.onPress()
      })

      expect(mockLogger.error).toHaveBeenCalledWith(`Error cancelling verification request: ${mockError}`)
      expect(mockDispatch).toHaveBeenCalledWith({
        type: BCDispatchAction.UPDATE_PENDING_VERIFICATION,
        payload: [false],
      })
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerificationMethodSelection)
    })

    it('should not do anything when cancel button is pressed', () => {
      const { result } = renderHook(() => useSetupStepsModel(mockNavigation))

      result.current.handleCancelVerification()

      const alertCall = alertSpy.mock.calls[0]
      const cancelButton = alertCall[2][1]

      cancelButton.onPress()

      expect(mockEvidenceApi.cancelVerificationRequest).not.toHaveBeenCalled()
      expect(mockDispatch).not.toHaveBeenCalled()
      expect(mockNavigation.navigate).not.toHaveBeenCalled()
    })
  })
})
