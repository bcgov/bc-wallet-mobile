import { useRegistrationService } from '@/bcsc-theme/services/hooks/useRegistrationService'
import { BCState, initialState } from '@/store'
import { testIdWithKey, useStore } from '@bifold/core'
import { useNavigation } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { Text } from 'react-native'
import EditNicknameScreen from './EditNicknameScreen'

jest.mock('@/bcsc-theme/services/hooks/useRegistrationService', () => ({
  useRegistrationService: jest.fn(),
}))

const NICKNAME_INPUT = 'com.ariesbifold:id/accountNickname-input'

/** Exposes the saved nickname in the tree so tests can observe store updates. */
const NicknameProbe = () => {
  const [store] = useStore<BCState>()
  return <Text testID="NicknameProbe">{String(store.bcsc.selectedNickname)}</Text>
}

describe('EditNickname', () => {
  const mockUpdateRegistration = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockUpdateRegistration.mockReset().mockResolvedValue(undefined)
    jest.mocked(useRegistrationService).mockReturnValue({ updateRegistration: mockUpdateRegistration } as any)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const renderScreen = () =>
    render(
      <BasicAppContext
        initialStateOverride={{
          bcsc: { ...initialState.bcsc, selectedNickname: 'Old name' },
          // A token in app state is not what the update uses: the service reads the registration from storage
          bcscSecure: { ...initialState.bcscSecure, registrationAccessToken: 'state-token' },
        }}
      >
        <EditNicknameScreen />
        <NicknameProbe />
      </BasicAppContext>
    )

  const rename = async (tree: ReturnType<typeof renderScreen>, nickname: string) => {
    fireEvent.changeText(tree.getByTestId(NICKNAME_INPUT), nickname)
    await act(async () => {
      fireEvent.press(tree.getByTestId(testIdWithKey('SaveAndContinue')))
    })
  }

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <EditNicknameScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('updates the registration with the nickname alone, then saves it and goes back', async () => {
    const tree = renderScreen()

    await rename(tree, '  New name  ')

    await waitFor(() => {
      expect(tree.getByTestId('NicknameProbe').props.children).toBe('New name')
    })
    expect(mockUpdateRegistration).toHaveBeenCalledTimes(1)
    expect(mockUpdateRegistration).toHaveBeenCalledWith('New name')
    expect(useNavigation().goBack).toHaveBeenCalledTimes(1)
  })

  it('keeps the old nickname and stays on the screen when the registration update fails', async () => {
    mockUpdateRegistration.mockRejectedValue(new Error('offline'))
    const tree = renderScreen()

    fireEvent.changeText(tree.getByTestId(NICKNAME_INPUT), 'New name')
    await act(async () => {
      // The form rethrows, so the press handler's rejection is expected here
      await Promise.resolve(fireEvent.press(tree.getByTestId(testIdWithKey('SaveAndContinue')))).catch(() => undefined)
    })

    await waitFor(() => {
      expect(mockUpdateRegistration).toHaveBeenCalledWith('New name')
    })
    expect(tree.getByTestId('NicknameProbe').props.children).toBe('Old name')
    expect(useNavigation().goBack).not.toHaveBeenCalled()
  })
})
