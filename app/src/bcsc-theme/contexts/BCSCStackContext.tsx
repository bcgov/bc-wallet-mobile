import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react'
import { BCSCStacks } from '../types/navigators'

interface BCSCStackContextType {
  stack: BCSCStacks
  updateStack: (stack: BCSCStacks) => void
}

export const BCSCStackContext = createContext<BCSCStackContextType | null>(null)

/**
 * BCSCStackProvider component that provides the current BCSC stack and a function to update it via context.
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
 * Custom hook to access the BCSCStackContext and optionally claim the current stack.
 */
export const useBCSCStack = (initialStack?: BCSCStacks) => {
  const context = useContext(BCSCStackContext)

  if (!context) {
    throw new Error('useBCSCStack must be used within a BCSCStackProvider')
  }

  const { updateStack } = context

  // Two stacks are mounted while the root slides from one to the other, and the one sliding in mounts
  // last, so it wins. Deliberately not conditional on the current value: that re-ran this effect on every
  // change, so the two stacks took turns claiming the context until one unmounted.
  useEffect(() => {
    if (initialStack) {
      updateStack(initialStack)
    }
  }, [initialStack, updateStack])

  return context
}
