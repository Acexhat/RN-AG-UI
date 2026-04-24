import { AGUIEvent, EventType } from "@ag-ui/core"

export type Scenario = {
  name: string
  description: string
  events: (input?: string) => AGUIEvent[]
}

const runId = () => `run-${Date.now()}`

const greeting: Scenario = {
  name: "greeting",
  description: "Simple streaming text response",
  events: (input = "Hello") => {
    const rid = runId()
    const msgId = `msg-${Date.now()}`
    const response = `Hello! You asked: "${input}". I'm the AG-UI dev server. How can I help?`
    return [
      { type: EventType.RUN_STARTED, payload: { runId: rid }, meta: { timestamp: Date.now() } },
      { type: EventType.TEXT_MESSAGE_START, payload: { messageId: msgId, role: "assistant" }, meta: { timestamp: Date.now() } },
      ...response.split("").map((char, i): AGUIEvent => ({
        type: EventType.TEXT_MESSAGE_CONTENT,
        payload: { messageId: msgId, delta: char },
        meta: { id: `c${i}`, timestamp: Date.now() + i },
      })),
      { type: EventType.TEXT_MESSAGE_END, payload: { messageId: msgId }, meta: { timestamp: Date.now() } },
      { type: EventType.RUN_FINISHED, payload: { runId: rid }, meta: { timestamp: Date.now() } },
    ]
  },
}

const weather: Scenario = {
  name: "weather",
  description: "Text + tool call + result sequence",
  events: () => {
    const rid = runId()
    const msgId = `msg-${Date.now()}`
    const toolCallId = `tc-${Date.now()}`
    const intro = "Let me check that for you."
    const args = '{"city":"New York","units":"metric"}'
    const followUp = "It's 22°C and sunny in New York!"
    const followMsgId = `msg-${Date.now() + 1}`
    return [
      { type: EventType.RUN_STARTED, payload: { runId: rid }, meta: { timestamp: Date.now() } },
      { type: EventType.TEXT_MESSAGE_START, payload: { messageId: msgId, role: "assistant" }, meta: {} },
      ...intro.split("").map((c, i): AGUIEvent => ({
        type: EventType.TEXT_MESSAGE_CONTENT,
        payload: { messageId: msgId, delta: c },
        meta: { id: `ci${i}` },
      })),
      { type: EventType.TEXT_MESSAGE_END, payload: { messageId: msgId }, meta: {} },
      { type: EventType.TOOL_CALL_START, payload: { toolCallId, toolName: "get_weather" }, meta: {} },
      ...args.split("").map((c, i): AGUIEvent => ({
        type: EventType.TOOL_CALL_ARGS,
        payload: { toolCallId, delta: c },
        meta: { id: `ca${i}` },
      })),
      { type: EventType.TOOL_CALL_END, payload: { toolCallId }, meta: {} },
      { type: EventType.TOOL_RESULT, payload: { toolCallId, result: { temp: "22°C", condition: "Sunny" } }, meta: {} },
      { type: EventType.TEXT_MESSAGE_START, payload: { messageId: followMsgId, role: "assistant" }, meta: {} },
      ...followUp.split("").map((c, i): AGUIEvent => ({
        type: EventType.TEXT_MESSAGE_CONTENT,
        payload: { messageId: followMsgId, delta: c },
        meta: { id: `cf${i}` },
      })),
      { type: EventType.TEXT_MESSAGE_END, payload: { messageId: followMsgId }, meta: {} },
      { type: EventType.RUN_FINISHED, payload: { runId: rid }, meta: {} },
    ]
  },
}

const navigation: Scenario = {
  name: "navigation",
  description: "Action handler — triggers NAVIGATE event",
  events: () => {
    const rid = runId()
    return [
      { type: EventType.RUN_STARTED, payload: { runId: rid }, meta: {} },
      { type: EventType.NAVIGATE, payload: { screen: "Orders", params: { filter: "recent" } }, meta: {} },
      { type: EventType.RUN_FINISHED, payload: { runId: rid }, meta: {} },
    ]
  },
}

const errorScenario: Scenario = {
  name: "error",
  description: "Simulates a backend error",
  events: () => {
    const rid = runId()
    return [
      { type: EventType.RUN_STARTED, payload: { runId: rid }, meta: {} },
      { type: EventType.RUN_ERROR, payload: { runId: rid, message: "Internal server error", code: "500" }, meta: {} },
    ]
  },
}

export const scenarios: Record<string, Scenario> = {
  greeting,
  weather,
  navigation,
  error: errorScenario,
}

export const defaultScenario = greeting
