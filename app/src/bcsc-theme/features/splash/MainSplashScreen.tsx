import { BCSCAccountContext } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { CommonActions } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useContext, useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'

interface MainStackSplashScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.MainSplash | BCSCStacks.Tab>
}

/**
 * Renders the Main Stack Splash Screen, which checks the account status and navigates accordingly.
 *
 * @returns {*} {JSX.Element} The MainStackSplashScreen component.
 */
export const MainSplashScreen = ({ navigation }: MainStackSplashScreenProps) => {
  const context = useContext(BCSCAccountContext)

  useEffect(() => {
    if (!context || context.isLoadingAccount) {
      return
    }

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

    // TODO (MD): handle navigation when account is expired
  }, [context, navigation])

  return (
    <View style={{ flex: 1 }}>
      {/** TODO (MD): Align this with the actual BCSC splash screen see issue: #2777 for ref **/}
      <ActivityIndicator size={'large'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
    </View>
  )
}
