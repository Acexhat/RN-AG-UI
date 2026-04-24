import { AGUIEvent, EventType } from "@ag-ui/core"
import { ClientOptions } from "@ag-ui/client"

/**
 * CopilotKit streaming event shapes (simplified).
 * Ref: https://docs.copilotkit.ai/concepts/streaming
 */
interface CopilotKitStreamEvent {
  type: string
  threadId?: string
  runId?: string
  messageId?: string
  content?: string
  delta?: string
  toolCallId?: string
  toolName?: string
  toolArgs?: string
  result?: unknown
  error?: string
}

/**
 * Normalizes CopilotKit streaming events into AG-UI canonical events.
 *
 * @example
 * ```ts
 * import { createClient } from "@ag-ui/client"
 * import { copilotKitTransform } from "@ag-ui/adapters/copilotkit"
 *
 * const client = createClient({ url, transform: copilotKitTransform })
 * ```
 */
export function copilotKitTransform(raw: unknown): AGUIEvent {
  const evt = raw as CopilotKitStreamEvent
  const ts = Date.now()

  switch (evt.type) {
    case "run.created":
      return {
        type: EventType.RUN_STARTED,
        payload: { runId: evt.runId ?? "ck-run", threadId: evt.threadId },
        meta: { timestamp: ts, runId: evt.runId, threadId: evt.threadId },
      }

    case "run.completed":
      return {
        type: EventType.RUN_FINISHED,
        payload: { runId: evt.runId ?? "ck-run" },
        meta: { timestamp: ts },
      }

    case "run.failed":
      return {
        type: EventType.RUN_ERROR,
        payload: { runId: evt.runId ?? "ck-run", message: evt.error ?? "Unknown error" },
        meta: { timestamp: ts },
      }

    case "message.start":
      return {
        type: EventType.TEXT_MESSAGE_START,
        payload: { messageId: evt.messageId ?? `ck-msg-${ts}`, role: "assistant" },
        meta: { timestamp: ts },
      }

    case "message.delta":
      return {
        type: EventType.TEXT_MESSAGE_CONTENT,
        payload: {
          messageId: evt.messageId ?? `ck-msg-${ts}`,
          delta: evt.delta ?? "",
        },
        meta: { timestamp: ts },
      }

    case "message.end":
      return {
        type: EventType.TEXT_MESSAGE_END,
        payload: { messageId: evt.messageId ?? `ck-msg-${ts}` },
        meta: { timestamp: ts },
      }

    case "tool.start":
      return {
        type: EventType.TOOL_CALL_START,
        payload: {
          toolCallId: evt.toolCallId ?? `ck-tc-${ts}`,
          toolName: evt.toolName ?? "unknown",
        },
        meta: { timestamp: ts },
      }

    case "tool.args":
      return {
        type: EventType.TOOL_CALL_ARGS,
        payload: {
          toolCallId: evt.toolCallId ?? `ck-tc-${ts}`,
          delta: evt.toolArgs ?? "",
        },
        meta: { timestamp: ts },
      }

    case "tool.end":
      return {
        type: EventType.TOOL_CALL_END,
        payload: { toolCallId: evt.toolCallId ?? `ck-tc-${ts}` },
        meta: { timestamp: ts },
      }

    case "tool.result":
      return {
        type: EventType.TOOL_RESULT,
        payload: {
          toolCallId: evt.toolCallId ?? `ck-tc-${ts}`,
          result: evt.result,
        },
        meta: { timestamp: ts },
      }

    default:
      return {
        type: evt.type ?? EventType.CUSTOM,
        payload: { raw: evt },
        meta: { timestamp: ts },
      }
  }
}

/**
 * Pre-configured ClientOptions for CopilotKit backends.
 */
export const copilotKitClientOptions: Partial<ClientOptions> = {
  transport: "sse",
  transform: copilotKitTransform,
  headers: {
    "X-AG-UI-Adapter": "copilotkit",
  },
}
