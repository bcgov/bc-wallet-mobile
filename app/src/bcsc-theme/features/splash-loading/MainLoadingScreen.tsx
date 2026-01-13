import { BCSCAccountContext } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { isAccountExpired } from '@/services/system-checks/AccountExpiryWarningBannerSystemCheck'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useContext } from 'react'
import { LoadingScreenContent } from './LoadingScreenContent'

interface MainStackLoadingScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.MainLoading | BCSCStacks.Tab>
}

/**
 * Renders the Main Stack Loading Screen, which checks the account status and navigates accordingly.
 *
 * @returns {*} {JSX.Element} The MainLoadingScreen component.
 */
export const MainLoadingScreen = ({ navigation }: MainStackLoadingScreenProps) => {
  const context = useContext(BCSCAccountContext)

  const loadingAccount = !context || context.isLoadingAccount || !context.account

  const onLoaded = () => {
    if (!context?.account) {
      throw new Error('MainLoadingScreen: Account context is unavailable on load complete')
    }

    // Navigate to Account Expired screen when account is expired
    // TODO: (Al) shouldn't this be handled by the system check?
    if (isAccountExpired(context.account.account_expiration_date)) {
      return navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: BCSCScreens.AccountExpired,
            },
          ],
        })
      )
    }

    // Navigate to Home screen when account is valid
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: BCSCStacks.Tab,
            params: {
              screen: BCSCScreens.Home,
            },
          },
        ],
      })
    )
  }

  return <LoadingScreenContent loading={loadingAccount} onLoaded={onLoaded} />
}
