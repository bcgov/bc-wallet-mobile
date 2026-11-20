#!/usr/bin/env node
import { run } from './cli.ts'

process.exitCode = await run(process.argv.slice(2), {
  io: {
    stdout: (text) => process.stdout.write(text),
    stderr: (text) => process.stderr.write(text),
    isTTY: Boolean(process.stdin.isTTY && process.stdout.isTTY),
  },
  env: process.env,
})
