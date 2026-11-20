import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { run } from './cli.ts'
import { groups } from './commands.ts'
import type { CommandSpec, GroupSpec, Io } from './spec.ts'

const invoke = async (argv: string[], groupsOverride?: GroupSpec[]) => {
  let stdout = ''
  let stderr = ''
  const io: Io = { stdout: (t) => (stdout += t), stderr: (t) => (stderr += t), isTTY: false }
  const code = await run(argv, { io, env: {}, groups: groupsOverride })
  return { code, stdout, stderr }
}

// Pinned by hand so un-wiring a command fails the suite instead of silently flipping the expectations below.
const SHIPPED = new Set(['auth login', 'auth status', 'auth token', 'auth switch', 'auth logout'])
const isShipped = (group: GroupSpec, command: CommandSpec): boolean => SHIPPED.has(`${group.name} ${command.name}`)

describe('shipped commands', () => {
  it('are exactly the commands with a handler', () => {
    const withHandler = groups.flatMap((g) => g.commands.filter((c) => c.handler).map((c) => `${g.name} ${c.name}`))
    assert.deepEqual(withHandler.sort(), [...SHIPPED].sort())
  })
})

// Positionals that satisfy each command's declared args, so stubs are reached with valid input.
const sampleArgs = (count: number) => Array.from({ length: count }, () => 'NCNF-ZNTB')

describe('root help', () => {
  for (const argv of [[], ['--help'], ['help']]) {
    it(`renders for ${JSON.stringify(argv)} and exits 0`, async () => {
      const { code, stdout } = await invoke(argv)
      assert.equal(code, 0)
      assert.match(stdout, /^USAGE$/m)
      assert.match(stdout, /^CORE COMMANDS$/m)
      for (const group of groups) {
        const shipped = group.commands.some((c) => isShipped(group, c))
        assert.match(stdout, new RegExp(`^  ${group.name}:\\s+${shipped ? group.summary : 'not implemented'}$`, 'm'))
      }
    })
  }

  it('renders each help topic', async () => {
    for (const topic of ['environment', 'exit-codes', 'formatting']) {
      const { code, stdout } = await invoke(['help', topic])
      assert.equal(code, 0)
      assert.ok(stdout.length > 0)
    }
  })
})

describe('unknown input', () => {
  it('rejects an unknown command with exit 1', async () => {
    const { code, stderr } = await invoke(['nope'])
    assert.equal(code, 1)
    assert.match(stderr, /unknown command "nope" for "bcsc-test"/)
  })

  it('rejects an unknown subcommand with exit 1', async () => {
    const { code, stderr } = await invoke(['card', 'shred'])
    assert.equal(code, 1)
    assert.match(stderr, /unknown command "shred" for "bcsc-test card"/)
  })

  it('rejects an unknown flag before reaching the stub', async () => {
    const { code, stderr } = await invoke(['card', 'suspend', 'NCNF-ZNTB', '--bogus'])
    assert.equal(code, 1)
    assert.doesNotMatch(stderr, /not implemented/)
  })
})

for (const group of groups) {
  describe(group.name, () => {
    it('renders group help for the bare group and --help', async () => {
      for (const argv of [[group.name], [group.name, '--help'], ['help', group.name]]) {
        const { code, stdout } = await invoke(argv)
        assert.equal(code, 0)
        assert.match(stdout, /^AVAILABLE COMMANDS$/m)
        if (group.commands.some((c) => isShipped(group, c))) assert.doesNotMatch(stdout, /^not implemented$/m)
        for (const command of group.commands) {
          assert.match(
            stdout,
            new RegExp(
              `^  ${command.name}:\\s+${isShipped(group, command) ? command.summary : 'not implemented'}$`,
              'm'
            )
          )
        }
      }
    })

    for (const command of group.commands) {
      it(`${command.name} --help lists usage, flags and a runnable example`, async () => {
        const { code, stdout } = await invoke([group.name, command.name, '--help'])
        assert.equal(code, 0)
        if (isShipped(group, command)) {
          assert.match(stdout, new RegExp(`^${command.description.split('\n')[0]}$`, 'm'))
          assert.doesNotMatch(stdout, /^not implemented$/m)
        } else {
          assert.match(stdout, /^not implemented$/m)
        }
        assert.match(stdout, new RegExp(`^  bcsc-test ${group.name} ${command.name}`, 'm'))
        assert.match(stdout, new RegExp(`^  \\$ .*bcsc-test ${group.name} ${command.name}`, 'm'))
        for (const flag of command.flags) assert.match(stdout, new RegExp(`--${flag.name}\\b`))
      })

      if (!isShipped(group, command)) {
        it(`${command.name} prints "not implemented" and exits 1`, async () => {
          const { code, stdout, stderr } = await invoke([group.name, command.name, ...sampleArgs(command.args.length)])
          assert.equal(code, 1)
          assert.equal(stderr, 'not implemented\n')
          assert.equal(stdout, '')
        })
      }
    }
  })
}

describe('implemented commands', () => {
  const withHandler: GroupSpec[] = [
    {
      ...groups[0],
      commands: [{ ...groups[0].commands[0], handler: async ({ io }) => (io.stdout('ran\n'), 0) }],
    },
  ]

  it('shows the real summary instead of "not implemented"', async () => {
    const { stdout } = await invoke([], withHandler)
    assert.match(stdout, new RegExp(`^  auth:\\s+${groups[0].summary}$`, 'm'))
  })

  it('runs the handler', async () => {
    const { code, stdout } = await invoke(['auth', 'login'], withHandler)
    assert.equal(code, 0)
    assert.equal(stdout, 'ran\n')
  })
})
