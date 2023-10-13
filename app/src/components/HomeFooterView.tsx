import { Button, ButtonType, testIdWithKey, useTheme } from 'aries-bifold'
import React, { PropsWithChildren, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

interface HomeFooterViewProps extends PropsWithChildren {}

const HomeFooterView: React.FC<HomeFooterViewProps> = ({ children }) => {
  const { ColorPallet } = useTheme()
  const { t } = useTranslation()
  const [surveyVisible, setSurveyVisible] = useState(false)

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
      {children}
    </View>
  )
}

export default HomeFooterView
