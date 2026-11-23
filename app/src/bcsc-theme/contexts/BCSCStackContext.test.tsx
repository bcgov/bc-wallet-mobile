import { render } from '@testing-library/react-native'
import { BCSCStacks } from '../types/navigators'
import { BCSCStackProvider, useBCSCStack } from './BCSCStackContext'

/** A navigator claiming the context, as AuthStack, OnboardingStack, VerifyStack and MainStack do on mount. */
const Stack = ({ name }: { name: BCSCStacks; renderCount?: number }) => {
  useBCSCStack(name)
  return null
}

/** A consumer reading the current stack, as useAlerts does. */
const stackReads: BCSCStacks[] = []
const Reader = () => {
  stackReads.push(useBCSCStack().stack)
  return null
}
const currentStack = () => stackReads[stackReads.length - 1]

describe('useBCSCStack', () => {
  beforeEach(() => {
    stackReads.length = 0
  })

  it('throws outside the provider', () => {
    expect(() => render(<Reader />)).toThrow('useBCSCStack must be used within a BCSCStackProvider')
  })

  it('is the stack mounted last while two stacks overlap', () => {
    // The outgoing stack is already mounted when the incoming one mounts beneath or over it
    render(
      <BCSCStackProvider>
        <Stack name={BCSCStacks.Verify} />
        <Stack name={BCSCStacks.Main} />
        <Reader />
      </BCSCStackProvider>
    )

    expect(currentStack()).toBe(BCSCStacks.Main)
  })

  it('stays with the incoming stack when the outgoing one re-renders', () => {
    const App = ({ renderCount }: { renderCount: number }) => (
      <BCSCStackProvider>
        <Stack name={BCSCStacks.Verify} renderCount={renderCount} />
        <Stack name={BCSCStacks.Main} />
        <Reader />
      </BCSCStackProvider>
    )
    const view = render(<App renderCount={1} />)
    expect(currentStack()).toBe(BCSCStacks.Main)

    view.rerender(<App renderCount={2} />)

    expect(currentStack()).toBe(BCSCStacks.Main)
  })

  it('moves to a stack that mounts later and stays once the earlier one unmounts', () => {
    const App = ({ stacks }: { stacks: BCSCStacks[] }) => (
      <BCSCStackProvider>
        {stacks.map((name) => (
          <Stack key={name} name={name} />
        ))}
        <Reader />
      </BCSCStackProvider>
    )
    const view = render(<App stacks={[BCSCStacks.Main]} />)
    expect(currentStack()).toBe(BCSCStacks.Main)

    // Home → Start verification: VerifyStack pushes in over MainStack
    view.rerender(<App stacks={[BCSCStacks.Main, BCSCStacks.Verify]} />)
    expect(currentStack()).toBe(BCSCStacks.Verify)

    // The slide ends and MainStack unmounts
    view.rerender(<App stacks={[BCSCStacks.Verify]} />)
    expect(currentStack()).toBe(BCSCStacks.Verify)
  })
})
