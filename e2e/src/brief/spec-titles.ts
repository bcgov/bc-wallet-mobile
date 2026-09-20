import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Titles read straight from a spec's source — what the brief holds JUnit results against. */

export interface SpecTitles {
  /** `it` titles in file order. */
  its: string[]
  describes: string[]
}

const E2E_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const cache = new Map<string, SpecTitles | undefined>()

/** `it('…')` / `describe("…")` titles in a spec source, in order, with the quote escapes undone. */
export function titlesIn(source: string): SpecTitles {
  const its: string[] = []
  const describes: string[] = []
  const pattern = /\b(it|describe)(?:\.(?:skip|only))?\(\s*(['"`])((?:\\[\s\S]|(?!\2)[^\\])*)\2/g
  for (const match of source.matchAll(pattern)) {
    const title = match[3].replace(/\\(['"`\\])/g, '$1')
    ;(match[1] === 'it' ? its : describes).push(title)
  }
  return { its, describes }
}

/** The titles of a spec path relative to e2e/, or undefined when it is not on disk. Cached per process. */
export function specTitles(file: string): SpecTitles | undefined {
  if (!cache.has(file)) {
    const path = join(E2E_ROOT, file)
    cache.set(file, existsSync(path) ? titlesIn(readFileSync(path, 'utf8')) : undefined)
  }
  return cache.get(file)
}
