export function isSauceLabs(): boolean {
  return !!browser.options?.['user'] && !!browser.options?.['key']
}

export async function annotate(message: string) {
  if (isSauceLabs()) {
    await browser.execute(`sauce:context=${message}`)
  }
}
