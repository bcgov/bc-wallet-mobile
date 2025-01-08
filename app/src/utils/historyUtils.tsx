import { Agent } from '@credo-ts/core'
import { HistoryCardType, IHistoryManager } from '@hyperledger/aries-bifold-core/App/modules/history/types'
import { NavigationProp } from '@react-navigation/native'
import { Alert } from 'react-native'
import Toast from 'react-native-toast-message'

// SVG Imports
import ChangingSettingsImg from '../assets/img/ChangingSettings.svg'
import CredentialAddedImg from '../assets/img/CredentialAdded.svg'
import CardRemovedImg from '../assets/img/DeleteIcon.svg'
import InformationNotSentImg from '../assets/img/ErrorIcon.svg'
import CardExpiredImg from '../assets/img/ExpiredIcon.svg'
import FleurLysImg from '../assets/img/FleurLys.svg'
import MessageImg from '../assets/img/Message.svg'
import ProofRequestImg from '../assets/img/ProofRequest.svg'
import RevocationImg from '../assets/img/RevokeIconCircle.svg'
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
            Toast.show({
              type: 'error',
              text1: t('Error.FailedToDelete'),
              text2: t('Error.UnexpectedError'),
            })
          }
        },
      },
    ],
    { cancelable: true }
  )
}

/**
 * Renders the appropriate icon based on the history card type.
 *
 * @param type - The type of the history card.
 * @returns The corresponding SVG icon component.
 */
export const renderCardIcon = (type: HistoryCardType) => {
  const dimensions = { width: 24, height: 24 }
  switch (type) {
    case HistoryCardType.CardAccepted:
      return <CredentialAddedImg width={dimensions.width} height={dimensions.height} />
    case HistoryCardType.CardDeclined:
    case HistoryCardType.CardRevoked:
      return <RevocationImg width={dimensions.width} height={dimensions.height} />
    case HistoryCardType.CardRemoved:
      return <CardRemovedImg width={dimensions.width} height={dimensions.height} />
    case HistoryCardType.CardExpired:
      return <CardExpiredImg width={dimensions.width} height={dimensions.height} />
    case HistoryCardType.InformationNotSent:
      return <InformationNotSentImg width={dimensions.width} height={dimensions.height} />
    case HistoryCardType.InformationSent:
      return <ProofRequestImg width={dimensions.width} height={dimensions.height} />
    case HistoryCardType.PinChanged:
    case HistoryCardType.ActivateBiometry:
    case HistoryCardType.DeactivateBiometry:
      return <ChangingSettingsImg width={dimensions.width} height={dimensions.height} />
    case HistoryCardType.Connection:
      return <MessageImg width={dimensions.width} height={dimensions.height} />
    case HistoryCardType.ConnectionRemoved:
      return <CardRemovedImg width={dimensions.width} height={dimensions.height} />
    default:
      return <FleurLysImg width={dimensions.width} height={dimensions.height} />
  }
}
