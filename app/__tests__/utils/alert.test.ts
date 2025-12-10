import { AlertEvent } from '@/events/alertEvents'
import { showAlert } from '@/utils/alert'
import { Analytics } from '@/utils/analytics/analytics-singleton'
import i18n from 'i18next'

describe('showAlert', () => {
  it('should render the default alert with translations', () => {
    const renderAlertMock = jest.fn()
    const defaultOnPressMock = jest.fn()
    const translationSpy = jest.spyOn(i18n, 't')

    translationSpy.mockReturnValue('Translated Text')

    showAlert('test_event' as AlertEvent, [{ text: 'OK', onPress: defaultOnPressMock }], renderAlertMock)

    expect(renderAlertMock).toHaveBeenCalledTimes(1)
    expect(translationSpy).toHaveBeenCalledWith('Alerts.test_event.Title')
    expect(translationSpy).toHaveBeenCalledWith('Alerts.test_event.Body')

    expect(renderAlertMock).toHaveBeenCalledWith('Translated Text', 'Translated Text', [
      {
        text: 'OK',
        onPress: expect.any(Function),
      },
    ])
  })

  it('should call onPress and track analytics event when button is pressed', () => {
    const renderAlertMock = jest.fn()
    const onPressMock = jest.fn()
    const alertActionAnalticsSpy = jest.spyOn(Analytics, 'trackAlertActionEvent')
    const translationSpy = jest.spyOn(i18n, 't')

    translationSpy.mockReturnValue('Translated Text')
    showAlert('test_event' as AlertEvent, [{ text: 'Confirm', onPress: onPressMock }], renderAlertMock)

    // Simulate button press
    const alertButtons = renderAlertMock.mock.calls[0][2]
    alertButtons[0].onPress()

    expect(onPressMock).toHaveBeenCalledTimes(1)
    expect(alertActionAnalticsSpy).toHaveBeenCalledWith('test_event', 'Confirm')
  })

  it('should track alert display event', () => {
    const renderAlertMock = jest.fn()
    const alertDisplayAnalyticsSpy = jest.spyOn(Analytics, 'trackAlertDisplayEvent')
    const translationSpy = jest.spyOn(i18n, 't')

    translationSpy.mockReturnValue('Translated Text')
    showAlert('test_event' as AlertEvent, [], renderAlertMock)

    expect(alertDisplayAnalyticsSpy).toHaveBeenCalledWith('test_event')
  })
})
