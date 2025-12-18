import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import { ResidentialAddressScreen } from '../../src/bcsc-theme/features/verify/ResidentialAddressScreen'

describe('ResidentialAddress', () => {
  let mockNavigation: any
  let mockRoute: any

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <ResidentialAddressScreen navigation={mockNavigation as never} route={mockRoute as never} />
      </BasicAppContext>,
    )

    expect(tree).toMatchSnapshot()
  })
})
