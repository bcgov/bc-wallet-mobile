import { useRegistrationService } from '@/bcsc-theme/services/hooks/useRegistrationService'
import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { BCDispatchAction, initialState } from '@/store'
import { useServices, useStore } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { CommonActions, useNavigation } from '@react-navigation/native'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import NicknameAccountScreen from './NicknameAccountScreen'

jest.mock('@/bcsc-theme/services/hooks/useRegistrationService', () => ({
  useRegistrationService: jest.fn(),
}))

jest.mock('@bifold/core', () => ({
  ...jest.requireActual('@bifold/core'),
  useStore: jest.fn(),
  useServices: jest.fn(),
}))

const mockUseStore = useStore as jest.Mock
const mockUseServices = useServices as jest.Mock
const mockUseRegistrationService = useRegistrationService as jest.Mock

const defaultLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), trace: jest.fn() }

describe('NicknameAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseStore.mockReturnValue([initialState, jest.fn()] as any)
    mockUseServices.mockReturnValue([defaultLogger] as any)
    mockUseRegistrationService.mockReturnValue({
      updateRegistration: jest.fn().mockResolvedValue(undefined),
    } as any)
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <NicknameAccountScreen />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('should dispatch ADD_NICKNAME and SELECT_ACCOUNT on submit', async () => {
    const dispatchMock = jest.fn()
    const updateRegistrationMock = jest.fn().mockResolvedValue(undefined)
    mockUseRegistrationService.mockReturnValue({ updateRegistration: updateRegistrationMock } as any)
    mockUseStore.mockReturnValue([
      { ...initialState, bcscSecure: { registrationAccessToken: 'test-token' } },
      dispatchMock,
    ] as any)

    const { getByTestId } = render(
      <BasicAppContext>
        <NicknameAccountScreen />
      </BasicAppContext>
    )

    fireEvent.changeText(getByTestId('com.ariesbifold:id/accountNickname-input'), 'MyAccount')
    fireEvent.press(getByTestId('com.ariesbifold:id/SaveAndContinue'))

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith({ type: BCDispatchAction.ADD_NICKNAME, payload: ['MyAccount'] })
      expect(dispatchMock).toHaveBeenCalledWith({ type: BCDispatchAction.SELECT_ACCOUNT, payload: ['MyAccount'] })
    })
  })

  it('should call updateRegistration and navigate on submit', async () => {
    const dispatchMock = jest.fn()
    const updateRegistrationMock = jest.fn().mockResolvedValue(undefined)
    mockUseRegistrationService.mockReturnValue({ updateRegistration: updateRegistrationMock } as any)
    mockUseStore.mockReturnValue([
      { ...initialState, bcscSecure: { registrationAccessToken: 'test-token' } },
      dispatchMock,
    ] as any)
    const navigation = useNavigation()

    const { getByTestId } = render(
      <BasicAppContext>
        <NicknameAccountScreen />
      </BasicAppContext>
    )

    fireEvent.changeText(getByTestId('com.ariesbifold:id/accountNickname-input'), 'MyAccount')
    fireEvent.press(getByTestId('com.ariesbifold:id/SaveAndContinue'))

    await waitFor(() => {
      expect(updateRegistrationMock).toHaveBeenCalledWith('test-token', 'MyAccount')
    })
    expect(navigation.dispatch).toHaveBeenCalledWith(
      CommonActions.reset({ index: 0, routes: [{ name: BCSCScreens.SetupSteps }] })
    )
  })

  it('should log error when updateRegistration fails', async () => {
    const dispatchMock = jest.fn()
    const errorMock = jest.fn()
    const apiError = new Error('API failure')
    const updateRegistrationMock = jest.fn().mockRejectedValue(apiError)
    mockUseRegistrationService.mockReturnValue({ updateRegistration: updateRegistrationMock } as any)
    mockUseStore.mockReturnValue([
      { ...initialState, bcscSecure: { registrationAccessToken: 'test-token' } },
      dispatchMock,
    ] as any)
    mockUseServices.mockReturnValue([{ ...defaultLogger, error: errorMock }] as any)

    const { getByTestId } = render(
      <BasicAppContext>
        <NicknameAccountScreen />
      </BasicAppContext>
    )

    fireEvent.changeText(getByTestId('com.ariesbifold:id/accountNickname-input'), 'MyAccount')
    fireEvent.press(getByTestId('com.ariesbifold:id/SaveAndContinue'))

    await waitFor(() => {
      expect(updateRegistrationMock).toHaveBeenCalled()
      expect(errorMock).toHaveBeenCalledWith('Failed to update registration', apiError)
    })
  })
})
