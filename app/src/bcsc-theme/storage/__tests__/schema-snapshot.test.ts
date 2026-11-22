import fs from 'fs'
import path from 'path'
import { z } from 'zod'
import { LATEST } from '../migrations'
import { PERSISTED_KEYS } from '../slices'

// To add a version: bump LATEST, then run this test with STORAGE_SNAPSHOT=write to create the new file
it('stored shapes change only with a new storage version', () => {
  const file = path.join(__dirname, 'schema-snapshots', `s${LATEST}.json`)
  const current = Object.fromEntries(
    PERSISTED_KEYS.map((def) => [
      def.key,
      { backend: def.backend, schema: z.toJSONSchema(def.schema, { unrepresentable: 'any' }) },
    ])
  )
  if (process.env.STORAGE_SNAPSHOT === 'write') {
    // A shipped version's shapes are fixed: changing them needs a new migration, which bumps LATEST
    if (fs.existsSync(file)) {
      throw new Error(`s${LATEST}.json already exists: add a migration to change a stored shape`)
    }
    fs.writeFileSync(file, `${JSON.stringify(current, null, 2)}\n`)
  }
  expect(current).toEqual(JSON.parse(fs.readFileSync(file, 'utf8')))
})
