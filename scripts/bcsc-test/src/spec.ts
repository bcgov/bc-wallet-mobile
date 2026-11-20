export interface Io {
  stdout: (text: string) => void
  stderr: (text: string) => void
  /** Standard input is a terminal, so prompts can be answered. */
  isTTY: boolean
  /** Standard output is a terminal, so JSON is pretty-printed. */
  stdoutIsTTY?: boolean
}

export type FlagValue = string | boolean | undefined

export interface FlagSpec {
  name: string
  short?: string
  /** Placeholder shown in help for a string flag, e.g. `host`; a boolean flag omits it. */
  value?: string
  description: string
}

export interface ArgSpec {
  name: string
  description: string
}

export interface Example {
  comment: string
  command: string
}

export interface HandlerContext {
  args: Record<string, string>
  flags: Record<string, FlagValue>
  env: NodeJS.ProcessEnv
  io: Io
}

export interface CommandSpec {
  name: string
  summary: string
  description: string
  args: ArgSpec[]
  flags: FlagSpec[]
  examples: Example[]
  /** Fields accepted by `--json`; listed under JSON FIELDS in help. */
  jsonFields?: string[]
  /** Absent until the command ships; help shows it as `not implemented` and running it exits 1. */
  handler?: (ctx: HandlerContext) => Promise<number>
}

export interface GroupSpec {
  name: string
  summary: string
  description: string
  commands: CommandSpec[]
}

export interface HelpTopic {
  name: string
  summary: string
  body: string
}
