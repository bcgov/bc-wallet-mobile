export enum ConnectionState {
  Disconnected,
  Connecting,
  Connected,
}

export interface ConnectionRequest {
  nodeUrl: string
  conferenceAlias: string
  displayName: string
  pin?: string
}
