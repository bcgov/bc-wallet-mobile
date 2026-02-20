import { MockLogger } from '@bifold/core'
import * as BcscCore from 'react-native-bcsc-core'
import { initIssuer } from './issuer'

describe('initIssuer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not set the issuer if it is already defined', async () => {
    const getIssuerSpy = jest.spyOn(BcscCore, 'getIssuer')
    const setIssuerSpy = jest.spyOn(BcscCore, 'setIssuer')
    const mockLogger = new MockLogger()

    getIssuerSpy.mockResolvedValue('https://example.com/issuer')

    await initIssuer(mockLogger as any)

    expect(getIssuerSpy).toHaveBeenCalled()
    expect(setIssuerSpy).not.toHaveBeenCalled()
  })

  it('should set the issuer to the default value if it is not defined', async () => {
    const getIssuerSpy = jest.spyOn(BcscCore, 'getIssuer')
    const setIssuerSpy = jest.spyOn(BcscCore, 'setIssuer')
    const mockLogger = new MockLogger()

    getIssuerSpy.mockResolvedValue(null)

    await initIssuer(mockLogger as any)

    expect(getIssuerSpy).toHaveBeenCalled()
    expect(setIssuerSpy).toHaveBeenCalledWith('https://id.gov.bc.ca')
  })

  it('should log an error if there is an issue during initialization', async () => {
    const getIssuerSpy = jest.spyOn(BcscCore, 'getIssuer')
    const setIssuerSpy = jest.spyOn(BcscCore, 'setIssuer')
    const mockLogger = new MockLogger()
    const mockError = new Error('Initialization error')

    getIssuerSpy.mockRejectedValue(mockError)

    await initIssuer(mockLogger as any)

    expect(getIssuerSpy).toHaveBeenCalled()
    expect(setIssuerSpy).not.toHaveBeenCalled()
    expect(mockLogger.error).toHaveBeenCalledWith('[BCSCCore] Error initializing issuer', mockError)
  })
})
