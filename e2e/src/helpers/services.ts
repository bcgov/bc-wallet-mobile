import { bcsc } from '../screens/core/appId.js'
import { TestIds } from '../test-ids/registry.js'

/**
 * Selectors for the Services catalogue rows, whose testIDs are NAME-DERIVED (`ServiceButton-<title
 * minus whitespace>` / `ServiceButton-Bookmark-<...>`, `ServiceButton.tsx`). Names come from live SIT
 * catalogue data; the one name the suite can rely on is the demo RP `fetchPairingCode()` returns.
 *
 * Platform split, forced by the app: each row is a `ListButton` with `accessible={true}`, so iOS
 * flattens the row into ONE a11y element (label = the title with NBSP for spaces, per `a11yLabel`)
 * and the inner testIDs above are unreachable there — they are ANDROID-ONLY selectors, while iOS
 * drives rows by label (`serviceRowLabel`) and cannot reach the in-row bookmark toggle at all
 * (bookmark via the PairingConfirmation button instead).
 */

const ROW_PREFIX = bcsc(TestIds.main.services.serviceRowPrefix)
const BOOKMARK_PREFIX = bcsc(TestIds.main.services.serviceBookmarkPrefix)

/** `title.replaceAll(/\s+/g, '')` — mirror of the app's id mangling (punctuation survives). */
const mangleServiceName = (title: string): string => title.replaceAll(/\s+/g, '')

/** Full resource-id of a catalogue row's title text (Android-only — see module doc). */
export const serviceRowId = (title: string): string => `${ROW_PREFIX}${mangleServiceName(title)}`

/** Full resource-id of a catalogue row's bookmark toggle (Android-only — see module doc). */
export const serviceBookmarkId = (title: string): string => `${BOOKMARK_PREFIX}${mangleServiceName(title)}`

/** The flattened row's a11y label: the title with every space swapped for NBSP (`a11yLabel`). */
export const serviceRowLabel = (title: string): string => title.replaceAll(' ', '\u00A0')

/** A found catalogue row. The id's suffix is the MANGLED name — the stripping is not reversible. */
export interface ServiceRow {
  id: string
  mangledName: string
}

/** The bookmark toggle's id for a row found by {@link listServiceRows}. */
export const bookmarkIdForRow = (row: ServiceRow): string => `${BOOKMARK_PREFIX}${row.mangledName}`

/**
 * The catalogue rows currently rendered, in on-screen order — Android only (iOS hides the ids;
 * callers platform-guard). Reads each row's own resource-id, so it works with zero knowledge of SIT
 * data: `rows[0]` is the top-sort assert, and any row round-trips into {@link bookmarkIdForRow}.
 */
export async function listServiceRows(): Promise<ServiceRow[]> {
  if (driver.isIOS) {
    throw new Error('listServiceRows is Android-only: iOS flattens ServiceButton ids out of the a11y tree')
  }
  // Java regex (UiSelector): escape the prefix's dots, then a lookahead drops the bookmark toggles.
  const escapedPrefix = ROW_PREFIX.replaceAll('.', '\\.')
  const elements = await $$(`android=new UiSelector().resourceIdMatches("${escapedPrefix}(?!Bookmark-).+")`)
  const rows: ServiceRow[] = []
  for (const el of elements) {
    const id = (await el.getAttribute('resource-id')) ?? ''
    if (!id.startsWith(ROW_PREFIX)) continue
    rows.push({ id, mangledName: id.slice(ROW_PREFIX.length) })
  }
  return rows
}
