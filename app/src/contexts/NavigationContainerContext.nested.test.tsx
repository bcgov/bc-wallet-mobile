import { BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import {
  NAVIGATION_TRAIL,
  NavigationContainerContext,
  NavigationContainerProvider,
} from '@/contexts/NavigationContainerContext'
import { renderHook } from '@testing-library/react-native'
import { useContext } from 'react'

// Uses the real stack-utils helpers so nested navigator states exercise real back detection.
let capturedOnStateChange: ((state: any) => void) | undefined

jest.mock('@react-navigation/native', () => ({
  // The shared mock supplies the exports other modules import (e.g. createNavigatorFactory)
  ...jest.requireActual('../../__mocks__/@react-navigation/native'),
  NavigationContainer: ({ children, onStateChange }: any) => {
    capturedOnStateChange = onStateChange
    return <>{children}</>
  },
}))

jest.mock('@bifold/core', () => ({
  useTheme: jest.fn(() => ({ NavigationTheme: {} })),
}))

jest.mock('@/utils/analytics/analytics-singleton', () => ({
  Analytics: { trackScreenEvent: jest.fn() },
}))

const route = (name: string, state?: unknown, key = name) => ({ name, key, state })
const stack = (routes: ReturnType<typeof route>[], index = routes.length - 1) => ({ type: 'stack', index, routes })
const tabs = (names: string[], index: number) => ({
  type: 'tab',
  index,
  routes: names.map((name) => route(name)),
})
const tabStack = (index: number) =>
  route(BCSCStacks.Tab, tabs([BCSCScreens.Home, BCSCScreens.Services, BCSCScreens.Wallet], index))
const root = (...children: ReturnType<typeof route>[]) => stack([route('RootStack', stack(children))])

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NavigationContainerProvider>{children}</NavigationContainerProvider>
)

describe('NavigationContainerContext back detection with nested navigators', () => {
  beforeEach(() => {
    capturedOnStateChange = undefined
    NAVIGATION_TRAIL.screens.length = 0
    NAVIGATION_TRAIL.droppedCount = 0
    renderHook(() => useContext(NavigationContainerContext), { wrapper })
  })

  const flags = () => NAVIGATION_TRAIL.screens.map(({ name, isBack }) => `${isBack ? 'back:' : ''}${name}`)

  it('marks returning within a child stack as back', () => {
    const main = (...routes: ReturnType<typeof route>[]) =>
      root(route(BCSCStacks.Main, stack([tabStack(0), ...routes])))

    capturedOnStateChange?.(main(route(BCSCScreens.MainSettings), route(BCSCScreens.MainWebView)))
    capturedOnStateChange?.(main(route(BCSCScreens.MainSettings)))

    expect(flags()).toEqual(['Web view', 'back:In App Settings'])
  })

  it('marks dismissing a modal back to the tab screen as back', () => {
    const main = (...routes: ReturnType<typeof route>[]) =>
      root(route(BCSCStacks.Main, stack([tabStack(0), ...routes])))

    capturedOnStateChange?.(main(route(BCSCScreens.MainSettings)))
    capturedOnStateChange?.(main())

    expect(flags()).toEqual(['In App Settings', 'back:Home'])
  })

  it('treats switching tabs as fresh, including returning to the first tab', () => {
    const main = (index: number) => root(route(BCSCStacks.Main, stack([tabStack(index)])))

    capturedOnStateChange?.(main(0))
    capturedOnStateChange?.(main(1))
    capturedOnStateChange?.(main(0))

    expect(flags()).toEqual(['Home', 'Service List', 'Home'])
  })

  it('treats a stack swap onto a same-named screen as fresh', () => {
    capturedOnStateChange?.(
      root(route(BCSCStacks.Main, stack([route(BCSCScreens.MainSettings), route(BCSCScreens.MainWebView)])))
    )
    capturedOnStateChange?.(root(route(BCSCStacks.Verify, stack([route(BCSCScreens.VerifySettings)]))))

    // Both settings screens normalize to 'In App Settings' but live in different stacks
    expect(flags()).toEqual(['Web view', 'In App Settings'])
  })

  it('treats a replace-based back fallback to a screen not in the stack as fresh', () => {
    capturedOnStateChange?.(root(route(BCSCStacks.Verify, stack([route(BCSCScreens.EnterBirthdate)]))))
    capturedOnStateChange?.(root(route(BCSCStacks.Verify, stack([route(BCSCScreens.IdentitySelection)]))))

    expect(flags()).toEqual([BCSCScreens.EnterBirthdate, BCSCScreens.IdentitySelection])
  })

  it('treats pushing a screen whose name is already in the stack as fresh', () => {
    const flow = [
      BCSCScreens.EvidenceTypeList,
      BCSCScreens.IDPhotoInformation,
      BCSCScreens.EvidenceCapture,
      BCSCScreens.EvidenceIDCollection,
      BCSCScreens.AdditionalIdentificationRequired,
    ]
    const routes: ReturnType<typeof route>[] = []

    // Two full passes, the second pushed on top of the first, each route with its own key
    for (const pass of [1, 2]) {
      for (const name of flow) {
        routes.push(route(name, undefined, `${name}-${pass}`))
        capturedOnStateChange?.(root(route(BCSCStacks.Verify, stack([...routes]))))
      }
    }

    expect(NAVIGATION_TRAIL.screens).toHaveLength(10)
    expect(NAVIGATION_TRAIL.screens.some(({ isBack }) => isBack)).toBe(false)
  })

  it('still marks going back after a duplicate push as back', () => {
    const first = route(BCSCScreens.EvidenceTypeList, undefined, 'etl-1')
    const photo = route(BCSCScreens.IDPhotoInformation, undefined, 'idp-1')
    const second = route(BCSCScreens.EvidenceTypeList, undefined, 'etl-2')
    const verify = (...routes: ReturnType<typeof route>[]) => root(route(BCSCStacks.Verify, stack(routes)))

    capturedOnStateChange?.(verify(first, photo))
    capturedOnStateChange?.(verify(first, photo, second))
    capturedOnStateChange?.(verify(first, photo))

    expect(flags()).toEqual([
      BCSCScreens.IDPhotoInformation,
      BCSCScreens.EvidenceTypeList,
      `back:${BCSCScreens.IDPhotoInformation}`,
    ])
  })
})
