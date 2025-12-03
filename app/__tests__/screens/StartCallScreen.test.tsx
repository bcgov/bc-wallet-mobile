import { render } from '@testing-library/react-native'
import React from 'react'

import { useNavigation } from '../../__mocks__/custom/@react-navigation/core'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import StartCallScreen from '../../src/bcsc-theme/features/verify/live-call/StartCallScreen'

jest.mock('../../src/bcsc-theme/hooks/useBCSCApiClient')
jest.mock('../../src/bcsc-theme/api/hooks/useApi')

describe('StartCall', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <StartCallScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
