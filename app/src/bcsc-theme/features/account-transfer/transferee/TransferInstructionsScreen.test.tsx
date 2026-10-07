import en from '@/localization/en'
import fr from '@/localization/fr'
import ptBr from '@/localization/pt-br'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import { BCSCScreens } from '../../../types/navigators'
import TransferInstructionsScreen from './TransferInstructionsScreen'

describe('TransferInstructionsScreen', () => {
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
        <TransferInstructionsScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('renders four numbered steps', () => {
    const { getAllByText, getByText } = render(
      <BasicAppContext>
        <TransferInstructionsScreen />
      </BasicAppContext>
    )

    expect(getAllByText(/^\d\.$/)).toHaveLength(4)
    for (const step of [1, 2, 3, 4]) {
      expect(getByText(`BCSC.TransferInstructions.Step${step}`)).toBeTruthy()
    }
  })

  // The i18n mock renders each step as its key, so check the copy in the locale files directly.
  it.each([
    ['en', en],
    ['fr', fr],
    ['pt-br', ptBr],
  ])('has copy for all four steps in %s', (_locale, translation) => {
    const { Step1, Step2, Step3, Step4 } = translation.BCSC.TransferInstructions

    for (const copy of [Step1, Step2, Step3, Step4]) {
      expect(copy).toEqual(expect.any(String))
      expect(copy.length).toBeGreaterThan(0)
    }
  })

  it('tells people to open the app on the other device first', () => {
    expect(en.BCSC.TransferInstructions.Step1).toContain('<b>On your other device</b>')
    expect(en.BCSC.TransferInstructions.Step1).toContain('unlock')
  })

  it('navigates to QR scan screen when Scan QR Code button is pressed', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <TransferInstructionsScreen />
      </BasicAppContext>
    )

    const scanButton = getByTestId(testIdWithKey('ScanQRCode'))
    act(() => {
      fireEvent.press(scanButton)
    })
    expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.TransferAccountQRScan)
  })
})
