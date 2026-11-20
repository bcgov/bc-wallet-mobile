import { createNativeRecordReader } from '../legacy/native'

const readerOf = (record: unknown) => createNativeRecordReader(jest.fn().mockResolvedValue(record))

describe('createNativeRecordReader', () => {
  it('passes an ok record through with its value', async () => {
    const value = { access: 'a', refresh: 'r' }
    expect(await readerOf({ status: 'ok', value }).readLegacyRecord('tokens')).toEqual({ status: 'ok', value })
  })

  it.each(['absent', 'locked'])('passes %s through', async (status) => {
    expect(await readerOf({ status }).readLegacyRecord('credential')).toEqual({ status })
  })

  it('keeps the native reason for an unreadable record', async () => {
    expect(
      await readerOf({ status: 'unreadable', reason: 'credential_decode_failed' }).readLegacyRecord('credential')
    ).toEqual({ status: 'unreadable', reason: 'credential_decode_failed' })
  })

  it('treats an ok record without a value as unreadable', async () => {
    expect(await readerOf({ status: 'ok' }).readLegacyRecord('account')).toEqual({
      status: 'unreadable',
      reason: 'ok_without_value',
    })
  })

  it('treats a status it does not know as unreadable', async () => {
    expect(await readerOf({ status: 'maybe' }).readLegacyRecord('account')).toEqual({
      status: 'unreadable',
      reason: 'unknown_status',
    })
  })

  it('turns a rejection into unreadable rather than throwing', async () => {
    const reader = createNativeRecordReader(jest.fn().mockRejectedValue(new TypeError('not a function')))
    expect(await reader.readLegacyRecord('evidence')).toEqual({ status: 'unreadable', reason: 'TypeError' })
  })

  it('asks native for the record by name', async () => {
    const read = jest.fn().mockResolvedValue({ status: 'absent' })
    await createNativeRecordReader(read).readLegacyRecord('savedServices')
    expect(read).toHaveBeenCalledWith('savedServices')
  })
})
