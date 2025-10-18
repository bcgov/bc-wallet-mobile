import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import { WorkflowState, WorkflowDefinition, WorkflowContext } from './types'

/**
 * Actions for workflow state management
 */
type WorkflowAction =
  | { type: 'INITIALIZE_WORKFLOW'; payload: WorkflowDefinition }
  | { type: 'SET_CURRENT_STEP'; payload: string }
  | { type: 'UPDATE_CONTEXT'; payload: Partial<WorkflowContext> }
  | { type: 'NAVIGATE_BACK' }
  | { type: 'COMPLETE_WORKFLOW' }

/**
 * Initial workflow state
 */
const initialWorkflowState: WorkflowState = {
  workflow: {
    id: '',
    name: '',
    steps: [],
    startStepId: '',
    initialContext: {},
  },
  currentStepId: null,
  context: {},
  history: [],
  isComplete: false,
}

/**
 * Workflow state reducer
 */
function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  switch (action.type) {
    case 'INITIALIZE_WORKFLOW':
      return {
        ...state,
        workflow: action.payload,
        currentStepId: action.payload.startStepId,
        context: { ...action.payload.initialContext },
        history: [],
        isComplete: false,
      }

    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStepId: action.payload,
        history: state.currentStepId ? [...state.history, state.currentStepId] : state.history,
      }

    case 'UPDATE_CONTEXT':
      return {
        ...state,
        context: { ...state.context, ...action.payload },
      }

    case 'NAVIGATE_BACK':
      const previousStepId = state.history[state.history.length - 1]
      return {
        ...state,
        currentStepId: previousStepId || null,
        history: state.history.slice(0, -1),
      }

    case 'COMPLETE_WORKFLOW':
      return {
        ...state,
        isComplete: true,
        currentStepId: null,
      }

    default:
      return state
  }
}

/**
 * Workflow context type
 */
interface WorkflowContextType {
  state: WorkflowState
  dispatch: React.Dispatch<WorkflowAction>
  getCurrentStep: () => import('./types').WorkflowStep | undefined
  navigateToNextStep: () => void
  updateContext: (updates: Partial<WorkflowContext>) => void
  canGoBack: () => boolean
}

/**
 * Create the workflow context
 */
const WorkflowProviderContext = createContext<WorkflowContextType | undefined>(undefined)

/**
 * Workflow context provider component
 */
interface WorkflowProviderProps {
  children: ReactNode
}

export const WorkflowProvider: React.FC<WorkflowProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(workflowReducer, initialWorkflowState)

  /**
   * Get the current step definition
   */
  const getCurrentStep = () => {
    if (!state.currentStepId) return undefined
    return state.workflow.steps.find(step => step.id === state.currentStepId)
  }

  /**
   * Navigate to the next step based on the current step's 'next' property
   */
  const navigateToNextStep = () => {
    const currentStep = getCurrentStep()
    if (!currentStep) return

    let nextStepId: string | null = null

    if (typeof currentStep.next === 'string') {
      nextStepId = currentStep.next
    } else if (typeof currentStep.next === 'function') {
      nextStepId = currentStep.next(state.context)
    }

    if (nextStepId) {
      // Check if the next step should be skipped
      const nextStep = state.workflow.steps.find(step => step.id === nextStepId)
      if (nextStep?.shouldSkip?.(state.context)) {
        // Skip this step and try to find the next one
        const tempStep = { ...nextStep }
        tempStep.id = state.currentStepId! // Temporarily use current step to trigger next logic
        dispatch({ type: 'SET_CURRENT_STEP', payload: nextStepId })
        // Recursively call to find the next non-skipped step
        setTimeout(() => navigateToNextStep(), 0)
        return
      }
      
      dispatch({ type: 'SET_CURRENT_STEP', payload: nextStepId })
    } else {
      dispatch({ type: 'COMPLETE_WORKFLOW' })
    }
  }

  /**
   * Update workflow context
   */
  const updateContext = (updates: Partial<WorkflowContext>) => {
    dispatch({ type: 'UPDATE_CONTEXT', payload: updates })
  }

  /**
   * Check if we can navigate back
   */
  const canGoBack = () => {
    return state.history.length > 0
  }

  const contextValue: WorkflowContextType = {
    state,
    dispatch,
    getCurrentStep,
    navigateToNextStep,
    updateContext,
    canGoBack,
  }

  return (
    <WorkflowProviderContext.Provider value={contextValue}>
      {children}
    </WorkflowProviderContext.Provider>
  )
}

/**
 * Hook to use workflow context
 */
export const useWorkflow = (): WorkflowContextType => {
  const context = useContext(WorkflowProviderContext)
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider')
  }
  return context
}