import { render } from '@testing-library/react-native'
import HelpContactUs from '../../src/components/HelpContactUs'
import { contactMock } from '../../__mocks__/contact'

describe('HelpContactUs Component', () => {
  test('Renders Correctly', () => {
    const tree = render(<HelpContactUs itemContact={contactMock.itemContact} />)

    expect(tree).toMatchSnapshot()
  })
})
