# PR Documentation: Declarative Workflow Engine Implementation

## Summary

This PR introduces a declarative workflow engine to drive the identity verification flow in the BC Wallet mobile app. The workflow engine replaces static stack navigator declarations with data-driven workflow definitions that support optional steps, dynamic branching, and conditional navigation.

## Key Changes

### 1. **New Workflow Engine Architecture** (`src/bcsc-theme/workflow/`)

#### Core Components Created:
- **`types.ts`**: TypeScript interfaces for workflow definitions, steps, and state
- **`WorkflowContext.tsx`**: React Context provider for workflow state management
- **`WorkflowEngine.tsx`**: Main workflow engine component with stack navigator integration
- **`workflows.tsx`**: Example workflow definitions and screen wrappers
- **`testWorkflow.tsx`**: Simple test workflow demonstrating all features
- **`index.ts`**: Public API exports for the workflow engine

#### Features Implemented:
- **Data-driven workflow definition**: Workflows defined as arrays of step objects
- **Dynamic branching**: Steps can determine next step at runtime using functions
- **Optional steps**: Steps can be skipped based on conditional logic
- **Centralized state management**: Workflow context shared between steps
- **Backward navigation**: History tracking and back navigation support

### 2. **Example Implementations**

#### Test Workflow (`testWorkflow`)
A simple 4-step workflow demonstrating:
- Basic step progression
- Dynamic branching based on user choice
- Optional step that can be skipped
- Context state management across steps

#### Mini Identity Verification Workflow (`exampleMiniWorkflow`)
Simplified identity verification flow showing:
- Conditional navigation based on user state
- Integration with existing screen components
- Header customization and navigation options

### 3. **Demo Component**

Created `WorkflowEngineDemo.tsx` to showcase the workflow engine functionality with the test workflow.

## Technical Implementation

### Workflow Definition Structure

```typescript
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
```

### State Management

- Uses React Context with useReducer for state management
- Centralized workflow state with actions for navigation and context updates
- Automatic history tracking for backward navigation

### Navigation Integration

- Built on top of React Navigation's stack navigator
- Maintains compatibility with existing navigation patterns
- Provides workflow-specific navigation methods (onNext, onBack, updateContext)

## Benefits

1. **Maintainability**: Workflow logic is separated from UI components and centralized
2. **Flexibility**: Dynamic branching and conditional steps support complex flows
3. **Testability**: Workflow definitions can be tested independently
4. **Reusability**: Workflows can be composed and shared across features
5. **Extensibility**: Easy to add new steps or modify existing flows

## Usage Example

```tsx
import { WorkflowEngine, testWorkflow } from '@/bcsc-theme/workflow'

const MyWorkflowScreen = () => {
  return <WorkflowEngine workflow={testWorkflow} />
}
```

## Migration Path

The workflow engine is designed to work alongside existing navigation without breaking changes:

1. **Immediate**: New workflows can use the declarative engine
2. **Gradual**: Existing flows can be migrated step by step
3. **Backward Compatible**: Existing screen components work with minimal adaptation

## Future Enhancements

- **Full Identity Verification Migration**: Replace the existing static stack with the workflow engine
- **Workflow Validation**: Add runtime validation for workflow definitions
- **Visual Workflow Editor**: Tool for non-developers to create workflows
- **Analytics Integration**: Track workflow completion and drop-off points
- **Nested Workflows**: Support for sub-workflows and workflow composition

## Files Added

```
src/bcsc-theme/workflow/
├── README.md                           # Comprehensive documentation
├── index.ts                           # Public API exports
├── types.ts                           # TypeScript interfaces
├── WorkflowContext.tsx                # State management
├── WorkflowEngine.tsx                 # Main workflow engine
├── workflows.tsx                      # Example workflows
└── testWorkflow.tsx                   # Test workflow implementation

src/bcsc-theme/features/verify/
└── WorkflowEngineDemo.tsx             # Demo component
```

## Testing

The implementation includes:
- **Test Workflow**: Demonstrates all workflow engine features
- **Type Safety**: Full TypeScript support with comprehensive interfaces
- **Error Handling**: Proper error boundaries and validation
- **Navigation Integration**: Seamless integration with React Navigation

## Documentation

- **README.md**: Comprehensive documentation with examples and API reference
- **Code Comments**: Detailed inline documentation for maintainers
- **Type Documentation**: JSDoc comments on all public interfaces

This implementation provides a solid foundation for declarative workflow management while maintaining compatibility with existing code patterns and allowing for gradual migration.