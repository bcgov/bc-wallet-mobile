import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import VerificationSuccessScreen from '../../src/bcsc-theme/features/verify/VerificationSuccessScreen'

describe('VerificationSuccess', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <VerificationSuccessScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
