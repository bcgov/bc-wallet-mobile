/**
 * Integration test for the workflow engine
 * 
 * This file demonstrates how to test workflow definitions and engine functionality
 */

import { testWorkflow } from '../testWorkflow'
import { WorkflowDefinition, WorkflowContext } from '../types'

/**
 * Test workflow definition validation
 */
export const validateWorkflow = (workflow: WorkflowDefinition): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  // Check basic required fields
  if (!workflow.id) {
    errors.push('Workflow must have an id')
  }
  if (!workflow.name) {
    errors.push('Workflow must have a name')
  }
  if (!workflow.startStepId) {
    errors.push('Workflow must have a startStepId')
  }
  if (!workflow.steps || workflow.steps.length === 0) {
    errors.push('Workflow must have at least one step')
  }

  // Check if startStepId exists in steps
  const stepIds = workflow.steps.map(step => step.id)
  if (workflow.startStepId && !stepIds.includes(workflow.startStepId)) {
    errors.push(`Start step '${workflow.startStepId}' not found in workflow steps`)
  }

  // Check for duplicate step IDs
  const duplicates = stepIds.filter((id, index) => stepIds.indexOf(id) !== index)
  if (duplicates.length > 0) {
    errors.push(`Duplicate step IDs found: ${duplicates.join(', ')}`)
  }

  // Check that all step components are defined
  workflow.steps.forEach(step => {
    if (!step.component) {
      errors.push(`Step '${step.id}' is missing a component`)
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Test workflow navigation logic
 */
export const testWorkflowNavigation = () => {
  const testCases = [
    {
      name: 'Navigation with skip optional = true',
      context: { hasCompletedStep1: true, skipOptional: true },
      expectedPath: ['step1', 'step2', 'final']
    },
    {
      name: 'Navigation with skip optional = false',
      context: { hasCompletedStep1: true, skipOptional: false },
      expectedPath: ['step1', 'step2', 'optional', 'final']
    }
  ]

  const results = testCases.map(testCase => {
    const path = simulateWorkflowPath(testWorkflow, testCase.context)
    return {
      ...testCase,
      actualPath: path,
      passed: JSON.stringify(path) === JSON.stringify(testCase.expectedPath)
    }
  })

  return results
}

/**
 * Simulate workflow navigation path given a context
 */
const simulateWorkflowPath = (workflow: WorkflowDefinition, context: WorkflowContext): string[] => {
  const path: string[] = []
  let currentStepId: string | null = workflow.startStepId
  let iterationCount = 0
  const maxIterations = 20 // Prevent infinite loops

  while (currentStepId && iterationCount < maxIterations) {
    const currentStep = workflow.steps.find(step => step.id === currentStepId)
    if (!currentStep) break

    // Check if step should be skipped
    if (currentStep.shouldSkip && currentStep.shouldSkip(context)) {
      // Skip this step, but still need to find next
    } else {
      path.push(currentStepId)
    }

    // Determine next step
    if (typeof currentStep.next === 'string') {
      currentStepId = currentStep.next
    } else if (typeof currentStep.next === 'function') {
      currentStepId = currentStep.next(context)
    } else {
      currentStepId = null // End of workflow
    }

    iterationCount++
  }

  return path
}

/**
 * Run all tests
 */
export const runWorkflowTests = () => {
  console.log('Running Workflow Engine Tests...')

  // Test workflow validation
  const validationResult = validateWorkflow(testWorkflow)
  console.log('Workflow Validation:', validationResult)

  // Test navigation logic
  const navigationResults = testWorkflowNavigation()
  console.log('Navigation Tests:', navigationResults)

  // Test that workflow is valid
  if (!validationResult.valid) {
    console.error('❌ Test workflow is invalid:', validationResult.errors)
    return false
  }

  // Test that navigation tests pass
  const allNavigationPassed = navigationResults.every(result => result.passed)
  if (!allNavigationPassed) {
    console.error('❌ Navigation tests failed:', navigationResults.filter(r => !r.passed))
    return false
  }

  console.log('✅ All workflow tests passed!')
  return true
}

// Export for external testing
export { testWorkflow }

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  runWorkflowTests()
}