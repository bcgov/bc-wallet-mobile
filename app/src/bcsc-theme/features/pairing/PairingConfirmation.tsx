import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackScreenProps } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ServiceBookmarkButton from './components/ServiceBookmarkButton'

type ManualPairingProps = StackScreenProps<BCSCMainStackParams, BCSCScreens.PairingConfirmation>

const ManualPairing: React.FC<ManualPairingProps> = ({ navigation, route }) => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()
  const { serviceName, serviceId } = route.params

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: Spacing.md,
      justifyContent: 'space-between',
    },
    contentContainer: {
      flex: 1,
    },
    controlsContainer: {
      marginTop: 'auto',
    },
  })

  const onClose = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: BCSCStacks.Tab }],
      })
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <ThemedText variant={'headingThree'}>{t('Unified.ManualPairing.CompletionTitle')}</ThemedText>
        <ThemedText style={{ marginVertical: Spacing.md }}>
          {t('Unified.ManualPairing.CompletionDescription', { serviceName })}
        </ThemedText>
        <ServiceBookmarkButton serviceId={serviceId} serviceName={serviceName} />
      </ScrollView>
      <View style={styles.controlsContainer}>
        <Button
          title={t('Global.Close')}
          buttonType={ButtonType.Primary}
          testID={testIdWithKey('Close')}
          accessibilityLabel={t('Global.Close')}
          onPress={onClose}
        />
      </View>
    </SafeAreaView>
  )
}

export default ManualPairing
