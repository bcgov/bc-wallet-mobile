import { render } from '@testing-library/react-native'
import Spinner from '../../src/components/Spinner'

describe('Spinner Component', () => {
  test('Renders correctly', () => {
    const tree = render(<Spinner />)

    expect(tree).toMatchSnapshot()
  })
})
