import { BCSCAccountContext } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { MainLoadingScreen } from '@/bcsc-theme/features/splash-loading/MainLoadingScreen'
import { BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { testIdWithKey } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { render } from '@testing-library/react-native'

describe('MainLoadingScreen Component', () => {
  beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('1970-01-01'))
  })

  it('should render loading screen when account is loading', () => {
    const navigationMock: any = {
      navigate: jest.fn(),
    }

    const tree = render(
      <BCSCAccountContext.Provider
        value={{
          isLoadingAccount: true,
          account: 'account' as any,
        }}
      >
        <MainLoadingScreen navigation={navigationMock} />
      </BCSCAccountContext.Provider>
    )

    const loadingScreen = tree.getByTestId(testIdWithKey('LoadingScreenContent'))

    expect(loadingScreen).toBeTruthy()
  })

  it('should render loading screen when account is not available', () => {
    const navigationMock: any = {
      navigate: jest.fn(),
    }

    const tree = render(
      <BCSCAccountContext.Provider
        value={{
          isLoadingAccount: false,
          account: null,
        }}
      >
        <MainLoadingScreen navigation={navigationMock} />
      </BCSCAccountContext.Provider>
    )

    const loadingScreen = tree.getByTestId(testIdWithKey('LoadingScreenContent'))

    expect(loadingScreen).toBeTruthy()
  })

  it('should render loading screen when context is null', () => {
    const navigationMock: any = {
      navigate: jest.fn(),
    }

    const tree = render(
      <BCSCAccountContext.Provider value={null}>
        <MainLoadingScreen navigation={navigationMock} />
      </BCSCAccountContext.Provider>
    )

    const loadingScreen = tree.getByTestId(testIdWithKey('LoadingScreenContent'))

    expect(loadingScreen).toBeTruthy()
  })

  it('should navigate to Account Expired screen when account is expired', () => {
    const navigationMock: any = {
      dispatch: jest.fn(),
    }

    const expiredDate = new Date()
    expiredDate.setDate(expiredDate.getDate() - 1) // Set to yesterday

    render(
      <BCSCAccountContext.Provider
        value={{
          isLoadingAccount: false,
          account: {
            account_expiration_date: expiredDate,
          } as any,
        }}
      >
        <MainLoadingScreen navigation={navigationMock} />
      </BCSCAccountContext.Provider>
    )

    expect(navigationMock.dispatch).toHaveBeenCalledWith(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: BCSCScreens.AccountExpired,
          },
        ],
      })
    )
  })

  it('should navigate to Home screen when account is valid', () => {
    const navigationMock: any = {
      dispatch: jest.fn(),
    }

    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 1) // Set to tomorrow

    render(
      <BCSCAccountContext.Provider
        value={{
          isLoadingAccount: false,
          account: {
            account_expiration_date: futureDate,
          } as any,
        }}
      >
        <MainLoadingScreen navigation={navigationMock} />
      </BCSCAccountContext.Provider>
    )

    expect(navigationMock.dispatch).toHaveBeenCalledWith(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: BCSCStacks.Tab,
            params: {
              screen: BCSCScreens.Home,
            },
          },
        ],
      })
    )
  })
})
