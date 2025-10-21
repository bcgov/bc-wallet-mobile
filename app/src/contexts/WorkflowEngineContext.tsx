import { useNavigation } from '@react-navigation/native'
import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react'

export interface WorkflowStep<WorkflowKey extends string = string> {
  /**
   * The name of the screen associated with this workflow step.
   * @type {string}
   */
  screen: string
  /**
   * The name of the next screen in the workflow, or a function that determines the next screen based on context.
   * @type {WorkflowKey | ((context: any) => WorkflowKey)}
   */
  nextStep: WorkflowKey | ((context: any) => WorkflowKey)
  /**
   * The name of the previous screen in the workflow, or null if this is the first step.
   * @type {WorkflowKey | null}
   */
  previousStep: WorkflowKey | null
}

export interface WorkflowEngineContextType<WorkflowKey extends string> {
  /**
   * The current step in the workflow.
   * @type {WorkflowStep<WorkflowKey>}
   */
  currentStep: WorkflowStep<WorkflowKey>
  /**
   * Advances to the next step in the workflow.
   * @param {any} [context] - Optional context for determining the next screen.
   * @returns {void}
   */
  goToNextStep: (context?: any) => void
  /**
   * Moves to the previous step in the workflow.
   * @param {WorkflowKey} stepKey - The step to navigate to.
   * @returns {void}
   */
  goToStep: (stepKey: WorkflowKey) => void
}

export const WorkflowEngineContext = createContext<WorkflowEngineContextType<any> | null>(null)

export type WorkflowDefinition<WorkflowKey extends string> = Record<WorkflowKey, WorkflowStep<WorkflowKey>>

export type WorkflowEngineProviderProps<WorkflowKey extends string> = PropsWithChildren<{
  workflowDefinition: WorkflowDefinition<WorkflowKey>
  initialWorkflowStep: WorkflowStep<WorkflowKey>
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
export const WorkflowEngineProvider = <WorkflowKey extends string>(props: WorkflowEngineProviderProps<WorkflowKey>) => {
  const navigation = useNavigation()
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep<WorkflowKey>>(props.initialWorkflowStep)

  /**
   * Advances to the next workflow step.
   *
   * @throws {Error} If the next step is not defined.
   * @param {any} [context] - Optional context for determining the next screen.
   * @returns {void}
   */
  const goToNextWorkflowStep = useCallback(
    (context?: any) => {
      let nextStep = workflowStep.nextStep

      if (typeof nextStep === 'function') {
        nextStep = nextStep(context)
      }

      const goToNextWorkflowStep = props.workflowDefinition[nextStep]

      navigation.navigate(goToNextWorkflowStep.screen as never)
      setWorkflowStep(goToNextWorkflowStep)
    },
    [navigation, props.workflowDefinition, workflowStep.nextStep]
  )

  /**
   * Moves to the previous workflow step.
   *
   * @throws {Error} If no previous step is defined (ie: first step).
   * @returns {void}
   */
  const goToWorkflowStep = useCallback(
    (stepKey: WorkflowKey) => {
      const step = props.workflowDefinition[stepKey]

      navigation.navigate(step.screen as never)
      setWorkflowStep(step)
    },
    [navigation, props.workflowDefinition]
  )

  // Memoize the workflow engine context value
  const workflowEngine = useMemo(
    () => ({
      currentStep: workflowStep,
      goToNextStep: goToNextWorkflowStep,
      goToStep: goToWorkflowStep,
    }),
    [goToNextWorkflowStep, goToWorkflowStep, workflowStep]
  )

  return <WorkflowEngineContext.Provider value={workflowEngine}>{props.children}</WorkflowEngineContext.Provider>
}

/**
 * Hook to access the WorkflowEngine context.
 *
 * @throws {Error} If used outside of a WorkflowEngineProvider.
 * @returns {WorkflowEngineContextType} The workflow engine context value.
 */
export const useWorkflowEngine = () => {
  const context = useContext(WorkflowEngineContext)

  if (!context) {
    throw new Error('useWorkflowEngine must be used within a WorkflowEngineProvider')
  }

  return context
}
