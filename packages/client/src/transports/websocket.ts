import { AGUIEvent } from "@ag-ui/core"
import { defaultNormalizer } from "@ag-ui/core"
import { ClientOptions } from "../types"
import { BaseTransport } from "./base"

/**
 * WebSocket transport for AG-UI event streams.
 *
 * Expects the server to send JSON-encoded AGUIEvent objects line-by-line
 * (or as individual WebSocket messages).
 */
export class WebSocketTransport extends BaseTransport {
  private url: string
  private transform: (raw: unknown) => AGUIEvent
  private socket: WebSocket | null = null

  constructor(options: Required<Pick<ClientOptions, "url">> & ClientOptions) {
    super(options.reconnectDelay ?? 2000, options.maxReconnects ?? 5)
    this.url = options.url
    this.transform = options.transform ?? defaultNormalizer
  }

  connect(): void {
    this.active = true
    this.openSocket()
  }

  disconnect(): void {
    this.active = false
    this.clearReconnectTimer()
    this.socket?.close()
    this.socket = null
  }

  send(input: string, context?: Record<string, unknown>): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.emit("error", new Error("[ag-ui/ws] Cannot send — not connected"))
      return
    }
    this.socket.send(JSON.stringify({ input, context }))
  }

  private openSocket(): void {
    const socket = new WebSocket(this.url)
    this.socket = socket

    socket.onopen = () => {
      this.reconnectCount = 0
      this.emit("connect")
    }

    socket.onmessage = (ev: MessageEvent) => {
      try {
        const raw: unknown = JSON.parse(ev.data as string)
        const event = this.transform(raw)
        this.emit("event", event)
      } catch (err) {
        this.emit(
          "error",
          err instanceof Error
            ? err
            : new Error("[ag-ui/ws] Failed to parse message")
        )
      }
    }

    socket.onerror = () => {
      this.emit("error", new Error("[ag-ui/ws] WebSocket error"))
    }

    socket.onclose = () => {
      this.emit("disconnect")
      if (this.active) this.scheduleReconnect(() => this.openSocket())
    }
  }
}
