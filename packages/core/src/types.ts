// ─── AG-UI Event Types ──────────────────────────────────────────────────────

/**
 * Well-known AG-UI event type strings.
 * Consumers can extend this with their own string literals.
 */
export enum EventType {
  // Lifecycle
  RUN_STARTED = "RUN_STARTED",
  RUN_FINISHED = "RUN_FINISHED",
  RUN_ERROR = "RUN_ERROR",

  // Messaging
  TEXT_MESSAGE_START = "TEXT_MESSAGE_START",
  TEXT_MESSAGE_CONTENT = "TEXT_MESSAGE_CONTENT",
  TEXT_MESSAGE_END = "TEXT_MESSAGE_END",

  // Tools
  TOOL_CALL_START = "TOOL_CALL_START",
  TOOL_CALL_ARGS = "TOOL_CALL_ARGS",
  TOOL_CALL_END = "TOOL_CALL_END",
  TOOL_RESULT = "TOOL_RESULT",

  // State
  STATE_SNAPSHOT = "STATE_SNAPSHOT",
  STATE_DELTA = "STATE_DELTA",

  // App actions (renderer-handled, not rendered)
  NAVIGATE = "NAVIGATE",
  OPEN_MODAL = "OPEN_MODAL",
  CLOSE_MODAL = "CLOSE_MODAL",
  SHOW_TOAST = "SHOW_TOAST",

  // Custom
  CUSTOM = "CUSTOM",
}

export interface AGUIEventMeta {
  id?: string
  timestamp?: number
  runId?: string
  threadId?: string
}

export interface AGUIEvent<TPayload = Record<string, unknown>> {
  type: string
  payload: TPayload
  meta?: AGUIEventMeta
}

// ─── Message Types ───────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "tool" | "system"

export interface Message {
  id: string
  role: MessageRole
  content: string
  createdAt: number
  toolCallId?: string
  toolName?: string
  isStreaming?: boolean
}

// ─── Tool Call Types ─────────────────────────────────────────────────────────

export type ToolCallStatus = "pending" | "running" | "complete" | "error"

export interface ToolCall {
  id: string
  name: string
  args: string
  result?: unknown
  status: ToolCallStatus
}

// ─── Engine State ────────────────────────────────────────────────────────────

export type EngineStatus = "idle" | "streaming" | "error"

export interface EngineState {
  events: AGUIEvent[]
  messages: Message[]
  toolCalls: Record<string, ToolCall>
  status: EngineStatus
  error?: string
  runId?: string
  threadId?: string
}

// ─── Registry Types ──────────────────────────────────────────────────────────

export type StateListener = (state: EngineState) => void
export type Unsubscribe = () => void

// ─── Payload Shapes for well-known events ───────────────────────────────────

export interface TextMessageStartPayload {
  messageId: string
  role: MessageRole
}

export interface TextMessageContentPayload {
  messageId: string
  delta: string
}

export interface TextMessageEndPayload {
  messageId: string
}

export interface ToolCallStartPayload {
  toolCallId: string
  toolName: string
  parentMessageId?: string
}

export interface ToolCallArgsPayload {
  toolCallId: string
  delta: string
}

export interface ToolCallEndPayload {
  toolCallId: string
}

export interface ToolResultPayload {
  toolCallId: string
  result: unknown
}

export interface RunStartedPayload {
  runId: string
  threadId?: string
}

export interface RunFinishedPayload {
  runId: string
}

export interface RunErrorPayload {
  runId: string
  message: string
  code?: string
}

export interface NavigatePayload {
  screen: string
  params?: Record<string, unknown>
}

export interface OpenModalPayload {
  id: string
  props?: Record<string, unknown>
}

export interface CloseModalPayload {
  id?: string
}

export interface ShowToastPayload {
  message: string
  variant?: "info" | "success" | "warning" | "error"
  duration?: number
}

export interface StateDeltaPayload {
  delta: unknown
}

export interface StateSnapshotPayload {
  snapshot: unknown
}
