import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import {ResidentialAddressScreen} from '../../src/bcsc-theme/features/verify/ResidentialAddressScreen'

describe('ResidentialAddress', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <ResidentialAddressScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
