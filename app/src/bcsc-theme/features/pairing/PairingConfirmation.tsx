import { BCSCRootStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { useTheme, ThemedText, Button, ButtonType, testIdWithKey } from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import ServiceBookmarkButton from './components/ServiceBookmarkButton'
import { useTranslation } from 'react-i18next'
import { CommonActions } from '@react-navigation/native'

type ManualPairingProps = StackScreenProps<BCSCRootStackParams, BCSCScreens.PairingConfirmation>

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
        routes: [{ name: BCSCStacks.TabStack }],
      })
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <View style={styles.contentContainer}>
        <ThemedText variant={'headingThree'}>{"You're done in this app"}</ThemedText>
        <ThemedText style={{ marginVertical: Spacing.md }}>
          Go back to the device you started on to continue logging in to {serviceName}.
        </ThemedText>
        <ServiceBookmarkButton serviceId={serviceId} serviceName={serviceName} />
      </View>
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
