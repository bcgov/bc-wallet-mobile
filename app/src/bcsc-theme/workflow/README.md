# Declarative Workflow Engine

## Overview

The Declarative Workflow Engine is a data-driven approach to managing complex, branching workflows in the BC Wallet mobile app. Instead of static stack navigator screen declarations, workflows are now defined as data structures that support conditional logic, dynamic branching, and optional steps.

## Key Features

### 1. **Data-Driven Workflow Definition**
- Workflows are defined as arrays of step objects
- Each step references a React component directly
- No more static `<Stack.Screen>` declarations

### 2. **Dynamic Branching**
- Steps can determine the next step at runtime based on context
- Support for both static step IDs and dynamic functions
- Conditional navigation based on user state

### 3. **Optional Steps**
- Steps can be marked as optional and skipped based on logic
- `shouldSkip` function determines if a step should be bypassed
- Seamless navigation around skipped steps

### 4. **Centralized State Management**
- Workflow context shared between all steps
- Steps can update context to influence future navigation
- Built-in state management with React Context and useReducer

### 5. **Backward Navigation**
- Automatic history tracking for step navigation
- Support for going back through the workflow
- Integration with React Navigation's back functionality

## Architecture

```
WorkflowEngine
├── WorkflowProvider (Context)
├── WorkflowEngineCore (Stack Navigator)
└── WorkflowStepWrapper (HOC for each step)
```

### Core Components

#### `WorkflowEngine`
Main component that wraps the entire workflow with context and navigation.

#### `WorkflowProvider`
React Context provider that manages workflow state and provides helper functions.

#### `WorkflowStepWrapper`
Higher-order component that wraps each step to provide workflow capabilities.

## Usage

### Basic Workflow Definition

```tsx
import { WorkflowDefinition } from '@/bcsc-theme/workflow'

const myWorkflow: WorkflowDefinition = {
  id: 'my-workflow',
  name: 'My Workflow',
  startStepId: 'step1',
  initialContext: { /* initial state */ },
  steps: [
    {
      id: 'step1',
      component: MyStepComponent,
      title: 'Step 1',
      next: 'step2',
    },
    {
      id: 'step2',
      component: MyStep2Component,
      title: 'Step 2',
      next: null, // End of workflow
    },
  ],
}
```

### Dynamic Branching

```tsx
{
  id: 'conditional-step',
  component: MyComponent,
  next: (context) => {
    if (context.userType === 'premium') {
      return 'premium-step'
    }
    return 'standard-step'
  }
}
```

### Optional Steps

```tsx
{
  id: 'optional-step',
  component: MyOptionalComponent,
  isOptional: true,
  shouldSkip: (context) => !context.includeOptional,
  next: 'next-step',
}
```

### Using the Workflow Engine

```tsx
import React from 'react'
import { WorkflowEngine } from '@/bcsc-theme/workflow'
import { myWorkflow } from './workflows'

const MyWorkflowScreen = () => {
  return <WorkflowEngine workflow={myWorkflow} />
}
```

## Step Component Interface

Step components receive the following props:

```tsx
interface WorkflowStepProps {
  onNext: () => void          // Navigate to next step
  onBack: () => void          // Navigate to previous step
  updateContext: (updates: any) => void  // Update workflow context
  context: any                // Current workflow context
  canGoBack: boolean         // Whether back navigation is available
  navigation: any            // React Navigation object
  route: any                 // React Navigation route object
}
```

### Example Step Component

```tsx
const MyStepComponent: React.FC<WorkflowStepProps> = ({
  onNext,
  updateContext,
  context,
}) => {
  const handleSubmit = (data) => {
    updateContext({ formData: data })
    onNext()
  }

  return (
    <View>
      <Text>My Step</Text>
      <Button title="Continue" onPress={() => handleSubmit({})} />
    </View>
  )
}
```

## Migration Guide

### Before (Static Stack Navigator)

```tsx
const MyStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Step1" component={Step1Component} />
      <Stack.Screen name="Step2" component={Step2Component} />
      <Stack.Screen name="Step3" component={Step3Component} />
    </Stack.Navigator>
  )
}
```

### After (Declarative Workflow)

```tsx
const myWorkflow: WorkflowDefinition = {
  id: 'my-workflow',
  name: 'My Workflow',
  startStepId: 'step1',
  steps: [
    { id: 'step1', component: Step1Component, next: 'step2' },
    { id: 'step2', component: Step2Component, next: 'step3' },
    { id: 'step3', component: Step3Component, next: null },
  ],
}

const MyWorkflowScreen = () => (
  <WorkflowEngine workflow={myWorkflow} />
)
```

## Benefits

1. **Maintainability**: Workflows are easier to understand and modify
2. **Testability**: Workflow logic can be tested independently of UI
3. **Flexibility**: Dynamic branching and conditional steps
4. **Reusability**: Workflow definitions can be shared and composed
5. **Debugging**: Centralized state makes debugging easier

## Examples

See the following example workflows:

- `testWorkflow`: Simple demonstration with branching and optional steps
- `exampleMiniWorkflow`: Identity verification mini-workflow
- `identityVerificationWorkflow`: Full identity verification workflow

## API Reference

### Types

```tsx
interface WorkflowDefinition {
  id: string
  name: string
  steps: WorkflowStep[]
  startStepId: string
  initialContext?: WorkflowContext
}

interface WorkflowStep {
  id: string
  component: ComponentType<any>
  title?: string
  headerOptions?: StackNavigationOptions
  isOptional?: boolean
  shouldSkip?: ShouldSkipFunction
  next?: string | NextStepFunction
}

type NextStepFunction = (context: WorkflowContext) => string | null
type ShouldSkipFunction = (context: WorkflowContext) => boolean
```

### Hooks

```tsx
const { 
  state, 
  dispatch, 
  getCurrentStep, 
  navigateToNextStep, 
  updateContext, 
  canGoBack 
} = useWorkflow()
```

## Future Enhancements

- Workflow validation and type safety
- Visual workflow editor
- Workflow analytics and tracking
- Conditional step rendering based on permissions
- Workflow composition and nesting