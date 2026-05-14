import {
  ButtonLocation,
  IconButton,
  InfoBox,
  InfoBoxType,
  QRRenderer,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useServices,
  useTheme,
} from '@bifold/core'
import { useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'

import { useBCSCAgent } from '../agent'

import useQRDisplayViewModel from './useQRDisplayViewModel'
import WalletNameDisplay from './WalletNameDisplay'

const QRDisplay: React.FC = () => {
  const { agent } = useBCSCAgent()
  const { t } = useTranslation()
  const navigation = useNavigation()
  const { width } = useWindowDimensions()
  const { ColorPalette, Spacing } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const vm = useQRDisplayViewModel({ agent, logger })

  const qrSize = width - Spacing.lg * 2

  const headerRight = useCallback(() => {
    if (vm.status !== 'ready') {
      return null
    }
    return (
      <IconButton
        buttonLocation={ButtonLocation.Right}
        icon="share-variant"
        accessibilityLabel={t('Global.Share')}
        testID={testIdWithKey('Share')}
        onPress={vm.share}
      />
    )
  }, [t, vm.share, vm.status])

  useEffect(() => {
    navigation.setOptions({ headerRight })
  }, [navigation, headerRight])

  const styles = StyleSheet.create({
    container: {
      flexGrow: 1,
    },
    qrFrame: {
      padding: Spacing.lg,
      alignItems: 'center',
    },
    descriptionBlock: {
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    description: {
      textAlign: 'left',
    },
    stateContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.lg,
    },
  })

  if (vm.status === 'loading') {
    return (
      <View style={styles.stateContainer} testID={testIdWithKey('QRDisplay.Loading')}>
        <ActivityIndicator size="large" color={ColorPalette.brand.primary} />
      </View>
    )
  }

  if (vm.status === 'error') {
    return (
      <View style={styles.stateContainer} testID={testIdWithKey('QRDisplay.Error')}>
        <InfoBox
          notificationType={InfoBoxType.Error}
          title={t('BCSC.QRDisplay.ErrorTitle')}
          description={t('BCSC.QRDisplay.ErrorBody')}
          onCallToActionPressed={vm.retry}
          onCallToActionLabel={t('BCSC.QRDisplay.RetryCta')}
        />
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.qrFrame}>
        <QRRenderer value={vm.invitation ?? ''} size={qrSize} />
      </View>
      <View style={styles.descriptionBlock}>
        <WalletNameDisplay />
        <ThemedText style={styles.description}>{t('BCSC.QRDisplay.SharingDescription')}</ThemedText>
      </View>
    </ScrollView>
  )
}

export default QRDisplay
