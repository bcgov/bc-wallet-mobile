import { CommonActions, NavigationProp, ParamListBase } from '@react-navigation/native'

/**
 * Drops every route above `anchor`, then opens `screen` on top of it in a single transition, so back
 * from `screen` returns to `anchor`. Routes up to and including `anchor` keep their keys, so they are
 * not remounted.
 *
 * When the stack doesn't hold `anchor`, nothing is dropped: `screen` opens on top of the stack as is.
 *
 */
export const popToThenNavigate = <ParamList extends ParamListBase, RouteName extends Extract<keyof ParamList, string>>(
  navigation: Pick<NavigationProp<ParamList>, 'dispatch'>,
  anchor: Extract<keyof ParamList, string>,
  screen: RouteName,
  params?: ParamList[RouteName]
): void => {
  navigation.dispatch((state) => {
    const anchorIndex = state.routes.findIndex((route) => route.name === anchor)
    const kept = anchorIndex === -1 ? state.routes : state.routes.slice(0, anchorIndex + 1)
    const routes = [...kept, { name: screen, params }]

    return CommonActions.reset({ ...state, routes, index: routes.length - 1 })
  })
}
