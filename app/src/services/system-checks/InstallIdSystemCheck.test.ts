import { InstallIdSystemCheck } from './InstallIdSystemCheck'

jest.mock('react-native-uuid', () => ({ v4: jest.fn().mockReturnValue('test-uuid-1234') }))
jest.mock('@/store', () => ({
  BCDispatchAction: { SET_INSTALL_ID: 'bcsc/setInstallId' },
}))

const SET_INSTALL_ID = 'bcsc/setInstallId'

describe('InstallIdSystemCheck', () => {
  const mockDispatch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('runCheck', () => {
    it('should return true when installId is defined', () => {
      const check = new InstallIdSystemCheck('existing-uuid', mockDispatch)
      expect(check.runCheck()).toBe(true)
    })

    it('should return false when installId is undefined', () => {
      const check = new InstallIdSystemCheck(undefined, mockDispatch)
      expect(check.runCheck()).toBe(false)
    })

    it('should return false when installId is an empty string', () => {
      const check = new InstallIdSystemCheck('', mockDispatch)
      expect(check.runCheck()).toBe(false)
    })
  })

  describe('onFail', () => {
    it('should dispatch SET_INSTALL_ID with the generated uuid', () => {
      const check = new InstallIdSystemCheck(undefined, mockDispatch)
      check.onFail()
      expect(mockDispatch).toHaveBeenCalledWith({
        type: SET_INSTALL_ID,
        payload: ['test-uuid-1234'],
      })
    })
  })
})
