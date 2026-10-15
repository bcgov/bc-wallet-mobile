import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { mediatorHost, mediatorLabel, switchMediator } from '@/bcsc-theme/features/agent/services/mediator-service'
import { BCSCMainStackParams, BCSCQRCoreScreens, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useAlerts } from '@/hooks/useAlerts'
import { BCState } from '@/store'
import { activate, deactivate } from '@/utils/PushNotificationsHelper'
import { DispatchAction, TOKENS, useServices, useStore } from '@bifold/core'
import { Agent } from '@credo-ts/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface MediatorOption {
  url: string
  label: string
  host: string
  selected: boolean
}

/**
 * Developer-mode mediator picker: lists the mediators this install knows, switches the wallet to the
 * tapped one in place and persists the choice. A mediator invitation scanned on the way in joins the list.
 */
export const useConfigureMediatorViewModel = (scannedMediatorUri?: string) => {
  const { t } = useTranslation()
  const [store, dispatch] = useStore<BCState>()
  const { waitForAgent } = useBCSCAgent()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()
  const { failedToSwitchMediatorAlert } = useAlerts(navigation)
  const [switchingTo, setSwitchingTo] = useState<string | null>(null)

  const { availableMediators, selectedMediator, usePushNotifications } = store.preferences

  useEffect(() => {
    if (scannedMediatorUri && !availableMediators.includes(scannedMediatorUri)) {
      dispatch({ type: DispatchAction.ADD_AVAILABLE_MEDIATOR, payload: [scannedMediatorUri] })
    }
  }, [scannedMediatorUri, availableMediators, dispatch])

  const mediators = useMemo<MediatorOption[]>(
    () =>
      availableMediators.map((url) => ({
        url,
        label: mediatorLabel(url),
        host: mediatorHost(url),
        selected: url === selectedMediator,
      })),
    [availableMediators, selectedMediator]
  )

  const switchTo = useCallback(
    async (agent: Agent, url: string) => {
      // The device token follows the mediator: taken off the current one first, then registered with
      // whichever mediator the switch leaves in place
      if (usePushNotifications) {
        await deactivate(agent).catch((error) =>
          logger.warn(`Clearing the device token before the mediator switch failed: ${error}`)
        )
      }
      try {
        await switchMediator(agent, url, logger)
        dispatch({ type: DispatchAction.SET_SELECTED_MEDIATOR, payload: [url] })
      } finally {
        if (usePushNotifications) {
          activate(agent).catch((error) =>
            logger.warn(`Push notification registration after the mediator switch failed: ${error}`)
          )
        }
      }
    },
    [usePushNotifications, logger, dispatch]
  )

  const selectMediator = useCallback(
    async (url: string) => {
      if (url === selectedMediator || switchingTo) {
        return
      }
      setSwitchingTo(url)
      try {
        const agent = await waitForAgent()
        if (!agent) {
          throw new Error('Agent is not ready')
        }
        await switchTo(agent, url)
      } catch (error) {
        logger.error(`Mediator switch failed: ${error}`)
        failedToSwitchMediatorAlert(error)
      } finally {
        setSwitchingTo(null)
      }
    },
    [selectedMediator, switchingTo, waitForAgent, switchTo, logger, failedToSwitchMediatorAlert]
  )

  const scanMediator = useCallback(() => {
    navigation.navigate(BCSCScreens.QRCore, { screen: BCSCQRCoreScreens.Scanner })
  }, [navigation])

  return {
    mediators,
    switchingTo,
    descriptionText: t('BCSC.ConfigureMediator.Description'),
    scanButtonText: t('BCSC.ConfigureMediator.ScanButton'),
    selectMediator,
    scanMediator,
  }
}
