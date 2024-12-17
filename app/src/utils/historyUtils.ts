import { Agent } from '@credo-ts/core'
import { IHistoryManager } from '@hyperledger/aries-bifold-core/App/modules/history/types'
import { NavigationProp } from '@react-navigation/native'
import { Alert } from 'react-native'

import { ActivitiesStackParams } from '../navigators/navigators'

/**
 * Handles the deletion of a history event with confirmation.
 *
 * @param itemId - The identifier of the item to be deleted.
 * @param agent - The agent used to interact with the history manager.
 * @param loadHistory - Function to load the history manager for the given agent.
 * @param navigation - Navigation object to allow returning to the previous screen.
 * @param t - Translation function for localized messages.
 */
export const handleDeleteHistory = async (
  itemId: string,
  agent: Agent | undefined,
  loadHistory: (agent: Agent) => IHistoryManager | undefined,
  navigation: NavigationProp<ActivitiesStackParams>,
  t: (key: string) => string
) => {
  Alert.alert(
    t('History.Button.DeleteHistory'),
    t('History.ConfirmDeleteHistory'),
    [
      { text: t('Global.Cancel'), style: 'cancel' },
      {
        text: t('Global.Confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            const historyManager = agent ? loadHistory(agent) : undefined
            if (historyManager) {
              const record = await historyManager.findGenericRecordById(itemId || '')
              if (record) {
                await historyManager.removeGenericRecord(record)
                navigation.goBack()
              }
            }
          } catch (error) {
            //console.warn('Failed to delete event:', error)
          }
        },
      },
    ],
    { cancelable: true }
  )
}
