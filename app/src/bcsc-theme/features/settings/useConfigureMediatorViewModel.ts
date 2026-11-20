import { useBCSCAgent } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { mediatorHost, mediatorLabel, switchMediator } from '@/bcsc-theme/features/agent/services/mediator-service'
import { usePreferences } from '@/bcsc-theme/storage/hooks'
import { BCSCMainStackParams, BCSCQRCoreScreens, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useAlerts } from '@/hooks/useAlerts'
import { activate, deactivate } from '@/utils/PushNotificationsHelper'
import { TOKENS, useServices } from '@bifold/core'
import { Agent } from '@credo-ts/core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Config from 'react-native-config'

export interface MediatorOption {
  url: string
  label: string
  host: string
  selected: boolean
  /** A mediator not in use can leave the list, except the build's own, which the next launch would restore. */
  removable: boolean
  /** Accessibility label of the control that removes the mediator. */
  removeLabel: string
}

/**
 * Developer-mode mediator picker: lists the mediators this install knows, switches the wallet to the
 * tapped one in place and persists the choice. A mediator invitation scanned on the way in joins the
 * list, and a mediator that is not in use can be removed from it again.
 */
export const useConfigureMediatorViewModel = (scannedMediatorUri?: string) => {
  const { t } = useTranslation()
  const { waitForAgent } = useBCSCAgent()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams, BCSCScreens.ConfigureMediator>>()
  const { failedToSwitchMediatorAlert } = useAlerts(navigation)
  const [switchingTo, setSwitchingTo] = useState<string | null>(null)

  const {
    availableMediators,
    selectedMediator,
    usePushNotifications,
    walletName,
    addMediator,
    selectMediator: saveSelectedMediator,
    removeMediator: forgetMediator,
  } = usePreferences()
  // The mediator sees this wallet under the label the agent is built with (see useAgentSetupViewModel)
  const walletLabel = walletName || 'BC Wallet'

  useEffect(() => {
    if (!scannedMediatorUri) {
      return
    }
    if (!availableMediators.includes(scannedMediatorUri)) {
      void addMediator(scannedMediatorUri)
    }
    // Consumed: the route keeps its params, and a mediator removed later must not come back from them
    navigation.setParams({ scannedMediatorUri: undefined })
  }, [scannedMediatorUri, availableMediators, addMediator, navigation])

  const mediators = useMemo<MediatorOption[]>(
    () =>
      availableMediators.map((url) => {
        const label = mediatorLabel(url)
        return {
          url,
          label,
          host: mediatorHost(url),
          selected: url === selectedMediator,
          removable: url !== selectedMediator && url !== Config.MEDIATOR_URL,
          removeLabel: t('BCSC.ConfigureMediator.Remove', { mediator: label }),
        }
      }),
    [availableMediators, selectedMediator, t]
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
        await switchMediator(agent, { mediatorUrl: url, label: walletLabel }, logger)
        await saveSelectedMediator(url)
      } finally {
        if (usePushNotifications) {
          await activate(agent).catch((error) =>
            logger.warn(`Push notification registration after the mediator switch failed: ${error}`)
          )
        }
      }
    },
    [usePushNotifications, walletLabel, logger, saveSelectedMediator]
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

  const removeMediator = useCallback(
    (url: string) => {
      if (switchingTo || !mediators.some((mediator) => mediator.url === url && mediator.removable)) {
        return
      }
      void forgetMediator(url)
    },
    [switchingTo, mediators, forgetMediator]
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
    removeMediator,
    scanMediator,
  }
}
