import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import TransferSuccessScreen from '../../src/bcsc-theme/features/account-transfer/TransferSuccessScreen'

jest.mock('../../src/bcsc-theme/hooks/useBCSCApiClient')
jest.mock('../../src/bcsc-theme/api/hooks/useApi')

describe('TransferSuccess', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <TransferSuccessScreen/>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
