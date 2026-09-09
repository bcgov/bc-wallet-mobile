import { useServerStatus } from '@/bcsc-theme/contexts/ServerStatusContext'
import { BCSCModals } from '@/bcsc-theme/types/navigators'
import { CommonActions, useNavigation } from '@react-navigation/native'
import { useCallback } from 'react'

export interface ServerStatusCheckNavigationParams {
  inOnboarding?: boolean
}

export interface ServerStatusCheckResult {
  isAvailable: boolean
  statusMessage?: string
}

const useServerStatusCheck = () => {
  const navigation = useNavigation()
  const { refresh, isChecking } = useServerStatus()

  const checkServerStatus = useCallback(
    async (navigationParams?: ServerStatusCheckNavigationParams): Promise<ServerStatusCheckResult> => {
      const result = await refresh({ force: true })

      if (!result.isAvailable) {
        const state = navigation.getState()
        const currentRouteName = state?.routes?.[state.index]?.name
        if (currentRouteName !== BCSCModals.ServiceOutage) {
          navigation.dispatch(
            CommonActions.navigate({ name: BCSCModals.ServiceOutage, params: { ...(navigationParams ?? {}) } })
          )
        }
      }

      return { isAvailable: result.isAvailable, statusMessage: result.statusMessage }
    },
    [refresh, navigation]
  )

  return { checkServerStatus, isChecking }
}

export default useServerStatusCheck
