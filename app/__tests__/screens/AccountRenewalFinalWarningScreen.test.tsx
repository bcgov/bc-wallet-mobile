import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import {AccountRenewalFinalWarningScreen} from '../../src/bcsc-theme/features/account/AccountRenewalFinalWarningScreen'

jest.mock('../../src/bcsc-theme/hooks/useBCSCApiClient')
jest.mock('../../src/bcsc-theme/api/hooks/useApi')

describe('AccountRenewalFinalWarning', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        
        <AccountRenewalFinalWarningScreen/>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
