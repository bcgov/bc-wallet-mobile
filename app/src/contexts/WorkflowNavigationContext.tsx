import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack/lib/typescript/src/types'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

export enum WorkflowType {
  Onboarding = 'onboarding',
  AccountTransfer = 'accountTransfer',
}

// this will need to be a little more complicated
// each screen will need a function to determine if it has been seen already
// so if the workflow is restarted, we can skip to the next unseen screen
export interface WorkflowConfig {
  name: string
  screens: BCSCScreens[]
}

export const FLOW_CONFIGURATIONS: Record<WorkflowType, WorkflowConfig> = {
  [WorkflowType.Onboarding]: {
    name: 'Onboarding Flow',
    screens: [
      BCSCScreens.OnboardingSetupTypes,
      BCSCScreens.OnboardingIntroCarousel,
      BCSCScreens.OnboardingPrivacyPolicy,
      BCSCScreens.OnboardingOptInAnalytics,
      BCSCScreens.OnboardingTermsOfUse,
      BCSCScreens.OnboardingNotifications,
      BCSCScreens.OnboardingSecureApp,
      BCSCScreens.OnboardingCreatePIN,
      // After PIN, handleSuccessfulAuth dispatch navigates based on verified state
    ],
  },
  [WorkflowType.AccountTransfer]: {
    name: 'Account Transfer Flow',
    screens: [
      BCSCScreens.TransferAccountInformation,
      BCSCScreens.OnboardingPrivacyPolicy,
      BCSCScreens.OnboardingTermsOfUse,
      BCSCScreens.OnboardingOptInAnalytics,
      BCSCScreens.OnboardingNotifications,
      BCSCScreens.OnboardingSecureApp,
      BCSCScreens.OnboardingCreatePIN,
      BCSCScreens.NicknameAccount,
      BCSCScreens.TransferAccountInstructions,
      BCSCScreens.TransferAccountQRScan,
    ],
  },
}

interface WorkflowProviderProps {
  children: React.ReactNode
}

interface WorkflowNavigationContext {
  workflowType: WorkflowType | null
  currentScreen: BCSCScreens | null
  startWorkflow: (type: WorkflowType) => void
  goToNextScreen: (screen?: BCSCScreens) => void
  goToPreviousScreen: () => void
  goToScreen: (skipToScreen: BCSCScreens) => void
  endWorkflow: () => void
}

const WorkflowNavigationContext = createContext<WorkflowNavigationContext | undefined>(undefined)
// TODO: add error logger to this thang
export const WorkflowNavigationProvider: React.FC<WorkflowProviderProps> = ({ children }) => {
  console.log('___ Rendering WorkflowNavigationProvider')
  const navigation = useNavigation<StackNavigationProp<BCSCOnboardingStackParams>>()
  const [currentScreen, setCurrentScreen] = useState<BCSCScreens | null>(null)
  const [workflowType, setWorkflowType] = useState<WorkflowType | null>(null)
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowConfig | null>(null)

  const startWorkflow = useCallback(
    (type: WorkflowType) => {
      console.log('Starting workflow:', type)
      const flow = FLOW_CONFIGURATIONS[type]
      if (!flow.screens.length) {
        console.warn('No screens defined for this workflow type:', type)
        return
      }

      const firstScreen = flow.screens[0]
      setCurrentWorkflow(flow)
      setWorkflowType(type)
      setCurrentScreen(firstScreen)
      navigation.navigate(firstScreen as never) // TODO: this is hacky
    },
    [navigation, setCurrentWorkflow, setWorkflowType, setCurrentScreen]
  )

  const goToNextScreen = useCallback(
    (skipToScreen?: BCSCScreens) => {
      console.log('Going to next screen in workflow')
      const currentActiveScreen = skipToScreen ?? currentScreen
      if (!currentActiveScreen || !workflowType) {
        console.warn('No current screen or workflow type set.')
        console.log(currentActiveScreen, workflowType)
        return
      }

      const currentIndex = currentWorkflow?.screens.indexOf(currentActiveScreen)

      if (currentIndex === undefined || currentIndex === -1 || !currentWorkflow) {
        // current screen not found in workflow
        console.warn('Current screen not found in workflow.')
        return
      }

      // if last scren
      // run endWorkflow (clean up store, reset states, clean context)

      if (currentIndex + 1 <= currentWorkflow.screens.length) {
        const screen = currentWorkflow.screens[currentIndex + 1]
        console.log('Navigating to next screen:', screen)
        setCurrentScreen(screen)
        navigation.navigate(screen as never) // TODO: this is hacky
      }
    },
    [navigation, currentScreen, workflowType, currentWorkflow]
  )

  const goToPreviousScreen = () => {
    const currentIndex = currentWorkflow?.screens.indexOf(currentScreen as BCSCScreens)
    if (!currentIndex || currentIndex < 0) {
      return
    }

    navigation.navigate(currentWorkflow!.screens[currentIndex - 1] as never) // TODO: this is hacky
  }

  const endWorkflow = () => {
    setCurrentScreen(null)
    setWorkflowType(null)
    setCurrentWorkflow(null)
    // this will also need to clea up some store values I'm sure
  }

  const contextValues = useMemo(
    () => ({
      workflowType,
      currentScreen,
      startWorkflow,
      goToNextScreen,
      goToPreviousScreen,
      goToScreen: (screen: BCSCScreens) => {},
      endWorkflow,
    }),
    [workflowType, currentScreen, startWorkflow, goToNextScreen, goToPreviousScreen, endWorkflow]
  )

  return <WorkflowNavigationContext.Provider value={contextValues}>{children}</WorkflowNavigationContext.Provider>
}

export function useWorkflowNavigation() {
  const context = useContext(WorkflowNavigationContext)

  if (!context) {
    throw new Error('useFlowNavigation must be used within a FlowNavigationProvider')
  }

  return context
}
