import { AGUIEvent, EventType } from "@ag-ui/core"
import { ClientOptions } from "@ag-ui/client"

/**
 * LangGraph event shapes (subset used for normalization).
 * Full spec: https://langchain-ai.github.io/langgraph/concepts/streaming/
 */
interface LangGraphStreamEvent {
  event: string
  data?: Record<string, unknown>
  run_id?: string
  name?: string
  metadata?: Record<string, unknown>
}

/**
 * Normalizes LangGraph streaming events into AG-UI canonical events.
 *
 * Pass this as the `transform` option to createClient():
 * ```ts
 * import { langGraphTransform } from "@ag-ui/adapters/langgraph"
 * const client = createClient({ url, transform: langGraphTransform })
 * ```
 */
export function langGraphTransform(raw: unknown): AGUIEvent {
  const evt = raw as LangGraphStreamEvent
  const runId = evt.run_id ?? "lg-run"
  const ts = Date.now()

  switch (evt.event) {
    case "on_chain_start":
      return {
        type: EventType.RUN_STARTED,
        payload: { runId },
        meta: { timestamp: ts },
      }

    case "on_chain_end":
      return {
        type: EventType.RUN_FINISHED,
        payload: { runId },
        meta: { timestamp: ts },
      }

    case "on_chat_model_stream": {
      const chunk = evt.data?.["chunk"] as
        | { content?: string; id?: string }
        | undefined
      const content = chunk?.content ?? ""
      const msgId = chunk?.id ?? `lg-msg-${runId}`
      return {
        type: EventType.TEXT_MESSAGE_CONTENT,
        payload: { messageId: msgId, delta: content },
        meta: { timestamp: ts },
      }
    }

    case "on_tool_start": {
      return {
        type: EventType.TOOL_CALL_START,
        payload: {
          toolCallId: evt.run_id ?? `lg-tc-${ts}`,
          toolName: evt.name ?? "unknown",
        },
        meta: { timestamp: ts },
      }
    }

    case "on_tool_end": {
      return {
        type: EventType.TOOL_RESULT,
        payload: {
          toolCallId: evt.run_id ?? `lg-tc-${ts}`,
          result: evt.data?.["output"],
        },
        meta: { timestamp: ts },
      }
    }

    default:
      return {
        type: EventType.CUSTOM,
        payload: { raw: evt },
        meta: { timestamp: ts },
      }
  }
}

/**
 * Pre-configured ClientOptions for LangGraph backends.
 *
 * @example
 * ```ts
 * import { createClient } from "@ag-ui/client"
 * import { langGraphClientOptions } from "@ag-ui/adapters/langgraph"
 *
 * const client = createClient({
 *   url: "http://localhost:2024/stream",
 *   ...langGraphClientOptions,
 * })
 * ```
 */
export const langGraphClientOptions: Partial<ClientOptions> = {
  transport: "sse",
  transform: langGraphTransform,
  headers: {
    "X-AG-UI-Adapter": "langgraph",
  },
}
