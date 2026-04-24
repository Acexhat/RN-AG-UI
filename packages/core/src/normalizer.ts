import { AGUIEvent } from "./types"

/**
 * Transforms arbitrary raw backend payloads into the canonical AGUIEvent shape.
 *
 * Default implementation is a pass-through. Backend adapters can swap this
 * out with their own transform functions via `ClientOptions.transform`.
 */
export function defaultNormalizer(raw: unknown): AGUIEvent {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(
      `[ag-ui] Cannot normalize event: expected object, got ${typeof raw}`
    )
  }

  const obj = raw as Record<string, unknown>

  if (typeof obj["type"] !== "string") {
    throw new Error(`[ag-ui] Cannot normalize event: missing string "type" field`)
  }

  return {
    type: obj["type"],
    payload:
      typeof obj["payload"] === "object" && obj["payload"] !== null
        ? (obj["payload"] as Record<string, unknown>)
        : {},
    meta:
      typeof obj["meta"] === "object" && obj["meta"] !== null
        ? (obj["meta"] as AGUIEvent["meta"])
        : { timestamp: Date.now() },
  }
}
