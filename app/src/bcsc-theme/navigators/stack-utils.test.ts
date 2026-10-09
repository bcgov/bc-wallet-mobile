import { NAVIGATION_TRAIL, VisitedScreen } from '@/contexts/NavigationContainerContext'
import { NavigationState } from '@react-navigation/native'
import { BCSCScreens, BCSCStacks } from '../types/navigators'
import {
  formatNavigationTrail,
  getBaseScreenName,
  getCurrentStateScreenName,
  getNavigationBreadcrumbs,
  getRouteNamesBelowFocus,
  isForwardPush,
} from './stack-utils'

const fresh = (name: string): VisitedScreen => ({ name, isBack: false })
const back = (name: string): VisitedScreen => ({ name, isBack: true })

const stackState = (names: string[], index = names.length - 1) =>
  ({
    type: 'stack',
    index,
    routes: names.map((name) => ({ name, key: name })),
  }) as unknown as NavigationState

describe('StackUtils', () => {
  describe('getBaseScreenName', () => {
    it('returns the screen name', () => {
      expect(getBaseScreenName('OnboardingAccountSetup')).toBe('OnboardingAccountSetup')
    })

    it('returns the base screen with the stack prefix removed and trimmed', () => {
      expect(getBaseScreenName(`${BCSCStacks.Main}Test`)).toBe('Test')
      expect(getBaseScreenName(`${BCSCStacks.Main} Test`)).toBe('Test')
    })

    it('handles empty string', () => {
      expect(getBaseScreenName('')).toBe('')
    })
  })

  describe('getCurrentStateScreenName', () => {
    it('returns the screen name for a flat navigation state', () => {
      const state = {
        index: 0,
        routes: [{ name: BCSCScreens.Home, key: 'home-1' }],
      } as unknown as NavigationState

      expect(getCurrentStateScreenName(state)).toBe(BCSCScreens.Home)
    })

    it('returns the active screen for a state with multiple routes', () => {
      const state = {
        index: 1,
        routes: [
          { name: BCSCScreens.Home, key: 'home-1' },
          { name: BCSCScreens.MainSettings, key: 'settings-1' },
        ],
      } as unknown as NavigationState

      expect(getCurrentStateScreenName(state)).toBe(BCSCScreens.MainSettings)
    })

    it('returns the Home screen from a nested TabStack inside MainStack', () => {
      const state = {
        index: 0,
        routes: [
          {
            name: BCSCStacks.Tab,
            key: 'tab-1',
            state: {
              index: 0,
              routes: [
                { name: BCSCScreens.Home, key: 'home-1' },
                { name: BCSCScreens.Services, key: 'services-1' },
                { name: BCSCScreens.Wallet, key: 'wallet-1' },
              ],
            },
          },
        ],
      } as unknown as NavigationState

      expect(getCurrentStateScreenName(state)).toBe(BCSCScreens.Home)
    })

    it('returns the active tab screen when a different tab is selected', () => {
      const state = {
        index: 0,
        routes: [
          {
            name: BCSCStacks.Tab,
            key: 'tab-1',
            state: {
              index: 2,
              routes: [
                { name: BCSCScreens.Home, key: 'home-1' },
                { name: BCSCScreens.Services, key: 'services-1' },
                { name: BCSCScreens.Wallet, key: 'wallet-1' },
              ],
            },
          },
        ],
      } as unknown as NavigationState

      expect(getCurrentStateScreenName(state)).toBe(BCSCScreens.Wallet)
    })

    it('recursively resolves through three levels of nesting', () => {
      const state = {
        index: 0,
        routes: [
          {
            name: 'RootStack',
            key: 'root-1',
            state: {
              index: 0,
              routes: [
                {
                  name: BCSCStacks.Main,
                  key: 'main-1',
                  state: {
                    index: 0,
                    routes: [
                      {
                        name: BCSCStacks.Tab,
                        key: 'tab-1',
                        state: {
                          index: 0,
                          routes: [{ name: BCSCScreens.Home, key: 'home-1' }],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      } as unknown as NavigationState

      expect(getCurrentStateScreenName(state)).toBe(BCSCScreens.Home)
    })
  })

  describe('getRouteNamesBelowFocus', () => {
    it('returns the routes beneath the focused route of a flat stack', () => {
      expect(getRouteNamesBelowFocus(stackState(['A', 'B', 'C']))).toEqual(['A', 'B'])
    })

    it('returns an empty array when the first route is focused', () => {
      expect(getRouteNamesBelowFocus(stackState(['A', 'B'], 0))).toEqual([])
    })

    it('resolves a nested navigator route beneath focus to its focused leaf screen', () => {
      const state = {
        type: 'stack',
        index: 1,
        routes: [
          {
            name: BCSCStacks.Tab,
            key: 'tab-1',
            state: {
              type: 'tab',
              index: 1,
              routes: [
                { name: BCSCScreens.Home, key: 'home-1' },
                { name: BCSCScreens.Services, key: 'services-1' },
              ],
            },
          },
          { name: BCSCScreens.MainSettings, key: 'settings-1' },
        ],
      } as unknown as NavigationState

      expect(getRouteNamesBelowFocus(state)).toEqual([BCSCScreens.Services])
    })

    it('adds nothing for a tab level', () => {
      const state = {
        type: 'stack',
        index: 0,
        routes: [
          {
            name: BCSCStacks.Tab,
            key: 'tab-1',
            state: {
              type: 'tab',
              index: 2,
              routes: [
                { name: BCSCScreens.Home, key: 'home-1' },
                { name: BCSCScreens.Services, key: 'services-1' },
                { name: BCSCScreens.Wallet, key: 'wallet-1' },
              ],
            },
          },
        ],
      } as unknown as NavigationState

      expect(getRouteNamesBelowFocus(state)).toEqual([])
    })

    it('traverses through a focused tab into the tab’s own child stack', () => {
      const state = {
        type: 'stack',
        index: 1,
        routes: [
          { name: 'Outer', key: 'outer-1' },
          {
            name: 'Tabs',
            key: 'tabs-1',
            state: {
              type: 'tab',
              index: 0,
              routes: [
                {
                  name: 'FirstTab',
                  key: 'first-1',
                  state: stackState(['A', 'B', 'C']),
                },
              ],
            },
          },
        ],
      } as unknown as NavigationState

      expect(getRouteNamesBelowFocus(state)).toEqual(['Outer', 'A', 'B'])
    })

    it('preserves the stack prefix on raw route names', () => {
      const state = stackState([BCSCScreens.MainSettings, BCSCScreens.MainWebView])

      expect(getRouteNamesBelowFocus(state)).toEqual([`${BCSCStacks.Main} In App Settings`])
    })
  })

  describe('isForwardPush', () => {
    const keyed = (keys: string[], index = keys.length - 1, type = 'stack') =>
      ({
        type,
        index,
        routes: keys.map((key) => ({ name: key.split('#')[0], key })),
      }) as unknown as NavigationState

    it('is true for a plain push', () => {
      expect(isForwardPush(keyed(['A#1']), keyed(['A#1', 'B#1']))).toBe(true)
    })

    it('is true when the pushed screen shares a name with one already beneath', () => {
      expect(isForwardPush(keyed(['A#1', 'B#1']), keyed(['A#1', 'B#1', 'A#2']))).toBe(true)
    })

    it('is false going back', () => {
      expect(isForwardPush(keyed(['A#1', 'B#1', 'C#1']), keyed(['A#1', 'B#1']))).toBe(false)
    })

    it('is false for a reset to an earlier step with new keys', () => {
      expect(isForwardPush(keyed(['VO#1', 'Inc#1']), keyed(['VO#2']))).toBe(false)
    })

    it('is false for a reset onto a new, shallower screen', () => {
      expect(isForwardPush(keyed(['VO#1', 'Tips#1', 'Call#1']), keyed(['VO#2', 'Inc#2']))).toBe(false)
    })

    it('is true for a push from inside a tab navigator onto the outer stack', () => {
      const tab = (index: number) => ({
        name: 'Tabs',
        key: 'tabs',
        state: {
          type: 'tab',
          index,
          routes: [
            { name: 'Home', key: 'home' },
            { name: 'Wallet', key: 'wallet' },
          ],
        },
      })
      const previous = { type: 'stack', index: 0, routes: [tab(1)] } as unknown as NavigationState
      const next = {
        type: 'stack',
        index: 1,
        routes: [tab(1), { name: 'Settings', key: 'settings' }],
      } as unknown as NavigationState

      expect(isForwardPush(previous, next)).toBe(true)
    })

    it('is true for a push inside a nested stack and false for going back inside it', () => {
      const nested = (keys: string[]) =>
        ({
          type: 'stack',
          index: 0,
          routes: [{ name: 'Outer', key: 'outer', state: keyed(keys) }],
        }) as unknown as NavigationState

      expect(isForwardPush(nested(['A#1']), nested(['A#1', 'A#2']))).toBe(true)
      expect(isForwardPush(nested(['A#1', 'B#1']), nested(['A#1']))).toBe(false)
    })

    it('is false when routes have no keys', () => {
      const unkeyed = (names: string[]) =>
        ({
          type: 'stack',
          index: names.length - 1,
          routes: names.map((name) => ({ name })),
        }) as unknown as NavigationState

      expect(isForwardPush(unkeyed(['A']), unkeyed(['A', 'B']))).toBe(false)
    })
  })

  describe('formatNavigationTrail', () => {
    it('returns an empty string for an empty trail', () => {
      expect(formatNavigationTrail([], 0)).toBe('')
    })

    it('returns the name of a single screen', () => {
      expect(formatNavigationTrail([fresh('Home')], 0)).toBe('Home')
    })

    it('joins a linear all-fresh trail with " > "', () => {
      expect(formatNavigationTrail([fresh('A'), fresh('B'), fresh('C')], 0)).toBe('A > B > C')
    })

    it('renders back navigation as "back to X"', () => {
      expect(formatNavigationTrail([fresh('A'), fresh('B'), back('A')], 0)).toBe('A > B > back to A')
    })

    it('collapses the repeated verification flow from the issue', () => {
      const flow = [
        BCSCScreens.VerificationMethodSelection,
        BCSCScreens.PhotoInstructions,
        BCSCScreens.TakePhoto,
        BCSCScreens.PhotoReview,
        BCSCScreens.StartCall,
        BCSCScreens.LiveCall,
        BCSCScreens.VerifyNotComplete,
      ]
      const screens = [
        fresh(BCSCScreens.AccountLanding),
        ...flow.map(fresh),
        ...flow.map((name, index) => (index === 0 ? back(name) : fresh(name))),
      ]

      expect(screens).toHaveLength(15)
      expect(formatNavigationTrail(screens, 0)).toBe(
        'Account Landing > [back to Verify Options > Selfie Photo Tips > Selfie Photo Capture > Selfie Photo Confirmation > Video Verify Call Now Progress > Video Call: In-Call > Video Verify Incomplete] x2'
      )
    })

    it('counts three passes as x3', () => {
      const pass = (first: VisitedScreen) => [first, fresh('B')]

      expect(
        formatNavigationTrail([fresh('Start'), ...pass(fresh('A')), ...pass(back('A')), ...pass(back('A'))], 0)
      ).toBe('Start > [back to A > B] x3')
    })

    it('collapses a repeat in the middle of the trail', () => {
      const screens = [fresh('Start'), fresh('A'), fresh('B'), back('A'), fresh('B'), fresh('End')]

      expect(formatNavigationTrail(screens, 0)).toBe('Start > [back to A > B] x2 > End')
    })

    it('keeps the entry point out of a block that starts on its second screen', () => {
      const screens = [fresh('Home'), fresh('Settings'), back('Home'), fresh('Settings'), back('Home')]

      expect(formatNavigationTrail(screens, 0)).toBe('Home > [Settings > back to Home] x2')
    })

    it('never folds the entry point into a block when nothing was dropped', () => {
      const screens = [
        fresh('Home'),
        fresh('Settings'),
        back('Home'),
        fresh('Settings'),
        back('Home'),
        fresh('Settings'),
      ]

      expect(formatNavigationTrail(screens, 0)).toBe('Home > [Settings > back to Home] x2 > Settings')
    })

    it('shows the flags of the last pass inside a block', () => {
      const screens = [fresh('Start'), fresh('A'), fresh('B'), back('A'), back('B')]

      expect(formatNavigationTrail(screens, 0)).toBe('Start > [back to A > back to B] x2')
    })

    it('lists a repeat nested inside a repeated block flat', () => {
      const run = ['A', 'X', 'Y', 'X', 'Y', 'Z']
      const screens = [fresh('Start'), ...run.map(fresh), ...run.map(fresh)]

      expect(formatNavigationTrail(screens, 0)).toBe('Start > [A > X > Y > X > Y > Z] x2')
    })

    it('marks the gap after the entry point and never spans a block across it', () => {
      const screens = [fresh('A'), fresh('B'), back('A'), fresh('B')]

      expect(formatNavigationTrail(screens, 3)).toBe('A > (3 more) > B > back to A > B')
    })
  })

  describe('getNavigationBreadcrumbs', () => {
    beforeEach(() => {
      NAVIGATION_TRAIL.screens.length = 0
      NAVIGATION_TRAIL.droppedCount = 0
    })

    it('delegates to formatNavigationTrail with the recorded trail and dropped count', () => {
      NAVIGATION_TRAIL.screens.push(fresh('A'), fresh('B'), back('A'), fresh('B'))
      NAVIGATION_TRAIL.droppedCount = 4

      expect(getNavigationBreadcrumbs()).toBe(formatNavigationTrail(NAVIGATION_TRAIL.screens, 4))
      expect(getNavigationBreadcrumbs()).toBe('A > (4 more) > B > back to A > B')
    })

    it('returns an empty string for no visited screens', () => {
      expect(getNavigationBreadcrumbs()).toBe('')
    })

    it('returns the screen name for a single visited screen', () => {
      NAVIGATION_TRAIL.screens.push(fresh(BCSCScreens.Home))

      expect(getNavigationBreadcrumbs()).toBe(BCSCScreens.Home)
    })

    it('joins visited screens in the order they were visited', () => {
      NAVIGATION_TRAIL.screens.push(
        fresh(BCSCScreens.Contacts),
        fresh(BCSCScreens.ContactDetails),
        fresh(BCSCScreens.EditContactName)
      )

      expect(getNavigationBreadcrumbs()).toBe(
        `${BCSCScreens.Contacts} > ${BCSCScreens.ContactDetails} > ${BCSCScreens.EditContactName}`
      )
    })
  })
})
