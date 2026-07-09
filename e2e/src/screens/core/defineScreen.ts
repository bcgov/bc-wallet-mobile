import { BaseScreen, EnterTextOptions } from './BaseScreen.js'

/**
 * A test ID that either resolves to the same string on both platforms, or differs per platform.
 * Most BCSC IDs are shared (see {@link bcsc}); use the `{ ios, android }` form only when they diverge.
 */
export type TestId = string | { readonly ios: string; readonly android: string }

/**
 * Declarative description of a screen: a map from **semantic roles** to test IDs.
 *
 * Specs then reference roles (`tap('primary')`, `link('inPerson')`) instead of raw testIDs, so a
 * renamed testID is a one-line descriptor edit rather than churn across every spec that touched it.
 *
 * - `self` — proves the screen mounted (defaults to `primary` when omitted).
 * - `primary` / `secondary` / `back` / `help` / `menu` — the common single-instance controls.
 * - `links` — named buttons / tabs / list options.
 * - `inputs` — text fields.
 * - `elements` — read/assert targets (labels, status text, …).
 */
export interface ScreenSpec {
  readonly self?: TestId
  readonly primary?: TestId
  readonly secondary?: TestId
  readonly back?: TestId
  readonly help?: TestId
  readonly menu?: TestId
  readonly links?: Readonly<Record<string, TestId>>
  readonly inputs?: Readonly<Record<string, TestId>>
  readonly elements?: Readonly<Record<string, TestId>>
}

/** The single-instance control roles. */
type ActionRole = 'primary' | 'secondary' | 'back' | 'help' | 'menu'

/**
 * The action roles a given spec actually declares. Because {@link defineScreen} captures the spec
 * with a `const` type parameter, `keyof S` stays a literal union — so `tap()` autocompletes only the
 * declared roles and rejects (at compile time) any role the screen does not have.
 */
type PresentRoles<S> = Extract<keyof S, ActionRole>
type LinkKeys<S> = S extends { links: infer L } ? Extract<keyof L, string> : never
type InputKeys<S> = S extends { inputs: infer I } ? Extract<keyof I, string> : never
type ElementKeys<S> = S extends { elements: infer E } ? Extract<keyof E, string> : never
/** Any named target — link, input, or element. */
type NamedKeys<S> = LinkKeys<S> | InputKeys<S> | ElementKeys<S>

type BackNamespace = { readonly tap: () => Promise<void> }
type HelpNamespace = { readonly open: () => Promise<void> }
/**
 * `back` / `help` are exposed only when the descriptor declares that role, so `screen.back.tap()` on
 * a screen without a `back` role is a **compile-time** error — the same guarantee `tap(role)` gives,
 * rather than only throwing at runtime.
 */
type RoleNamespaces<S> = ('back' extends PresentRoles<S> ? { readonly back: BackNamespace } : unknown) &
  ('help' extends PresentRoles<S> ? { readonly help: HelpNamespace } : unknown)

/** Resolve a (possibly platform-specific) {@link TestId} to a concrete id string for the live driver. */
export function resolveTestId(testId: TestId): string {
  if (typeof testId === 'string') return testId
  return driver.isIOS ? testId.ios : testId.android
}

/**
 * A thin handle around one raw testID — the escape hatch returned by {@link Screen.el} for the
 * occasional element a descriptor does not (yet) model. Wraps the same {@link BaseScreen} engine.
 */
export class RawElement {
  constructor(
    private readonly engine: BaseScreen,
    private readonly testId: TestId
  ) {}

  private get id(): string {
    return resolveTestId(this.testId)
  }

  /** Wait until the element is displayed (scrolls into view on miss). */
  async waitFor(timeout?: number): Promise<void> {
    await this.engine.waitForDisplayed(this.id, timeout)
  }

  /** Tap the element (scrolls into view on miss). */
  async tap(): Promise<void> {
    await this.engine.tapByTestId(this.id)
  }

  /** Wait until the element is enabled, then tap it. */
  async tapWhenEnabled(timeout?: number): Promise<void> {
    await this.engine.waitForEnabledAndTap(this.id, timeout)
  }

  /** Type into the element. */
  async fill(value: string, options?: EnterTextOptions): Promise<void> {
    await this.engine.enterText(this.id, value, options)
  }

  /** Read the element's visible text (falls back to the iOS `label` attribute). */
  async read(timeout?: number): Promise<string> {
    return this.engine.getTextByTestId(this.id, timeout)
  }

  /** Scroll until the element is visible (no tap). */
  async scrollTo(maxScrolls?: number, directions?: 'down' | 'both'): Promise<void> {
    await this.engine.scrollToTestId(this.id, maxScrolls, directions)
  }

  /** True if the element is currently displayed; never throws. */
  async isVisible(): Promise<boolean> {
    const el = await this.engine.findByTestId(this.id)
    try {
      return await el.isDisplayed()
    } catch {
      return false
    }
  }
}

/**
 * Action-based screen object produced by {@link defineScreen}. Methods speak in semantic roles and
 * named targets; the underlying testIDs live only in the descriptor. Reuses {@link BaseScreen} as
 * the selector engine (scroll-retry, iOS/Android selector syntax, secure-input handling).
 */
export class Screen<S extends ScreenSpec> {
  private readonly engine: BaseScreen

  /** Convenience namespace for the header back button (`await Screen.back.tap()`). */
  readonly back: { tap(): Promise<void> }
  /** Convenience namespace for the floating help menu (`await Screen.help.open()`). */
  readonly help: { open(): Promise<void> }

  constructor(private readonly spec: S) {
    this.engine = new BaseScreen()
    this.back = { tap: () => this.tapRole('back') }
    this.help = { open: () => this.tapRole('help') }
  }

  // --- role/name resolution (runtime) --------------------------------------

  private roleId(role: ActionRole): TestId {
    const testId = (this.spec as unknown as Record<string, TestId | undefined>)[role]
    if (!testId) {
      throw new Error(`Screen has no "${role}" role declared in its descriptor`)
    }
    return testId
  }

  private namedId(group: 'links' | 'inputs' | 'elements', name: string): TestId {
    const map = (this.spec as unknown as Record<string, Record<string, TestId> | undefined>)[group]
    const testId = map?.[name]
    if (!testId) {
      throw new Error(`Screen has no "${name}" entry under "${group}" in its descriptor`)
    }
    return testId
  }

  private anyNamedId(name: string): TestId {
    const s = this.spec as ScreenSpec
    const testId = s.elements?.[name] ?? s.links?.[name] ?? s.inputs?.[name]
    if (!testId) {
      throw new Error(`Screen has no named target "${name}" (searched elements, links, inputs)`)
    }
    return testId
  }

  private async tapRole(role: ActionRole): Promise<void> {
    await this.engine.tapByTestId(resolveTestId(this.roleId(role)))
  }

  // --- public API ----------------------------------------------------------

  /** Assert the screen is mounted by waiting for `self` (or `primary` when `self` is omitted). */
  async expectVisible(timeout?: number): Promise<void> {
    const target = this.spec.self ?? this.spec.primary
    if (!target) {
      throw new Error('Screen declares neither "self" nor "primary"; cannot expectVisible()')
    }
    await this.engine.waitForDisplayed(resolveTestId(target), timeout)
  }

  /** Tap a declared role. Only roles the descriptor declares type-check. */
  async tap(role: PresentRoles<S>): Promise<void> {
    await this.tapRole(role as ActionRole)
  }

  /** Wait until a declared role is enabled, then tap it. */
  async tapWhenEnabled(role: PresentRoles<S>, timeout?: number): Promise<void> {
    await this.engine.waitForEnabledAndTap(resolveTestId(this.roleId(role as ActionRole)), timeout)
  }

  /** Tap a named link. */
  async link(name: LinkKeys<S>): Promise<void> {
    await this.engine.tapByTestId(resolveTestId(this.namedId('links', name)))
  }

  /** Scroll a named link into view (no tap). */
  async scrollToLink(name: LinkKeys<S>, maxScrolls?: number, directions?: 'down' | 'both'): Promise<void> {
    await this.engine.scrollToTestId(resolveTestId(this.namedId('links', name)), maxScrolls, directions)
  }

  /** Type into a named input. */
  async fill(name: InputKeys<S>, value: string, options?: EnterTextOptions): Promise<void> {
    await this.engine.enterText(resolveTestId(this.namedId('inputs', name)), value, options)
  }

  /** Read the visible text of a named element. */
  async read(name: ElementKeys<S>, timeout?: number): Promise<string> {
    return this.engine.getTextByTestId(resolveTestId(this.namedId('elements', name)), timeout)
  }

  /** True if a named target (element, link, or input) is currently displayed; never throws. */
  async isVisible(name: NamedKeys<S>): Promise<boolean> {
    return new RawElement(this.engine, this.anyNamedId(name)).isVisible()
  }

  /** Escape hatch: operate on a raw testID this descriptor does not model. */
  el(raw: TestId): RawElement {
    return new RawElement(this.engine, raw)
  }
}

/**
 * Define a screen from a role → testID descriptor.
 *
 * The `const` type parameter preserves literal role/link/input/element keys, which gives
 * autocomplete on the returned {@link Screen} and turns an undeclared role into a **compile-time**
 * error (e.g. `tap('menu')` on a screen with no `menu`). The return type also gates the `back` /
 * `help` namespaces on the declared roles (see {@link RoleNamespaces}), so `screen.back.tap()` only
 * compiles when the descriptor declares `back`.
 *
 * ```ts
 * export const OnboardingIntroScreen = defineScreen({
 *   self: bcsc('Continue'),
 *   primary: bcsc('Continue'),
 *   secondary: bcsc('LearnMore'),
 * })
 * ```
 */
export function defineScreen<const S extends ScreenSpec>(
  spec: S
): Omit<Screen<S>, 'back' | 'help'> & RoleNamespaces<S> {
  return new Screen<S>(spec) as unknown as Omit<Screen<S>, 'back' | 'help'> & RoleNamespaces<S>
}
