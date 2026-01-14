import { useStore } from '@bifold/core'
import React, { useCallback } from 'react'
import { BCDispatchAction, BCState, IASEnvironment } from '../store'
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
      shouldDismissModal()
    },
    [dispatch, shouldDismissModal]
  )

  return <EnvironmentSelector onEnvironmentChange={handleEnvironmentChange} onCancel={shouldDismissModal} />
}

export default WalletEnvironmentScreen
