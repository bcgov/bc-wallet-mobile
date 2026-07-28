import { BCDispatchAction } from '@/store'
import { ReducerAction } from '@bifold/core'
import { Dispatch } from 'react'
import uuid from 'react-native-uuid'
import { SystemCheckStrategy } from './system-checks'

export class InstallIdSystemCheck implements SystemCheckStrategy {
  private readonly installId: string | undefined
  private readonly dispatch: Dispatch<ReducerAction<any>>

  constructor(installId: string | undefined, dispatch: Dispatch<ReducerAction<any>>) {
    this.installId = installId
    this.dispatch = dispatch
  }

  runCheck(): boolean {
    return !!this.installId
  }

  onFail(): void {
    this.dispatch({
      type: BCDispatchAction.SET_INSTALL_ID,
      payload: [uuid.v4().toString()],
    })
  }
}
