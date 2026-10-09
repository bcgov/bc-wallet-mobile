import { NAVIGATION_TRAIL, VisitedScreen } from '@/contexts/NavigationContainerContext'
import { NavigationState } from '@react-navigation/native'
import { StackNavigationOptions } from '@react-navigation/stack'
import { createStackHeader } from '../components/NavigationHeaders'
import { BCSCScreens, BCSCStacks } from '../types/navigators'

/**
 * Returns default screen options for modal presentations.
 *
 * @param {string} title - The title of the modal screen.
 * @returns {*} {StackNavigationOptions} The default modal screen options.
 */
export function getDefaultModalOptions(title?: string): StackNavigationOptions {
  return {
    presentation: 'modal',
    headerShown: true,
    headerLeft: () => null,
    title: title,
    headerShadowVisible: false,
    header: createStackHeader,
    gestureEnabled: true,
  }
}

/**
 * Gets the base screen name by removing the stack prefix from the screen name.
 *
 * @example getBaseScreenName('BCSCAuthStack EnterPIN') // returns 'EnterPIN'
 *
 * @param screen - The screen name to get the base name from.
 * @returns The base screen name without the stack prefix.
 */
export const getBaseScreenName = (screen: BCSCScreens | string): string => {
  for (const stack of Object.values(BCSCStacks)) {
    if (screen.startsWith(stack)) {
      return screen.slice(stack.length).trim()
    }
  }

  return screen
}

/**
 * Gets the current screen name from the navigation state, accounting for nested navigators.
 *
 * @param state - The navigation state object.
 * @returns The name of the current screen.
 */
export const getCurrentStateScreenName = (state: NavigationState): string => {
  const currentRoute = state.routes[state.index]

  if (!currentRoute.state || currentRoute.state.index === undefined || !currentRoute.state.routes) {
    // If there is no nested state (ie: TabStack), return the current route name
    return currentRoute.name
  }

  return getCurrentStateScreenName(currentRoute.state as NavigationState)
}

const getRouteLeafName = (route: NavigationState['routes'][number]): string => {
  const nested = route.state

  if (!nested || nested.index === undefined || !nested.routes) {
    return route.name
  }

  return getCurrentStateScreenName(nested as NavigationState)
}

/**
 * Gets the raw (stack-prefixed) names of the screens sitting beneath the focused screen, across
 * every stack navigator on the focused path. Tab and drawer levels contribute nothing because
 * switching tabs is a sideways move, not a return.
 *
 * @param state - The navigation state object.
 * @returns The route names beneath the focused screen, outermost stack first.
 */
export const getRouteNamesBelowFocus = (state: NavigationState): string[] => {
  const names: string[] = []
  let current: NavigationState | undefined = state

  while (current) {
    const focusedRoute: NavigationState['routes'][number] = current.routes[current.index]

    if (current.type === 'stack') {
      for (const route of current.routes.slice(0, current.index)) {
        names.push(getRouteLeafName(route))
      }
    }

    const nested = focusedRoute.state
    current = nested && nested.index !== undefined && nested.routes ? (nested as NavigationState) : undefined
  }

  return names
}

type TrailBlock = { screens: VisitedScreen[]; count: number }

const isTrailBlock = (token: VisitedScreen | TrailBlock): token is TrailBlock => 'count' in token

const hasSameNames = (screens: VisitedScreen[], a: number, b: number, length: number): boolean => {
  for (let offset = 0; offset < length; offset++) {
    if (screens[a + offset].name !== screens[b + offset].name) {
      return false
    }
  }

  return true
}

/**
 * Collapses adjacent repeated runs of screens (matched by name, shortest run first, left to right).
 * A block carries the entries of its last pass, so `isBack` reflects the most recent attempt.
 * Nested repeats inside a block are listed flat.
 */
const collapseRepeats = (screens: VisitedScreen[]): Array<VisitedScreen | TrailBlock> => {
  const tokens: Array<VisitedScreen | TrailBlock> = []
  let index = 0

  while (index < screens.length) {
    const maxPeriod = Math.floor((screens.length - index) / 2)
    let period = 1

    while (period <= maxPeriod && !hasSameNames(screens, index, index + period, period)) {
      period++
    }

    if (period > maxPeriod) {
      tokens.push(screens[index])
      index += 1
      continue
    }

    let count = 2
    while (
      index + (count + 1) * period <= screens.length &&
      hasSameNames(screens, index, index + count * period, period)
    ) {
      count++
    }

    tokens.push({ screens: screens.slice(index + (count - 1) * period, index + count * period), count })
    index += count * period
  }

  return tokens
}

const renderScreen = ({ name, isBack }: VisitedScreen): string => (isBack ? `back to ${name}` : name)

const renderTokens = (screens: VisitedScreen[]): string[] =>
  collapseRepeats(screens).map((token) =>
    isTrailBlock(token) ? `[${token.screens.map(renderScreen).join(' > ')}] x${token.count}` : renderScreen(token)
  )

/**
 * Formats the recorded trail as a readable string: repeated flows collapse into `[a > b] xN`,
 * returning to an earlier screen reads `back to X`, and `(N more)` marks entries evicted after the
 * entry point. Text is plain English diagnostic output for the problem-report dashboard, not UI.
 *
 * @param screens - The recorded screens, oldest first; index 0 is the session entry point.
 * @param droppedCount - How many entries were evicted after the entry point.
 * @returns The formatted trail.
 */
export const formatNavigationTrail = (screens: VisitedScreen[], droppedCount: number): string => {
  if (droppedCount === 0) {
    return renderTokens(screens).join(' > ')
  }

  // The rest is collapsed separately so a block never spans the gap
  return [renderScreen(screens[0]), `(${droppedCount} more)`, ...renderTokens(screens.slice(1))].join(' > ')
}

/**
 * Formats a session's visited-screen history into a breadcrumb trail for error reports.
 *
 * A live NavigationState snapshot can't reconstruct "where the user came from" — React Navigation
 * prunes popped routes out of `state.routes` on back-navigation, so the trail has to be recorded
 * as navigation happens (see `NAVIGATION_TRAIL` in NavigationContainerContext) rather than
 * derived here from a single point-in-time state.
 *
 * @returns A string representing the navigation breadcrumbs.
 */
export const getNavigationBreadcrumbs = (): string =>
  formatNavigationTrail(NAVIGATION_TRAIL.screens, NAVIGATION_TRAIL.droppedCount)
