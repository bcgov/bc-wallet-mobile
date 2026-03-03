import { BCState, Mode } from '@/store'
import BCSCRootStack from '@bcsc-theme/navigators/RootStack'
import { RootStack as BCWalletRootStack, useStore } from '@bifold/core'
import NonProdOverlay from './bcsc-theme/components/NonProdOverlay'
import { BCSCApiClientProvider } from './bcsc-theme/contexts/BCSCApiClientContext'
import { BCSCLoadingProvider } from './bcsc-theme/contexts/BCSCLoadingContext'
import { BCSCStackProvider } from './bcsc-theme/contexts/BCSCStackContext'

const Root: React.FC = () => {
  const [store] = useStore<BCState>()

  return store.mode === Mode.BCSC ? (
    <BCSCStackProvider>
      <BCSCApiClientProvider>
        <BCSCLoadingProvider>
          <BCSCRootStack />
          <NonProdOverlay />
        </BCSCLoadingProvider>
      </BCSCApiClientProvider>
    </BCSCStackProvider>
  ) : (
    <BCWalletRootStack />
  )
}

export default Root
