import { AGUIEvent } from "@ag-ui/core"
import { builtInScenarios, MockScenarioFn } from "../mock/scenarios"
import { ClientOptions } from "../types"
import { BaseTransport } from "./base"

/**
 * Mock transport — no backend required.
 *
 * Replays a predefined scenario with realistic inter-event delays so you can
 * build, test, and demo UI without any running server.
 */
export class MockTransport extends BaseTransport {
  private scenario: MockScenarioFn
  private customScenarios: Record<string, MockScenarioFn>
  private replayTimers: ReturnType<typeof setTimeout>[] = []

  constructor(options: ClientOptions = {}) {
    super(0, Infinity)

    this.customScenarios = {}

    const scenarioKey = options.mockScenario ?? "default"
    this.scenario =
      this.customScenarios[scenarioKey] ??
      builtInScenarios[scenarioKey] ??
      builtInScenarios["default"]!
  }

  connect(): void {
    this.active = true
    // Immediately signal connected — no network call needed
    setTimeout(() => this.emit("connect"), 0)
  }

  disconnect(): void {
    this.active = false
    this.cancelReplay()
    this.emit("disconnect")
  }

  send(input: string, _context?: Record<string, unknown>): void {
    this.cancelReplay()
    const events = this.scenario(input)
    this.replayEvents(events)
  }

  /** Register a custom scenario at runtime. */
  registerScenario(name: string, fn: MockScenarioFn): void {
    this.customScenarios[name] = fn
  }

  private replayEvents(events: AGUIEvent[]): void {
    let delay = 30 // base delay in ms per event

    events.forEach((event, i) => {
      // TEXT_MESSAGE_CONTENT events stream character-by-character faster
      const isCharStream =
        event.type === "TEXT_MESSAGE_CONTENT" ||
        event.type === "TOOL_CALL_ARGS"
      const eventDelay = isCharStream ? delay + i * 15 : delay + i * 80

      const timer = setTimeout(() => {
        if (this.active) this.emit("event", event)
      }, eventDelay)

      this.replayTimers.push(timer)
    })
  }

  private cancelReplay(): void {
    this.replayTimers.forEach((t) => clearTimeout(t))
    this.replayTimers = []
  }
}
