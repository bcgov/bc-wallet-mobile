// The real module constructs a NativeEventEmitter against a native module
// that doesn't exist in the Jest environment (no device/simulator backing
// it), which throws at import time. Mock the surface NfcScanner.tsx uses.
const NfcManager = {
  isSupported: jest.fn().mockResolvedValue(false),
  start: jest.fn().mockResolvedValue(undefined),
  // Real `requestTechnology` blocks until a tag is tapped or the request is
  // cancelled — it does not resolve on its own. Resolving it immediately (as
  // a naive default mock would) spins NfcScanner's read loop into a tight,
  // unbounded loop of state updates. Tests that need a "tag read" simulate it
  // with `mockResolvedValueOnce`/`mockImplementationOnce` on this mock.
  requestTechnology: jest.fn().mockReturnValue(new Promise(() => {})),
  getTag: jest.fn().mockResolvedValue(null),
  cancelTechnologyRequest: jest.fn().mockResolvedValue(undefined),
}

const NfcTech = {
  Ndef: 'Ndef',
}

const Ndef = {
  uri: {
    decodePayload: jest.fn(),
  },
}

export default NfcManager
export { Ndef, NfcTech }
