# Workflow-Based Architecture for React Native Applications

This document outlines a comprehensive workflow-based architecture approach for structuring user flows in React Native applications, specifically designed for the BC Wallet Mobile project.

## Overview

The workflow architecture provides a declarative way to define and manage complex user flows that span multiple screens, with features like conditional navigation, progress tracking, state management, and seamless integration with existing navigation systems.

## Key Benefits

- **Declarative Flow Definition**: Define user flows as data structures rather than imperative navigation code
- **Reusable Components**: Screen components can be reused across different workflows
- **State Management**: Centralized workflow state with automatic persistence
- **Progress Tracking**: Built-in progress indicators and completion tracking
- **Conditional Logic**: Support for branching flows based on user data or app state
- **Headless Steps**: Background processing steps that don't require UI
- **Graceful Integration**: Works alongside existing react-navigation setup

## Architecture Components

### 1. Core Types (`types/workflow.ts`)

The foundation includes several key interfaces:

- `WorkflowDefinition`: Defines a complete user flow
- `WorkflowStep`: Individual steps within a workflow
- `WorkflowContext`: Runtime context passed to steps
- `WorkflowEngine`: Main workflow execution engine

### 2. Workflow Provider (`providers/WorkflowProvider.tsx`)

A React Context provider that:

- Manages workflow state using React hooks and reducers
- Provides the workflow engine API
- Handles step completion and navigation
- Emits events for workflow lifecycle

### 3. Workflow Navigator (`components/WorkflowNavigator.tsx`)

Integration layer with react-navigation:

- Provides workflow-aware navigation options
- Handles Android back button during workflows
- Offers HOCs and hooks for screen integration

### 4. Utilities (`utils/workflowUtils.ts`)

Helper functions and builders:

- `WorkflowBuilder`: Fluent API for creating workflows
- `WorkflowUtils`: Progress calculation and validation
- `WorkflowTemplates`: Common workflow patterns
- Debug and storage utilities

## Usage Examples

### 1. Basic Workflow Definition

```typescript
const onboardingWorkflow: WorkflowDefinition = {
  id: 'onboarding',
  name: 'Welcome to BC Wallet',
  steps: [
    {
      id: 'splash',
      screen: Screens.Splash,
      completed: false,
      required: true,
      headless: true,
      completionCondition: (context) => !!context.userState.agent,
    },
    {
      id: 'tutorial',
      screen: Screens.Onboarding,
      completed: false,
      required: true,
      completionCondition: (context) => context.userState.onboarding.didCompleteTutorial,
    },
    // More steps...
  ],
  onComplete: async (context) => {
    console.log('Onboarding completed!')
    // Navigate to main app
  },
}
```

### 2. Using WorkflowBuilder

```typescript
const credentialWorkflow = WorkflowBuilder.create('credential-issuance', 'Receive Credential')
  .description('Review and accept a new credential')
  .pausable(true)
  .addHeadlessStep(
    async (context) => {
      // Validate connection
      await validateConnection(context.data.connectionId)
    },
    { id: 'validate-connection', required: true }
  )
  .addScreenStep(Screens.CredentialOffer, {
    id: 'review-offer',
    required: true,
    completionCondition: (ctx) => ctx.data.offerAccepted === true,
  })
  .addHeadlessStep(
    async (context) => {
      // Process credential
      await processCredential(context.data.credentialId)
    },
    { id: 'process-credential', required: true }
  )
  .onComplete(async (context) => {
    context.navigation.navigate('Credentials')
  })
  .build()
```

### 3. Screen Integration

```typescript
const CredentialOfferScreen: React.FC = withWorkflow((props) => {
  const { workflowContext, isWorkflowStep } = props

  const handleAccept = async () => {
    await acceptCredential()

    if (isWorkflowStep) {
      workflowContext.setData('offerAccepted', true)
      workflowContext.completeStep('review-offer')
    } else {
      // Regular navigation for non-workflow usage
      navigation.navigate('Credentials')
    }
  }

  return (
    <View>
      <Button onPress={handleAccept} title="Accept Credential" />
    </View>
  )
})
```

### 4. App Integration

```typescript
const App: React.FC = () => {
  const [store] = useStore()
  const config = useConfig()

  return (
    <WorkflowProvider userState={store} config={config}>
      <WorkflowNavigator>
        <NavigationContainer>
          <MainStack />
        </NavigationContainer>
      </WorkflowNavigator>
    </WorkflowProvider>
  )
}
```

## Integration with Existing BC Wallet Architecture

### 1. Onboarding Enhancement

The existing `useOnboardingState` hook can be extended to use the new workflow system:

```typescript
// Current approach
const { onboardingState, activeScreen } = useOnboardingState(
  store,
  config,
  termsVersion,
  generateOnboardingWorkflowSteps
)

// Enhanced approach
const engine = useWorkflowEngine()
useEffect(() => {
  if (!store.onboarding.didCompleteOnboarding) {
    engine.startWorkflow('onboarding')
  }
}, [store.onboarding.didCompleteOnboarding])
```

### 2. Event-Driven Workflow Triggers

```typescript
useEffect(() => {
  const credentialOfferListener = DeviceEventEmitter.addListener(EventTypes.CREDENTIAL_OFFER_RECEIVED, (event) => {
    engine.startWorkflow('credential-issuance', {
      data: {
        credentialId: event.credentialId,
        connectionId: event.connectionId,
      },
    })
  })

  return () => credentialOfferListener.remove()
}, [engine])
```

### 3. Gradual Migration Strategy

1. **Phase 1**: Implement workflow system alongside existing navigation
2. **Phase 2**: Migrate onboarding flow to use workflows
3. **Phase 3**: Convert credential issuance and proof request flows
4. **Phase 4**: Apply to other complex user flows

## Advanced Features

### 1. Conditional Steps

```typescript
.addConditionalStep(
  (context) => context.config.enableBiometry,
  {
    screen: Screens.UseBiometry,
    id: 'biometry-setup',
    required: false,
  }
)
```

### 2. Step Dependencies

```typescript
{
  id: 'review-credentials',
  screen: Screens.ProofRequest,
  dependencies: ['connection-verified', 'user-authenticated'],
  required: true,
}
```

### 3. Progress Tracking

```typescript
const { state } = useWorkflow()
const progress = WorkflowUtils.getProgress(state.activeWorkflow)

<ProgressBar
  progress={progress.percentage}
  text={`${progress.completed} of ${progress.total} completed`}
/>
```

### 4. Workflow Persistence

```typescript
// Automatically save workflow state
useEffect(() => {
  if (state.activeWorkflow) {
    AsyncStorage.setItem('workflow-state', WorkflowStorage.serialize(state))
  }
}, [state])

// Restore on app start
useEffect(() => {
  AsyncStorage.getItem('workflow-state').then((data) => {
    if (data) {
      const restoredState = WorkflowStorage.deserialize(data)
      // Resume workflow...
    }
  })
}, [])
```

## Testing

### 1. Unit Testing Workflows

```typescript
describe('Credential Issuance Workflow', () => {
  it('should complete all required steps', () => {
    const workflow = credentialIssuanceWorkflow
    const validation = WorkflowUtils.validate(workflow)
    expect(validation.valid).toBe(true)
  })

  it('should handle step completion', async () => {
    const context = createMockWorkflowContext({
      data: { credentialId: 'test-123' },
    })

    const step = workflow.steps.find((s) => s.id === 'review-offer')
    expect(step.completionCondition(context)).toBe(false)

    context.setData('offerAccepted', true)
    expect(step.completionCondition(context)).toBe(true)
  })
})
```

### 2. Integration Testing

```typescript
describe('Workflow Integration', () => {
  it('should navigate through credential workflow', async () => {
    const mockEngine = createMockWorkflowEngine()

    render(
      <WorkflowProvider engine={mockEngine}>
        <CredentialOfferScreen />
      </WorkflowProvider>
    )

    fireEvent.press(screen.getByText('Accept Credential'))

    expect(mockEngine.completeStep).toHaveBeenCalledWith('review-offer')
  })
})
```

## Performance Considerations

1. **Lazy Loading**: Steps are only activated when needed
2. **Memory Management**: Workflow state is cleaned up when complete
3. **Event Optimization**: Uses DeviceEventEmitter for loose coupling
4. **React Optimization**: Uses React.memo and useCallback appropriately

## Migration Path

1. **Start with new flows**: Implement new user flows using workflows
2. **Wrap existing screens**: Use `withWorkflow` HOC to make screens workflow-aware
3. **Gradual conversion**: Convert existing flows one at a time
4. **Maintain compatibility**: Keep both systems working during transition

This workflow-based architecture provides a robust foundation for managing complex user flows while maintaining compatibility with existing React Native navigation patterns. It offers significant benefits in terms of maintainability, testability, and user experience consistency.
