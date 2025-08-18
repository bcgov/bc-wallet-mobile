/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('fs')
const path = require('path')
const { getIndyLedgers, IndyLedger, writeIndyLedgersToFile } = require('@bifold/core/lib/commonjs/utils/ledger')

const LEDGERS_JSON_FILE = 'app/src/configs/ledgers/indy/ledgers.json'

const fileSystem = {
  writeFile: (filePath, data) => fs.writeFileSync(filePath, data, 'utf8'),
  readFile: (filePath) => fs.readFileSync(filePath, 'utf8'),
  fileExists: (filePath) => fs.existsSync(filePath),
  pathResolve: (filePath) => path.resolve(filePath),
}

/**
 * Main function to refresh Indy ledgers and write them to a file.
 *
 * @returns {*} {Promise<void>}
 */
async function main() {
  const indyLedgers = [
    { ledgerId: IndyLedger.BCOVRIN_TEST, isProduction: false },
    { ledgerId: IndyLedger.CANDY_DEV_NETWORK, isProduction: false },
    { ledgerId: IndyLedger.CANDY_TEST_NETWORK, isProduction: false },
    { ledgerId: IndyLedger.CANDY_PRODUCTION_NETWORK, isProduction: true },
  ]

  console.log(`Fetching Indy ledgers: [${indyLedgers.map((ledger) => ledger.ledgerId)}]`)

  const ledgers = await getIndyLedgers(indyLedgers)

  console.log(
    'Fetched Indy ledgers: ',
    ledgers.map((ledger) => ({ ...ledger, genesisTransactions: '<JSON TOO LARGE>' }))
  )

  console.log(`Writing Indy ledgers to file '${LEDGERS_JSON_FILE}'...`)
  writeIndyLedgersToFile(fileSystem, LEDGERS_JSON_FILE, ledgers)
}

main()
