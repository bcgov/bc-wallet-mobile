import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { Button, ButtonType, Link, testIdWithKey, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BCState } from '@/store'
import { useState } from 'react'
import useApi from '@/bcsc-theme/api/hooks/useApi'

type VerifyInPersonScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.VerifyInPerson>
}

const VerifyInPersonScreen = ({ navigation }: VerifyInPersonScreenProps) => {
  const { ColorPallet, Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const [error, setError] = useState(false)
  const { token } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPallet.brand.primaryBackground,
      padding: Spacing.md,
    },
    contentContainer: {
      flex: 1,
    },
    controlsContainer: {
      marginTop: 'auto'
    },
  })
  
  const onPressComplete = async () => {
    try {
      if (!store.bcsc.deviceCode || !store.bcsc.userCode) {
        throw new Error('Device code or user code is missing in the store.')
      }

      const data = await token.checkDeviceCodeStatus(store.bcsc.deviceCode, store.bcsc.userCode)
      if (data.access_token) {
        navigation.navigate(BCSCScreens.VerificationSuccess)
      } else {
        setError(true)
        logger.error('Device verification failed, no access token received.')
      }
    } catch (e) {
      logger.error(`Error completing device verification: ${e}`)
      setError(true)
    }
  }

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <View style={styles.contentContainer}>
        <ThemedText variant={'headingTwo'} style={{ marginBottom: Spacing.md }}>Verify in person</ThemedText>
        <ThemedText variant={'bold'}>Where to go</ThemedText>
        <Link
          linkText={'A Service BC Location'}
          testID={testIdWithKey('ServiceBCLink')}
          onPress={() => null}
          style={{ marginBottom: Spacing.md }}
        />
        <ThemedText variant={'bold'}>What to bring</ThemedText>
        <ThemedText>
          {'\u2022 This device'}
        </ThemedText>
        <ThemedText style={{ marginBottom: Spacing.lg }}>
          {`\u2022 Your BC Services Card - if it's a non-photo card, bring your additional ID too`}
        </ThemedText>
        <ThemedText variant={'bold'}>Show this confirmation number</ThemedText>
        <ThemedText variant={'headingThree'} style={{ fontWeight: 'normal', marginBottom: Spacing.xl }}>
          {`${store.bcsc.userCode?.slice(0, 4)}-${store.bcsc.userCode?.slice(4, 8)}`}
        </ThemedText>
        <ThemedText variant={'bold'}>You must complete this by</ThemedText>
        <ThemedText variant={'headingThree'} style={{ fontWeight: 'normal' }}>
          {store.bcsc.deviceCodeExpiresAt?.toLocaleString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
        </ThemedText>
      </View>
      <View style={styles.controlsContainer}>
        <View style={{ marginBottom: Spacing.md }}>
          {error && (<ThemedText variant={'inlineErrorText'} style={{ marginBottom: Spacing.xs }}>You have not yet been verified</ThemedText>)}
          <Button
            buttonType={ButtonType.Primary}
            testID={testIdWithKey('Complete')}
            accessibilityLabel={'Complete'}
            title={'Complete'}
            onPress={onPressComplete}
          />
        </View>
        <ThemedText variant={'labelSubtitle'} style={{ textAlign: 'center' }}>Card serial number: {store.bcsc.serial}</ThemedText>
      </View>  
    </SafeAreaView>
  )
}
export default VerifyInPersonScreen