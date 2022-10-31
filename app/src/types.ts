import type { ReducerAction } from 'aries-bifold/lib/typescript/App/contexts/reducers/store'

import { contexts, types } from 'aries-bifold'

export class BcWalletState extends contexts.store.DefaultBiFoldState {}

export const BcWalletReducer = (state: types.state.State, action: ReducerAction): types.state.State => {
  return state
}
