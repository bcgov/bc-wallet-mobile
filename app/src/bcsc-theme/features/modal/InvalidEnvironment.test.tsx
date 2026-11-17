import { TestIds } from '@/test-ids/registry'
import { IASEnvironment } from '@/utils/environment'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { InvalidEnvironment } from './InvalidEnvironment'

const mockSwitchEnvironment = jest.fn().mockResolvedValue(undefined)
jest.mock('@/bcsc-theme/hooks/useSwitchEnvironment', () => ({
  useSwitchEnvironment: () => mockSwitchEnvironment,
}))

const mockOpenLink = jest.fn()
jest.mock('@/utils/links', () => ({
  ...jest.requireActual('@/utils/links'),
  openLink: (url: string) => mockOpenLink(url),
}))

describe('InvalidEnvironment', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the header, descriptions and reset button', () => {
    const { getByText } = render(
      <BasicAppContext>
        <InvalidEnvironment />
      </BasicAppContext>
    )

    expect(getByText('BCSC.Modals.InvalidEnvironment.Header')).toBeTruthy()
    expect(getByText('BCSC.Modals.InvalidEnvironment.ContentA')).toBeTruthy()
    expect(getByText('BCSC.Modals.InvalidEnvironment.ContentB')).toBeTruthy()
    expect(getByText('BCSC.Modals.InvalidEnvironment.ResetButton')).toBeTruthy()
  })

  it('switches to the production environment when the reset button is pressed', async () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <InvalidEnvironment />
      </BasicAppContext>
    )

    fireEvent.press(getByTestId(testIdWithKey(TestIds.systemModal.invalidEnvironment.reset)))

    await waitFor(() => {
      expect(mockSwitchEnvironment).toHaveBeenCalledWith(IASEnvironment.PROD)
    })
  })

  it('opens the contact us link', () => {
    const { getByTestId } = render(
      <BasicAppContext>
        <InvalidEnvironment />
      </BasicAppContext>
    )

    fireEvent.press(getByTestId(testIdWithKey(TestIds.systemModal.invalidEnvironment.contactUs)))

    expect(mockOpenLink).toHaveBeenCalledTimes(1)
  })
})
