import type { CommandSpec, FlagSpec, GroupSpec, HelpTopic } from './spec.ts'

export const BIN = 'bcsc-test'
export const NOT_IMPLEMENTED = 'not implemented'

const ROOT_DESCRIPTION = 'Drive BCSC test devices through the IAS mobile E2E test API.'

export const isImplemented = (command: CommandSpec): boolean => command.handler !== undefined
const groupImplemented = (group: GroupSpec): boolean => group.commands.some(isImplemented)

const commandSummary = (command: CommandSpec): string => (isImplemented(command) ? command.summary : NOT_IMPLEMENTED)
const groupSummary = (group: GroupSpec): string => (groupImplemented(group) ? group.summary : NOT_IMPLEMENTED)

type Row = [string, string]

// gh aligns the description column across every section on the page, not per section.
const renderSections = (sections: Array<[string, Row[]]>): string => {
  const width = Math.max(...sections.flatMap(([, rows]) => rows.map(([name]) => name.length + 1)))
  return sections
    .filter(([, rows]) => rows.length > 0)
    .map(([title, rows]) => {
      const lines = rows.map(([name, text]) => {
        const label = `${name}:`
        return `  ${label.padEnd(width + 2)}${text}`
      })
      return `${title}\n${lines.join('\n')}\n`
    })
    .join('\n')
}

const flagLabel = (flag: FlagSpec): string => {
  const short = flag.short ? `-${flag.short}, ` : '    '
  const value = flag.value ? ` ${flag.value}` : ''
  return `${short}--${flag.name}${value}`
}

const renderFlags = (flags: FlagSpec[]): string => {
  const width = Math.max(...flags.map((flag) => flagLabel(flag).length))
  return flags.map((flag) => `  ${flagLabel(flag).padEnd(width + 3)}${flag.description}`).join('\n')
}

const withStubNotice = (implemented: boolean, description: string): string =>
  implemented ? description : `${NOT_IMPLEMENTED}\n\n${description}`

const INHERITED_FLAGS = 'INHERITED FLAGS\n  --help   Show help for command\n'

const learnMore = (): string =>
  [
    'LEARN MORE',
    `  Use \`${BIN} <command> <subcommand> --help\` for more information about a command.`,
    `  Learn about exit codes using \`${BIN} help exit-codes\``,
    `  Learn about environment variables using \`${BIN} help environment\``,
    '',
  ].join('\n')

export const renderRootHelp = (groups: GroupSpec[], topics: HelpTopic[]): string =>
  [
    `${ROOT_DESCRIPTION}\n`,
    `USAGE\n  ${BIN} <command> <subcommand> [flags]\n`,
    renderSections([
      ['CORE COMMANDS', groups.map((group): Row => [group.name, groupSummary(group)])],
      ['HELP TOPICS', topics.map((topic): Row => [topic.name, topic.summary])],
    ]),
    `FLAGS\n  --help      Show help for command\n  --version   Show bcsc-test version\n`,
    `EXAMPLES\n  $ ${BIN} verification approve NCNF-ZNTB\n  $ ${BIN} mobile-app set-expiry NCNF-ZNTB 2026-11-01T00:00:00-08:00 --dry-run\n  $ ${BIN} auth status\n`,
    learnMore(),
  ].join('\n')

export const renderGroupHelp = (group: GroupSpec): string =>
  [
    `${withStubNotice(groupImplemented(group), group.description)}\n`,
    `USAGE\n  ${BIN} ${group.name} <command> [flags]\n`,
    renderSections([
      ['AVAILABLE COMMANDS', group.commands.map((command): Row => [command.name, commandSummary(command)])],
    ]),
    INHERITED_FLAGS,
    learnMore(),
  ].join('\n')

export const commandUsage = (group: GroupSpec, command: CommandSpec): string => {
  const args = command.args.map((arg) => `<${arg.name}>`).join(' ')
  return [BIN, group.name, command.name, args, '[flags]'].filter(Boolean).join(' ')
}

export const renderCommandHelp = (group: GroupSpec, command: CommandSpec): string => {
  const sections = [
    `${withStubNotice(isImplemented(command), command.description)}\n`,
    `USAGE\n  ${commandUsage(group, command)}\n`,
  ]
  if (command.args.length > 0) {
    const width = Math.max(...command.args.map((arg) => arg.name.length + 2))
    const rows = command.args.map((arg) => {
      const label = `<${arg.name}>`
      return `  ${label.padEnd(width + 3)}${arg.description}`
    })
    sections.push(`ARGUMENTS\n${rows.join('\n')}\n`)
  }
  if (command.flags.length > 0) {
    sections.push(`FLAGS\n${renderFlags(command.flags)}\n`)
  }
  if (command.jsonFields?.length) {
    sections.push(`JSON FIELDS\n  ${command.jsonFields.join(', ')}\n`)
  }
  const examples = command.examples.map((example) => `  # ${example.comment}\n  $ ${example.command}`)
  sections.push(INHERITED_FLAGS, `EXAMPLES\n${examples.join('\n\n')}\n`, learnMore())
  return sections.join('\n')
}

export const renderTopic = (topic: HelpTopic): string => topic.body
