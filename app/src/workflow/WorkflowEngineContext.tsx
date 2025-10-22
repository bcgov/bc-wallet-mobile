import { useNavigation, useNavigationState } from '@react-navigation/native'
import { createContext, PropsWithChildren, useCallback, useMemo } from 'react'

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
   * Get the current step in the workflow.
   * @throws {Error} If there is no current step (ie: not in a workflow screen).
   * @type {WorkflowStep<WorkflowKey>}
   */
  getCurrentStep: () => WorkflowStep<WorkflowKey>
  /**
   * Advances to the next step in the workflow.
   * Note: If the next step is null, the workflow is considered complete
   * and the onWorkflowComplete callback will be invoked.
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
  const currentRoute = useNavigationState((state) => state?.routes[state?.index]?.name)

  // Determine the current workflow step based on the current route or return null if screen is not part of the workflow
  const workflowStep: WorkflowStep<WorkflowKey> | null = useMemo(() => {
    return (
      Object.values<WorkflowStep<WorkflowKey>>(props.workflowDefinition).find((step) => step.screen === currentRoute) ??
      null
    )
  }, [currentRoute, props.workflowDefinition])

  /**
   * Gets the current workflow step.
   *
   * @throws {Error} If there is no current workflow step.
   * @return {WorkflowStep<WorkflowKey>} The current workflow step.
   */
  const getCurrentWorkflowStep = useCallback(() => {
    if (!workflowStep) {
      throw new Error('WorkflowEngineProvider: No current workflow step. Is this screen part of the workflow?')
    }

    return workflowStep
  }, [workflowStep])

  /**
   * Moves to a specific workflow step.
   *
   * @returns {void}
   */
  const goToWorkflowStep = useCallback(
    (stepKey: WorkflowKey) => {
      const step = props.workflowDefinition[stepKey]

      navigation.navigate(step.screen as never)
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
      if (!workflowStep) {
        return
      }

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
    [goToWorkflowStep, props, workflowStep]
  )

  /**
   * Moves to the previous workflow step.
   *
   * @throws {Error} If no previous step is defined (ie: first step).
   * @returns {void}
   */
  const goToPreviousWorkflowStep = useCallback(() => {
    if (!workflowStep) {
      return
    }

    if (!workflowStep.previousStep) {
      throw new Error('WorkflowEngineProvider: No previous step defined for the current workflow step.')
    }

    goToWorkflowStep(workflowStep.previousStep)
  }, [goToWorkflowStep, workflowStep])

  // Memoize the workflow engine context value
  const workflowEngine = useMemo(
    () => ({
      getCurrentStep: getCurrentWorkflowStep,
      goToNextStep: goToNextWorkflowStep,
      goToPreviousStep: goToPreviousWorkflowStep,
      goToStep: goToWorkflowStep,
    }),
    [getCurrentWorkflowStep, goToNextWorkflowStep, goToPreviousWorkflowStep, goToWorkflowStep]
  )

  return <WorkflowEngineContext.Provider value={workflowEngine}>{props.children}</WorkflowEngineContext.Provider>
}
