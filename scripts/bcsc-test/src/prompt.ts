import { createInterface } from 'node:readline/promises'
import { Writable } from 'node:stream'
import { text } from 'node:stream/consumers'

/** Prompts go to stderr so stdout stays clean for piping. */
export const ask = async (question: string): Promise<string> => {
  const rl = createInterface({ input: process.stdin, output: process.stderr })
  try {
    return (await rl.question(question)).trim()
  } finally {
    rl.close()
  }
}

/** Like `ask`, but the typed characters are not echoed. */
export const askSecret = async (question: string): Promise<string> => {
  const silent = new Writable({ write: (_chunk, _encoding, done) => done() })
  const rl = createInterface({ input: process.stdin, output: silent, terminal: true })
  process.stderr.write(question)
  try {
    return await rl.question('')
  } finally {
    rl.close()
    process.stderr.write('\n')
  }
}

/** Reads all of standard input, dropping one trailing newline. */
export const readStdin = async (): Promise<string> => (await text(process.stdin)).replace(/\r?\n$/, '')
