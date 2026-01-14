import BulletPointWithText from '@/components/BulletPointWithText'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

export interface PINExplainerProps {
  continueCreatePIN: () => void
}

const PINExplainer: React.FC<PINExplainerProps> = ({ continueCreatePIN }) => {
  const { t } = useTranslation()
  const { ColorPalette, Assets, Spacing } = useTheme()

  const style = StyleSheet.create({
    imageContainer: {
      alignItems: 'center',
      marginBottom: Spacing.xxl,
    },
  })

  const imageDisplayOptions = {
    fill: ColorPalette.notification.infoText,
    height: 150,
    width: 150,
  }

  const controls = (
    <Button
      title={t('Global.Continue')}
      accessibilityLabel={t('Global.Continue')}
      testID={testIdWithKey('ContinueCreatePIN')}
      onPress={continueCreatePIN}
      buttonType={ButtonType.Primary}
    />
  )

  return (
    <ScreenWrapper controls={controls}>
      <View style={style.imageContainer}>
        <Assets.svg.secureCheck {...imageDisplayOptions} />
      </View>
      <ThemedText style={{ marginBottom: Spacing.md }} variant="headingThree">
        {t('PINCreate.Explainer.PrimaryHeading')}
      </ThemedText>
      <BulletPointWithText translationKey={'PINCreate.Explainer.Bullet1'} />
      <BulletPointWithText translationKey={'PINCreate.Explainer.Bullet2'} />
    </ScreenWrapper>
  )
}

export default PINExplainer
