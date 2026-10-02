export type QRCodeStrategy = {
  matches: (uri: string) => boolean
  handle: (uri: string) => void | Promise<void>
}
