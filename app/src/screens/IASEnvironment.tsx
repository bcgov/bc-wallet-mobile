import { useSwitchEnvironment } from '@/bcsc-theme/hooks/useSwitchEnvironment'
import { IASEnvironment } from '@utils/environment'
import React, { useCallback } from 'react'
import EnvironmentSelector from './EnvironmentSelector'

interface IASEnvironmentProps {
  shouldDismissModal: () => void
}

/**
 * IAS Environment screen for BCSC mode.
 * Handles environment switching with factory reset for BCSC-specific context.
 */
const IASEnvironmentScreen: React.FC<IASEnvironmentProps> = ({ shouldDismissModal }) => {
  const switchEnvironment = useSwitchEnvironment()

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
      await switchEnvironment(environment)
      shouldDismissModal()
    },
    [switchEnvironment, shouldDismissModal]
  )

  return <EnvironmentSelector onEnvironmentChange={handleEnvironmentChange} onCancel={shouldDismissModal} />
}

export default IASEnvironmentScreen
