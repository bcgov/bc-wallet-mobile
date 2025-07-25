import { ComponentType } from 'react'
import { StackNavigationOptions } from '@react-navigation/stack'

/**
 * Context data passed between workflow steps
 */
export interface WorkflowContext {
  [key: string]: any
}

/**
 * Function type for determining the next step in the workflow
 * @param context - Current workflow context/state
 * @returns The ID of the next step, or null to end the workflow
 */
export type NextStepFunction = (context: WorkflowContext) => string | null

/**
 * Function type for determining if a step should be skipped
 * @param context - Current workflow context/state
 * @returns true if the step should be skipped, false otherwise
 */
export type ShouldSkipFunction = (context: WorkflowContext) => boolean

/**
 * Defines a single step in a workflow
 */
export interface WorkflowStep {
  /** Unique identifier for this step */
  id: string
  
  /** React component to render for this step */
  component: ComponentType<any>
  
  /** Optional title for the screen header */
  title?: string
  
  /** Stack navigation options for this screen */
  headerOptions?: StackNavigationOptions
  
  /** Whether this step is optional and can be skipped */
  isOptional?: boolean
  
  /** Function to determine if this step should be skipped based on context */
  shouldSkip?: ShouldSkipFunction
  
  /** 
   * Determines the next step in the workflow
   * Can be a static step ID or a function for dynamic branching
   */
  next?: string | NextStepFunction
}

/**
 * Complete workflow definition
 */
export interface WorkflowDefinition {
  /** Unique identifier for this workflow */
  id: string
  
  /** Human-readable name for this workflow */
  name: string
  
  /** Array of steps that make up this workflow */
  steps: WorkflowStep[]
  
  /** ID of the first step to start with */
  startStepId: string
  
  /** Initial context data for the workflow */
  initialContext?: WorkflowContext
}

/**
 * Current state of a workflow execution
 */
export interface WorkflowState {
  /** Current workflow definition */
  workflow: WorkflowDefinition
  
  /** ID of the currently active step */
  currentStepId: string | null
  
  /** Current context/state data */
  context: WorkflowContext
  
  /** Stack of previous step IDs for navigation history */
  history: string[]
  
  /** Whether the workflow is complete */
  isComplete: boolean
}