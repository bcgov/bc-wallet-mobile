/**
 * Selectors for elements the testID registry cannot reach: labels on components with no id (contact
 * rows, the notification-status row) and text swallowed by `accessible={true}` containers, which iOS
 * flattens into a single element whose label CONCATENATES the children (`ListButton` rows — their
 * ON/OFF endAdornments have no id and, on iOS, no element of their own).
 */

/** Escape a value for embedding in a quoted iOS predicate (mirrors `BaseScreen`'s private helper). */
function escapePredicateValue(value: string): string {
  const backslash = String.fromCodePoint(0x5c)
  const doubleQuote = String.fromCodePoint(0x22)
  return value.replaceAll(backslash, `${backslash}${backslash}`).replaceAll(doubleQuote, `${backslash}${doubleQuote}`)
}

/**
 * Find an element by its accessibility LABEL — for label-only elements like `ContactRow`
 * (`accessibilityLabel={name}`, no testID). Android maps the label to content-desc (the `~` strategy);
 * iOS needs a predicate, since `~` there matches the accessibility IDENTIFIER, which these lack.
 */
export function findByA11yLabel(label: string) {
  return driver.isIOS ? $(`-ios predicate string:label == "${escapePredicateValue(label)}"`) : $(`~${label}`)
}

/**
 * Does a `ListButton`-style row currently show `word` (e.g. 'ON'/'OFF') among its children?
 *
 * Android reads the real view tree, so the adornment is a child TextView under the row's resource-id.
 * iOS only has the flattened row element — its DERIVED label concatenates the children's text — so the
 * word is matched inside that label, on word boundaries ('ON' must not match 'ONLY').
 */
export async function rowShowsWord(rowTestId: string, word: string): Promise<boolean> {
  if (driver.isIOS) {
    const row = $(`~${rowTestId}`)
    try {
      const label = (await row.getAttribute('label')) ?? ''
      return new RegExp(`\\b${word}\\b`).test(label)
    } catch {
      return false
    }
  }
  const child = $(`android=new UiSelector().resourceId("${rowTestId}").childSelector(new UiSelector().text("${word}"))`)
  return child.isExisting()
}
