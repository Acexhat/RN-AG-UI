import * as http from "http"
import { AGUIEvent } from "@ag-ui/core"
import { scenarios, defaultScenario } from "./scenarios"

export interface DevServerOptions {
  port?: number
  /** Default scenario to run when none is specified via ?scenario= param. */
  scenario?: string
  /** Milliseconds between each event emission. Default: 40 */
  eventDelay?: number
  /** Milliseconds extra delay for character stream events. Default: 15 */
  charDelay?: number
}

const CHAR_STREAM_TYPES = new Set([
  "TEXT_MESSAGE_CONTENT",
  "TOOL_CALL_ARGS",
])

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
}

/**
 * AG-UI development server.
 *
 * Provides two endpoints:
 *   POST /stream  — SSE stream of AG-UI events (main endpoint)
 *   GET  /health  — health check
 *   GET  /scenarios — list available scenarios
 *
 * Usage:
 * ```ts
 * import { createDevServer } from "@ag-ui/dev-server"
 * createDevServer({ port: 4000 }).listen()
 * ```
 */
export class DevServer {
  private server: http.Server
  private options: Required<DevServerOptions>

  constructor(options: DevServerOptions = {}) {
    this.options = {
      port: options.port ?? 4000,
      scenario: options.scenario ?? "greeting",
      eventDelay: options.eventDelay ?? 40,
      charDelay: options.charDelay ?? 15,
    }

    this.server = http.createServer(this.requestHandler.bind(this))
  }

  listen(): this {
    this.server.listen(this.options.port, () => {
      console.log(`\n🚀 AG-UI Dev Server running at http://localhost:${this.options.port}`)
      console.log(`   POST /stream        — SSE event stream`)
      console.log(`   GET  /scenarios     — list scenarios`)
      console.log(`   GET  /health        — health check\n`)
      console.log(`   Available scenarios: ${Object.keys(scenarios).join(", ")}\n`)
    })
    return this
  }

  close(): void {
    this.server.close()
  }

  private requestHandler(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
    // CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS_HEADERS)
      res.end()
      return
    }

    const url = new URL(req.url ?? "/", `http://localhost:${this.options.port}`)

    if (url.pathname === "/health") {
      res.writeHead(200, { ...CORS_HEADERS, "Content-Type": "application/json" })
      res.end(JSON.stringify({ status: "ok", version: "0.0.1" }))
      return
    }

    if (url.pathname === "/scenarios") {
      const list = Object.values(scenarios).map((s) => ({
        name: s.name,
        description: s.description,
      }))
      res.writeHead(200, { ...CORS_HEADERS, "Content-Type": "application/json" })
      res.end(JSON.stringify(list, null, 2))
      return
    }

    if (url.pathname === "/stream") {
      this.handleStream(req, res, url)
      return
    }

    res.writeHead(404, CORS_HEADERS)
    res.end(JSON.stringify({ error: "Not found" }))
  }

  private handleStream(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    url: URL
  ): void {
    // Parse input and scenario from request body or query params
    const scenarioName =
      url.searchParams.get("scenario") ?? this.options.scenario

    const scenario = scenarios[scenarioName] ?? defaultScenario

    // SSE headers
    res.writeHead(200, {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    })

    // Read request body to get user input
    let body = ""
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString()
    })

    req.on("end", () => {
      let input: string | undefined
      try {
        const parsed = JSON.parse(body) as { input?: string }
        input = parsed.input
      } catch {
        // body may be empty for GET-style requests
      }

      const events = scenario.events(input)
      this.streamEvents(events, res)
    })

    req.on("close", () => {
      // Client disconnected — nothing to clean up for this simple impl
    })
  }

  private streamEvents(events: AGUIEvent[], res: http.ServerResponse): void {
    let cumulativeDelay = 0

    events.forEach((event) => {
      const isChar = CHAR_STREAM_TYPES.has(event.type)
      cumulativeDelay += isChar
        ? this.options.charDelay
        : this.options.eventDelay

      setTimeout(() => {
        if (res.writableEnded) return
        const data = JSON.stringify(event)
        res.write(`data: ${data}\n\n`)
      }, cumulativeDelay)
    })

    // Close stream after all events
    const totalDelay =
      cumulativeDelay + this.options.eventDelay * 2

    setTimeout(() => {
      if (!res.writableEnded) {
        res.write("data: [DONE]\n\n")
        res.end()
      }
    }, totalDelay)
  }
}

export function createDevServer(options: DevServerOptions = {}): DevServer {
  return new DevServer(options)
}
