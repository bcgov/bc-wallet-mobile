import { Agent } from '@aries-framework/core'
import AsyncStorage from '@react-native-async-storage/async-storage'
import messaging from '@react-native-firebase/messaging'
import { Config } from 'react-native-config'

interface SetDeviceInfoOptions {
  agent: Agent<any> | undefined
}

// Will send the device token to the mediator agent if it is undefined or has changed, otherwise it will do nothing
export async function setDeviceInfo({ agent }: SetDeviceInfoOptions) {
  if (!Config.MEDIATOR_USE_PUSH_NOTIFICATIONS) return

  const token = await messaging().getToken()
  if ((await AsyncStorage.getItem('deviceToken')) === token) return

  if (!agent) return

  agent.config.logger.info('Change of push notification token detected, sending to agent')
  const connections = await agent.connections.findAllByQuery({})
  connections.forEach(async (c) => {
    if (c.theirLabel === Config.MEDIATOR_LABEL) {
      agent.config.logger.info(`Trying to send device info to connection ${c.id}`)
      try {
        await agent.modules.pushNotificationsFcm.setDeviceInfo(c.id, {
          deviceToken: token,
        })
        AsyncStorage.setItem('deviceToken', token)
      } catch (error) {
        agent.config.logger.error('Error sending device token info to mediator agent')
        AsyncStorage.setItem('deviceToken', '')
      }
    }
  })
}
