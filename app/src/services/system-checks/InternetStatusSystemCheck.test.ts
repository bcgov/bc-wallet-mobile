import { BCSCModals, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { InternetStatusSystemCheck } from '@/services/system-checks/InternetStatusSystemCheck'
import { MockLogger } from '@bifold/core'
import { NavigationState } from '@react-navigation/native'

type Route = { name: string; state?: NavigationState }

// Enough of a stack state for the check: the registered names, the routes and the focused index
const stack = (routeNames: string[], routes: Route[], index = routes.length - 1): NavigationState =>
  ({
    type: 'stack',
    key: `stack-${routeNames[0]}`,
    stale: false,
    index,
    routeNames,
    routes: routes.map((route) => ({ key: `${route.name}-key`, ...route })),
  }) as unknown as NavigationState

// The root navigator registers the current phase only; the modal is registered in the phase stack
const root = (phase: NavigationState) => stack([BCSCStacks.Main], [{ name: BCSCStacks.Main, state: phase }])
const loadingRoot = () => stack([BCSCScreens.RootLoading], [{ name: BCSCScreens.RootLoading }])
const mainStack = (...afterHome: string[]) =>
  stack(
    [BCSCScreens.Home, BCSCModals.InternetDisconnected],
    [{ name: BCSCScreens.Home }, ...afterHome.map((name) => ({ name }))]
  )

const createNavigation = (state: NavigationState | undefined) => ({
  navigate: jest.fn(),
  canGoBack: jest.fn(() => true),
  goBack: jest.fn(),
  getState: jest.fn(() => state),
})

const createCheck = (navigation: ReturnType<typeof createNavigation>, connected = false) =>
  new InternetStatusSystemCheck(connected, connected ? true : false, navigation, new MockLogger())

describe('InternetStatusSystemCheck', () => {
  describe('runCheck', () => {
    it('passes when connected and the internet is reachable', () => {
      expect(createCheck(createNavigation(undefined), true).runCheck()).toBe(true)
    })

    it('passes when connected and reachability is unknown', () => {
      const check = new InternetStatusSystemCheck(true, null, createNavigation(undefined), new MockLogger())

      expect(check.runCheck()).toBe(true)
    })

    it('fails when disconnected', () => {
      expect(createCheck(createNavigation(undefined)).runCheck()).toBe(false)
    })
  })

  describe('onFail', () => {
    it('shows the modal when the phase stack nested under the root registers it', () => {
      const navigation = createNavigation(root(mainStack()))

      createCheck(navigation).onFail()

      expect(navigation.navigate).toHaveBeenCalledWith(BCSCModals.InternetDisconnected)
    })

    it('does nothing while the root shows only the startup Loading route', () => {
      const navigation = createNavigation(loadingRoot())

      createCheck(navigation).onFail()

      expect(navigation.navigate).not.toHaveBeenCalled()
    })

    it('does nothing when the modal is already on top of the phase stack', () => {
      const navigation = createNavigation(root(mainStack(BCSCModals.InternetDisconnected)))

      createCheck(navigation).onFail()

      expect(navigation.navigate).not.toHaveBeenCalled()
    })

    it('does nothing when there is no navigation state yet', () => {
      const navigation = createNavigation(undefined)

      createCheck(navigation).onFail()

      expect(navigation.navigate).not.toHaveBeenCalled()
    })
  })

  describe('onSuccess', () => {
    it('dismisses the modal when it is on top of the phase stack', () => {
      const navigation = createNavigation(root(mainStack(BCSCModals.InternetDisconnected)))

      createCheck(navigation, true).onSuccess()

      expect(navigation.goBack).toHaveBeenCalledTimes(1)
    })

    it('does not go back when the modal is not visible', () => {
      const navigation = createNavigation(root(mainStack()))

      createCheck(navigation, true).onSuccess()

      expect(navigation.goBack).not.toHaveBeenCalled()
    })
  })
})
