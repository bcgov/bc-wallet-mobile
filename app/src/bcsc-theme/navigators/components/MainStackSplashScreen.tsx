import { SystemCheckScope, useSystemChecks } from '@/bcsc-theme/hooks/useSystemChecks'
import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { AccountExpirySystemCheck } from '@/services/system-checks/AccountExpirySystemCheck'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'

interface MainStackSplashScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.AccountExpired | BCSCStacks.Tab>
}

/**
 * Renders the Main Stack Splash Screen, which checks the account status and navigates accordingly.
 *
 * @returns {*} {JSX.Element} The MainStackSplashScreen component.
 */
export const MainStackSplashScreen = ({ navigation }: MainStackSplashScreenProps) => {
  const { account } = useSystemChecks(SystemCheckScope.MAIN_STACK)

  useEffect(() => {
    if (!account) {
      return
    }

    const accountName = `${account.family_name}, ${account.given_name}`

    // TODO (MD): remove
    return navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: BCSCScreens.AccountExpired,
            params: {
              accountExpiration: account.card_expiry,
              accountName: accountName,
            },
          },
        ],
      })
    )

    // If the account is expired, navigate to the Account Expired screen
    if (AccountExpirySystemCheck.isAccountExpired(account.card_expiry)) {
      return navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: BCSCScreens.AccountExpired,
              params: {
                accountExpiration: account.card_expiry,
                accountName: accountName,
              },
            },
          ],
        })
      )
    }

    // Otherwise, navigate to the Home screen
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: BCSCStacks.Tab,
            params: {
              screen: BCSCScreens.Home,
              params: {
                accountName: accountName,
              },
            },
          },
        ],
      })
    )
  }, [account, navigation])

  return (
    <View style={{ flex: 1 }}>
      {/** TODO (MD): Align this with the actual BCSC splash screen see issue: #2777 for ref **/}
      <ActivityIndicator size={'large'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
    </View>
  )
}
