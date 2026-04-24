import { AGUIEvent } from "@ag-ui/core"
import { ClientOptions, ClientEventType, ITransport } from "./types"
import { WebSocketTransport } from "./transports/websocket"
import { SSETransport } from "./transports/sse"
import { MockTransport } from "./transports/mock"

/**
 * AG-UI Client — entry point for consuming event streams.
 *
 * Automatically selects the right transport based on options.
 *
 * @example
 * ```ts
 * // Real backend
 * const client = createClient({ url: "ws://localhost:8080/ag-ui" })
 *
 * // Mock mode — no backend needed
 * const client = createClient({ mock: true })
 *
 * client.on("event", engine.consume)
 * client.connect()
 * ```
 */
export class AGUIClient {
  private transport: ITransport

  constructor(private options: ClientOptions = {}) {
    this.transport = this.buildTransport(options)
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  connect(): this {
    this.transport.connect()
    return this
  }

  disconnect(): void {
    this.transport.disconnect()
  }

  // ─── Sending ───────────────────────────────────────────────────────────────

  send(input: string, context?: Record<string, unknown>): void {
    this.transport.send(input, context)
  }

  // ─── Event subscription ────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: ClientEventType, cb: (...args: any[]) => void): this {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(this.transport.on as any)(event, cb)
    return this
  }

  off(event: ClientEventType, cb: (...args: unknown[]) => void): this {
    this.transport.off(event, cb)
    return this
  }

  /** Convenience: pipe all events directly to an Engine.consume function. */
  subscribe(consume: (event: AGUIEvent) => void): () => void {
    this.transport.on("event", consume)
    return () => this.transport.off("event", consume as (...args: unknown[]) => void)
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private buildTransport(options: ClientOptions): ITransport {
    if (options.mock) {
      return new MockTransport(options)
    }

    if (!options.url) {
      throw new Error(
        "[ag-ui/client] Either `url` or `mock: true` must be provided in ClientOptions"
      )
    }

    const transport = options.transport ?? "ws"

    if (transport === "sse") {
      return new SSETransport(options as Required<Pick<ClientOptions, "url">> & ClientOptions)
    }

    return new WebSocketTransport(options as Required<Pick<ClientOptions, "url">> & ClientOptions)
  }
}

/**
 * Factory function — preferred over `new AGUIClient()` for ergonomics.
 */
export function createClient(options: ClientOptions = {}): AGUIClient {
  return new AGUIClient(options)
}
