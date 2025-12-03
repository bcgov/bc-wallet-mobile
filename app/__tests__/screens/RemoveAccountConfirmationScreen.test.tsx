import { render } from '@testing-library/react-native'
import React from 'react'

import { BasicAppContext } from '../../__mocks__/helpers/app'
import RemoveAccountConfirmationScreen from '../../src/bcsc-theme/features/account/RemoveAccountConfirmationScreen'

jest.mock('../../src/bcsc-theme/hooks/useBCSCApiClient')
jest.mock('../../src/bcsc-theme/api/hooks/useApi')

describe('RemoveAccountConfirmation', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <RemoveAccountConfirmationScreen  />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
