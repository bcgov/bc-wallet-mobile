import { BCState, Mode } from '@/store'
import BCSCRootStack from '@bcsc-theme/navigators/RootStack'
import { RootStack as BCWalletRootStack, useStore } from '@bifold/core'
import { BCSCApiClientProvider } from './bcsc-theme/contexts/BCSCApiClientContext'
import { BCSCLoadingProvider } from './bcsc-theme/contexts/BCSCLoadingContext'

const Root: React.FC = () => {
  const [store] = useStore<BCState>()

  return store.mode === Mode.BCSC ? (
    <BCSCApiClientProvider>
      <BCSCLoadingProvider>
        <BCSCRootStack />
      </BCSCLoadingProvider>
    </BCSCApiClientProvider>
  ) : (
    <BCWalletRootStack />
  )
}

export default Root
