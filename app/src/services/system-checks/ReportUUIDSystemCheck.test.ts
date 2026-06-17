import { ReportUUIDSystemCheck } from './ReportUUIDSystemCheck'

jest.mock('react-native-uuid', () => ({ v4: jest.fn().mockReturnValue('test-uuid-1234') }))
jest.mock('@/store', () => ({
  BCDispatchAction: { SET_REPORT_UUID: 'bcsc/setReportUUID' },
}))

const SET_REPORT_UUID = 'bcsc/setReportUUID'

describe('ReportUUIDSystemCheck', () => {
  const mockDispatch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('runCheck', () => {
    it('should return true when reportUUID is defined', () => {
      const check = new ReportUUIDSystemCheck('existing-uuid', mockDispatch)
      expect(check.runCheck()).toBe(true)
    })

    it('should return false when reportUUID is undefined', () => {
      const check = new ReportUUIDSystemCheck(undefined, mockDispatch)
      expect(check.runCheck()).toBe(false)
    })

    it('should return false when reportUUID is an empty string', () => {
      const check = new ReportUUIDSystemCheck('', mockDispatch)
      expect(check.runCheck()).toBe(false)
    })
  })

  describe('onFail', () => {
    it('should call setReportUUID with a generated uuid', () => {
      const check = new ReportUUIDSystemCheck(undefined, mockDispatch)
      check.onFail()
    })

    it('should dispatch SET_REPORT_UUID with the generated uuid', () => {
      const check = new ReportUUIDSystemCheck(undefined, mockDispatch)
      check.onFail()
      expect(mockDispatch).toHaveBeenCalledWith({
        type: SET_REPORT_UUID,
        payload: ['test-uuid-1234'],
      })
    })
  })
})
