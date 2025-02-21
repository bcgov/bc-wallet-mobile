import { render } from '@testing-library/react-native'
import React from 'react'

import HomeHeaderView from '../../src/components/HomeHeaderView'
import { BasicAppContext } from '../../__mocks__/helpers/app'

const mockNavigation = jest.fn()
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => {
    return mockNavigation
  },
}))

describe('HomeHeaderView Component', () => {
  test('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <HomeHeaderView />
      </BasicAppContext>
    )
    expect(tree).toMatchSnapshot()
  })
})
