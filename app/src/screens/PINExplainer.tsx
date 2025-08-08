import BulletPointWithText from '@/components/BulletPointWithText'
import { useTheme, testIdWithKey, ThemedText, Button, ButtonType } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export interface PINExplainerProps {
  continueCreatePIN: () => void
}

const PINExplainer: React.FC<PINExplainerProps> = ({ continueCreatePIN }) => {
  const { t } = useTranslation()
  const { ColorPalette, Assets, Spacing } = useTheme()

  const style = StyleSheet.create({
    safeAreaView: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.lg,
    },
    scrollViewContentContainer: {
      flexGrow: 1,
    },
    imageContainer: {
      alignItems: 'center',
      marginBottom: Spacing.xxl,
    },
    footer: {
      paddingTop: 10,
    },
  })

  const imageDisplayOptions = {
    fill: ColorPalette.notification.infoText,
    height: 150,
    width: 150,
  }

  return (
    <SafeAreaView style={style.safeAreaView} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={style.scrollViewContentContainer}>
        <View style={style.imageContainer}>
          <Assets.svg.secureCheck {...imageDisplayOptions} />
        </View>
        <ThemedText style={{ marginBottom: Spacing.md }} variant="headingThree">
          {t('PINCreate.Explainer.PrimaryHeading')}
        </ThemedText>
        <BulletPointWithText translationKey={'PINCreate.Explainer.Bullet1'} />
        <BulletPointWithText translationKey={'PINCreate.Explainer.Bullet2'} />
      </ScrollView>
      <View style={style.footer}>
        <Button
          title={t('Global.Continue')}
          accessibilityLabel={t('Global.Continue')}
          testID={testIdWithKey('ContinueCreatePIN')}
          onPress={continueCreatePIN}
          buttonType={ButtonType.Primary}
        />
      </View>
    </SafeAreaView>
  )
}

export default PINExplainer
