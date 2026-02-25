import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react'
import { BCSCStacks } from '../types/navigators'

interface BCSCStackContextType {
  stack: BCSCStacks
  updateStack: (stack: BCSCStacks) => void
}

export const BCSCStackContext = createContext<BCSCStackContextType | null>(null)

/**
 * BCSCStackProvider component that provides the current BCSC stack and a function to update it via context.
 *
 * @param children - The child components that will have access to the BCSC stack context.
 * @returns The BCSCStackProvider component that wraps its children with the BCSCStackContext provider.
 */
export const BCSCStackProvider = ({ children }: PropsWithChildren) => {
  const [stack, updateStack] = useState<BCSCStacks>(BCSCStacks.Auth)

  const stackContext = useMemo(
    () => ({
      stack,
      updateStack,
    }),
    [stack]
  )

  return <BCSCStackContext.Provider value={stackContext}>{children}</BCSCStackContext.Provider>
}

/**
 * Custom hook to access the BCSCStackContext and optionally update the current stack.
 *
 * @param initialStack - An optional initial stack.
 * @returns The current stack and the function to update it from the context.
 */
export const useBCSCStack = (initialStack?: BCSCStacks) => {
  const context = useContext(BCSCStackContext)

  if (!context) {
    throw new Error('useBCSCStack must be used within a BCSCStackProvider')
  }

  // If a stack is provided as an argument, update the context with the new stack value.
  useEffect(() => {
    if (!initialStack || context.stack === initialStack) {
      // Skip if no stack provided or the stack has not changed
      return
    }

    context.updateStack(initialStack)
  }, [initialStack, context])

  return context
}
