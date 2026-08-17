import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const {
  OBJECT_STORAGE_ENDPOINT,
  OBJECT_STORAGE_OBJECT_ID,
  OBJECT_STORAGE_BASIC_AUTH_USERNAME,
  OBJECT_STORAGE_BASIC_AUTH_PASSWORD,
} = process.env

if (
  !OBJECT_STORAGE_ENDPOINT ||
  !OBJECT_STORAGE_OBJECT_ID ||
  !OBJECT_STORAGE_BASIC_AUTH_USERNAME ||
  !OBJECT_STORAGE_BASIC_AUTH_PASSWORD
) {
  console.error('[push-remote-config] Missing required environment variables.')
  process.exit(1)
}

async function push() {
  const filePath = path.resolve(__dirname, '../remote-config-defaults.json')
  const fileContent = fs.readFileSync(filePath)
  const authorization = Buffer.from(
    `${OBJECT_STORAGE_BASIC_AUTH_USERNAME}:${OBJECT_STORAGE_BASIC_AUTH_PASSWORD}`
  ).toString('base64')

  try {
    const response = await fetch(`${OBJECT_STORAGE_ENDPOINT}/object/${OBJECT_STORAGE_OBJECT_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authorization}`,
      },
      body: fileContent,
    })

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    }

    console.log('[push-remote-config] Successfully pushed remote-config-defaults.json to Object Storage.')
  } catch (error) {
    console.error('[push-remote-config] Failed to push to Object Storage:', error)
    process.exit(1)
  }
}

push()
