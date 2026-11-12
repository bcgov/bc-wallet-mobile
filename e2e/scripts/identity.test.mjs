/**
 * A journey's card holder (src/support/identity.ts): which source answers, what a mint sends, what the
 * holder carries and how it is masked. A fake host stands in for the test API; every value is made up.
 */
import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { TestUsers } from '../src/constants.ts'
import { personaLabel, redactSensitiveText } from '../src/helpers/redact.ts'
import { arrangeTestUser, identitySource } from '../src/support/identity.ts'

const ENV_KEYS = [
  'E2E_IDENTITY_SOURCE',
  'GITHUB_RUN_ID',
  'IAS_TEST_API_HOST',
  'IAS_TEST_API_CLIENT_ID',
  'IAS_TEST_API_CLIENT_SECRET',
]
/** The masks the evidence metadata serves for the two documents a holder types. */
const LICENCE_MASK = /^[0-9]{5,10}$/
const PASSPORT_MASK = /^[A-Z0-9]{5,10}$/

let saved = {}
let hosts = 0

// The client caches a token per host, so every test talks to a host of its own.
beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))
  process.env.E2E_IDENTITY_SOURCE = 'api'
  process.env.GITHUB_RUN_ID = '4242'
  process.env.IAS_TEST_API_HOST = `https://ias-${++hosts}.test`
  process.env.IAS_TEST_API_CLIENT_ID = 'e2e.unit.test.client'
  process.env.IAS_TEST_API_CLIENT_SECRET = 'not-a-real-secret'
})
afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
  delete globalThis.driver
})

const json = (status, body) => new Response(JSON.stringify(body), { status })

/**
 * Stand in for the test API: a token for the asking, and a card (`C00000001`, `C00000002`, ...) per
 * mint request, issued under the birthdate asked for unless `issue` says otherwise.
 */
function fakeApi(t, issue = (request, serial) => ({ csn: serial, birthDate: request.birthDate, transactionId: 'tx' })) {
  const api = { calls: 0, mints: [] }
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    api.calls += 1
    if (new URL(url).pathname === '/oauth2/token') {
      return json(200, { access_token: 'token', token_type: 'Bearer', expires_in: 3599, scope: 'test-idv-accounts' })
    }
    const request = JSON.parse(init.body)
    api.mints.push(request)
    return json(200, issue(request, `C${String(api.mints.length).padStart(8, '0')}`))
  })
  return api
}

/** Whole years between a `YYYY-MM-DD` date and today. */
function ageOf(birthDate) {
  const [year, month, day] = birthDate.split('-').map(Number)
  const now = new Date()
  const hadBirthday = now.getUTCMonth() + 1 > month || (now.getUTCMonth() + 1 === month && now.getUTCDate() >= day)
  return now.getUTCFullYear() - year - (hadBirthday ? 0 : 1)
}

// --- source -----------------------------------------------------------------------------------------

test('the fixed personas answer unless the run says api', async (t) => {
  const api = fakeApi(t)
  for (const source of [undefined, '', 'personas', ' Personas ']) {
    if (source === undefined) delete process.env.E2E_IDENTITY_SOURCE
    else process.env.E2E_IDENTITY_SOURCE = source
    assert.equal(identitySource(), 'personas')
    assert.equal(await arrangeTestUser('photo'), TestUsers.photo)
    assert.equal(await arrangeTestUser('na'), TestUsers.na)
  }
  assert.equal(api.calls, 0)
})

test('an unknown source is refused rather than guessed', async (t) => {
  const api = fakeApi(t)
  process.env.E2E_IDENTITY_SOURCE = 'sit'
  assert.throws(() => identitySource(), /use api or personas/)
  await assert.rejects(arrangeTestUser('photo'), /use api or personas/)
  assert.equal(api.calls, 0)
})

// --- what a mint sends ------------------------------------------------------------------------------

test('a mint sends the name, gender and birthdate the journey will type, under a surname of its own', async (t) => {
  const api = fakeApi(t)
  const first = await arrangeTestUser('photo')
  const second = await arrangeTestUser('photo')

  const [request, another] = api.mints
  assert.deepEqual(
    { ...request, surname: '<surname>' },
    {
      cardType: 'STANDALONE',
      surname: '<surname>',
      givenName1: 'SHAGGY',
      gender: 'M',
      birthDate: '1998-11-14',
      groupingLabel: 'e2e-4242',
    }
  )
  assert.match(request.surname, /^AUTOTEST[A-Z]{8}$/)
  assert.notEqual(request.surname, another.surname)

  assert.deepEqual(first, {
    username: 'e2e_shaggy',
    firstName: 'SHAGGY',
    lastName: request.surname,
    dob: '19981114',
    cardSerial: 'C00000001',
    cardScanImage: 'images/dl_shaggy.jpg',
    selfieImage: 'images/id_shaggy.jpg',
    flow: 'photo',
  })
  assert.equal(second.cardSerial, 'C00000002')
  assert.equal(second.lastName, another.surname)
})

test('each card type takes its own verify path', async (t) => {
  const api = fakeApi(t)
  const combined = await arrangeTestUser('combined')
  const nonPhoto = await arrangeTestUser('nonPhoto')

  assert.deepEqual(
    api.mints.map((request) => request.cardType),
    ['COMBO', 'NONPHOTO']
  )
  assert.equal(combined.flow, 'photo')
  assert.equal(combined.cardScanImage, 'images/dl_velma.jpg')
  assert.equal(nonPhoto.flow, 'non-photo')
  assert.equal(nonPhoto.documentTypeId, '12')
  assert.match(nonPhoto.documentNumber, PASSPORT_MASK)
})

test('a minor is minted under a birthdate of its own, not the 16 to 80 the API would pick', async (t) => {
  const api = fakeApi(t)
  const minor = await arrangeTestUser('u12')

  const [{ cardType, birthDate }] = api.mints
  assert.equal(cardType, 'STANDALONE')
  assert.equal(ageOf(birthDate), 6)
  assert.equal(minor.dob, birthDate.replaceAll('-', ''))
  assert.equal(minor.flow, 'photo')
})

test('a holder without a card is generated, not minted', async (t) => {
  const api = fakeApi(t)
  const first = await arrangeTestUser('na')
  const second = await arrangeTestUser('na')

  assert.equal(api.calls, 0)
  assert.equal(first.flow, 'non-bcsc')
  assert.equal(first.cardSerial, 'N/A')
  assert.equal(first.firstName, 'FRED')
  assert.match(first.lastName, /^AUTOTEST[A-Z]{8}$/)
  assert.equal(first.dob, '19680918')
  assert.deepEqual([first.primaryDocumentTypeId, first.documentTypeId], ['18', '12'])
  assert.match(first.primaryDocumentNumber, LICENCE_MASK)
  assert.match(first.documentNumber, PASSPORT_MASK)
  assert.notEqual(first.lastName, second.lastName)
  assert.notEqual(first.primaryDocumentNumber, second.primaryDocumentNumber)
})

test('a card issued under another birthdate is refused without quoting either date', async (t) => {
  fakeApi(t, (request, serial) => ({ csn: serial, birthDate: '1970-01-01' }))
  const error = await arrangeTestUser('photo').catch((caught) => caught)

  assert.match(error.message, /issued the photo card under another birthdate/)
  assert.ok(!error.message.includes('1970') && !error.message.includes('1998'))
})

test('the grouping label names the workflow run or the local user, then the platform', async (t) => {
  const api = fakeApi(t)

  globalThis.driver = { isIOS: true }
  await arrangeTestUser('photo')
  delete process.env.GITHUB_RUN_ID
  globalThis.driver = { isIOS: false }
  await arrangeTestUser('photo')

  const [inCi, local] = api.mints.map((request) => request.groupingLabel)
  assert.equal(inCi, 'e2e-4242-ios')
  assert.match(local, /^e2e-local-[a-z0-9-]+-android$/)
})

// --- masking ----------------------------------------------------------------------------------------

test('a minted holder is masked and labelled like a persona', async (t) => {
  fakeApi(t)
  const card = await arrangeTestUser('nonPhoto')
  const cardless = await arrangeTestUser('na')

  const shown = redactSensitiveText(
    `Name: ${card.lastName}, ${card.firstName} | ${card.cardSerial} | ${card.dob} | ${card.documentNumber} | ` +
      `${cardless.lastName.toLowerCase()} ${cardless.primaryDocumentNumber} ${cardless.documentNumber}`
  )
  for (const value of [
    card.lastName,
    card.firstName,
    card.cardSerial,
    card.dob,
    card.documentNumber,
    cardless.lastName.toLowerCase(),
    cardless.primaryDocumentNumber,
    cardless.documentNumber,
  ]) {
    assert.ok(!shown.includes(value), `a minted value survived the redaction: ${shown}`)
  }
  assert.match(shown, /^Name: <minted>, <minted> \| <minted> \| <minted> \| <minted> \| /)

  assert.equal(personaLabel({ cardSerialNumber: card.cardSerial.toLowerCase() }), 'minted')
  assert.equal(
    personaLabel({ cardSerialNumber: 'N/A', surname: cardless.lastName, firstName: cardless.firstName }),
    'minted'
  )
  // The personas and strangers keep their labels.
  assert.equal(personaLabel({ cardSerialNumber: TestUsers.photo.cardSerial }), 'photo')
  assert.equal(personaLabel({ cardSerialNumber: 'N/A', surname: 'Jones', firstName: 'Fred' }), 'na')
  assert.equal(personaLabel({ cardSerialNumber: 'N/A', surname: cardless.lastName, firstName: 'Velma' }), 'foreign')
  assert.equal(personaLabel({ cardSerialNumber: 'Z99999999' }), 'foreign')
})
