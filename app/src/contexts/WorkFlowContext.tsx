import React, { createContext, useContext, useState } from 'react'

export type WorkflowStepHandlerArgs = {
  step: WorkflowStep // The current step being executed
  context: WorkflowContext // The workflow context
}
export interface WorkflowStep {
  name: string // Unique identifier for the step
  component?: React.ComponentType<any> // Optional UI component for the step
  handler?: (args: WorkflowStepHandlerArgs) => Promise<void> // Logic for non-UI steps
  condition?: (context: WorkflowContext) => boolean // Determines if the step should execute
  weight?: number // Determines the order of steps
  index?: number // Determines the order of steps
}

export interface WorkflowContext {
  [key: string]: any // Dynamic key-value pairs for passing data between steps
}

export interface WorkflowContextValue {
  context: WorkflowContext // Shared state across steps
  engine: WorkflowEngine // Workflow engine instance
  currentStep: WorkflowStep | null // Current step in the workflow
  nextStep: (navigation: any, currentStepIndex: number) => Promise<void> // Function to navigate to the next step
}

export class WorkflowEngine {
  private steps: WorkflowStep[]
  private context: WorkflowContext

  constructor(steps: WorkflowStep[], initialContext: WorkflowContext = {}) {
    this.steps = steps.sort((a, b) => (a.weight || 0) - (b.weight || 0))
    this.steps.forEach((step, index) => {
      step.index = index
    })
    this.context = initialContext
  }

  getStepByIndex(index: number): WorkflowStep | null {
    return this.steps[index]
  }

  getContext(): WorkflowContext {
    return this.context
  }
}

const WorkflowContextProvider = createContext<WorkflowContextValue | undefined>(undefined)

export const WorkflowProvider: React.FC<{
  steps: WorkflowStep[]
  initialContext?: WorkflowContext
  children: React.ReactNode
}> = ({ steps, initialContext = {}, children }) => {
  const [workflowEngine] = useState(() => new WorkflowEngine(steps, initialContext))
  const [currentStep, setCurrentStep] = useState<WorkflowStep | null>(null)

  const nextStep = async (navigation: any, currentStepIndex: number) => {
    const nextStepIndex = currentStepIndex + 1
    console.log('Current Navigation State')
    console.log(JSON.stringify(navigation.getState(), null, 2))
    console.log('Current Step Index is', currentStepIndex)
    console.log('Next Step Index is', nextStepIndex)
    const navState = navigation.getState()
    const lastRoute = navState.routes[navState.routes.length - 1]
    console.log('Last Route', lastRoute)
    if (lastRoute.name === 'Loading') {
      console.log("navigation.replace('Loading')")
      navigation.replace('Loading', { stepIndex: nextStepIndex })
    } else {
      navigation.push('Loading', { stepIndex: nextStepIndex })
    }
  }

  return (
    <WorkflowContextProvider.Provider
      value={{
        context: workflowEngine.getContext(),
        engine: workflowEngine,
        currentStep,
        nextStep,
      }}
    >
      {children}
    </WorkflowContextProvider.Provider>
  )
}

export const useWorkflow = (): WorkflowContextValue => {
  const context = useContext(WorkflowContextProvider)
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider')
  }
  return context
}
