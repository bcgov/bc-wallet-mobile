import { render } from '@testing-library/react-native'
import HeaderText from '../../src/components/HeaderText'

describe('HeaderText Component', () => {
  test('Renders correctly', () => {
    const tree = render(<HeaderText title={'Any Title'} />)

    expect(tree).toMatchSnapshot()
  })
})
