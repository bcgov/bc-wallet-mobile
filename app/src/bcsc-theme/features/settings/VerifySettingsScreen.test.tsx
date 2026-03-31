import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import { VerifySettingsScreen } from './VerifySettingsScreen'

describe('VerifySettings', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <BCSCLoadingProvider>
          <VerifySettingsScreen navigation={mockNavigation as never} />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
