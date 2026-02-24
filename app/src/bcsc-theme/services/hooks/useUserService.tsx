import BCSCApiClient from '@/bcsc-theme/api/client'
import useUserApi from '@/bcsc-theme/api/hooks/useUserApi'
import { useBCSCApiClientState } from '@/bcsc-theme/hooks/useBCSCApiClient'
import { isAppError } from '@/errors/appError'
import { AppEventCode } from '@/events/appEventCode'
import { useAlerts } from '@/hooks/useAlerts'
import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native'
import { useCallback, useMemo } from 'react'

/**
 * Service layer hook for user api.
 * Business logic related to user API calls and UI event handling should be implemented here.
 *
 * @returns User API service with UI event handling.
 */
export const useUserService = () => {
  const { client } = useBCSCApiClientState()
  const userApi = useUserApi(client as BCSCApiClient)
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  const alerts = useAlerts(navigation)

  /**
   * Gets user information and handles errors related to JSON deserialization failures by showing an alert.
   *
   * @returns Promise resolving to user information response data
   */
  const getUserInfo = useCallback(async () => {
    try {
      return await userApi.getUserInfo()
    } catch (error) {
      if (isAppError(error, AppEventCode.ERR_109_FAILED_TO_DESERIALIZE_JSON)) {
        alerts.failedToDeserializeJsonAlert()
      }

      throw error
    }
  }, [alerts, userApi])

  /**
   * Gets user metadata, including fetching the user's picture if it exists, and handles errors related to JSON deserialization failures by showing an alert.
   *
   * @returns Promise resolving to user metadata response data
   */
  const getUserMetadata = useCallback(async () => {
    let pictureUri: string | undefined
    try {
      const userMetadata = await userApi.getUserInfo()

      // if picture exists, fetch it
      if (userMetadata.picture) {
        pictureUri = await userApi.getPicture(userMetadata.picture)
      }

      return { user: userMetadata, picture: pictureUri }
    } catch (error) {
      if (isAppError(error, AppEventCode.ERR_109_FAILED_TO_DESERIALIZE_JSON)) {
        alerts.failedToDeserializeJsonAlert()
      }

      throw error
    }
  }, [alerts, userApi])

  return useMemo(
    () => ({
      ...userApi, // Spread the base token API to include all its methods
      getUserInfo,
      getUserMetadata,
    }),
    [getUserInfo, getUserMetadata, userApi]
  )
}
