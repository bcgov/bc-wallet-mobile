// What the engine logs through. The app logger satisfies it; log lines carry key names, never values.
export interface StorageLogger {
  info(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
  error(message: string, data?: Record<string, unknown>): void
}
