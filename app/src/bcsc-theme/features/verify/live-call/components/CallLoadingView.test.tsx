import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import CallLoadingView from './CallLoadingView'

jest.mock('@/bcsc-theme/components/BCAnimatedLoadingIcon', () => ({
  BCAnimatedLoadingIcon: () => null,
}))

describe('CallLoadingView', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('keeps Cancel available immediately and updates the status without changing the heading', () => {
    const onCancel = jest.fn()
    const view = render(<CallLoadingView onCancel={onCancel} progressPercent={0} />, { wrapper: BasicAppContext })

    expect(view.getByRole('progressbar', { name: 'BCSC.VideoCall.Loading.SettingThingsUp' })).toBeTruthy()
    const cancel = view.getByRole('button', { name: 'Global.Cancel' })
    expect(cancel).toBeEnabled()
    fireEvent.press(cancel)
    expect(onCancel).toHaveBeenCalledTimes(1)

    view.rerender(<CallLoadingView onCancel={onCancel} message="Uploading your photo..." progressPercent={0} />)
    expect(view.getByRole('progressbar', { name: 'Uploading your photo...' })).toBeTruthy()

    view.rerender(<CallLoadingView onCancel={onCancel} message="Creating video session..." progressPercent={25} />)
    expect(view.getByRole('progressbar', { name: 'Creating video session...' })).toBeTruthy()
    expect(view.queryByText('Uploading your photo...')).toBeNull()
    expect(view.getByText('BCSC.VideoCall.Loading.OneMomentPlease')).toBeTruthy()
    view.unmount()
  })

  it('preserves delayed feedback across stage changes while keeping status and Cancel available', () => {
    const onCancel = jest.fn()
    const view = render(<CallLoadingView onCancel={onCancel} message="Uploading your photo..." progressPercent={0} />, {
      wrapper: BasicAppContext,
    })
    const delayedMessage = 'BCSC.VideoCall.Loading.TakingLongerThanUsual'

    act(() => jest.advanceTimersByTime(10000))
    expect(view.queryByText(delayedMessage)).toBeNull()

    view.rerender(<CallLoadingView onCancel={onCancel} message="Creating video session..." progressPercent={25} />)
    act(() => jest.advanceTimersByTime(3199))
    expect(view.queryByText(delayedMessage)).toBeNull()
    act(() => jest.advanceTimersByTime(1))

    expect(view.getByText(delayedMessage)).toBeTruthy()
    expect(view.getByRole('progressbar', { name: 'Creating video session...' })).toBeTruthy()
    fireEvent.press(view.getByRole('button', { name: 'Global.Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    view.unmount()
  })
})
