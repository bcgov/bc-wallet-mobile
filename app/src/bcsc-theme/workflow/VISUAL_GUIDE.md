# Visual Guide: Declarative Workflow Engine

## Before vs After: Static Navigation vs Declarative Workflow

### Before (Static Stack Navigator)
```
VerifyIdentityStack.tsx
├── <Stack.Screen name="SetupSteps" />
├── <Stack.Screen name="IdentitySelection" />
├── <Stack.Screen name="SerialInstructions" />
├── <Stack.Screen name="ManualSerial" />
├── <Stack.Screen name="ScanSerial" />
├── ... (20+ more static screens)
└── <Stack.Screen name="VerificationSuccess" />

Navigation Logic Scattered Across Components:
SetupStepsScreen.tsx:
  navigation.navigate(BCSCScreens.IdentitySelection)

IdentitySelectionScreen.tsx:
  navigation.navigate(BCSCScreens.SerialInstructions)

// Hard-coded navigation paths, no conditional logic
```

### After (Declarative Workflow Engine)
```
workflow.tsx
const identityVerificationWorkflow = {
  id: 'identity-verification',
  steps: [
    {
      id: 'setup-steps',
      component: SetupStepsScreen,
      next: (context) => {
        if (context.hasSerial && context.hasEmail) {
          return 'verification-method'  // Skip selection
        }
        return 'identity-selection'     // Go to selection
      }
    },
    {
      id: 'identity-selection',
      component: IdentitySelectionScreen,
      shouldSkip: (context) => context.hasSerial,  // Skip if already have serial
      next: 'verification-method'
    },
    // ... more steps with dynamic logic
  ]
}

VerifyIdentityStack.tsx:
return <WorkflowEngine workflow={identityVerificationWorkflow} />

// Centralized workflow logic, dynamic branching
```

## Workflow Engine Architecture

```
                    ┌─────────────────────┐
                    │   WorkflowEngine    │
                    │                     │
                    │  ┌───────────────┐  │
                    │  │ WorkflowCore  │  │
                    │  │ (Navigator)   │  │
                    │  └───────────────┘  │
                    └─────────────────────┘
                              │
                              │
                    ┌─────────────────────┐
                    │  WorkflowProvider   │
                    │   (Context State)   │
                    │                     │
                    │  ┌───────────────┐  │
                    │  │   Workflow    │  │
                    │  │    State      │  │
                    │  │ ┌─────────────┐│  │
                    │  │ │ currentStep ││  │
                    │  │ │   context   ││  │
                    │  │ │   history   ││  │
                    │  │ └─────────────┘│  │
                    │  └───────────────┘  │
                    └─────────────────────┘
                              │
                              │
                    ┌─────────────────────┐
                    │ WorkflowStepWrapper │
                    │                     │
                    │  Provides props:    │
                    │  • onNext()         │
                    │  • onBack()         │
                    │  • updateContext()  │
                    │  • context          │
                    │  • canGoBack        │
                    └─────────────────────┘
                              │
                              │
                    ┌─────────────────────┐
                    │   Step Component    │
                    │                     │
                    │ SetupStepsScreen    │
                    │ IdentitySelection   │
                    │ VerificationMethod  │
                    │      etc...         │
                    └─────────────────────┘
```

## Example Workflow Flow

### Test Workflow Demonstration
```
Step 1: Welcome
│
├─── User clicks "Continue"
│    └─── updateContext({ hasCompletedStep1: true })
│    └─── onNext() → Navigate to Step 2
│
Step 2: Choose Path
│
├─── User clicks "Skip Optional Step"
│    └─── updateContext({ skipOptional: true })
│    └─── onNext() → next function returns 'final'
│    └─── Navigate to Final Step (skips optional)
│
└─── User clicks "Include Optional Step"
     └─── updateContext({ skipOptional: false })
     └─── onNext() → next function returns 'optional'
     └─── Navigate to Optional Step
     │
     Optional Step
     │
     └─── User clicks "Continue"
          └─── onNext() → Navigate to Final Step

Final Step: Workflow Complete!
```

## Dynamic Branching Logic

### Context-Based Navigation
```typescript
// Step definition with dynamic next function
{
  id: 'decision-point',
  component: DecisionScreen,
  next: (context) => {
    if (context.userType === 'premium') {
      return 'premium-flow'
    }
    if (context.userType === 'basic') {
      return 'basic-flow'
    }
    return 'default-flow'
  }
}
```

### Conditional Step Skipping
```typescript
// Step that can be skipped
{
  id: 'optional-verification',
  component: OptionalVerificationScreen,
  isOptional: true,
  shouldSkip: (context) => {
    return context.hasPreverifiedAccount || context.userSkippedVerification
  },
  next: 'next-step'
}
```

## Benefits Visualization

### Maintainability
```
Before: Navigation logic scattered across 20+ files
After:  Single workflow definition file

Before: Hard to understand complete flow
After:  Clear, declarative workflow structure
```

### Flexibility
```
Before: Static navigation paths only
After:  Dynamic branching based on state

Before: No conditional step skipping
After:  Optional steps with runtime decisions
```

### Testing
```
Before: Manual testing of navigation flows
After:  Automated workflow validation tests

Before: UI testing required for flow logic
After:  Pure function testing of workflow logic
```

## Migration Strategy

### Phase 1: Coexistence (✅ Completed)
- New workflow engine alongside existing navigator
- Demo route shows workflow engine capabilities
- Zero breaking changes to existing flows

### Phase 2: Gradual Migration (Future)
- Replace one flow at a time with workflow definitions
- Maintain backward compatibility during transition
- Team can learn and adapt gradually

### Phase 3: Full Migration (Future)
- All flows use declarative workflow engine
- Remove static stack navigator
- Benefits: cleaner code, better testing, easier maintenance

## Code Quality Improvements

### Before
```typescript
// Scattered navigation in 20+ components
const MyScreen = ({ navigation }) => {
  const handleNext = () => {
    if (someCondition) {
      navigation.navigate('ScreenA')
    } else {
      navigation.navigate('ScreenB')
    }
  }
  // ... rest of component
}
```

### After
```typescript
// Centralized workflow logic
const myWorkflow = {
  steps: [
    {
      id: 'decision-step',
      component: MyScreen,
      next: (context) => context.someCondition ? 'screen-a' : 'screen-b'
    }
  ]
}

// Component focuses on UI only
const MyScreen = ({ onNext, updateContext }) => {
  const handleNext = () => {
    updateContext({ someCondition: true })
    onNext()
  }
  // ... rest of component
}
```

This visualization shows how the declarative workflow engine transforms complex, scattered navigation logic into a clean, maintainable, and testable data-driven approach.