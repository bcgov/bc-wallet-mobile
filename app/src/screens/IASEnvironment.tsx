import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { TOKENS, useServices, useStore } from '@bifold/core'
import React, { useCallback } from 'react'
import { BCDispatchAction, BCState, IASEnvironment } from '../store'
import EnvironmentSelector from './EnvironmentSelector'

interface IASEnvironmentProps {
  shouldDismissModal: () => void
}

/**
 * IAS Environment screen for BCSC mode.
 * Handles environment switching with factory reset for BCSC-specific context.
 */
const IASEnvironmentScreen: React.FC<IASEnvironmentProps> = ({ shouldDismissModal }) => {
  const [, dispatch] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const factoryReset = useFactoryReset()

  /**
   * Handles the change of the IAS environment by performing a factory reset and updating the store.
   *
   * Note: Switching environments currently requires a factory reset.
   * Persisting state between environments is a potential future enhancement.
   *
   * @param environment - The selected IAS environment to switch to.
   * @returns A promise that resolves when the environment change process is complete.
   */
  const handleEnvironmentChange = useCallback(
    async (environment: IASEnvironment) => {
      try {
        // hard factory reset, no state saved
        await factoryReset()

        dispatch({
          type: BCDispatchAction.UPDATE_ENVIRONMENT,
          payload: [environment],
        })
      } catch (error) {
        logger.error('Error during factory reset for environment change:', error as Error)
      }

      shouldDismissModal()
    },
    [factoryReset, dispatch, logger, shouldDismissModal]
  )

  return <EnvironmentSelector onEnvironmentChange={handleEnvironmentChange} onCancel={shouldDismissModal} />
}

export default IASEnvironmentScreen
