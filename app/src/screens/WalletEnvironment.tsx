import { useDeveloper } from '@/bcsc-theme/storage/hooks'
import { IS_BCSC } from '@/utils/environment'
import { useStore } from '@bifold/core'
import { IASEnvironment } from '@utils/environment'
import React, { useCallback } from 'react'
import { BCDispatchAction, BCState } from '../store'
import EnvironmentSelector from './EnvironmentSelector'

interface WalletEnvironmentProps {
  shouldDismissModal: () => void
}

/**
 * BC Wallet equivalent to the IASEnvironment Screen.
 * Allows developers to switch between different IAS environments for testing purposes.
 * Does not require factory reset since BC Wallet doesn't depend on BCSC providers.
 */
const WalletEnvironmentScreen: React.FC<WalletEnvironmentProps> = ({ shouldDismissModal }) => {
  const [, dispatch] = useStore<BCState>()
  const { update: updateDeveloper } = useDeveloper()

  /**
   * Handles the change of the IAS environment by updating the store.
   * No factory reset needed for BC Wallet mode.
   *
   * @param environment - The selected IAS environment to switch to.
   * @returns A promise that resolves when the environment change process is complete.
   */
  const handleEnvironmentChange = useCallback(
    async (environment: IASEnvironment) => {
      dispatch({
        type: BCDispatchAction.UPDATE_ENVIRONMENT,
        payload: [environment],
      })
      if (IS_BCSC) {
        await updateDeveloper({ environment })
      }
      shouldDismissModal()
    },
    [dispatch, shouldDismissModal, updateDeveloper]
  )

  return <EnvironmentSelector onEnvironmentChange={handleEnvironmentChange} onCancel={shouldDismissModal} />
}

export default WalletEnvironmentScreen
