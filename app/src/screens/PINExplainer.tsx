import { useTheme, testIdWithKey, ThemedText, Button, ButtonType } from '@hyperledger/aries-bifold-core'
import React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'

interface BoldedBulletPointProps {
  i18nKey: string
}

const BoldedBulletPoint: React.FC<BoldedBulletPointProps> = ({ i18nKey }) => {
  const { t } = useTranslation()
  const { ColorPallet, Spacing } = useTheme()

  const styles = StyleSheet.create({
    container: {
      marginVertical: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    iconContainer: {
      margin: Spacing.sm,
    },
  })

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon name={'circle'} size={Spacing.sm} color={ColorPallet.brand.modalIcon} />
      </View>
      <ThemedText style={{ flexShrink: 1 }}>
        <Trans
          i18nKey={i18nKey}
          components={{
            b: <ThemedText variant="bold" />,
          }}
          t={t}
        />
      </ThemedText>
    </View>
  )
}

export interface PINExplainerProps {
  continueCreatePIN: () => void
}

const PINExplainer: React.FC<PINExplainerProps> = ({ continueCreatePIN }) => {
  const { t } = useTranslation()
  const { ColorPallet, Assets, Spacing } = useTheme()

  const style = StyleSheet.create({
    safeAreaView: {
      flex: 1,
      backgroundColor: ColorPallet.brand.primaryBackground,
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
    fill: ColorPallet.notification.infoText,
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
        <BoldedBulletPoint i18nKey={'PINCreate.Explainer.Bullet1'} />
        <BoldedBulletPoint i18nKey={'PINCreate.Explainer.Bullet2'} />
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
