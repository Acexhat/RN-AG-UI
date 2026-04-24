import { AGUIEvent } from "@ag-ui/core"
import {
  ClientEventMap,
  ClientEventType,
  ConnectionCallback,
  ErrorCallback,
  EventCallback,
  ITransport,
} from "../types"

type Listener = ClientEventMap[ClientEventType]

/**
 * Shared event emitter + reconnection logic for all transports.
 */
export abstract class BaseTransport implements ITransport {
  protected reconnectDelay: number
  protected maxReconnects: number
  protected reconnectCount = 0
  protected reconnectTimer: ReturnType<typeof setTimeout> | null = null
  protected active = false

  private listeners = new Map<ClientEventType, Set<Listener>>()

  constructor(reconnectDelay = 2000, maxReconnects = 5) {
    this.reconnectDelay = reconnectDelay
    this.maxReconnects = maxReconnects
  }

  // ─── ITransport impl ───────────────────────────────────────────────────────

  on(event: "event", cb: EventCallback): void
  on(event: "error", cb: ErrorCallback): void
  on(event: "connect", cb: ConnectionCallback): void
  on(event: "disconnect", cb: ConnectionCallback): void
  on(event: ClientEventType, cb: Listener): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(cb)
  }

  off(event: ClientEventType, cb: (...args: unknown[]) => void): void {
    this.listeners.get(event)?.delete(cb as Listener)
  }

  // ─── Protected emit helpers ────────────────────────────────────────────────

  protected emit(event: "event", payload: AGUIEvent): void
  protected emit(event: "error", payload: Error): void
  protected emit(event: "connect"): void
  protected emit(event: "disconnect"): void
  protected emit(event: ClientEventType, payload?: unknown): void {
    const cbs = this.listeners.get(event)
    if (!cbs) return
    cbs.forEach((cb) => {
      if (payload !== undefined) {
        ;(cb as (p: unknown) => void)(payload)
      } else {
        ;(cb as () => void)()
      }
    })
  }

  // ─── Reconnection helpers ──────────────────────────────────────────────────

  protected scheduleReconnect(connectFn: () => void): void {
    if (this.reconnectCount >= this.maxReconnects) {
      this.emit(
        "error",
        new Error(
          `[ag-ui] Max reconnection attempts (${this.maxReconnects}) reached`
        )
      )
      return
    }
    this.reconnectCount++
    this.reconnectTimer = setTimeout(() => {
      if (this.active) connectFn()
    }, this.reconnectDelay)
  }

  protected clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  // ─── Abstract interface ────────────────────────────────────────────────────

  abstract connect(): void
  abstract disconnect(): void
  abstract send(input: string, context?: Record<string, unknown>): void
}
