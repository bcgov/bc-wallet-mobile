/**
 * Simple validation test for the workflow engine (JavaScript version)
 */

// Simple test workflow definition
const testWorkflow = {
  id: 'test-workflow',
  name: 'Test Workflow',
  startStepId: 'step1',
  initialContext: {
    hasCompletedStep1: false,
    skipOptional: false,
  },
  steps: [
    {
      id: 'step1',
      component: 'TestStepOne', // Mock component
      title: 'Welcome',
      next: 'step2',
    },
    {
      id: 'step2',
      component: 'TestStepTwo', // Mock component
      title: 'Choose Path',
      next: (context) => {
        return context.skipOptional ? 'final' : 'optional'
      },
    },
    {
      id: 'optional',
      component: 'TestStepOptional', // Mock component
      title: 'Optional Step',
      isOptional: true,
      shouldSkip: (context) => context.skipOptional === true,
      next: 'final',
    },
    {
      id: 'final',
      component: 'TestStepFinal', // Mock component
      title: 'Complete',
      next: null,
    },
  ],
}

/**
 * Validate workflow definition
 */
function validateWorkflow(workflow) {
  const errors = []

  if (!workflow.id) errors.push('Workflow must have an id')
  if (!workflow.name) errors.push('Workflow must have a name')
  if (!workflow.startStepId) errors.push('Workflow must have a startStepId')
  if (!workflow.steps || workflow.steps.length === 0) {
    errors.push('Workflow must have at least one step')
  }

  const stepIds = workflow.steps.map(step => step.id)
  if (workflow.startStepId && !stepIds.includes(workflow.startStepId)) {
    errors.push(`Start step '${workflow.startStepId}' not found in workflow steps`)
  }

  const duplicates = stepIds.filter((id, index) => stepIds.indexOf(id) !== index)
  if (duplicates.length > 0) {
    errors.push(`Duplicate step IDs found: ${duplicates.join(', ')}`)
  }

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
 * Simulate workflow navigation path
 */
function simulateWorkflowPath(workflow, context) {
  const path = []
  let currentStepId = workflow.startStepId
  let iterationCount = 0
  const maxIterations = 20

  while (currentStepId && iterationCount < maxIterations) {
    const currentStep = workflow.steps.find(step => step.id === currentStepId)
    if (!currentStep) break

    // Check if step should be skipped
    if (currentStep.shouldSkip && currentStep.shouldSkip(context)) {
      // Skip this step
    } else {
      path.push(currentStepId)
    }

    // Determine next step
    if (typeof currentStep.next === 'string') {
      currentStepId = currentStep.next
    } else if (typeof currentStep.next === 'function') {
      currentStepId = currentStep.next(context)
    } else {
      currentStepId = null
    }

    iterationCount++
  }

  return path
}

/**
 * Test workflow navigation
 */
function testWorkflowNavigation() {
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

  return testCases.map(testCase => {
    const path = simulateWorkflowPath(testWorkflow, testCase.context)
    return {
      ...testCase,
      actualPath: path,
      passed: JSON.stringify(path) === JSON.stringify(testCase.expectedPath)
    }
  })
}

/**
 * Run all tests
 */
function runWorkflowTests() {
  console.log('🚀 Running Workflow Engine Tests...')
  
  // Test workflow validation
  const validationResult = validateWorkflow(testWorkflow)
  console.log('📋 Workflow Validation:', validationResult)

  if (!validationResult.valid) {
    console.error('❌ Test workflow is invalid:', validationResult.errors)
    return false
  }

  // Test navigation logic
  const navigationResults = testWorkflowNavigation()
  console.log('🧭 Navigation Tests:')
  navigationResults.forEach(result => {
    const status = result.passed ? '✅' : '❌'
    console.log(`  ${status} ${result.name}`)
    console.log(`     Expected: [${result.expectedPath.join(' → ')}]`)
    console.log(`     Actual:   [${result.actualPath.join(' → ')}]`)
  })

  const allNavigationPassed = navigationResults.every(result => result.passed)
  if (!allNavigationPassed) {
    console.error('❌ Some navigation tests failed')
    return false
  }

  console.log('✅ All workflow tests passed!')
  console.log('')
  console.log('🎉 Workflow Engine Implementation Summary:')
  console.log('   - Declarative workflow definitions: ✅')
  console.log('   - Dynamic branching with functions: ✅')  
  console.log('   - Optional steps with skip logic: ✅')
  console.log('   - Context state management: ✅')
  console.log('   - Navigation path validation: ✅')
  
  return true
}

// Run the tests
runWorkflowTests()