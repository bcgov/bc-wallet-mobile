import { Button, ButtonType, testIdWithKey, useTheme } from '@bifold/core'
import React, { PropsWithChildren, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import { surveyMonkeyUrl, surveyMonkeyExitUrl } from '@/constants'
import WebDisplay from '@screens/WebDisplay'

interface HomeFooterViewProps extends PropsWithChildren {}

const HomeFooterView = ({ children }: HomeFooterViewProps) => {
  const { ColorPallet } = useTheme()
  const { t } = useTranslation()
  const [surveyVisible, setSurveyVisible] = useState(false)

  const styles = StyleSheet.create({
    feedbackContainer: {
      marginTop: 10,
      paddingHorizontal: 20,
      paddingVertical: 20,
      backgroundColor: ColorPallet.brand.secondaryBackground,
    },
    feedbackIcon: {
      paddingRight: 10,
    },
  })

  const toggleSurveyVisibility = () => setSurveyVisible(!surveyVisible)

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
    </View>
  )
}

export default HomeFooterView
