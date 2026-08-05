import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import AdditionalIdentificationRequiredScreen from './AdditionalIdentificationRequiredScreen'

describe('AdditionalIdentificationRequired', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <AdditionalIdentificationRequiredScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('pushes a fresh photo-filtered evidence list on continue', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <AdditionalIdentificationRequiredScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    fireEvent.press(getByTestId(testIdWithKey('Global.Continue')))

    expect(mockNavigation.push).toHaveBeenCalledWith(
      BCSCScreens.EvidenceTypeList,
      expect.objectContaining({ photoFilter: 'photo' })
    )
    // navigate would pop back to an existing list (the "Other Options" one), which that screen
    // treats as back-navigation and uses to release the ID the user just collected.
    expect(mockNavigation.navigate).not.toHaveBeenCalled()
  })
})
