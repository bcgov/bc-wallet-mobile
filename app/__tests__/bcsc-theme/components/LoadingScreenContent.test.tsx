import { LoadingScreenContent } from '@/bcsc-theme/features/splash-loading/LoadingScreenContent'
import { render } from '@testing-library/react-native'

describe('LoadingScreenContent Component', () => {
  it('renders message', () => {
    const tree = render(<LoadingScreenContent message={'TEST_LOADINGSCREENCONTENT'} />)

    expect(tree.getByText('TEST_LOADINGSCREENCONTENT')).toBeTruthy()
  })

  it('runs onLoaded callback when loading is false', () => {
    const onLoadedMock = jest.fn()

    render(<LoadingScreenContent loading={false} onLoaded={onLoadedMock} />)

    expect(onLoadedMock).toHaveBeenCalledTimes(1)
  })

  it('does not run onLoaded callback when loading is true', () => {
    const onLoadedMock = jest.fn()

    const { rerender } = render(<LoadingScreenContent loading={true} onLoaded={onLoadedMock} />)

    expect(onLoadedMock).not.toHaveBeenCalled()

    rerender(<LoadingScreenContent loading={false} onLoaded={onLoadedMock} />)

    expect(onLoadedMock).toHaveBeenCalledTimes(1)
  })
})
