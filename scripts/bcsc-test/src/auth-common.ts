import type { HandlerContext } from './spec.ts'

export const stringFlag = (ctx: HandlerContext, name: string): string | undefined => {
  const value = ctx.flags[name]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export const describeExpiry = (expiresAt: number | undefined): string => {
  if (expiresAt === undefined) return 'unknown'
  const minutes = Math.round((expiresAt * 1000 - Date.now()) / 60_000)
  const relative = minutes >= 0 ? `in ${minutes} min` : `${-minutes} min ago`
  return `${new Date(expiresAt * 1000).toISOString()} (${relative})`
}
