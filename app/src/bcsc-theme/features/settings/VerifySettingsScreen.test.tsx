import { BCSCLoadingProvider } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
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

  it('navigates to remove account confirmation when remove account is pressed', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <BCSCLoadingProvider>
          <VerifySettingsScreen navigation={mockNavigation as never} />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

    fireEvent.press(getByTestId(testIdWithKey('RemoveAccount')))

    expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.VerifyRemoveAccountConfirmation)
  })
})
