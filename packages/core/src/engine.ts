import {
  AGUIEvent,
  EngineState,
  EngineStatus,
  EventType,
  Message,
  RunErrorPayload,
  RunFinishedPayload,
  RunStartedPayload,
  StateListener,
  TextMessageContentPayload,
  TextMessageEndPayload,
  TextMessageStartPayload,
  ToolCall,
  ToolCallArgsPayload,
  ToolCallEndPayload,
  ToolCallStartPayload,
  ToolResultPayload,
  Unsubscribe,
} from "./types"

function makeInitialState(): EngineState {
  return {
    events: [],
    messages: [],
    toolCalls: {},
    status: "idle",
  }
}

/**
 * Core AG-UI Engine.
 *
 * Maintains UI state derived from an AG-UI event stream. Framework-agnostic —
 * designed to be consumed by any renderer (React Native, web, CLI, etc).
 */
export class Engine {
  private state: EngineState = makeInitialState()
  private listeners = new Set<StateListener>()

  // ─── Public API ────────────────────────────────────────────────────────────

  /** Feed a single AG-UI event into the engine. */
  consume = (event: AGUIEvent): void => {
    // Always record the raw event for devtools / replay
    this.state = {
      ...this.state,
      events: [...this.state.events, event],
    }

    this.processEvent(event)
    this.notify()
  }

  getState(): EngineState {
    return this.state
  }

  subscribe(listener: StateListener): Unsubscribe {
    this.listeners.add(listener)
    // Immediately emit current state so the subscriber is in sync
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  /** Reset engine to its initial state (useful between runs). */
  reset(): void {
    this.state = makeInitialState()
    this.notify()
  }

  // ─── Internal Event Processing ─────────────────────────────────────────────

  private processEvent(event: AGUIEvent): void {
    // Using `unknown` as an intermediate cast because AGUIEvent<Record<string,unknown>>
    // and AGUIEvent<SpecificPayload> don't overlap in strict mode — the specific
    // payload types have required fields that Record<string,unknown> cannot satisfy.
    const e = event as unknown
    switch (event.type) {
      case EventType.RUN_STARTED:
        this.onRunStarted(e as AGUIEvent<RunStartedPayload>)
        break
      case EventType.RUN_FINISHED:
        this.onRunFinished(e as AGUIEvent<RunFinishedPayload>)
        break
      case EventType.RUN_ERROR:
        this.onRunError(e as AGUIEvent<RunErrorPayload>)
        break
      case EventType.TEXT_MESSAGE_START:
        this.onTextMessageStart(e as AGUIEvent<TextMessageStartPayload>)
        break
      case EventType.TEXT_MESSAGE_CONTENT:
        this.onTextMessageContent(e as AGUIEvent<TextMessageContentPayload>)
        break
      case EventType.TEXT_MESSAGE_END:
        this.onTextMessageEnd(e as AGUIEvent<TextMessageEndPayload>)
        break
      case EventType.TOOL_CALL_START:
        this.onToolCallStart(e as AGUIEvent<ToolCallStartPayload>)
        break
      case EventType.TOOL_CALL_ARGS:
        this.onToolCallArgs(e as AGUIEvent<ToolCallArgsPayload>)
        break
      case EventType.TOOL_CALL_END:
        this.onToolCallEnd(e as AGUIEvent<ToolCallEndPayload>)
        break
      case EventType.TOOL_RESULT:
        this.onToolResult(e as AGUIEvent<ToolResultPayload>)
        break
      // All other events (including NAVIGATE, OPEN_MODAL, CUSTOM, etc.)
      // are stored in `events` but have no built-in state mutation.
      // The renderer/action handler layer picks them up.
      default:
        break
    }
  }

  // ─── Event Handlers ────────────────────────────────────────────────────────

  private onRunStarted(event: AGUIEvent<RunStartedPayload>): void {
    this.state = {
      ...this.state,
      status: "streaming" as EngineStatus,
      runId: event.payload.runId,
      threadId: event.payload.threadId,
      error: undefined,
    }
  }

  private onRunFinished(_event: AGUIEvent<RunFinishedPayload>): void {
    // Mark any still-streaming messages as complete
    const messages = this.state.messages.map((m) =>
      m.isStreaming ? { ...m, isStreaming: false } : m
    )
    this.state = { ...this.state, status: "idle", messages }
  }

  private onRunError(event: AGUIEvent<RunErrorPayload>): void {
    this.state = {
      ...this.state,
      status: "error",
      error: event.payload.message,
    }
  }

  private onTextMessageStart(event: AGUIEvent<TextMessageStartPayload>): void {
    const msg: Message = {
      id: event.payload.messageId,
      role: event.payload.role,
      content: "",
      createdAt: event.meta?.timestamp ?? Date.now(),
      isStreaming: true,
    }
    this.state = {
      ...this.state,
      messages: [...this.state.messages, msg],
    }
  }

  private onTextMessageContent(
    event: AGUIEvent<TextMessageContentPayload>
  ): void {
    const messages = this.state.messages.map((m) =>
      m.id === event.payload.messageId
        ? { ...m, content: m.content + event.payload.delta }
        : m
    )
    this.state = { ...this.state, messages }
  }

  private onTextMessageEnd(event: AGUIEvent<TextMessageEndPayload>): void {
    const messages = this.state.messages.map((m) =>
      m.id === event.payload.messageId ? { ...m, isStreaming: false } : m
    )
    this.state = { ...this.state, messages }
  }

  private onToolCallStart(event: AGUIEvent<ToolCallStartPayload>): void {
    const toolCall: ToolCall = {
      id: event.payload.toolCallId,
      name: event.payload.toolName,
      args: "",
      status: "running",
    }
    this.state = {
      ...this.state,
      toolCalls: { ...this.state.toolCalls, [toolCall.id]: toolCall },
    }
  }

  private onToolCallArgs(event: AGUIEvent<ToolCallArgsPayload>): void {
    const existing = this.state.toolCalls[event.payload.toolCallId]
    if (!existing) return
    const updated: ToolCall = {
      ...existing,
      args: existing.args + event.payload.delta,
    }
    this.state = {
      ...this.state,
      toolCalls: { ...this.state.toolCalls, [updated.id]: updated },
    }
  }

  private onToolCallEnd(event: AGUIEvent<ToolCallEndPayload>): void {
    const existing = this.state.toolCalls[event.payload.toolCallId]
    if (!existing) return
    const updated: ToolCall = { ...existing, status: "complete" }
    this.state = {
      ...this.state,
      toolCalls: { ...this.state.toolCalls, [updated.id]: updated },
    }
  }

  private onToolResult(event: AGUIEvent<ToolResultPayload>): void {
    const existing = this.state.toolCalls[event.payload.toolCallId]
    if (!existing) return
    const updated: ToolCall = { ...existing, result: event.payload.result }
    this.state = {
      ...this.state,
      toolCalls: { ...this.state.toolCalls, [updated.id]: updated },
    }
  }

  // ─── Notifications ─────────────────────────────────────────────────────────

  private notify(): void {
    this.listeners.forEach((l) => l(this.state))
  }
}
