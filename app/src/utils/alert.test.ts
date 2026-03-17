import { AppEventCode } from '@/events/appEventCode'
import { showAlert } from '@/utils/alert'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import i18n from 'i18next'
import { Alert } from 'react-native'

describe('showAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(i18n, 't').mockReturnValue('OK')
  })

  it('should render the alert with provided title and body', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation()

    showAlert('Test Title', 'Test Body')

    expect(alertSpy).toHaveBeenCalledTimes(1)
    expect(alertSpy).toHaveBeenCalledWith('Test Title', 'Test Body', expect.any(Array))
  })

  it('should use default OK action when no actions provided', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation()

    showAlert('Title', 'Body')

    const actions = alertSpy.mock.calls[0][2]
    expect(actions).toHaveLength(1)
    expect(actions?.[0].text).toBe('OK')
  })

  it('should use custom actions when provided', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation()
    const onPressMock = jest.fn()

    showAlert('Title', 'Body', [{ text: 'Custom', onPress: onPressMock }])

    const actions = alertSpy.mock.calls[0][2]
    expect(actions).toHaveLength(1)
    expect(actions?.[0].text).toBe('Custom')
  })

  it('should call onPress and track analytics event when button is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation()
    const onPressMock = jest.fn()
    const alertActionAnalyticsSpy = jest.spyOn(Analytics, 'trackAlertActionEvent')

    showAlert('Title', 'Body', [{ text: 'Confirm', onPress: onPressMock }], 'test_event' as AppEventCode)

    // Simulate button press
    const alertButtons = alertSpy.mock.calls[0][2]
    alertButtons?.[0].onPress?.()

    expect(onPressMock).toHaveBeenCalledTimes(1)
    expect(alertActionAnalyticsSpy).toHaveBeenCalledWith('test_event', 'Confirm')
  })

  it('should track alert display event when event is provided', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation()
    const alertDisplayAnalyticsSpy = jest.spyOn(Analytics, 'trackAlertDisplayEvent')

    showAlert('Title', 'Body', undefined, 'test_event' as AppEventCode)

    expect(alertSpy).toHaveBeenCalled()
    expect(alertDisplayAnalyticsSpy).toHaveBeenCalledWith('test_event')
  })

  it('should not track analytics when no event is provided', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation()
    const alertDisplayAnalyticsSpy = jest.spyOn(Analytics, 'trackAlertDisplayEvent')
    const alertActionAnalyticsSpy = jest.spyOn(Analytics, 'trackAlertActionEvent')

    showAlert('Title', 'Body', [{ text: 'OK', onPress: jest.fn() }])

    // Simulate button press
    const alertButtons = alertSpy.mock.calls[0][2]
    alertButtons?.[0].onPress?.()

    expect(alertDisplayAnalyticsSpy).not.toHaveBeenCalled()
    expect(alertActionAnalyticsSpy).not.toHaveBeenCalled()
  })
})
