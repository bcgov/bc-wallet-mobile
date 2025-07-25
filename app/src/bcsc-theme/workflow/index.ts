/**
 * Declarative Workflow Engine for BC Wallet Mobile
 * 
 * This module provides a declarative workflow engine that enables defining
 * complex, branching workflows as data structures rather than static navigation stacks.
 * 
 * Key Features:
 * - Define workflows as arrays of step objects
 * - Each step references a React component directly
 * - Support for optional steps with conditional logic
 * - Dynamic branching based on runtime state/context
 * - Centralized state management across workflow steps
 * - Backward navigation support
 * 
 * Usage Example:
 * ```
 * import { WorkflowEngine, testWorkflow } from '@/bcsc-theme/workflow'
 * 
 * const MyWorkflowScreen = () => (
 *   <WorkflowEngine workflow={testWorkflow} />
 * )
 * ```
 * 
 * For comprehensive documentation, see README.md
 * For PR details and implementation notes, see PR_DOCUMENTATION.md
 */

export { WorkflowEngine } from './WorkflowEngine'
export { WorkflowProvider, useWorkflow } from './WorkflowContext'
export { exampleMiniWorkflow, identityVerificationWorkflow, testWorkflow } from './workflows'
export type {
  WorkflowDefinition,
  WorkflowStep,
  WorkflowState,
  WorkflowContext,
  NextStepFunction,
  ShouldSkipFunction,
} from './types'
export type { WorkflowStepProps } from './WorkflowEngine'

// Test utilities for validation
export { validateWorkflow, testWorkflowNavigation, runWorkflowTests } from './__tests__/workflow.test'