import { useServerStatus } from '@/bcsc-theme/contexts/ServerStatusContext'
import { useMemo } from 'react'
import { AppUpdate } from './app-update'
import { selectAppUpdate } from './selectors'

/**
 * Returns the current app update status based on the server status and app version.
 *
 * @returns - The current app update status.
 */
export const useAppUpdate = (): AppUpdate => {
  const { serverStatus } = useServerStatus()

  return useMemo(() => {
    return selectAppUpdate(serverStatus)
  }, [serverStatus])
}
