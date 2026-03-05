import { BCSCAccountContext } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { useLoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { isAccountExpired } from '@/services/system-checks/AccountExpiryWarningBannerSystemCheck'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useContext, useEffect } from 'react'

interface MainStackLoadingScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.MainLoading | BCSCStacks.Tab>
}

/**
 * Renders the Main Stack Loading Screen, which checks the account status and navigates accordingly.
 *
 * @returns {*} {React.ReactElement} The MainLoadingScreen component.
 */
export const MainLoadingScreen = ({ navigation }: MainStackLoadingScreenProps) => {
  const loadingScreen = useLoadingScreen()
  const context = useContext(BCSCAccountContext)

  useEffect(() => {
    if (!context || context.isLoadingAccount || !context.account) {
      loadingScreen.startLoading()
      return
    }

    if (!context?.account) {
      throw new Error('MainLoadingScreen: Account context is unavailable on load complete')
    }

    loadingScreen.stopLoading()

    // Navigate to Account Expired screen when account is expired
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

    return () => {
      loadingScreen.stopLoading()
    }
  }, [context, context?.isLoadingAccount, context?.account, loadingScreen, navigation])

  // const onLoaded = () => {
  //   if (!context?.account) {
  //     throw new Error('MainLoadingScreen: Account context is unavailable on load complete')
  //   }
  //
  //   // Navigate to Account Expired screen when account is expired
  //   if (isAccountExpired(context.account.account_expiration_date)) {
  //     return navigation.dispatch(
  //       CommonActions.reset({
  //         index: 0,
  //         routes: [
  //           {
  //             name: BCSCScreens.AccountExpired,
  //           },
  //         ],
  //       })
  //     )
  //   }
  //
  //   // Navigate to Home screen when account is valid
  //   navigation.dispatch(
  //     CommonActions.reset({
  //       index: 0,
  //       routes: [
  //         {
  //           name: BCSCStacks.Tab,
  //           params: {
  //             screen: BCSCScreens.Home,
  //           },
  //         },
  //       ],
  //     })
  //   )
  // }

  return null
}
