import { useCallback, useMemo } from 'react'

import { BCSCScreens, BCSCStacks } from '@/bcsc-theme/types/navigators'
import { useNavigation } from '@react-navigation/native'

const TABS_WITH_SCAN_FAB: ReadonlySet<string> = new Set([BCSCScreens.Home, BCSCScreens.Wallet])

export interface FloatingScanButtonViewModel {
  isVisible: boolean
  onPress: () => void
}

const useFloatingScanButtonViewModel = (activeTabName: string | undefined): FloatingScanButtonViewModel => {
  const navigation = useNavigation()

  const isVisible = useMemo(() => (activeTabName ? TABS_WITH_SCAN_FAB.has(activeTabName) : false), [activeTabName])

  const onPress = useCallback(() => {
    navigation.getParent()?.navigate(BCSCStacks.Connect, { screen: 'Scan' })
  }, [navigation])

  return { isVisible, onPress }
}

export default useFloatingScanButtonViewModel
export { TABS_WITH_SCAN_FAB }
