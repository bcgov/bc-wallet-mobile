import { render } from '@testing-library/react-native'
import Home from './Home'
describe('Home', () => {
  it('should render the Home component', () => {
    const home = render(<Home navigation={{} as any} route={{} as any} />)

    expect(home).toBeTruthy()
  })
})
