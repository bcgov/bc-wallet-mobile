import { RootStack as BCWalletRootStack, useStore } from '@bifold/core'
import { BCState, Mode } from '@/store'
import BCSCRootStack from '@bcsc-theme/navigators/RootStack'
import { BCSCApiClientProvider } from './bcsc-theme/contexts/BCSCApiClientContext'

const Root: React.FC = () => {
  const [store] = useStore<BCState>()

  return store.mode === Mode.BCSC ? (
    <BCSCApiClientProvider>
      <BCSCRootStack />
    </BCSCApiClientProvider>
  ) : (
    <BCWalletRootStack />
  )
}

export default Root
