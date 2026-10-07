import { BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import AlreadyVerifiedSuccessScreen from './AlreadyVerifiedSuccessScreen'

describe('AlreadyVerifiedSuccessScreen', () => {
  const navigation = { navigate: jest.fn() }

  const renderScreen = () =>
    render(
      <BasicAppContext>
        <AlreadyVerifiedSuccessScreen navigation={navigation as any} route={{} as any} />
      </BasicAppContext>
    )

  beforeEach(() => jest.clearAllMocks())

  it('renders correctly', () => {
    expect(renderScreen()).toMatchSnapshot()
  })

  it('navigates to Home when the continue button is pressed', () => {
    const { getByTestId } = renderScreen()

    fireEvent.press(getByTestId(testIdWithKey(TestIds.verify.verificationSuccess.continue)))

    expect(navigation.navigate).toHaveBeenCalledWith(BCSCStacks.Tab, { screen: BCSCScreens.Home })
  })
})
