import { AGUIEvent, defaultNormalizer } from "@ag-ui/core"
import { ClientOptions } from "../types"
import { BaseTransport } from "./base"

/**
 * Server-Sent Events transport for AG-UI event streams.
 *
 * Uses the `fetch` API to POST user input and then reads the SSE stream
 * from the response body. Falls back to `EventSource` for GET-only endpoints.
 */
export class SSETransport extends BaseTransport {
  private url: string
  private headers: Record<string, string>
  private transform: (raw: unknown) => AGUIEvent
  private abortController: AbortController | null = null

  constructor(options: Required<Pick<ClientOptions, "url">> & ClientOptions) {
    super(options.reconnectDelay ?? 2000, options.maxReconnects ?? 5)
    this.url = options.url
    this.headers = options.headers ?? {}
    this.transform = options.transform ?? defaultNormalizer
  }

  connect(): void {
    this.active = true
    this.openStream()
  }

  disconnect(): void {
    this.active = false
    this.clearReconnectTimer()
    this.abortController?.abort()
    this.abortController = null
    this.emit("disconnect")
  }

  send(input: string, context?: Record<string, unknown>): void {
    // For SSE, sending means starting a new request with the user's input
    this.abortController?.abort()
    this.openStream(input, context)
  }

  private openStream(
    input?: string,
    context?: Record<string, unknown>
  ): void {
    this.abortController = new AbortController()
    const { signal } = this.abortController

    const body = input !== undefined ? JSON.stringify({ input, context }) : undefined
    const method = body ? "POST" : "GET"

    fetch(this.url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...this.headers,
      },
      body,
      signal,
    })
      .then((res: Response) => {
        if (!res.ok) throw new Error(`[ag-ui/sse] HTTP ${res.status}`)
        if (!res.body) throw new Error("[ag-ui/sse] No response body")
        this.reconnectCount = 0
        this.emit("connect")
        return this.readStream(res.body)
      })
      .catch((err: unknown) => {
        if ((err as Error)?.name === "AbortError") return
        this.emit(
          "error",
          err instanceof Error ? err : new Error("[ag-ui/sse] Stream error")
        )
        this.emit("disconnect")
        if (this.active) this.scheduleReconnect(() => this.openStream())
      })
  }

  private async readStream(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE spec: events separated by double-newline
        const parts = buffer.split("\n\n")
        buffer = parts.pop() ?? ""

        for (const part of parts) {
          const dataLine = part
            .split("\n")
            .find((l) => l.startsWith("data:"))
          if (!dataLine) continue

          const jsonStr = dataLine.slice("data:".length).trim()
          if (jsonStr === "[DONE]") continue

          try {
            const raw: unknown = JSON.parse(jsonStr)
            const event = this.transform(raw)
            this.emit("event", event)
          } catch (err) {
            this.emit(
              "error",
              err instanceof Error
                ? err
                : new Error("[ag-ui/sse] Failed to parse event")
            )
          }
        }
      }
    } finally {
      reader.releaseLock()
      this.emit("disconnect")
      if (this.active && !this.abortController?.signal.aborted) {
        this.scheduleReconnect(() => this.openStream())
      }
    }
  }
}
