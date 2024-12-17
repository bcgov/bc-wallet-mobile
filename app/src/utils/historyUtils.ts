import { useAgent } from '@credo-ts/react-hooks'
import { TOKENS, useServices } from '@hyperledger/aries-bifold-core'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { Alert } from 'react-native'

/**
 * Handles the deletion of a history event with confirmation.
 *
 * @param itemId - The identifier of the item to be deleted.
 * @param navigation - Navigation object to allow returning to the previous screen.
 */
export const handleDeleteEvent = async (itemId: string) => {
  const { t } = useTranslation()
  const { agent } = useAgent()
  const navigation = useNavigation()
  const [loadHistory] = useServices([TOKENS.FN_LOAD_HISTORY])

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
