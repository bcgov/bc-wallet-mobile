import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCLocalStorageKeys } from '@/store'
import { PersistentStorage } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { TermsOfUseScreen } from './TermsOfUseScreen'

jest.mock('@/bcsc-theme/api/hooks/useApi')

const mockTermsOfUseResponse = {
  version: '1.0',
  date: '2024-01-01',
  html: '<p>Terms of Use content</p>',
}

describe('TermsOfUseScreen', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()

    const useApiMock = jest.mocked(useApi)
    useApiMock.mockReturnValue({
      config: {
        getTermsOfUse: jest.fn().mockResolvedValue(mockTermsOfUseResponse),
        getServerStatus: jest.fn(),
      },
    } as any)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const renderAndAccept = async () => {
    const tree = render(
      <BasicAppContext>
        <TermsOfUseScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    await waitFor(() => {
      expect(tree.queryByTestId('mocked-webview')).toBeTruthy()
    })

    // Simulate the webview finishing loading to enable the accept button
    fireEvent(tree.getByTestId('mocked-webview'), 'load')
    fireEvent.press(tree.getByTestId('com.ariesbifold:id/AcceptAndContinue'))

    return tree
  }

  it('persists the accepted terms version and navigates to the analytics opt-in screen', async () => {
    const storageSpy = jest.spyOn(PersistentStorage, 'storeValueForKey').mockResolvedValue()

    await renderAndAccept()

    // The analytics screen is next; it owns the logic for skipping the notifications step.
    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCScreens.OnboardingOptInAnalytics)
    })

    expect(storageSpy).toHaveBeenCalledWith(
      BCLocalStorageKeys.BCSC,
      expect.objectContaining({ acceptedTermsOfUseVersion: '1.0' })
    )
  })
})
