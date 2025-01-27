import { useEffect } from 'react'
import { DeviceEventEmitter } from 'react-native'

import { BCWalletEventTypes } from '../events/eventTypes'
import { SelectedNotificationType, SelectedHistoryType } from '../types/activities'

const useMultiSelectActive = (selectedType: SelectedNotificationType[] | SelectedHistoryType[] | null) => {
  useEffect(() => {
    if (selectedType !== null) {
      DeviceEventEmitter.emit(BCWalletEventTypes.ADD_MULTI_SELECT_PRESSED, true)
    } else {
      DeviceEventEmitter.emit(BCWalletEventTypes.ADD_MULTI_SELECT_PRESSED, false)
    }
  }, [selectedType])
}

export default useMultiSelectActive
