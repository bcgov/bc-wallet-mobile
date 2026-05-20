import { BCDispatchAction } from '@/store'
import { useNavigation } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import AccountLandingScreen from './AccountLandingScreen'

const mockUnlockApp = jest.fn()
const mockDispatch = jest.fn()

jest.mock('@/bcsc-theme/hooks/useAuthentication', () => ({
  useAuthentication: () => ({
    unlockApp: mockUnlockApp,
  }),
}))

// Keep the real bifold providers/components, but wrap useStore's dispatch with a
// spy so we can assert on the actions the screen dispatches.
jest.mock('@bifold/core', () => {
  const actual = jest.requireActual('@bifold/core')
  return {
    ...actual,
    useStore: () => {
      const [store, dispatch] = actual.useStore()
      return [
        store,
        (action: any) => {
          // Record a copy of the payload: the real reducer mutates it via .pop(),
          // which would otherwise empty the array we assert against later.
          mockDispatch(Array.isArray(action?.payload) ? { ...action, payload: [...action.payload] } : action)
          return dispatch(action)
        },
      ]
    },
  }
})

describe('AccountLanding', () => {
  let mockNavigation: ReturnType<typeof useNavigation>

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('when nicknames exist', () => {
    it('renders correctly with unlock button', () => {
      const tree = render(
        <BasicAppContext initialStateOverride={{ bcsc: { nicknames: ['John', 'Jane'] } as any }}>
          <AccountLandingScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      expect(tree.getByTestId('com.ariesbifold:id/Unlock')).toBeTruthy()
      expect(tree).toMatchSnapshot()
    })

    it('dispatches SELECT_ACCOUNT and calls unlockApp when Unlock is pressed', () => {
      const tree = render(
        <BasicAppContext initialStateOverride={{ bcsc: { nicknames: ['John'] } as any }}>
          <AccountLandingScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      const unlockButton = tree.getByTestId('com.ariesbifold:id/Unlock')
      fireEvent.press(unlockButton)

      expect(mockDispatch).toHaveBeenCalledWith({ type: BCDispatchAction.SELECT_ACCOUNT, payload: ['John'] })
      expect(mockUnlockApp).toHaveBeenCalled()
    })
  })

  describe('when no nicknames exist', () => {
    it('renders Unlock button', () => {
      const tree = render(
        <BasicAppContext initialStateOverride={{ bcsc: { nicknames: [] } as any }}>
          <AccountLandingScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      expect(tree.getByTestId('com.ariesbifold:id/Unlock')).toBeTruthy()
      expect(tree).toMatchSnapshot()
    })

    it('calls unlockApp when Unlock button is pressed', () => {
      const tree = render(
        <BasicAppContext initialStateOverride={{ bcsc: { nicknames: [] } as any }}>
          <AccountLandingScreen navigation={mockNavigation as never} />
        </BasicAppContext>
      )

      const unlockButton = tree.getByTestId('com.ariesbifold:id/Unlock')
      fireEvent.press(unlockButton)

      expect(mockUnlockApp).toHaveBeenCalled()
    })
  })
})
