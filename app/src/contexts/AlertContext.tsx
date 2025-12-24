import { AlertEvent } from '@/events/alertEvents'
import { showNativeAlert } from '@/utils/alert'
import { createContext, PropsWithChildren, useContext } from 'react'
import { AlertButton } from 'react-native'

type AlertAction = AlertButton & { text: string }

export interface AlertContextType {
  showAlert: (event: AlertEvent, actions?: AlertAction[]) => void
}

export const AlertContext = createContext<AlertContextType | null>(null)

/**
 * AlertProvider component that provides alert functionality to its children.
 *
 * Why? Because using a context allows for easier future transitions into custom alerts.
 * Right now we are using native alerts, but if we want to switch to a custom alert component later,
 * we can do so by updating this provider without changing the rest of the app.
 *
 * @param props - The props containing child components.
 * @returns Provider component wrapping its children.
 */
export const AlertProvider = ({ children }: PropsWithChildren) => {
  // TODO (MD): We can enhance this in the future to support custom alert components by swapping out showNativeAlert.

  return <AlertContext.Provider value={{ showAlert: showNativeAlert }}>{children}</AlertContext.Provider>
}

/**
 * Hook to access the Alert context.
 *
 * @returns The alert context
 */
export const useAlert = () => {
  const context = useContext(AlertContext)

  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider')
  }

  return context
}
