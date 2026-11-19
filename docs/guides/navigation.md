# Navigation Guide

Read before adding, removing or moving a BCSC screen, modal or navigator, or changing which stack shows. When editing existing code, follow the pattern in the file you're in. Code: `app/src/bcsc-theme/navigators/`. The reasons behind these rules are in [`CONVENTIONS.md`](../../CONVENTIONS.md), under "Root phase transitions" and "Waiting screens".

BC Wallet uses Bifold's navigators, not these. Only `app/src/contexts/NavigationContainerContext.tsx` (screen tracking and the problem-report trail) is shared by both apps.

## Layout

```
NavigationContainer              contexts/NavigationContainerContext.tsx
└─ BCSCRootStack                 navigators/RootStack.tsx
   └─ session providers          agent, account, system-check runs: on in verify and main
      └─ Root.Navigator          registers one route, the current phase's
         ├─ Loading              loading: startup
         ├─ BCSCOnboardingStack  onboarding: no account
         ├─ BCSCAuthStack        auth: locked
         ├─ BCSCVerifyStack      recovery, verify
         └─ BCSCMainStack        main
            ├─ BCSCTabStack      Home, Services, Wallet
            └─ QRCore            QR scanner tabs
```

## Who decides what

| Piece                                       | Job                                                                                                   | Must not                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `getRootPhase` (`state/root/root-phase.ts`) | Decide the phase from its facts. The only place that does.                                            | Be restated in a screen or a stack.             |
| `getRootTransition` (`root-transition.ts`)  | Decide how a phase change animates: push, pop or cut.                                                 | Be bypassed by animation options on a route.    |
| `BCSCRootStack` (`RootStack.tsx`)           | Map the phase to its route, and mount the session providers.                                          | Decide the phase or its animation, or navigate. |
| Phase stack (`<Phase>Stack.tsx`)            | Register its screens and modals, pick its first screen from state at mount, claim `BCSCStackContext`. | Navigate to another phase.                      |
| Screen / ViewModel                          | Navigate within its stack. Change phase by dispatching.                                               | `navigate` or `reset` into another phase.       |

## Rules

1. **A phase change is a store dispatch.** Change the fact `getRootPhase` reads, and the root swaps its route. React Navigation animates the swap like a `replace`. `useLeaveVerification` is the model: one `UPDATE_SECURE_IN_VERIFY_FLOW` dispatch, no navigation. Never `navigate`, `reset` or `replace` to another phase's stack or screens. They are not registered while another phase shows.
2. **One place decides each thing.** Which stack shows: `getRootPhase`, which `useRootStackViewModel` reads through `useRootPhase`, with `useVerificationRouting` for the verify journey. How the change animates: `getRootTransition`. Add a condition or a direction there, with a test row, never in a screen or as route options.
3. **Inside a phase, navigate normally.** `navigate`, `push`, `replace` and `goBack` reach the current phase stack and the navigators nested in it. Type `navigation` with the stack's params list (`StackNavigationProp<BCSCMainStackParams>`), so `tsc` rejects a route the stack doesn't register. A screen registered in more than one stack may only navigate to routes that all of them register.
4. **A phase stack starts fresh each time.** It mounts when its phase is entered, and its first screen comes from state (`initialRouteName`: Verify resumes at `getResumeStepRoute`, Auth checks the intro flag). Keep anything that must outlive a phase change in the store or a session provider, never in a stack's state or route params. To restart a stack without a phase change, give its route a new `navigationKey` from the ViewModel, as the verify outage fallback does.
5. **Put a provider at the lowest level that covers its consumers.** One screen or stack: inside it. One phase: inside that phase's `Root.Screen` (`BCSCIdTokenProvider` wraps main only). The session: beside `BCSCAgentProvider`, `BCSCAccountProvider` and `SystemCheckSessionProvider`, with an `enabled` prop that clears its state when it turns false. RootStack never remounts, so a lock or an account removal resets nothing by itself. The whole BCSC app: `app/src/Root.tsx`.
6. **Register a route wherever it can be raised.** A modal that a system check or an alert raises from any phase (`InternetDisconnected`, `MandatoryUpdate`, `ServiceOutage`) is registered under the same name in each phase stack where that can happen. Code that navigates from outside the phase stacks (the container ref, or the startup system checks run by the root's ViewModel) first checks that a navigator on the focused path registers the route, as `InternetStatusSystemCheck` does. The startup `Loading` route registers none.
7. **Read navigation state along the focused path.** The root's state holds one route: the phase. To find the screen, walk to the focused leaf (`findFocusedRoute`, `navigationRef.getCurrentRoute()`, `getRouteNamesBelowFocus` in `stack-utils.ts`) instead of reading the top level.
8. **A wait that ends in a navigation stays on the screen.** Spin the pressed button and lock the inputs (`disabled={loading}`), and check `navigation.isFocused()` before navigating once it finishes. Raise the global overlay (`useLoadingScreen().startLoading`) only for a wait that navigates nowhere, or behind an OS prompt. A phase change under the overlay cuts instead of sliding.

## Adding a screen

1. Add its name to `BCSCScreens` (or `BCSCModals`) in `types/navigators.ts`, and its params to the params type of each stack that registers it (`undefined` for none). The value is the screen name analytics and the problem-report trail record (any stack prefix is stripped by `getBaseScreenName`), so match the v3 name where there is one, and don't rename existing values in passing.
2. Add a `Stack.Screen` to each of those stacks; a header title goes in its `options`, localized. Modals go at the bottom, with `getDefaultModalOptions`. To make a screen disappear when state changes, register it conditionally, as MainStack does with `VerificationSuccess`: React Navigation drops a route that is no longer registered.
3. Build it per [`mvvm.md`](mvvm.md), with `navigation` typed against its stack.
4. Register its test IDs in `app/src/test-ids/registry.ts`. If an e2e journey visits it, add a descriptor to `e2e/src/screens/<stack>.ts`.
5. In the verify stack, decide whether a user can resume on it (`getResumeStepRoute`) and how they leave it ("Verification flow exits" in `CONVENTIONS.md`).
6. Update any test that lists the stack's routes (`AuthStack.test.tsx`).

## Removing a screen

1. Delete its `Stack.Screen` from every stack that registers it, its params entries and its enum member.
2. Run `yarn typecheck`, then grep for the enum member. Typed calls fail to compile; untyped ones (`as never`, `NavigationProp<any>`) do not.
3. Delete what only it used: the component, ViewModel, tests and snapshots; its translation keys in `en`, `fr` and `pt-br`; its test-ID keys (the registry test fails on a key with no call site) and the e2e descriptors that use them.
4. Update any test that lists the stack's routes.

## Adding a navigator or a phase

- A navigator inside a phase (like `BCSCTabStack` or `QRCore`) is one screen of its phase stack, with `NavigatorScreenParams<…>` params. It does not claim `BCSCStackContext`.
- A new phase changes the app's flow, so ask first. It touches `RootPhase` and `getRootPhase` in `state/root/root-phase.ts` (where it sits in the order), `getRootTransition` (and `isSessionPhase` if the user is signed in), `BCSCStacks` and `BCSCRootStackParams`, a `case` in `RootStack.tsx` (`tsc` fails until there is one), `useBCSCStack` in the new stack, the system-check modals, and the "Root phase transitions" list in `CONVENTIONS.md`.

## Testing

- Phase rule: a row in `state/root/root-phase.test.ts`. Verify routing: `useRootStackViewModel.test.ts`. Transitions: a row in `root-transition.test.ts`. Route table and session providers: `RootStack.test.tsx`, which mocks the ViewModel.
- A stack's own test covers its first-screen choice and any conditional registration (`AuthStack.test.tsx`, `MainStack.test.tsx`). Screens follow [`mvvm.md`](mvvm.md).
- Jest can't show a slide or a first frame. For a change to phases, transitions or waits, add iOS and Android device steps to the PR's "How to test".

## Checklist

Check the diff against each of these before you finish:

- [ ] Nothing navigates, resets or replaces into another phase; phase changes are dispatches. Outside `navigators/` and `types/navigators.ts`, a phase stack name (`BCSCStacks.Onboarding`, `Auth`, `Verify`, `Main`) appears only where code reads the current stack (`BCSCStackContext`, `useAlerts`).
- [ ] Which stack shows is decided only in `getRootPhase`, and how it animates only in `getRootTransition`.
- [ ] Each added route has its enum member, params entry and `Stack.Screen` in every stack that registers it. Each removed route is gone from all three, with its test IDs, e2e descriptors and translations.
- [ ] `navigation` is typed against its stack, and `yarn typecheck` passes.
- [ ] A modal raised from any phase is registered in every phase stack where it can be raised.
- [ ] State that must survive a phase change is in the store or a session provider, and a new session provider clears itself when `enabled` turns false.
- [ ] A wait that ends in a navigation spins its button, not the global overlay, and checks `isFocused()` first.
- [ ] Code that reads navigation state walks the focused path.
- [ ] New rules have tests, and a phase, transition or waiting change has device steps in the PR.
