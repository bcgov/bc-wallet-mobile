/**
 * Simple test workflow to demonstrate the declarative workflow engine
 * 
 * This workflow demonstrates:
 * 1. Basic step progression
 * 2. Conditional branching based on context state
 * 3. Optional steps that can be skipped
 * 4. Dynamic navigation using next functions
 */

import React from 'react'
import { View, Text, Button } from 'react-native'
import { WorkflowDefinition } from './types'

// Simple test components that use workflow engine props
const TestStepOne: React.FC<any> = ({ onNext, updateContext, context }) => (
  <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
    <Text style={{ fontSize: 18, marginBottom: 20 }}>Step 1: Welcome</Text>
    <Text style={{ marginBottom: 20 }}>This is the first step in our test workflow.</Text>
    <Button
      title="Continue"
      onPress={() => {
        updateContext({ hasCompletedStep1: true })
        onNext()
      }}
    />
  </View>
)

const TestStepTwo: React.FC<any> = ({ onNext, updateContext, context }) => (
  <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
    <Text style={{ fontSize: 18, marginBottom: 20 }}>Step 2: Choose Path</Text>
    <Text style={{ marginBottom: 20 }}>Choose whether to skip the optional step:</Text>
    <Button
      title="Skip Optional Step"
      onPress={() => {
        updateContext({ skipOptional: true })
        onNext()
      }}
    />
    <View style={{ marginVertical: 10 }} />
    <Button
      title="Include Optional Step"
      onPress={() => {
        updateContext({ skipOptional: false })
        onNext()
      }}
    />
  </View>
)

const TestStepOptional: React.FC<any> = ({ onNext, context }) => (
  <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
    <Text style={{ fontSize: 18, marginBottom: 20 }}>Optional Step</Text>
    <Text style={{ marginBottom: 20 }}>
      This step was included because you chose not to skip it!
    </Text>
    <Text style={{ marginBottom: 20 }}>Context: {JSON.stringify(context, null, 2)}</Text>
    <Button title="Continue" onPress={onNext} />
  </View>
)

const TestStepFinal: React.FC<any> = ({ context }) => (
  <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
    <Text style={{ fontSize: 18, marginBottom: 20 }}>Final Step</Text>
    <Text style={{ marginBottom: 20 }}>Workflow completed!</Text>
    <Text style={{ fontSize: 12 }}>Final Context: {JSON.stringify(context, null, 2)}</Text>
  </View>
)

/**
 * Test workflow demonstrating all workflow engine features
 */
export const testWorkflow: WorkflowDefinition = {
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
      component: TestStepOne,
      title: 'Welcome',
      next: 'step2',
    },
    {
      id: 'step2',
      component: TestStepTwo,
      title: 'Choose Path',
      next: (context) => {
        // Dynamic branching: go to final step if skipping optional
        return context.skipOptional ? 'final' : 'optional'
      },
    },
    {
      id: 'optional',
      component: TestStepOptional,
      title: 'Optional Step',
      isOptional: true,
      // Skip this step if user chose to skip it
      shouldSkip: (context) => context.skipOptional === true,
      next: 'final',
    },
    {
      id: 'final',
      component: TestStepFinal,
      title: 'Complete',
      next: null, // End of workflow
    },
  ],
}