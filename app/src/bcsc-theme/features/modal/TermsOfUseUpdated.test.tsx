import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { BCLocalStorageKeys } from '@/store'
import { PersistentStorage } from '@bifold/core'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { TermsOfUseUpdated } from './TermsOfUseUpdated'

jest.mock('@/bcsc-theme/api/hooks/useApi')

const mockTermsOfUseResponse = {
  version: '9',
  date: '2025-06-06',
  html: '<p>Updated Terms of Use content</p>',
}

describe('TermsOfUseUpdated', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    mockNavigation.canGoBack = jest.fn().mockReturnValue(true)
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
        <TermsOfUseUpdated navigation={mockNavigation as never} route={{} as never} />
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

  it('persists the accepted terms version and goes back when accept is pressed', async () => {
    const storageSpy = jest.spyOn(PersistentStorage, 'storeValueForKey').mockResolvedValue()
    mockNavigation.canGoBack.mockReturnValue(true)

    await renderAndAccept()

    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalled()
    })

    expect(storageSpy).toHaveBeenCalledWith(
      BCLocalStorageKeys.BCSC,
      expect.objectContaining({ acceptedTermsOfUseVersion: '9' })
    )
  })

  it('falls back to the tab stack when there is no screen to go back to', async () => {
    mockNavigation.canGoBack.mockReturnValue(false)

    await renderAndAccept()

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith(BCSCStacks.Tab, { screen: BCSCScreens.Home })
    })

    expect(mockNavigation.goBack).not.toHaveBeenCalled()
  })
})
