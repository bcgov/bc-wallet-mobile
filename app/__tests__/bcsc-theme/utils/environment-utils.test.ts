import { prepareEnvironmentSwitch } from '@/bcsc-theme/utils/environment-utils'
import { BCDispatchAction, BCState } from '@/store'
import { MockLogger } from '@bifold/core'
import { Dispatch } from 'react'
import * as BcscCore from 'react-native-bcsc-core'

describe('prepareEnvironmentSwitch', () => {
  let mockLogger: any
  let dispatchMock: jest.MockedFunction<Dispatch<BCDispatchAction>>
  let mockState: BCState

  beforeEach(() => {
    jest.clearAllMocks()
    mockLogger = new MockLogger()
    dispatchMock = jest.fn()
    mockState = {
      developer: {
        iasApiBaseUrl: 'https://idsit.gov.bc.ca',
      },
    } as BCState
  })

  describe('early returns', () => {
    it('should return early when newApiBaseUrl is empty string', async () => {
      await prepareEnvironmentSwitch('', mockState, dispatchMock, mockLogger)

      expect(BcscCore.getAccount).not.toHaveBeenCalled()
      expect(dispatchMock).not.toHaveBeenCalled()
      expect(mockLogger.info).not.toHaveBeenCalled()
    })

    it('should return early when newApiBaseUrl is undefined', async () => {
      await prepareEnvironmentSwitch(undefined as any, mockState, dispatchMock, mockLogger)

      expect(BcscCore.getAccount).not.toHaveBeenCalled()
      expect(dispatchMock).not.toHaveBeenCalled()
      expect(mockLogger.info).not.toHaveBeenCalled()
    })

    it('should return early when newApiBaseUrl equals current URL', async () => {
      await prepareEnvironmentSwitch('https://idsit.gov.bc.ca', mockState, dispatchMock, mockLogger)

      expect(BcscCore.getAccount).not.toHaveBeenCalled()
      expect(dispatchMock).not.toHaveBeenCalled()
      expect(mockLogger.info).not.toHaveBeenCalled()
    })
  })

  describe('when no existing account', () => {
    beforeEach(() => {
      jest.mocked(BcscCore.getAccount).mockResolvedValue(null)
    })

    it('should dispatch refresh token and verified updates when no account exists', async () => {
      const newApiBaseUrl = 'https://idqa.gov.bc.ca'

      await prepareEnvironmentSwitch(newApiBaseUrl, mockState, dispatchMock, mockLogger)

      expect(BcscCore.getAccount).toHaveBeenCalled()
      expect(BcscCore.removeAccount).not.toHaveBeenCalled()
      expect(dispatchMock).toHaveBeenCalledTimes(2)
      expect(dispatchMock).toHaveBeenCalledWith(BCDispatchAction.UPDATE_REFRESH_TOKEN)
      expect(dispatchMock).toHaveBeenCalledWith(BCDispatchAction.UPDATE_VERIFIED)
    })

    it('should not dispatch CLEAR_BCSC when no account exists', async () => {
      const newApiBaseUrl = 'https://idqa.gov.bc.ca'

      await prepareEnvironmentSwitch(newApiBaseUrl, mockState, dispatchMock, mockLogger)

      expect(dispatchMock).not.toHaveBeenCalledWith(BCDispatchAction.CLEAR_BCSC)
    })
  })

  describe('when existing account with matching issuer', () => {
    it('should return early without removing account when issuer matches', async () => {
      const newApiBaseUrl = 'https://idqa.gov.bc.ca'
      const mockAccount = {
        issuer: `${newApiBaseUrl}/device/`,
        subject: 'test-subject',
      }
      jest.mocked(BcscCore.getAccount).mockResolvedValue(mockAccount as any)

      await prepareEnvironmentSwitch(newApiBaseUrl, mockState, dispatchMock, mockLogger)

      expect(BcscCore.getAccount).toHaveBeenCalled()
      expect(BcscCore.removeAccount).not.toHaveBeenCalled()
      // When issuer matches, function returns early without dispatching final actions
      expect(dispatchMock).not.toHaveBeenCalled()
    })

    it('should not dispatch CLEAR_BCSC when issuer matches', async () => {
      const newApiBaseUrl = 'https://idqa.gov.bc.ca'
      const mockAccount = {
        issuer: `${newApiBaseUrl}/device/`,
        subject: 'test-subject',
      }
      jest.mocked(BcscCore.getAccount).mockResolvedValue(mockAccount as any)

      await prepareEnvironmentSwitch(newApiBaseUrl, mockState, dispatchMock, mockLogger)

      expect(dispatchMock).not.toHaveBeenCalledWith(BCDispatchAction.CLEAR_BCSC)
    })
  })

  describe('when existing account with different issuer', () => {
    it('should remove account and dispatch CLEAR_BCSC when issuer differs', async () => {
      const newApiBaseUrl = 'https://idqa.gov.bc.ca'
      const mockAccount = {
        issuer: 'https://idsit.gov.bc.ca/device/',
        subject: 'test-subject',
      }
      jest.mocked(BcscCore.getAccount).mockResolvedValue(mockAccount as any)
      jest.mocked(BcscCore.removeAccount).mockResolvedValue(undefined)

      await prepareEnvironmentSwitch(newApiBaseUrl, mockState, dispatchMock, mockLogger)

      expect(BcscCore.removeAccount).toHaveBeenCalled()
      expect(dispatchMock).toHaveBeenCalledWith(BCDispatchAction.CLEAR_BCSC)
    })

    it('should dispatch all three actions when removing old account', async () => {
      const newApiBaseUrl = 'https://idqa.gov.bc.ca'
      const mockAccount = {
        issuer: 'https://idsit.gov.bc.ca/device/',
        subject: 'test-subject',
      }
      jest.mocked(BcscCore.getAccount).mockResolvedValue(mockAccount as any)
      jest.mocked(BcscCore.removeAccount).mockResolvedValue(undefined)

      await prepareEnvironmentSwitch(newApiBaseUrl, mockState, dispatchMock, mockLogger)

      expect(dispatchMock).toHaveBeenCalledTimes(3)
      expect(dispatchMock).toHaveBeenCalledWith(BCDispatchAction.CLEAR_BCSC)
      expect(dispatchMock).toHaveBeenCalledWith(BCDispatchAction.UPDATE_REFRESH_TOKEN)
      expect(dispatchMock).toHaveBeenCalledWith(BCDispatchAction.UPDATE_VERIFIED)
    })
  })

  describe('error handling', () => {
    it('should log error and continue when getAccount throws', async () => {
      const newApiBaseUrl = 'https://idqa.gov.bc.ca'
      const error = new Error('getAccount failed')
      jest.mocked(BcscCore.getAccount).mockRejectedValue(error)

      await prepareEnvironmentSwitch(newApiBaseUrl, mockState, dispatchMock, mockLogger)

      expect(mockLogger.error).toHaveBeenCalledWith('Error checking/removing old account', {
        error,
      })
      expect(dispatchMock).toHaveBeenCalledTimes(2)
      expect(dispatchMock).toHaveBeenCalledWith(BCDispatchAction.UPDATE_REFRESH_TOKEN)
      expect(dispatchMock).toHaveBeenCalledWith(BCDispatchAction.UPDATE_VERIFIED)
    })

    it('should log error and continue when removeAccount throws', async () => {
      const newApiBaseUrl = 'https://idqa.gov.bc.ca'
      const mockAccount = {
        issuer: 'https://idsit.gov.bc.ca/device/',
        subject: 'test-subject',
      }
      const error = new Error('removeAccount failed')
      jest.mocked(BcscCore.getAccount).mockResolvedValue(mockAccount as any)
      jest.mocked(BcscCore.removeAccount).mockRejectedValue(error)

      await prepareEnvironmentSwitch(newApiBaseUrl, mockState, dispatchMock, mockLogger)

      expect(mockLogger.error).toHaveBeenCalledWith('Error checking/removing old account', {
        error,
      })
      expect(dispatchMock).toHaveBeenCalledTimes(2)
      expect(dispatchMock).toHaveBeenCalledWith(BCDispatchAction.UPDATE_REFRESH_TOKEN)
      expect(dispatchMock).toHaveBeenCalledWith(BCDispatchAction.UPDATE_VERIFIED)
    })

    it('should not throw when getAccount fails', async () => {
      const newApiBaseUrl = 'https://idqa.gov.bc.ca'
      jest.mocked(BcscCore.getAccount).mockRejectedValue(new Error('getAccount failed'))

      await expect(prepareEnvironmentSwitch(newApiBaseUrl, mockState, dispatchMock, mockLogger)).resolves.not.toThrow()
    })

    it('should not throw when removeAccount fails', async () => {
      const newApiBaseUrl = 'https://idqa.gov.bc.ca'
      const mockAccount = {
        issuer: 'https://idsit.gov.bc.ca/device/',
        subject: 'test-subject',
      }
      jest.mocked(BcscCore.getAccount).mockResolvedValue(mockAccount as any)
      jest.mocked(BcscCore.removeAccount).mockRejectedValue(new Error('removeAccount failed'))

      await expect(prepareEnvironmentSwitch(newApiBaseUrl, mockState, dispatchMock, mockLogger)).resolves.not.toThrow()
    })

    it('should still log completion message after error', async () => {
      const newApiBaseUrl = 'https://idqa.gov.bc.ca'
      jest.mocked(BcscCore.getAccount).mockRejectedValue(new Error('getAccount failed'))

      await prepareEnvironmentSwitch(newApiBaseUrl, mockState, dispatchMock, mockLogger)

      expect(mockLogger.info).toHaveBeenCalledWith('Environment switch preparation complete')
    })
  })
})
