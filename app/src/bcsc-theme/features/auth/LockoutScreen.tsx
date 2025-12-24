import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { BCSCAuthStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
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
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { isAccountLocked } from 'react-native-bcsc-core'

const formatTime = (seconds: number): string => {
  // Ensure we're working with whole seconds
  const wholeSeconds = Math.ceil(seconds)
  const minutes = Math.floor(wholeSeconds / 60)
  const remainingSecs = wholeSeconds % 60

  if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ${remainingSecs} second${remainingSecs === 1 ? '' : 's'}`
  }
  return `${remainingSecs} second${remainingSecs === 1 ? '' : 's'}`
}

interface LockoutScreenProps {
  navigation: StackNavigationProp<BCSCAuthStackParams, BCSCScreens.Lockout>
}

export const LockoutScreen = ({ navigation }: LockoutScreenProps) => {
  const { TextTheme, Spacing } = useTheme()
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0)
  const [shouldNavigateBack, setShouldNavigateBack] = useState(false)
  const factoryReset = useFactoryReset()

  const styles = StyleSheet.create({
    hr: {
      borderBottomWidth: 1,
      borderBottomColor: TextTheme.normal.color,
      width: '100%',
    },
  })

  useEffect(() => {
    const checkLockStatus = async () => {
      try {
        const { locked, remainingTime } = await isAccountLocked()

        if (!locked || remainingTime <= 0) {
          setShouldNavigateBack(true)
          return
        }

        // Round up to nearest second to avoid showing decimals
        setRemainingSeconds(Math.ceil(remainingTime))
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error)
        logger.error(`Error checking lock status: ${errMessage}`)
      }
    }

    checkLockStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (shouldNavigateBack) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: BCSCScreens.EnterPIN }],
        })
      )
    }
  }, [shouldNavigateBack, navigation])

  useEffect(() => {
    if (remainingSeconds <= 0) {
      return
    }

    const intervalId = setInterval(() => {
      setRemainingSeconds((prev) => {
        const newValue = prev - 1
        if (newValue <= 0) {
          setShouldNavigateBack(true)
          return 0
        }
        return newValue
      })
    }, 1000)

    return () => clearInterval(intervalId)
  }, [remainingSeconds])

  const onPressRemoveAccount = useCallback(async () => {
    try {
      // Don't delete from server when locked out - user hasn't authenticated yet
      // This matches ias-ios behavior which only cleans up local storage
      await factoryReset(undefined, false)
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Error removing account: ${errMessage}`)
    }
  }, [logger, factoryReset])

  const controls = (
    <Button
      buttonType={ButtonType.Critical}
      title={t('BCSC.Account.RemoveAccount')}
      accessibilityLabel={t('BCSC.Account.RemoveAccount')}
      testID={testIdWithKey('RemoveAccount')}
      onPress={onPressRemoveAccount}
    />
  )

  return (
    <ScreenWrapper padded controls={controls} scrollViewContainerStyle={{ gap: Spacing.lg }}>
      <ThemedText variant={'headingThree'}>{`Too many PIN attempts`}</ThemedText>
      <ThemedText>{`This app is temporarily locked because you've entered an incorrect PIN too many times.`}</ThemedText>
      <ThemedText variant={'bold'}>{`You can try again in:`}</ThemedText>
      <ThemedText variant={'bold'}>{formatTime(remainingSeconds)}</ThemedText>
      <View style={styles.hr} />
      <ThemedText variant={'bold'}>{`Cannot remember your PIN?`}</ThemedText>
      <ThemedText>{`We cannot help you get or reset your PIN if you forget it. It's only saved on this device. It's never shared with us.`}</ThemedText>
      <ThemedText>{`If you've forgotten your PIN you'll need to set up this app again.`}</ThemedText>
    </ScreenWrapper>
  )
}
