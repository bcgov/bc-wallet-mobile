import { RootStack as BCWalletRootStack, useStore } from '@bifold/core'
import { BCState, Skin } from '@/store'
import BCSCRootStack from '@bcsc-theme/navigators/RootStack'
import { useEffect } from 'react'

const Root: React.FC = () => {
  const [store] = useStore<BCState>()

  useEffect(() => {
    console.log('store.skin === Skins.BCSC', store.skin === Skin.BCSC)
    console.log('store.skin', store.skin)
    console.log('Skin.BCSC', Skin.BCSC)
  }, [store.skin])

  return store.skin === Skin.BCSC ? <BCSCRootStack />: <BCWalletRootStack />
}

export default Root
