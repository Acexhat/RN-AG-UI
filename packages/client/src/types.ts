import { AGUIEvent } from "@ag-ui/core"

export type TransportType = "ws" | "sse"

export interface ClientOptions {
  /** Backend URL. Not required when mock: true. */
  url?: string
  /** Transport protocol. Defaults to "ws". */
  transport?: TransportType
  /** Use built-in mock transport instead of a real backend. */
  mock?: boolean
  /** Custom scenario for mock mode. */
  mockScenario?: string
  /**
   * Custom event transformer. Receives the raw server payload and must
   * return a canonical AGUIEvent. Defaults to pass-through normalizer.
   */
  transform?: (raw: unknown) => AGUIEvent
  /** Milliseconds before attempting reconnection. Default: 2000. */
  reconnectDelay?: number
  /** Max reconnection attempts. Default: 5. Infinity to retry forever. */
  maxReconnects?: number
  /** Additional headers to send with the HTTP request (SSE only). */
  headers?: Record<string, string>
}

export type EventCallback = (event: AGUIEvent) => void
export type ErrorCallback = (error: Error) => void
export type ConnectionCallback = () => void

export interface ClientEventMap {
  event: EventCallback
  error: ErrorCallback
  connect: ConnectionCallback
  disconnect: ConnectionCallback
}

export type ClientEventType = keyof ClientEventMap

export interface ITransport {
  connect(): void
  disconnect(): void
  send(input: string, context?: Record<string, unknown>): void
  on(event: "event", cb: EventCallback): void
  on(event: "error", cb: ErrorCallback): void
  on(event: "connect", cb: ConnectionCallback): void
  on(event: "disconnect", cb: ConnectionCallback): void
  off(event: ClientEventType, cb: (...args: unknown[]) => void): void
}
