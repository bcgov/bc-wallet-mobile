import React from 'react'
import { WorkflowEngine, testWorkflow } from '@/bcsc-theme/workflow'

/**
 * Demo component showcasing the declarative workflow engine
 * 
 * This component demonstrates how to use the workflow engine with a simple
 * test workflow that includes:
 * - Welcome step (entry point)
 * - Path selection step (demonstrates branching)
 * - Optional step (conditional - can be skipped)
 * - Final step (completion)
 * 
 * The workflow showcases:
 * 1. Dynamic branching based on context state
 * 2. Conditional step skipping
 * 3. Context sharing between steps
 * 4. Backward navigation support
 */
const WorkflowEngineDemo: React.FC = () => {
  return <WorkflowEngine workflow={testWorkflow} />
}

export default WorkflowEngineDemo