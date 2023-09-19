import { useAgent } from '@aries-framework/react-hooks'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { isMediatorCapable, isRegistered, setup, isUserDenied } from '../helpers/PushNotificationsHelper'
import PushNotificationsModal from '../modals/PushNotificationsModal'

const PushNotifications = () => {
  const { agent } = useAgent()
  const [infoModalVisible, setInfoModalVisible] = useState(false)
  const { t } = useTranslation()

  const setupPushNotifications = async () => {
    setInfoModalVisible(false)
    if (!agent || (await isUserDenied())) {
      return
    }
    setup(agent, true)
  }

  const initializeCapabilityRequest = async () => {
    if (!agent || !(await isMediatorCapable(agent)) || (await isRegistered())) {
      return
    }
    setInfoModalVisible(true)
  }

  useEffect(() => {
    initializeCapabilityRequest()
  }, [agent]) // Reload if agent becomes defined

  return (
    <PushNotificationsModal
      title={t('PushNotifications.Title')}
      visible={infoModalVisible}
      onDone={setupPushNotifications}
    />
  )
}

export default PushNotifications
