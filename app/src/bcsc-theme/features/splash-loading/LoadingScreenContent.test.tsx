import { LoadingScreenContent } from '@/bcsc-theme/features/splash-loading/LoadingScreenContent'
import { render } from '@testing-library/react-native'

describe('LoadingScreenContent Component', () => {
  it('renders message', () => {
    const tree = render(<LoadingScreenContent message={'TEST_LOADINGSCREENCONTENT'} />)

    expect(tree.getByText('TEST_LOADINGSCREENCONTENT')).toBeTruthy()
  })

  it('should match snapshot', () => {
    const tree = render(<LoadingScreenContent message={'Loading...'} />)

    expect(tree.toJSON()).toMatchSnapshot()
  })
})
