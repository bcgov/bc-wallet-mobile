import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { RouteProp } from '@react-navigation/native'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import EvidenceTypeListScreen from './EvidenceTypeListScreen'

type EvidenceTypeListRoute = RouteProp<BCSCVerifyStackParams, BCSCScreens.EvidenceTypeList>

describe('EvidenceTypeList', () => {
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
        <EvidenceTypeListScreen
          navigation={mockNavigation as never}
          route={{ params: { cardProcess: BCSCCardProcess.None } } as EvidenceTypeListRoute}
        />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('renders "Other Options" footer when photoFilter is photo and no evidence selected', () => {
    const { getByText, getByTestId } = render(
      <BasicAppContext>
        <EvidenceTypeListScreen
          navigation={mockNavigation as never}
          route={
            { params: { cardProcess: BCSCCardProcess.BCSCNonPhoto, photoFilter: 'photo' } } as EvidenceTypeListRoute
          }
        />
      </BasicAppContext>
    )

    expect(getByText('BCSC.EvidenceTypeList.OtherOptions')).toBeTruthy()
    expect(getByText('BCSC.EvidenceTypeList.IDontHaveAnyOfThese')).toBeTruthy()
    expect(getByTestId('com.ariesbifold:id/EvidenceTypeListOtherOptions')).toBeTruthy()
  })

  it('navigates to nonPhoto filter when "Other Options" is pressed', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <EvidenceTypeListScreen
          navigation={mockNavigation as never}
          route={
            { params: { cardProcess: BCSCCardProcess.BCSCNonPhoto, photoFilter: 'photo' } } as EvidenceTypeListRoute
          }
        />
      </BasicAppContext>
    )

    fireEvent.press(getByTestId('com.ariesbifold:id/EvidenceTypeListOtherOptions'))
    expect(mockNavigation.replace).toHaveBeenCalledWith('BCSCEvidenceTypeList', {
      cardProcess: BCSCCardProcess.BCSCNonPhoto,
      photoFilter: 'nonPhoto',
    })
  })

  it('does not render "Other Options" footer when photoFilter is nonPhoto', () => {
    const { queryByText } = render(
      <BasicAppContext>
        <EvidenceTypeListScreen
          navigation={mockNavigation as never}
          route={
            { params: { cardProcess: BCSCCardProcess.BCSCNonPhoto, photoFilter: 'nonPhoto' } } as EvidenceTypeListRoute
          }
        />
      </BasicAppContext>
    )

    expect(queryByText('BCSC.EvidenceTypeList.OtherOptions')).toBeNull()
    expect(queryByText('BCSC.EvidenceTypeList.IDontHaveAnyOfThese')).toBeNull()
  })
})
