import { InstallIdSystemCheck } from './InstallIdSystemCheck'

jest.mock('react-native-uuid', () => ({ v4: jest.fn().mockReturnValue('test-uuid-1234') }))

describe('InstallIdSystemCheck', () => {
  const mockSaveInstallId = jest.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('runCheck', () => {
    it('should return true when installId is defined', () => {
      const check = new InstallIdSystemCheck('existing-uuid', mockSaveInstallId)
      expect(check.runCheck()).toBe(true)
    })

    it('should return false when installId is undefined', () => {
      const check = new InstallIdSystemCheck(undefined, mockSaveInstallId)
      expect(check.runCheck()).toBe(false)
    })

    it('should return false when installId is an empty string', () => {
      const check = new InstallIdSystemCheck('', mockSaveInstallId)
      expect(check.runCheck()).toBe(false)
    })
  })

  describe('onFail', () => {
    it('should save the generated uuid as the install ID', () => {
      const check = new InstallIdSystemCheck(undefined, mockSaveInstallId)
      check.onFail()
      expect(mockSaveInstallId).toHaveBeenCalledWith('test-uuid-1234')
    })
  })
})
