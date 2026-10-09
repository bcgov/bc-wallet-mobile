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

type NavigationRoute = NavigationState['routes'][number]

// A route only has a navigable nested state once its child navigator has been visited (ie: not a never-opened TabStack)
const getNestedState = (route: NavigationRoute): NavigationState | undefined =>
  route.state && route.state.index !== undefined && route.state.routes ? (route.state as NavigationState) : undefined

const getRouteLeafName = (route: NavigationRoute): string => {
  const nested = getNestedState(route)

  return nested ? getCurrentStateScreenName(nested) : route.name
}

/**
 * Gets the current screen name from the navigation state, accounting for nested navigators.
 *
 * @param state - The navigation state object.
 * @returns The name of the current screen.
 */
export const getCurrentStateScreenName = (state: NavigationState): string => getRouteLeafName(state.routes[state.index])

// The navigators on the focused path, outermost first
const getFocusedStates = (state: NavigationState): NavigationState[] => {
  const states: NavigationState[] = []

  for (let current: NavigationState | undefined = state; current; ) {
    states.push(current)
    current = getNestedState(current.routes[current.index])
  }

  return states
}

/**
 * Gets the raw (stack-prefixed) names of screens beneath the focused one in every stack on the focused path.
 * Tab and drawer levels add nothing: switching tabs is a sideways move, not a return.
 *
 * @param state - The navigation state object.
 * @returns The route names beneath the focused screen, outermost stack first.
 */
export const getRouteNamesBelowFocus = (state: NavigationState): string[] =>
  getFocusedStates(state)
    .filter((navigator) => navigator.type === 'stack')
    .flatMap((navigator) => navigator.routes.slice(0, navigator.index).map(getRouteLeafName))

/**
 * Whether `next` is a forward push: the route directly beneath the newly focused screen is one that was
 * already on the previous focused path. Goes back and resets to an earlier step leave no such route beneath.
 *
 * @param previous - The navigation state before the change.
 * @param next - The navigation state after the change.
 * @returns True when the user moved forward onto a new route, even one whose name is already in the stack.
 */
export const isForwardPush = (previous: NavigationState, next: NavigationState): boolean => {
  const previousKeys = new Set(getFocusedStates(previous).map((navigator) => navigator.routes[navigator.index].key))
  const holder = getFocusedStates(next).pop()
  const beneath = holder?.type === 'stack' && holder.index > 0 ? holder.routes[holder.index - 1] : undefined

  return beneath?.key !== undefined && previousKeys.has(beneath.key)
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
 * Collapses adjacent repeated runs by name, shortest first; a block keeps its last pass's `isBack` flags.
 * Not recursive: an inner repeat starting at the same position hides an outer repeat around it.
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
 * Formats the trail: repeats collapse to `[a > b] xN`, returns read `back to X`, `(N more)` marks evicted entries.
 * Diagnostic text for the problem-report dashboard, not UI, so it is not localized.
 *
 * @param screens - The recorded screens, oldest first; index 0 is the session entry point.
 * @param droppedCount - How many entries were evicted after the entry point.
 * @returns The formatted trail.
 */
export const formatNavigationTrail = (screens: VisitedScreen[], droppedCount: number): string => {
  if (screens.length === 0) {
    return ''
  }

  // The entry point is always shown on its own, and the rest is collapsed separately so no block spans it or the gap
  const gap = droppedCount > 0 ? [`(${droppedCount} more)`] : []

  return [renderScreen(screens[0]), ...gap, ...renderTokens(screens.slice(1))].join(' > ')
}

/**
 * Formats the session's recorded `NAVIGATION_TRAIL` into a breadcrumb trail for error reports.
 * Recorded as navigation happens because React Navigation prunes popped routes from a live state snapshot.
 *
 * @returns A string representing the navigation breadcrumbs.
 */
export const getNavigationBreadcrumbs = (): string =>
  formatNavigationTrail(NAVIGATION_TRAIL.screens, NAVIGATION_TRAIL.droppedCount)
