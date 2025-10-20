import { useNavigation } from '@react-navigation/native'
import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react'

export interface WorkflowStep {
  /**
   * The name of the screen associated with this workflow step.
   * @type {string}
   */
  screen: string
  /**
   * The name of the next screen in the workflow, or a function that determines the next screen based on context.
   * @type {string | ((context: any) => string)}
   */
  nextScreen: string | ((context: any) => string)
  /**
   * The name of the previous screen in the workflow, or null if this is the first step.
   * @type {string | null}
   */
  previousScreen: string | null
}

export interface WorkflowEngineContextType {
  currentStep: WorkflowStep
  nextStep: (context?: any) => void
  previousStep: () => void
}

export const WorkflowEngineContext = createContext<WorkflowEngineContextType | null>(null)

export type WorkflowEngineProviderProps = PropsWithChildren<{
  workflowSteps: WorkflowStep[]
}>

/**
 * Provides an API for managing multi-step workflows.
 *
 * Notes:
 *    - Manages current workflow step state
 *    - Provides functions to navigate to next and previous workflow steps
 *    - Uses React Navigation for screen transitions
 *
 * @param {WorkflowEngineProviderProps} props - The provider props including workflow steps and children.
 * @returns {JSX.Element} The WorkflowEngineProvider component wrapping its children.
 */
export const WorkflowEngineProvider = (props: WorkflowEngineProviderProps) => {
  const navigation = useNavigation()
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>(props.workflowSteps[0])

  /**
   * Finds a workflow step by its screen name.
   *
   * @param {string} screen - The screen name to find.
   * @returns {WorkflowStep} The matching workflow step.
   */
  const _getWorkflowStepFromScreen = useCallback(
    (screen: string) => {
      const step = props.workflowSteps.find((step) => step.screen === screen)

      if (!step) {
        throw new Error(`Screen "${screen}" not found in workflow engine steps.`)
      }

      return step
    },
    [props.workflowSteps]
  )

  /**
   * Advances to the next workflow step.
   *
   * @throws {Error} If the next step is not defined.
   * @param {any} [context] - Optional context for determining the next screen.
   * @returns {void}
   */
  const nextWorkflowStep = useCallback(
    (context?: any) => {
      let nextScreen = workflowStep.nextScreen

      if (typeof nextScreen === 'function') {
        nextScreen = nextScreen(context)
      }

      const nextStep = _getWorkflowStepFromScreen(nextScreen)

      navigation.navigate(workflowStep.nextScreen as never)

      setWorkflowStep(nextStep)
    },
    [_getWorkflowStepFromScreen, navigation, workflowStep.nextScreen]
  )

  /**
   * Moves to the previous workflow step.
   *
   * @throws {Error} If no previous step is defined (ie: first step).
   * @returns {void}
   */
  const previousWorkflowStep = useCallback(() => {
    if (!workflowStep.previousScreen) {
      throw new Error(`No previous step defined for screen "${workflowStep.screen}".`)
    }
    const previousStep = _getWorkflowStepFromScreen(workflowStep.previousScreen)

    navigation.navigate(workflowStep.previousScreen as never)

    setWorkflowStep(previousStep)
  }, [_getWorkflowStepFromScreen, navigation, workflowStep.previousScreen, workflowStep.screen])

  // Memoize the workflow engine context value
  const workflowEngine = useMemo(
    () => ({
      currentStep: workflowStep,
      nextStep: nextWorkflowStep,
      previousStep: previousWorkflowStep,
    }),
    [nextWorkflowStep, previousWorkflowStep, workflowStep]
  )

  return <WorkflowEngineContext.Provider value={workflowEngine}>{props.children}</WorkflowEngineContext.Provider>
}

export const useWorkflowEngine = () => {
  const context = useContext(WorkflowEngineContext)

  if (!context) {
    throw new Error('useWorkflowEngine must be used within a WorkflowEngineProvider')
  }

  return context
}
