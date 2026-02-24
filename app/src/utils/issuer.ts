import { getInitialEnvironment } from '@/store'
import { RemoteLogger } from '@bifold/remote-logs'
import { getIssuer, setIssuer } from 'react-native-bcsc-core'

/**
 * Initializes the issuer value on app startup if it is not already set.
 *
 * @param logger - The RemoteLogger instance for logging any errors during initialization.
 * @returns A promise that resolves when the initialization process is complete.
 */
export const initIssuer = async (logger: RemoteLogger): Promise<void> => {
  try {
    const currentIssuer = await getIssuer()

    if (currentIssuer) {
      return
    }

    const defaultIssuer = getInitialEnvironment().iasApiBaseUrl

    logger.info(`[BCSCCore] initializing issuer to default (${defaultIssuer})`)

    await setIssuer(defaultIssuer)
  } catch (error) {
    logger.error('[BCSCCore] Error initializing issuer', error as Error)
  }
}
