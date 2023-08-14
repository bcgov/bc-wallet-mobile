import { useAgent } from '@aries-framework/react-hooks'
import { Button, ButtonType, testIdWithKey, useTheme } from 'aries-bifold'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import { surveyMonkeyUrl, surveyMonkeyExitUrl } from '../constants'
import { setDeviceInfo } from '../helpers/PushNotificationsHelper'
import WebDisplay from '../screens/WebDisplay'

import PushNotifications from './PushNotifications'

interface HomeFooterViewProps {
  children?: any
}

const HomeFooterView: React.FC<HomeFooterViewProps> = ({ children }) => {
  const { ColorPallet } = useTheme()
  const { t } = useTranslation()
  const [surveyVisible, setSurveyVisible] = useState(false)
  const { agent } = useAgent()

  const styles = StyleSheet.create({
    feedbackContainer: {
      marginTop: 10,
      paddingHorizontal: 20,
      paddingVertical: 20,
      backgroundColor: ColorPallet.grayscale.white,
    },
    feedbackIcon: {
      paddingRight: 10,
    },
  })

  const toggleSurveyVisibility = () => setSurveyVisible(!surveyVisible)

  // Attempt to set device info for push notifications
  setDeviceInfo({ agent })

  return (
    <View style={styles.feedbackContainer}>
      <Button
        title={t('Feedback.GiveFeedback')}
        accessibilityLabel={t('Feedback.GiveFeedback')}
        testID={testIdWithKey('GiveFeedback')}
        onPress={toggleSurveyVisibility}
        buttonType={ButtonType.Secondary}
      >
        <Icon
          name="message-draw"
          style={[styles.feedbackIcon, { color: ColorPallet.brand.primary }]}
          size={26}
          color={ColorPallet.grayscale.white}
        />
      </Button>
      <WebDisplay
        destinationUrl={surveyMonkeyUrl}
        exitUrl={surveyMonkeyExitUrl}
        visible={surveyVisible}
        onClose={toggleSurveyVisibility}
      />
      {children}
      <PushNotifications agent={agent} />
    </View>
  )
}

export default HomeFooterView
