import assert from 'node:assert/strict'
import { it } from 'node:test'
import { confirm } from './confirm.ts'
import type { Io } from './spec.ts'

const io = (isTTY: boolean): Io => ({ stdout: () => {}, stderr: () => {}, isTTY })

it('--yes confirms without prompting', async () => {
  assert.equal(await confirm(io(false), 'Approve?', true), 'confirmed')
})

it('refuses to prompt without a TTY', async () => {
  assert.equal(await confirm(io(false), 'Approve?', false), 'needs-yes')
})
