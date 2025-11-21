import { BCSCAccountContext } from '@/bcsc-theme/contexts/BCSCAccountContext'
import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { StackNavigationProp } from '@react-navigation/stack'
import { useContext } from 'react'
import { LoadingScreenContent } from './LoadingScreenContent'

interface MainStackSplashScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.MainLoading | BCSCStacks.Tab>
}

/**
 * Renders the Main Stack Splash Screen, which checks the account status and navigates accordingly.
 *
 * @returns {*} {JSX.Element} The MainStackSplashScreen component.
 */
export const MainLoadingScreen = ({ navigation }: MainStackSplashScreenProps) => {
  const context = useContext(BCSCAccountContext)

  const loadingAccount = !context || context.isLoadingAccount

  const onLoaded = () => {
    // navigation.dispatch(
    //   CommonActions.reset({
    //     index: 0,
    //     routes: [
    //       {
    //         name: BCSCStacks.Tab,
    //         params: {
    //           screen: BCSCScreens.Home,
    //         },
    //       },
    //     ],
    //   })
    // )
  }

  return <LoadingScreenContent loading={loadingAccount} onLoaded={onLoaded} />
}
