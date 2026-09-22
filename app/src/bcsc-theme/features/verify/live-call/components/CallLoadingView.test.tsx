import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import CallLoadingView from './CallLoadingView'

jest.mock('@/bcsc-theme/components/BCAnimatedLoadingIcon', () => ({
  BCAnimatedLoadingIcon: () => null,
}))

describe('CallLoadingView', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('updates the status without changing the heading', () => {
    const onCancel = jest.fn()
    const view = render(<CallLoadingView onCancel={onCancel} progressPercent={0} />, { wrapper: BasicAppContext })

    expect(view.getByRole('progressbar', { name: 'BCSC.VideoCall.Loading.SettingThingsUp' })).toBeTruthy()

    view.rerender(<CallLoadingView onCancel={onCancel} message="Uploading your photo..." progressPercent={0} />)
    expect(view.getByRole('progressbar', { name: 'Uploading your photo...' })).toBeTruthy()

    view.rerender(<CallLoadingView onCancel={onCancel} message="Creating video session..." progressPercent={25} />)
    expect(view.getByRole('progressbar', { name: 'Creating video session...' })).toBeTruthy()
    expect(view.queryByText('Uploading your photo...')).toBeNull()
    expect(view.getByText('BCSC.VideoCall.Loading.OneMomentPlease')).toBeTruthy()
    view.unmount()
  })

  it('reveals Cancel and longer-wait feedback at 10 seconds despite stage changes', () => {
    const onCancel = jest.fn()
    const view = render(<CallLoadingView onCancel={onCancel} message="Uploading your photo..." progressPercent={0} />, {
      wrapper: BasicAppContext,
    })
    const delayedMessage = 'BCSC.VideoCall.Loading.TakingLongerThanUsual'
    const reservedButton = view.getByTestId(testIdWithKey(TestIds.verify.liveCall.cancel), {
      includeHiddenElements: true,
    })

    expect(reservedButton).toBeDisabled()
    expect(view.queryByRole('button', { name: 'Global.Cancel' })).toBeNull()
    fireEvent.press(reservedButton)
    expect(onCancel).not.toHaveBeenCalled()

    act(() => jest.advanceTimersByTime(5000))
    expect(view.queryByText(delayedMessage)).toBeNull()

    view.rerender(<CallLoadingView onCancel={onCancel} message="Creating video session..." progressPercent={25} />)
    act(() => jest.advanceTimersByTime(4999))
    expect(view.queryByText(delayedMessage)).toBeNull()
    expect(view.queryByRole('button', { name: 'Global.Cancel' })).toBeNull()
    act(() => jest.advanceTimersByTime(1))

    expect(view.getByText(delayedMessage)).toBeTruthy()
    expect(view.getByRole('progressbar', { name: 'Creating video session...' })).toBeTruthy()
    const cancel = view.getByRole('button', { name: 'Global.Cancel' })
    expect(cancel).toBe(reservedButton)
    expect(cancel).toBeEnabled()
    fireEvent.press(cancel)
    expect(onCancel).toHaveBeenCalledTimes(1)
    view.unmount()
  })
})
