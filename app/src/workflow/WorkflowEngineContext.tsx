import { useNavigation } from '@react-navigation/native'
import { createContext, PropsWithChildren, useCallback, useMemo, useState } from 'react'

export interface WorkflowStep<WorkflowKey extends string> {
  /**
   * The name of the screen associated with this workflow step.
   * @type {string}
   */
  screen: string
  /**
   * The name of the next screen in the workflow,
   * or a function that determines the next screen based on context,
   * or null if this is the last step.
   * @type {WorkflowKey | ((context: any) => WorkflowKey | null) | null}
   */
  nextStep: WorkflowKey | ((context: any) => WorkflowKey | null) | null
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
   *
   * Note: If the next step is null, the workflow is considered complete
   * and the onWorkflowComplete callback will be invoked.
   *
   * @param {any} [context] - Optional context for determining the next screen.
   * @returns {void}
   */
  goToNextStep: (context?: any) => void
  /**
   * Moves to the previous step in the workflow.
   * @returns {void}
   */
  goToPreviousStep: () => void
  /**
   * Moves to a specific step in the workflow.
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
  onWorkflowComplete: () => void
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
   * Moves to a specific workflow step.
   *
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

      // If there is no next step, the workflow is complete
      if (nextStep === null) {
        props.onWorkflowComplete()
        return
      }

      goToWorkflowStep(nextStep)
    },
    [goToWorkflowStep, props, workflowStep.nextStep]
  )

  /**
   * Moves to the previous workflow step.
   *
   * @throws {Error} If no previous step is defined (ie: first step).
   * @returns {void}
   */
  const goToPreviousWorkflowStep = useCallback(() => {
    if (!workflowStep.previousStep) {
      throw new Error('WorkflowEngineProvider: No previous step defined for the current workflow step.')
    }

    goToWorkflowStep(workflowStep.previousStep)
  }, [goToWorkflowStep, workflowStep.previousStep])

  // Memoize the workflow engine context value
  const workflowEngine = useMemo(
    () => ({
      currentStep: workflowStep,
      goToNextStep: goToNextWorkflowStep,
      goToPreviousStep: goToPreviousWorkflowStep,
      goToStep: goToWorkflowStep,
    }),
    [goToNextWorkflowStep, goToPreviousWorkflowStep, goToWorkflowStep, workflowStep]
  )

  return <WorkflowEngineContext.Provider value={workflowEngine}>{props.children}</WorkflowEngineContext.Provider>
}
