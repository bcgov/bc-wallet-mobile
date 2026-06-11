import { useBCSCAgentSafe } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { DEFAULT_AUTO_LOCK_TIME_MIN } from '@/constants'
import { BCState } from '@/store'
import { TOKENS, useServices, useStore } from '@bifold/core'
import type { Agent } from '@credo-ts/core'
import { DidCommMediatorPickupStrategy } from '@credo-ts/didcomm'
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AppState, AppStateStatus, Keyboard, PanResponder, View } from 'react-native'

export interface BCSCActivityContext {
  appStateStatus: AppStateStatus
  pauseActivityTracking: () => void
  reportActivity: () => void
  resumeActivityTracking: () => void
}

export const BCSCActivityContext = createContext<BCSCActivityContext>(null as unknown as BCSCActivityContext)

/**
 * Activity provider that tracks user activity and automatically logs out
 * the user after a period of inactivity defined by store.preferences.autoLockTime.
 *
 * This provider should wrap the VerifyStack and MainStack to monitor user interactions
 * and automatically log out (clear secure state + mark as not authenticated) when the
 * configured inactivity timeout is reached.
 *
 * Usage:
 * ```tsx
 * <BCSCActivityProvider>
 *   <YourApp />
 * </BCSCActivityProvider>
 *
 * // In components that need to pause/resume tracking:
 * const { pauseActivityTracking, resumeActivityTracking } = useBCSCActivity()
 * ```
 */
export const BCSCActivityProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const [store] = useStore<BCState>()
  const { logout } = useSecureActions()
  const lastActiveTimeRef = useRef<number | undefined>(undefined)
  const timeoutInMilliseconds = useRef<number>((store.preferences.autoLockTime ?? DEFAULT_AUTO_LOCK_TIME_MIN) * 60000)
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const prevAppStateStatusRef = useRef(AppState.currentState)
  const [appStateStatus, setAppStateStatus] = useState<AppStateStatus>(AppState.currentState)
  const isPausedRef = useRef<boolean>(false)
  // Read the live agent through a ref so the AppState listener (registered once)
  // always sees the current instance without re-subscribing on every agent change.
  const agentContext = useBCSCAgentSafe()
  const agentRef = useRef<Agent | null>(null)
  agentRef.current = agentContext?.agent ?? null

  const clearInactivityTimeoutIfExists = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current)
      inactivityTimeoutRef.current = null
    }
  }, [])

  const handleInactivityTimeout = useCallback(() => {
    logger.info('BCSC Activity: Inactivity timeout reached, logging out user')
    logout()
  }, [logger, logout])

  const resetInactivityTimeout = useCallback(
    (milliseconds: number) => {
      // Don't reset timeout if tracking is paused
      if (isPausedRef.current) {
        return
      }

      clearInactivityTimeoutIfExists()
      lastActiveTimeRef.current = Date.now()

      // do not set timeout if timeout duration is set to 0 (never lock)
      if (milliseconds > 0) {
        // create new timeout
        inactivityTimeoutRef.current = setTimeout(handleInactivityTimeout, milliseconds)
      }
    },
    [clearInactivityTimeoutIfExists, handleInactivityTimeout]
  )

  const pauseActivityTracking = useCallback(() => {
    logger.info('BCSC Activity: Pausing activity tracking')
    isPausedRef.current = true
    clearInactivityTimeoutIfExists()
  }, [logger, clearInactivityTimeoutIfExists])

  const resumeActivityTracking = useCallback(() => {
    logger.info('BCSC Activity: Resuming activity tracking')
    isPausedRef.current = false
    resetInactivityTimeout(timeoutInMilliseconds.current)
  }, [logger, resetInactivityTimeout])

  const reportActivity = useCallback(() => {
    if (!isPausedRef.current) {
      resetInactivityTimeout(timeoutInMilliseconds.current)
    }
  }, [resetInactivityTimeout])

  useEffect(() => {
    // listener for backgrounding / foregrounding
    const eventSubscription = AppState.addEventListener('change', async (nextAppState) => {
      // Snapshot the previous state and advance the ref/state synchronously, before any
      // await below. The handler is async (it awaits pickup calls), so if the OS fires
      // another AppState event while one is in-flight, advancing the ref up front keeps
      // the second invocation from reading a stale previous state and mis-ordering pickup
      // (e.g. a fast background→foreground flip would otherwise skip the pickup restart).
      const prevAppState = prevAppStateStatusRef.current
      prevAppStateStatusRef.current = nextAppState
      setAppStateStatus(nextAppState)

      // if going into the background
      if (['active', 'inactive'].includes(prevAppState) && nextAppState === 'background') {
        // remove timeout when backgrounded as timeout refs can be lost when app is backgrounded
        clearInactivityTimeoutIfExists()

        // Tear down the live mediator pickup socket. The OS suspends sockets while
        // backgrounded, leaving a dead session; pairing this with the foreground
        // restart below is what flushes messages queued at the mediator on return.
        // Only act when an agent exists, so the log reflects what actually happened.
        const agent = agentRef.current
        if (agent) {
          try {
            await agent.didcomm.mediationRecipient.stopMessagePickup()
            logger.info('BCSC Activity: Stopped agent message pickup')
          } catch (err) {
            logger.error(`BCSC Activity: Error stopping agent message pickup: ${err}`)
          }
        }
      }

      // if coming to the foreground
      if (prevAppState === 'background' && ['active', 'inactive'].includes(nextAppState)) {
        // if app was in background for longer than allowed time, log out user
        if (
          !isPausedRef.current &&
          lastActiveTimeRef.current &&
          Date.now() - lastActiveTimeRef.current >= timeoutInMilliseconds.current &&
          timeoutInMilliseconds.current > 0
        ) {
          logger.info('BCSC Activity: App was in background too long, logging out user')
          handleInactivityTimeout()
        } else {
          // app coming into the foreground is 'user activity', reset timeout
          resetInactivityTimeout(timeoutInMilliseconds.current)

          // Restart live message pickup. The mediator queues inbound DIDComm
          // messages (credential offers, proof requests, connection responses)
          // while the socket is down; without this they stay unfetched until the
          // next agent restart (app relaunch).
          // Only act when an agent exists, so the log reflects what actually happened.
          const agent = agentRef.current
          if (agent) {
            try {
              await agent.didcomm.mediationRecipient.initiateMessagePickup(
                undefined,
                DidCommMediatorPickupStrategy.PickUpV2LiveMode
              )
              logger.info('BCSC Activity: Restarted agent message pickup')
            } catch (err) {
              logger.error(`BCSC Activity: Error restarting agent message pickup: ${err}`)
            }
          }
        }
      }
    })

    // keyboard activity resets the inactivity timeout
    const keyboardDidShowSubscription = Keyboard.addListener('keyboardDidShow', reportActivity)
    const keyboardDidHideSubscription = Keyboard.addListener('keyboardDidHide', reportActivity)

    // initial timeout setup
    resetInactivityTimeout(timeoutInMilliseconds.current)

    return () => {
      clearInactivityTimeoutIfExists()
      eventSubscription.remove()
      keyboardDidShowSubscription.remove()
      keyboardDidHideSubscription.remove()
    }
  }, [clearInactivityTimeoutIfExists, handleInactivityTimeout, resetInactivityTimeout, reportActivity, logger])

  useEffect(() => {
    // user has updated settings for auto lock time
    const newTimeoutMillis = (store.preferences.autoLockTime ?? DEFAULT_AUTO_LOCK_TIME_MIN) * 60000
    logger.info(`BCSC Activity: Auto lock time updated to ${store.preferences.autoLockTime} minutes`)
    timeoutInMilliseconds.current = newTimeoutMillis

    // reset the timeout with the new duration if not paused
    if (!isPausedRef.current) {
      resetInactivityTimeout(newTimeoutMillis)
    }
  }, [store.preferences.autoLockTime, logger, resetInactivityTimeout])

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        reportActivity()
        // returns false so the PanResponder doesn't consume the touch event
        return false
      },
    })
  }, [reportActivity])

  const contextValue = useMemo(
    () => ({ appStateStatus, pauseActivityTracking, reportActivity, resumeActivityTracking }),
    [appStateStatus, pauseActivityTracking, reportActivity, resumeActivityTracking]
  )

  return (
    <BCSCActivityContext.Provider value={contextValue}>
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        {children}
      </View>
    </BCSCActivityContext.Provider>
  )
}

export const useBCSCActivity = () => useContext(BCSCActivityContext)
