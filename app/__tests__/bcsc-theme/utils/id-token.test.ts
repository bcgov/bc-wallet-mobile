import { BCSCCardType } from '@/bcsc-theme/types/cards'
import { BCSCAccountType, getIdTokenMetadata } from '@/bcsc-theme/utils/id-token'
import * as BcscCore from 'react-native-bcsc-core'

describe('ID Token Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  describe('getIdTokenMetadata', () => {
    it('should decode and parse a valid ID token', async () => {
      const bcscCoreMock = jest.mocked(BcscCore)

      const mockIdToken = {}
      const mockLogger: any = { error: jest.fn() }

      bcscCoreMock.decodePayload = jest.fn().mockResolvedValue(JSON.stringify(mockIdToken))

      const idToken = await getIdTokenMetadata('token', mockLogger)

      expect(bcscCoreMock.decodePayload).toHaveBeenCalledWith('token')
      expect(idToken).toEqual(mockIdToken)
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    it('should throw an error when unable to decode the ID token', async () => {
      const bcscCoreMock = jest.mocked(BcscCore)

      const mockLogger: any = { error: jest.fn() }

      bcscCoreMock.decodePayload = jest.fn().mockRejectedValue(new Error('Decoding error'))

      await expect(getIdTokenMetadata('token', mockLogger)).rejects.toThrow('Decoding error')

      expect(bcscCoreMock.decodePayload).toHaveBeenCalledWith('token')
      expect(mockLogger.error).toHaveBeenCalledWith(
        'getIdTokenMetadata -> Failed to decode ID token payload',
        expect.any(Error)
      )
    })

    it('should set bcsc_card_type to Other if undefined and bcsc_account_type is Other', async () => {
      const bcscCoreMock = jest.mocked(BcscCore)

      const mockIdToken = {
        bcsc_account_type: BCSCAccountType.Other,
        bcsc_card_type: undefined,
      }

      const mockLogger: any = { error: jest.fn() }

      bcscCoreMock.decodePayload = jest.fn().mockResolvedValue(JSON.stringify(mockIdToken))

      const idToken = await getIdTokenMetadata('token', mockLogger)

      expect(bcscCoreMock.decodePayload).toHaveBeenCalledWith('token')
      expect(idToken).toEqual({
        bcsc_account_type: BCSCAccountType.Other,
        bcsc_card_type: BCSCCardType.Other,
      })
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    it('should not change bcsc_card_type if bcsc_account_type is not Other', async () => {
      const bcscCoreMock = jest.mocked(BcscCore)

      const mockIdToken = {
        bcsc_account_type: BCSCAccountType.Photo,
        bcsc_card_type: undefined,
      }

      const mockLogger: any = { error: jest.fn() }

      bcscCoreMock.decodePayload = jest.fn().mockResolvedValue(JSON.stringify(mockIdToken))

      const idToken = await getIdTokenMetadata('token', mockLogger)

      expect(bcscCoreMock.decodePayload).toHaveBeenCalledWith('token')
      expect(idToken).toEqual({
        bcsc_account_type: BCSCAccountType.Photo,
        bcsc_card_type: undefined,
      })
      expect(mockLogger.error).not.toHaveBeenCalled()
    })
  })
})
