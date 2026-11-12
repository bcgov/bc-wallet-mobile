/**
 * What may reach a remote log (src/helpers/redact.ts): the values masked by name, the shapes masked
 * whoever they belong to, and the label a holder goes by. The minted side is in identity.test.mjs.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { TestUsers } from '../src/constants.ts'
import { personaLabel, redactSensitiveText } from '../src/helpers/redact.ts'

test('persona values are masked whatever their case', () => {
  const { firstName, lastName, cardSerial, dob, username } = TestUsers.photo
  assert.equal(
    redactSensitiveText(`${lastName.toUpperCase()}, ${firstName.toLowerCase()} (${username}) ${cardSerial} ${dob}`),
    '<persona>, <persona> (<persona>) <persona> <persona>'
  )
})

test('a serial, a confirmation code, a long number and an email are masked by shape', () => {
  assert.equal(redactSensitiveText('Serial number: A12345678'), 'Serial number: <serial>')
  assert.equal(redactSensitiveText('Your code is ABCD-2345.'), 'Your code is <code>.')
  assert.equal(redactSensitiveText('PIN 482915, document XY48291573'), 'PIN <digits>, document XY<digits>')
  assert.equal(redactSensitiveText('Sent to someone@example.test today'), 'Sent to <email> today')
})

test('a birthdate is masked however it is written', () => {
  assert.equal(redactSensitiveText('Birthdate: March 9, 2001'), 'Birthdate: <date>')
  assert.equal(redactSensitiveText('born 2001-03-09 or 2001/03/09'), 'born <date> or <date>')
  assert.equal(redactSensitiveText('typed as 20010309'), 'typed as <digits>')
})

test('ordinary screen text is left alone', () => {
  const text = 'Hours of Service | Monday to Friday | 7:30am - 5pm | Step 2 of 5 | Continue'
  assert.equal(redactSensitiveText(text), text)
})

test('a holder is labelled by its serial, a cardless one by its name', () => {
  assert.equal(personaLabel({ cardSerialNumber: ` ${TestUsers.combined.cardSerial.toLowerCase()} ` }), 'combined')
  assert.equal(personaLabel({ cardSerialNumber: 'n/a', surname: 'JONES', firstName: 'fred' }), 'na')
  // A serial decides on its own: the name beside it is not consulted.
  assert.equal(
    personaLabel({ cardSerialNumber: TestUsers.u12.cardSerial, surname: 'Someone', firstName: 'Else' }),
    'u12'
  )
  assert.equal(personaLabel({ cardSerialNumber: 'N/A', surname: 'Jones', firstName: 'Velma' }), 'foreign')
  assert.equal(personaLabel({ cardSerialNumber: 'N/A' }), 'foreign')
  assert.equal(personaLabel({ cardSerialNumber: 'Z99999999' }), 'foreign')
})
