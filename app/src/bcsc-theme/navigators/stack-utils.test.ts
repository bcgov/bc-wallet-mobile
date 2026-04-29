import { NavigationState } from '@react-navigation/native'
import { BCSCScreens, BCSCStacks } from '../types/navigators'
import { getBaseScreenName, getCurrentStateScreenName } from './stack-utils'

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
})
