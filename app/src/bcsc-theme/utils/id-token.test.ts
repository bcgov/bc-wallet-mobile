import { getIdTokenMetadata } from '@/bcsc-theme/utils/id-token'
import { AppError, ErrorRegistry } from '@/errors'
import { MockLogger } from '@bifold/core'
import * as BcscCore from 'react-native-bcsc-core'

describe('ID Token Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  describe('getIdTokenMetadata', () => {
    it('should decode and parse a valid ID token', async () => {
      const bcscCoreMock = jest.mocked(BcscCore)

      const mockIdToken = {}
      const mockLogger = new MockLogger()

      bcscCoreMock.decodePayload = jest.fn().mockResolvedValue(JSON.stringify(mockIdToken))

      const idToken = await getIdTokenMetadata('token', mockLogger)

      expect(bcscCoreMock.decodePayload).toHaveBeenCalledWith('token')
      expect(idToken).toEqual(mockIdToken)
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    it('should throw an error when unable to decode the ID token', async () => {
      const bcscCoreMock = jest.mocked(BcscCore)

      const mockLogger = new MockLogger()
      const mockError = new Error('Decoding error')

      bcscCoreMock.decodePayload = jest.fn().mockRejectedValue(mockError)

      await expect(getIdTokenMetadata('token', mockLogger)).rejects.toThrow(
        AppError.fromErrorDefinition(ErrorRegistry.DECRYPT_VERIFY_ID_TOKEN_ERROR, { cause: mockError })
      )

      expect(bcscCoreMock.decodePayload).toHaveBeenCalledWith('token')
      expect(mockLogger.error).toHaveBeenCalledWith(
        'getIdTokenMetadata -> Failed to decode ID token payload',
        mockError
      )
    })

    it('should set bcsc_card_type to Other if undefined and bcsc_account_type is Other', async () => {
      const bcscCoreMock = jest.mocked(BcscCore)

      const mockIdToken = {
        bcsc_account_type: BcscCore.BCSCAccountType.NoBcscCard,
        bcsc_card_type: undefined,
      }

      const mockLogger: any = { error: jest.fn() }

      bcscCoreMock.decodePayload = jest.fn().mockResolvedValue(JSON.stringify(mockIdToken))

      const idToken = await getIdTokenMetadata('token', mockLogger)

      expect(bcscCoreMock.decodePayload).toHaveBeenCalledWith('token')
      expect(idToken).toEqual({
        bcsc_account_type: BcscCore.BCSCAccountType.NoBcscCard,
        bcsc_card_type: BcscCore.BCSCCardType.NonBcsc,
      })
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    it('should not change bcsc_card_type if bcsc_account_type is not Other', async () => {
      const bcscCoreMock = jest.mocked(BcscCore)

      const mockIdToken = {
        bcsc_account_type: BcscCore.BCSCAccountType.PhotoCard,
        bcsc_card_type: undefined,
      }

      const mockLogger: any = { error: jest.fn() }

      bcscCoreMock.decodePayload = jest.fn().mockResolvedValue(JSON.stringify(mockIdToken))

      const idToken = await getIdTokenMetadata('token', mockLogger)

      expect(bcscCoreMock.decodePayload).toHaveBeenCalledWith('token')
      expect(idToken).toEqual({
        bcsc_account_type: BcscCore.BCSCAccountType.PhotoCard,
        bcsc_card_type: undefined,
      })
      expect(mockLogger.error).not.toHaveBeenCalled()
    })
  })
})
