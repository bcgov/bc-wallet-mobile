import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import MismatchedSerialScreen from '../../src/bcsc-theme/features/verify/MismatchedSerialScreen'

jest.mock('../../src/bcsc-theme/hooks/useBCSCApiClient')
jest.mock('../../src/bcsc-theme/api/hooks/useApi')

describe('MismatchedSerial', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <MismatchedSerialScreen/>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
