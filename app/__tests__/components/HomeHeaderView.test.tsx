import { render } from '@testing-library/react-native'
import React from 'react'

import HomeHeaderView from '@bcwallet-theme/components/HomeHeaderView'
import { BasicAppContext } from '../../__mocks__/helpers/app'

describe('HomeHeaderView Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <HomeHeaderView />
      </BasicAppContext>,
    )
    expect(tree).toMatchSnapshot()
  })
})
