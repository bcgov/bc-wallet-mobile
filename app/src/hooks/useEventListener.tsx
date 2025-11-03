import { useEffect, useRef } from 'react'

type RemoveListenerCallback = () => void

/**
 * Hook to manage attaching and detaching to event listeners.
 *
 * Note: The eventListener function should return a function that removes the event listener when called.
 * This is to prevent memory leaks by ensuring that all event listners are properly cleaned up on component unmount.
 *
 * @param {() => RemoveListenerCallback} eventListener - Function that attaches the event listener and returns a function to remove it.
 * @param {boolean} [canAttach=true] - Flag to determine if the event listener should be attached.
 * @returns {*} {void}
 */
export const useEventListener = (eventListener: () => RemoveListenerCallback, canAttach = true) => {
  // This prevents re-creating the event listener on every render
  const eventListenerRef = useRef(eventListener)

  useEffect(() => {
    if (!canAttach) {
      return
    }

    const removeListener = eventListenerRef.current()

    // Cleanup function to remove the event listener on unmount
    return removeListener
  }, [canAttach]) // only re-run if canAttach changes
}
