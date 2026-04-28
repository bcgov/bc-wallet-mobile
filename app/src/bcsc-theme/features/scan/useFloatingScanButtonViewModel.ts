import { useCallback, useMemo } from 'react'

import { BCSCMainStackParams, BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'

const TABS_WITH_SCAN_FAB: ReadonlySet<string> = new Set([BCSCScreens.Home, BCSCScreens.Wallet])

export interface FloatingScanButtonViewModel {
  isVisible: boolean
  onPress: () => void
}

const useFloatingScanButtonViewModel = (activeTabName: string | undefined): FloatingScanButtonViewModel => {
  const navigation = useNavigation<StackNavigationProp<BCSCMainStackParams>>()

  const isVisible = useMemo(() => (activeTabName ? TABS_WITH_SCAN_FAB.has(activeTabName) : false), [activeTabName])

  const onPress = useCallback(() => {
    navigation.navigate(BCSCStacks.Connect, { screen: 'Scan' })
  }, [navigation])

  return { isVisible, onPress }
}

export default useFloatingScanButtonViewModel
export { TABS_WITH_SCAN_FAB }
