import { autoDisableRemoteLoggingIntervalInMinutes } from '@/constants'
import { expirationOverrideInMinutes } from '@/utils/expiration'
import type { RemoteLogger } from '@bifold/remote-logs'
import { getBuildNumber, getVersion } from 'react-native-device-info'
import type { BCSCStore } from './slices'

// What LOAD_STATE did after loading, now run once open() returns ok
export const runStartupTasks = async (state: BCSCStore, logger: RemoteLogger, mediatorUrl: string | undefined) => {
  try {
    // Tells an update from a fresh install (#5166)
    await state.app.recordBuild({ version: getVersion(), build: getBuildNumber() })
  } catch (error) {
    logger.error('Failed to record the app build', error as Error)
  }

  try {
    await state.preferences.reconcileMediator(mediatorUrl)
  } catch (error) {
    // Re-runs next launch: the reconciled URL is only recorded with the preferences
    logger.error('Failed to reconcile the mediator preferences', error as Error)
  }

  const { enabledAt, sessionId } = state.developer.remoteDebugging
  if (enabledAt && sessionId) {
    const override = expirationOverrideInMinutes(new Date(enabledAt), autoDisableRemoteLoggingIntervalInMinutes)
    if (override > 0) {
      logger.remoteLoggingEnabled = true
      logger.sessionId = sessionId
      logger.overrideCurrentAutoDisableExpiration(override)
      logger.info(`Remote logging enabled, last enabled at ${enabledAt}, session id: ${sessionId}`)
    }
  }
}
