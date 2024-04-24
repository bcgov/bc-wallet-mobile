import { useAgent } from '@credo-ts/react-hooks'
import { Screens, Stacks, testIdWithKey, useTheme } from '@hyperledger/aries-bifold-core'
import { RemoteLogger } from '@hyperledger/aries-bifold-remote-logs'
import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Text, View } from 'react-native'

const HomeHeaderView = () => {
  const { ColorPallet } = useTheme()
  const { t } = useTranslation()
  const { agent } = useAgent()
  const logger = agent?.config.logger as RemoteLogger
  const navigation = useNavigation()

  const styles = StyleSheet.create({
    banner: {
      padding: 10,
      backgroundColor: ColorPallet.notification.errorText,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bannerText: {
      color: ColorPallet.grayscale.white,
      fontSize: 16,
      fontWeight: 'bold',
    },
  })

  const onPressBanner = () => {
    navigation.getParent()?.navigate(Stacks.SettingStack as never, { screen: Screens.Developer } as never)
  }

  return logger?.remoteLoggingEnabled ? (
    <Pressable onPress={onPressBanner} testID={testIdWithKey('SessionIdBanner')}>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>{t('RemoteLogging.Banner', { sessionId: logger.sessionId.toString() })}</Text>
      </View>
    </Pressable>
  ) : null
}

export default HomeHeaderView
