import { BCDispatchAction } from '@/store'
import { ReducerAction } from '@bifold/core'
import { Dispatch } from 'react'
import uuid from 'react-native-uuid'
import { SystemCheckStrategy } from './system-checks'

export class ReportUUIDSystemCheck implements SystemCheckStrategy {
  private readonly reportUUID: string | undefined
  private readonly dispatch: Dispatch<ReducerAction<any>>

  constructor(reportUUID: string | undefined, dispatch: Dispatch<ReducerAction<any>>) {
    this.reportUUID = reportUUID
    this.dispatch = dispatch
  }

  runCheck(): boolean {
    return !!this.reportUUID
  }

  onFail(): void {
    this.dispatch({
      type: BCDispatchAction.SET_REPORT_UUID,
      payload: [uuid.v4()],
    })
  }
}
