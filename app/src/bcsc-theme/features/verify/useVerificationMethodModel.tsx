import useApi from '@/bcsc-theme/api/hooks/useApi'
import { ServiceHours, VideoDestinations } from '@/bcsc-theme/api/hooks/useVideoCallApi'
import useVideoPrompts from '@/bcsc-theme/hooks/useVideoPrompts'
import { getBCSCState, useDeveloper, useSession, useVerificationOptions } from '@/bcsc-theme/storage/hooks'
import { checkFileSystemFreeStorage, removeFileSafely } from '@/bcsc-theme/utils/file-info'
import { formatServiceAndUnavailableHours, isLiveCallAvailable } from '@/bcsc-theme/utils/service-hours-formatter'
import { AppError, ErrorRegistry } from '@/errors'
import { useAlerts } from '@/hooks/useAlerts'
import { BCSCScreens, BCSCVerifyStackParams } from '@bcsc-theme/types/navigators'
import { TOKENS, useServices } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect, useState } from 'react'
import { getLiveCallVideoQueue } from './live-call/utils/videoDestinations'
import { VerificationVideoCache } from './send-video/VideoReviewScreen'

const MINIMUM_FREE_STORAGE_MB = 500

type useVerificationMethodModelProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.VerificationMethodSelection>
}

const useVerificationMethodModel = ({ navigation }: useVerificationMethodModelProps) => {
  const verificationOptions = useVerificationOptions()
  const session = useSession()
  const developer = useDeveloper()
  const [sendVideoLoading, setSendVideoLoading] = useState(false)
  const [liveCallLoading, setLiveCallLoading] = useState(false)
  const [hoursLoading, setHoursLoading] = useState(true)
  const [serviceHours, setServiceHours] = useState<ServiceHours | undefined>()
  const [destinations, setDestinations] = useState<VideoDestinations | undefined>()
  const { video: videoCallApi } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const { ensureVerificationRequest } = useVideoPrompts()
  const { videoPromptsMissingAlert, deviceStorageFullAlert } = useAlerts(navigation)

  useEffect(() => {
    Promise.all([videoCallApi.getVideoDestinations(), videoCallApi.getServiceHours()])
      .then(([destinations, serviceHours]) => {
        setDestinations(destinations)
        setServiceHours(serviceHours)
      })
      .catch((error) => {
        logger.error('Error loading verification method service hours:', error as Error)
        setDestinations(undefined)
        setServiceHours(undefined)
      })
      .finally(() => setHoursLoading(false))
  }, [logger, videoCallApi])

  const handlePressSendVideo = useCallback(async () => {
    try {
      setSendVideoLoading(true)

      // Opens a request only if one isn't already in flight. The prompt set the user records against is
      // issued by VideoInstructions immediately beforehand, so entering the flow must not burn one here.
      // This still catches a backend that can't issue prompts at all before the user does the photo steps.
      const request = await ensureVerificationRequest()
      if (!request.ready) {
        logger.error('[useVerificationMethodModel] No verification request available; aborting Send Video')
        videoPromptsMissingAlert(request.error)
        return
      }

      await Promise.allSettled([
        removeFileSafely(session.videoPath, logger),
        removeFileSafely(session.photoPath, logger),
        removeFileSafely(session.videoThumbnailPath, logger),
      ])

      VerificationVideoCache.clearCache()

      getBCSCState().session.update({
        photoPath: undefined,
        photoMetadata: undefined,
        videoPath: undefined,
        videoDuration: undefined,
        videoThumbnailPath: undefined,
      })

      const storage = await checkFileSystemFreeStorage(MINIMUM_FREE_STORAGE_MB, logger)

      if (!storage.hasFreeStorage) {
        const appError = AppError.fromErrorDefinition(ErrorRegistry.DEVICE_STORAGE_FULL)
        appError.addContext({ freeStorageMB: storage.freeStorageMb })
        deviceStorageFullAlert(appError)
        return
      }

      navigation.navigate(BCSCScreens.PhotoInstructions, { forLiveCall: false })
    } catch (error) {
      logger.error('Error sending video:', error as Error)
      return
    } finally {
      setSendVideoLoading(false)
    }
  }, [
    ensureVerificationRequest,
    session.videoPath,
    session.photoPath,
    session.videoThumbnailPath,
    logger,
    navigation,
    videoPromptsMissingAlert,
    deviceStorageFullAlert,
  ])

  const handlePressLiveCall = useCallback(async () => {
    try {
      setLiveCallLoading(true)

      const [resolvedDestinations, resolvedServiceHours] =
        destinations && serviceHours
          ? [destinations, serviceHours]
          : await Promise.all([videoCallApi.getVideoDestinations(), videoCallApi.getServiceHours()])

      const formattedHours = formatServiceAndUnavailableHours(resolvedServiceHours)
      const liveCallVideoQueue = getLiveCallVideoQueue(developer.environment, resolvedDestinations)

      if (!liveCallVideoQueue) {
        navigation.navigate(BCSCScreens.CallBusyOrClosed, {
          busy: true,
          formattedHours,
        })
        return
      }

      if (!isLiveCallAvailable(resolvedServiceHours)) {
        navigation.navigate(BCSCScreens.CallBusyOrClosed, {
          busy: false,
          formattedHours,
        })
        return
      }

      navigation.navigate(BCSCScreens.PhotoInstructions, { forLiveCall: true })
    } catch (error) {
      logger.error('Error checking service availability:', error as Error)
      navigation.navigate(BCSCScreens.CallBusyOrClosed, {
        busy: false,
        formattedHours: [{ title: 'Unable to retrieve service hours at this time.' }],
      })
    } finally {
      setLiveCallLoading(false)
    }
  }, [developer.environment, navigation, logger, destinations, serviceHours, videoCallApi])

  return {
    handlePressSendVideo,
    handlePressLiveCall,
    sendVideoLoading,
    liveCallLoading,
    hoursLoading,
    verificationOptions: verificationOptions ?? [],
    formattedHours: serviceHours ? formatServiceAndUnavailableHours(serviceHours) : undefined,
  }
}

export default useVerificationMethodModel
