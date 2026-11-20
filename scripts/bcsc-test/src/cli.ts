import { parseArgs } from 'node:util'
import { groups as defaultGroups } from './commands.ts'
import { ExitCode } from './exit-codes.ts'
import {
  BIN,
  commandUsage,
  NOT_IMPLEMENTED,
  renderCommandHelp,
  renderGroupHelp,
  renderRootHelp,
  renderTopic,
} from './help.ts'
import type { CommandSpec, FlagValue, GroupSpec, Io } from './spec.ts'
import { topics } from './topics.ts'

export const VERSION = '0.1.0'

interface RunOptions {
  io: Io
  env: NodeJS.ProcessEnv
  groups?: GroupSpec[]
}

const unknownCommand = (io: Io, name: string, parent: string, available: string[]): number => {
  io.stderr(
    `unknown command "${name}" for "${parent}"\n\nAvailable commands:\n${available.map((n) => `  ${n}`).join('\n')}\n`
  )
  return ExitCode.failure
}

const runHelpCommand = (io: Io, groups: GroupSpec[], argv: string[]): number => {
  const [first, second] = argv
  if (!first) {
    io.stdout(renderRootHelp(groups, topics))
    return ExitCode.ok
  }
  const topic = topics.find((t) => t.name === first)
  if (topic) {
    io.stdout(renderTopic(topic))
    return ExitCode.ok
  }
  const group = groups.find((g) => g.name === first)
  if (!group) {
    return unknownCommand(io, first, `${BIN} help`, [...groups.map((g) => g.name), ...topics.map((t) => t.name)])
  }
  if (!second) {
    io.stdout(renderGroupHelp(group))
    return ExitCode.ok
  }
  const command = group.commands.find((c) => c.name === second)
  if (!command) {
    return unknownCommand(
      io,
      second,
      `${BIN} ${group.name}`,
      group.commands.map((c) => c.name)
    )
  }
  io.stdout(renderCommandHelp(group, command))
  return ExitCode.ok
}

const runCommand = async (
  group: GroupSpec,
  command: CommandSpec,
  argv: string[],
  { io, env }: RunOptions
): Promise<number> => {
  const usage = `\nUsage:  ${commandUsage(group, command)}\n`
  let parsed: ReturnType<typeof parseArgs>
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: Object.fromEntries(
        command.flags.map((flag) => [
          flag.name,
          { type: flag.value ? ('string' as const) : ('boolean' as const), ...(flag.short && { short: flag.short }) },
        ])
      ),
    })
  } catch (error) {
    io.stderr(`${(error as Error).message}\n${usage}`)
    return ExitCode.failure
  }

  if (!command.handler) {
    io.stderr(`${NOT_IMPLEMENTED}\n`)
    return ExitCode.failure
  }

  if (parsed.positionals.length !== command.args.length) {
    io.stderr(`expected ${command.args.length} argument(s), got ${parsed.positionals.length}\n${usage}`)
    return ExitCode.failure
  }
  const args = Object.fromEntries(command.args.map((arg, i) => [arg.name, parsed.positionals[i]]))
  // No option sets `multiple`, so parseArgs never yields arrays.
  return command.handler({ args, flags: parsed.values as Record<string, FlagValue>, env, io })
}

const runGroup = (group: GroupSpec, argv: string[], options: RunOptions): Promise<number> | number => {
  const { io } = options
  const [name, ...rest] = argv
  if (name === undefined || name === '--help') {
    io.stdout(renderGroupHelp(group))
    return ExitCode.ok
  }
  const command = group.commands.find((c) => c.name === name)
  if (!command) {
    return unknownCommand(
      io,
      name,
      `${BIN} ${group.name}`,
      group.commands.map((c) => c.name)
    )
  }
  if (rest.includes('--help')) {
    io.stdout(renderCommandHelp(group, command))
    return ExitCode.ok
  }
  return runCommand(group, command, rest, options)
}

const unknownTopLevel = (io: Io, name: string, groups: GroupSpec[]): number => {
  if (name.startsWith('-')) {
    io.stderr(`unknown flag: ${name}\n\nUsage:  ${BIN} <command> <subcommand> [flags]\n`)
    return ExitCode.failure
  }
  return unknownCommand(
    io,
    name,
    BIN,
    groups.map((g) => g.name)
  )
}

/** Runs one CLI invocation and returns its exit code; never calls process.exit. */
export const run = async (argv: string[], options: RunOptions): Promise<number> => {
  const { io } = options
  const groups = options.groups ?? defaultGroups
  const [first, ...rest] = argv

  if (first === undefined || first === '--help') {
    io.stdout(renderRootHelp(groups, topics))
    return ExitCode.ok
  }
  if (first === '--version') {
    io.stdout(`${BIN} version ${VERSION}\n`)
    return ExitCode.ok
  }
  if (first === 'help') {
    return runHelpCommand(io, groups, rest)
  }
  const group = groups.find((g) => g.name === first)
  return group ? runGroup(group, rest, options) : unknownTopLevel(io, first, groups)
}
