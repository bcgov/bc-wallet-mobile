import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import {
  Button,
  ButtonType,
  Link,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useAnimatedComponents,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BCDispatchAction, BCState } from '@/store'
import { useState } from 'react'
import useApi from '@/bcsc-theme/api/hooks/useApi'

type VerifyInPersonScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.VerifyInPerson>
}

const VerifyInPersonScreen = ({ navigation }: VerifyInPersonScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const { token } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { ButtonLoading } = useAnimatedComponents()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.md,
    },
    contentContainer: {
      flex: 1,
    },
    controlsContainer: {
      marginTop: 'auto',
    },
    bulletContainer: {
      flexDirection: 'row',
    },
    bullet: {
      marginRight: Spacing.xs,
    },
  })

  const onPressComplete = async () => {
    try {
      setLoading(true)
      setError(false)

      if (!store.bcsc.deviceCode || !store.bcsc.userCode) {
        throw new Error('Device code or user code is missing in the store.')
      }

      const { refresh_token, bcsc_devices_count } = await token.checkDeviceCodeStatus(
        store.bcsc.deviceCode,
        store.bcsc.userCode
      )
      if (refresh_token) {
        dispatch({ type: BCDispatchAction.UPDATE_REFRESH_TOKEN, payload: [refresh_token] })

        if (bcsc_devices_count !== undefined) {
          dispatch({
            type: BCDispatchAction.UPDATE_DEVICE_COUNT,
            payload: [bcsc_devices_count],
          })
        }

        navigation.navigate(BCSCScreens.VerificationSuccess)
      } else {
        setError(true)
        logger.error('Device verification failed, no refresh token received.')
      }
    } catch (e) {
      logger.error(`Error completing device verification: ${e}`)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <View style={styles.contentContainer}>
        <ThemedText variant={'headingTwo'} style={{ marginBottom: Spacing.md }}>
          Verify in person
        </ThemedText>
        <ThemedText variant={'bold'}>Where to go</ThemedText>
        <Link
          linkText={'A Service BC Location'}
          testID={testIdWithKey('ServiceBCLink')}
          onPress={() => null}
          style={{ marginBottom: Spacing.md }}
        />
        <ThemedText variant={'bold'}>What to bring</ThemedText>
        <View style={styles.bulletContainer}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>{'This device'}</ThemedText>
        </View>
        <View style={[styles.bulletContainer, { marginBottom: Spacing.lg }]}>
          <ThemedText style={styles.bullet}>{'\u2022'}</ThemedText>
          <ThemedText>{`Your BC Services Card - if it's a non-photo card, bring your additional ID too`}</ThemedText>
        </View>
        <ThemedText variant={'bold'}>Show this confirmation number</ThemedText>
        <ThemedText variant={'headingTwo'} style={{ fontWeight: 'normal', marginBottom: Spacing.xl, letterSpacing: 7 }}>
          {`${store.bcsc.userCode?.slice(0, 4)}-${store.bcsc.userCode?.slice(4, 8)}`}
        </ThemedText>
        <ThemedText variant={'bold'}>You must complete this by</ThemedText>
        <ThemedText variant={'headingTwo'} style={{ fontWeight: 'normal' }}>
          {store.bcsc.deviceCodeExpiresAt?.toLocaleString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
        </ThemedText>
      </View>
      <View style={styles.controlsContainer}>
        <View style={{ marginBottom: Spacing.md }}>
          {error && (
            <ThemedText variant={'inlineErrorText'} style={{ marginBottom: Spacing.sm }}>
              You have not yet been verified
            </ThemedText>
          )}
          <Button
            buttonType={ButtonType.Primary}
            testID={testIdWithKey('Complete')}
            accessibilityLabel={'Complete'}
            title={'Complete'}
            onPress={onPressComplete}
            disabled={loading}
          >
            {loading && <ButtonLoading />}
          </Button>
        </View>
        <ThemedText variant={'labelSubtitle'} style={{ textAlign: 'center' }}>
          Card serial number: {store.bcsc.serial ?? store.bcsc.additionalEvidenceData[0]?.documentNumber ?? 'N/A'}
        </ThemedText>
      </View>
    </SafeAreaView>
  )
}
export default VerifyInPersonScreen
