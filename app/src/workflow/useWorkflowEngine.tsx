import { useContext } from 'react'
import { WorkflowEngineContext, WorkflowEngineContextType } from './WorkflowEngineContext'

/**
 * Hook to access the WorkflowEngine context.
 *
 * @throws {Error} If used outside of a WorkflowEngineProvider.
 * @returns {WorkflowEngineContextType} The workflow engine context value.
 */
export const useWorkflowEngine = <WorkflowKey extends string>(): WorkflowEngineContextType<WorkflowKey> => {
  const context = useContext(WorkflowEngineContext)

  if (!context) {
    throw new Error('useWorkflowEngine must be used within a WorkflowEngineProvider')
  }

  return context
}
