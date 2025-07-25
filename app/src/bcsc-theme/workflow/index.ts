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
 * import { WorkflowEngine, exampleMiniWorkflow } from '@/bcsc-theme/workflow'
 * 
 * const MyWorkflowScreen = () => (
 *   <WorkflowEngine workflow={exampleMiniWorkflow} />
 * )
 * ```
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