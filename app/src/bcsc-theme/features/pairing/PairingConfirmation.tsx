import ScreenWrapper from '@/bcsc-theme/components/ScreenWrapper'
import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { CommonActions } from '@react-navigation/native'
import { StackScreenProps } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'
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

  const controls = (
    <Button
      title={t('Global.Close')}
      buttonType={ButtonType.Primary}
      testID={testIdWithKey('Close')}
      accessibilityLabel={t('Global.Close')}
      onPress={onClose}
    />
  )

  return (
    <ScreenWrapper
      safeAreaViewStyle={styles.container}
      edges={['bottom', 'left', 'right']}
      controls={controls}
      controlsContainerStyle={styles.controlsContainer}
      scrollViewProps={{ contentContainerStyle: styles.contentContainer }}
    >
      <ThemedText variant={'headingThree'}>{t('BCSC.ManualPairing.CompletionTitle')}</ThemedText>
      <ThemedText style={{ marginVertical: Spacing.md }}>
        {t('BCSC.ManualPairing.CompletionDescription', { serviceName })}
      </ThemedText>
      <ServiceBookmarkButton serviceId={serviceId} serviceName={serviceName} />
    </ScreenWrapper>
  )
}

export default ManualPairing
