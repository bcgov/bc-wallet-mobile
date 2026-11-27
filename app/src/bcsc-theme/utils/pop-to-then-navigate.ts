import { CommonActions, NavigationProp, ParamListBase } from '@react-navigation/native'

/** A route to open, with its params when it takes any. */
export type RouteToPush<ParamList extends ParamListBase> = {
  [RouteName in Extract<keyof ParamList, string>]: { name: RouteName; params?: ParamList[RouteName] }
}[Extract<keyof ParamList, string>]

/**
 * Drops every route above `anchor`, then opens `routes` on top of it in order, in a single
 * transition, so back walks down through them to `anchor`. Routes up to and including `anchor` keep
 * their keys, so they are not remounted.
 *
 * When the stack doesn't hold `anchor`, nothing is dropped: `routes` open on top of the stack as is.
 */
export const popToThenPush = <ParamList extends ParamListBase>(
  navigation: Pick<NavigationProp<ParamList>, 'dispatch'>,
  anchor: Extract<keyof ParamList, string>,
  routes: readonly RouteToPush<ParamList>[]
): void => {
  navigation.dispatch((state) => {
    const anchorIndex = state.routes.findIndex((route) => route.name === anchor)
    const kept = anchorIndex === -1 ? state.routes : state.routes.slice(0, anchorIndex + 1)
    const nextRoutes = [...kept, ...routes]

    return CommonActions.reset({ ...state, routes: nextRoutes, index: nextRoutes.length - 1 })
  })
}

/**
 * Drops every route above `anchor`, then opens `screen` on top of it in a single transition, so back
 * from `screen` returns to `anchor`. See {@link popToThenPush} to open more than one route.
 */
export const popToThenNavigate = <ParamList extends ParamListBase, RouteName extends Extract<keyof ParamList, string>>(
  navigation: Pick<NavigationProp<ParamList>, 'dispatch'>,
  anchor: Extract<keyof ParamList, string>,
  screen: RouteName,
  params?: ParamList[RouteName]
): void => {
  popToThenPush(navigation, anchor, [{ name: screen, params } as RouteToPush<ParamList>])
}
