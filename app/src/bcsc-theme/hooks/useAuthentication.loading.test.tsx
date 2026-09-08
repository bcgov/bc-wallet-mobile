import { BCSCLoadingProvider, LoadingPresentation, LoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { BCAnimatedLoadingIcon } from '@/bcsc-theme/features/splash-loading/BCAnimatedLoadingIcon'
import { LoadingScreenContent } from '@/bcsc-theme/features/splash-loading/LoadingScreenContent'
import { useAlerts } from '@/hooks/useAlerts'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { act, render } from '@testing-library/react-native'
import { canPerformDeviceAuthentication, unlockWithDeviceSecurity } from 'react-native-bcsc-core'
import { useAuthentication } from './useAuthentication'
import useSecureActions from './useSecureActions'

jest.mock('./useSecureActions')
jest.mock('@/hooks/useAlerts')

describe('authentication loading handoff', () => {
  const navigation = { navigate: jest.fn(), dispatch: jest.fn() } as any
  let authenticate: () => Promise<void>

  const Authentication = () => {
    authenticate = useAuthentication(navigation).performDeviceAuth
    return null
  }

  const App = ({
    mainLoading = false,
    genericLoading = false,
  }: {
    mainLoading?: boolean
    genericLoading?: boolean
  }) => (
    <BasicAppContext>
      <BCSCLoadingProvider>
        {mainLoading ? (
          <LoadingScreen presentation={LoadingPresentation.Startup} statusMessage="BCSC.Loading.AccountLoading" />
        ) : (
          <Authentication />
        )}
        {genericLoading && <LoadingScreen message="Other work" />}
      </BCSCLoadingProvider>
    </BasicAppContext>
  )

  beforeEach(() => {
    jest.mocked(canPerformDeviceAuthentication).mockResolvedValue(true)
    jest.mocked(useAlerts).mockReturnValue({ deviceAuthenticationErrorAlert: jest.fn() } as any)
    jest.mocked(useSecureActions).mockReturnValue({ handleSuccessfulAuth: jest.fn() } as any)
  })

  it('keeps the same startup illustration through authentication, hydration, and a separate Main loading commit', async () => {
    let resolveUnlock!: (result: Awaited<ReturnType<typeof unlockWithDeviceSecurity>>) => void
    let resolveHydration!: () => void
    jest.mocked(unlockWithDeviceSecurity).mockReturnValue(
      new Promise((resolve) => {
        resolveUnlock = resolve
      })
    )
    const handleSuccessfulAuth = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveHydration = resolve
        })
    )
    jest.mocked(useSecureActions).mockReturnValue({ handleSuccessfulAuth } as any)
    const view = render(<App />)
    let pending!: Promise<void>
    await act(async () => {
      pending = authenticate()
    })

    const illustration = view.UNSAFE_getByType(BCAnimatedLoadingIcon)
    expect(view.getByText('BCSC.Loading.AccountLoading')).toBeTruthy()
    expect(view.UNSAFE_queryAllByType(LoadingScreenContent)).toHaveLength(0)

    await act(async () => {
      resolveUnlock({ success: true, walletKey: 'test-key' })
    })
    expect(handleSuccessfulAuth).toHaveBeenCalledWith('test-key')
    expect(view.UNSAFE_getByType(BCAnimatedLoadingIcon)).toBe(illustration)

    await act(async () => {
      resolveHydration()
      await pending
    })
    expect(view.getByTestId(testIdWithKey('BCSCLoadingProviderOverlay'), { includeHiddenElements: true })).toHaveStyle({
      display: 'none',
    })
    expect(view.UNSAFE_getByType(BCAnimatedLoadingIcon)).toBe(illustration)

    view.rerender(<App mainLoading />)
    expect(view.getByTestId(testIdWithKey('StartupLoadingScreenContent'))).toBeTruthy()
    expect(view.UNSAFE_getByType(BCAnimatedLoadingIcon)).toBe(illustration)
    expect(view.UNSAFE_queryAllByType(LoadingScreenContent)).toHaveLength(0)
    expect(view.getByText('BCSC.Loading.AccountLoading')).toBeTruthy()

    view.rerender(<App />)
    expect(view.getByTestId(testIdWithKey('BCSCLoadingProviderChildren'))).toHaveStyle({ display: 'flex' })
  })

  it.each(['cancelled', 'failed'] as const)(
    'releases %s authentication and restores the next generic loader',
    async (outcome) => {
      if (outcome === 'cancelled') {
        jest.mocked(unlockWithDeviceSecurity).mockResolvedValue({ success: false, walletKey: '' })
      } else {
        jest.mocked(unlockWithDeviceSecurity).mockRejectedValue(new Error('Authentication failed'))
      }
      const view = render(<App />)
      await act(async () => {
        await authenticate()
      })

      expect(view.getByTestId(testIdWithKey('BCSCLoadingProviderChildren'))).toHaveStyle({ display: 'flex' })
      expect(jest.mocked(useSecureActions)().handleSuccessfulAuth).not.toHaveBeenCalled()
      view.rerender(<App genericLoading />)
      expect(view.getByTestId(testIdWithKey('LoadingScreenContent'))).toBeTruthy()
      expect(view.getByText('Other work')).toBeTruthy()
      expect(view.queryByTestId(testIdWithKey('StartupLoadingScreenContent'))).toBeNull()
    }
  )
})
