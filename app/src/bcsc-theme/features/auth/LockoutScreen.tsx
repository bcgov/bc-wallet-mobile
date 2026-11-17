import { formatLockoutCountdown } from '@/bcsc-theme/features/auth/lockout-countdown'
import { readPinLockout } from '@/bcsc-theme/features/auth/services/pin-lockout-service'
import { PinLockoutType } from '@/bcsc-theme/state/pin-lockout/pin-lockout'
import { BCSCAuthStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { TestIds } from '@/test-ids/registry'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useServices,
  useTheme,
} from '@bifold/core'
import { CommonActions, useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

const COUNTDOWN_TICK_MS = 1000

interface LockoutScreenProps {
  navigation: StackNavigationProp<BCSCAuthStackParams, BCSCScreens.Lockout>
}

export const LockoutScreen = ({ navigation }: LockoutScreenProps) => {
  const { TextTheme, Spacing } = useTheme()
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  // Undefined until the lock has been read
  const [remainingMs, setRemainingMs] = useState<number | undefined>(undefined)

  const styles = StyleSheet.create({
    hr: {
      borderBottomWidth: 1,
      borderBottomColor: TextTheme.normal.color,
      width: '100%',
    },
  })

  // Runs while the screen is in view, so a lock that ends behind another screen is released on return
  useFocusEffect(
    useCallback(() => {
      let isFocused = true
      let intervalId: ReturnType<typeof setInterval> | undefined

      // Rebuilds the stack as a normal unlock leaves it, so Back from PIN entry goes to the landing
      // screen and not to a lock that is over
      const openPinEntry = () => {
        navigation.dispatch(
          CommonActions.reset({
            index: 1,
            routes: [{ name: BCSCScreens.AccountLanding }, { name: BCSCScreens.EnterPIN }],
          })
        )
      }

      const startCountdown = async () => {
        try {
          const lockout = await readPinLockout(logger)

          if (!isFocused) {
            return
          }

          if (lockout.type !== PinLockoutType.Locked) {
            openPinEntry()
            return
          }

          const lockedUntil = lockout.until.getTime()

          // Measured against the clock on every tick, so time the app spent suspended still counts
          const tick = () => {
            const remaining = lockedUntil - Date.now()

            if (remaining > 0) {
              setRemainingMs(remaining)
              return
            }

            clearInterval(intervalId)
            openPinEntry()
          }

          intervalId = setInterval(tick, COUNTDOWN_TICK_MS)
          tick()
        } catch (error) {
          const errMessage = error instanceof Error ? error.message : String(error)
          logger.error(`Error checking lock status: ${errMessage}`, error as Error)

          if (!isFocused) {
            return
          }

          // With no deadline there is nothing to count down to. Unlocking from the landing screen
          // reads the lock again, and reports the failure if it is still there.
          navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: BCSCScreens.AccountLanding }] }))
        }
      }

      void startCountdown()

      return () => {
        isFocused = false
        clearInterval(intervalId)
      }
    }, [logger, navigation])
  )

  // The account is still usable once the lock ends, so removing it is confirmed on its own screen
  const onPressRemoveAccount = useCallback(() => {
    navigation.navigate(BCSCScreens.AuthRemoveAccountConfirmation)
  }, [navigation])

  const controls = (
    <Button
      buttonType={ButtonType.Critical}
      title={t('BCSC.Account.RemoveAccount')}
      accessibilityLabel={t('BCSC.Account.RemoveAccount')}
      testID={testIdWithKey(TestIds.auth.lockout.removeAccount)}
      onPress={onPressRemoveAccount}
    />
  )

  return (
    <ScreenWrapper controls={controls} scrollViewContainerStyle={{ gap: Spacing.lg }}>
      <ThemedText variant={'headingThree'}>{t('BCSC.Lockout.Title')}</ThemedText>
      <ThemedText>{t('BCSC.Lockout.Description')}</ThemedText>
      {remainingMs === undefined ? null : (
        <>
          <ThemedText variant={'bold'}>{t('BCSC.Lockout.TryAgainIn')}</ThemedText>
          <ThemedText variant={'bold'}>{formatLockoutCountdown(t, remainingMs)}</ThemedText>
        </>
      )}
      <View style={styles.hr} />
      <ThemedText variant={'bold'}>{t('BCSC.Lockout.ForgotPINTitle')}</ThemedText>
      <ThemedText>{t('BCSC.Lockout.ForgotPINDescription')}</ThemedText>
      <ThemedText>{t('BCSC.Lockout.SetUpAgain')}</ThemedText>
    </ScreenWrapper>
  )
}
