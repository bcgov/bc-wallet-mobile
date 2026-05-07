import { useMemo } from 'react'

import { BCSCScreens } from '@/bcsc-theme/types/navigators'

const TABS_WITH_SCAN_FAB: ReadonlySet<string> = new Set([BCSCScreens.Home, BCSCScreens.Wallet])

export interface FloatingScanButtonViewModel {
  isVisible: boolean
}

const useFloatingScanButtonViewModel = (activeTabName: string | undefined): FloatingScanButtonViewModel => {
  const isVisible = useMemo(() => (activeTabName ? TABS_WITH_SCAN_FAB.has(activeTabName) : false), [activeTabName])

  return { isVisible }
}

export default useFloatingScanButtonViewModel
export { TABS_WITH_SCAN_FAB }
