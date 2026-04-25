import { AGUIEvent, EventType } from "@ag-ui/core"

export type MockScenarioFn = (input?: string) => AGUIEvent[]

/**
 * Built-in mock scenarios that simulate real AG-UI event sequences.
 * Each scenario returns a flat list of events; the mock transport replays
 * them with realistic delays to simulate streaming.
 */

const greeting: MockScenarioFn = (input) => {
  const runId = "mock-run-1"
  const msgId = "mock-msg-1"
  const inputText = input ?? "Hello"

  return [
    {
      type: EventType.RUN_STARTED,
      payload: { runId },
      meta: { id: "e1", timestamp: Date.now() },
    },
    {
      type: EventType.TEXT_MESSAGE_START,
      payload: { messageId: msgId, role: "assistant" },
      meta: { id: "e2", timestamp: Date.now() },
    },
    ...`Hello! You said: "${inputText}". How can I assist you today?`
      .split("")
      .map((char, i) => ({
        type: EventType.TEXT_MESSAGE_CONTENT,
        payload: { messageId: msgId, delta: char },
        meta: { id: `e3-${i}`, timestamp: Date.now() + i },
      })),
    {
      type: EventType.TEXT_MESSAGE_END,
      payload: { messageId: msgId },
      meta: { id: "e4", timestamp: Date.now() + 100 },
    },
    {
      type: EventType.RUN_FINISHED,
      payload: { runId },
      meta: { id: "e5", timestamp: Date.now() + 110 },
    },
  ]
}

const toolCall: MockScenarioFn = () => {
  const runId = "mock-run-2"
  const msgId = "mock-msg-2"
  const toolCallId = "mock-tc-1"
  const toolName = "get_weather"

  return [
    {
      type: EventType.RUN_STARTED,
      payload: { runId },
      meta: { id: "e1", timestamp: Date.now() },
    },
    {
      type: EventType.TEXT_MESSAGE_START,
      payload: { messageId: msgId, role: "assistant" },
      meta: { id: "e2", timestamp: Date.now() },
    },
    ...`Let me check the weather for you.`
      .split("")
      .map((char, i) => ({
        type: EventType.TEXT_MESSAGE_CONTENT,
        payload: { messageId: msgId, delta: char },
        meta: { id: `e3-${i}`, timestamp: Date.now() + i },
      })),
    {
      type: EventType.TEXT_MESSAGE_END,
      payload: { messageId: msgId },
      meta: { id: "e4", timestamp: Date.now() + 40 },
    },
    {
      type: EventType.TOOL_CALL_START,
      payload: { toolCallId, toolName },
      meta: { id: "e5", timestamp: Date.now() + 50 },
    },
    ...'{"city":"New York"}'.split("").map((char, i) => ({
      type: EventType.TOOL_CALL_ARGS,
      payload: { toolCallId, delta: char },
      meta: { id: `e6-${i}`, timestamp: Date.now() + 60 + i },
    })),
    {
      type: EventType.TOOL_CALL_END,
      payload: { toolCallId },
      meta: { id: "e7", timestamp: Date.now() + 90 },
    },
    {
      type: EventType.TOOL_RESULT,
      payload: {
        toolCallId,
        result: { temp: "22°C", condition: "Sunny", city: "New York" },
      },
      meta: { id: "e8", timestamp: Date.now() + 100 },
    },
    {
      type: EventType.RUN_FINISHED,
      payload: { runId },
      meta: { id: "e9", timestamp: Date.now() + 110 },
    },
  ]
}

const navigation: MockScenarioFn = () => {
  const runId = "mock-run-3"

  return [
    {
      type: EventType.RUN_STARTED,
      payload: { runId },
      meta: { id: "e1", timestamp: Date.now() },
    },
    {
      type: EventType.NAVIGATE,
      payload: { screen: "Orders", params: { userId: "user-42" } },
      meta: { id: "e2", timestamp: Date.now() + 50 },
    },
    {
      type: EventType.RUN_FINISHED,
      payload: { runId },
      meta: { id: "e3", timestamp: Date.now() + 60 },
    },
  ]
}

const error: MockScenarioFn = () => {
  const runId = "mock-run-4"
  return [
    {
      type: EventType.RUN_STARTED,
      payload: { runId },
      meta: { id: "e1", timestamp: Date.now() },
    },
    {
      type: EventType.RUN_ERROR,
      payload: { runId, message: "Upstream service unavailable", code: "503" },
      meta: { id: "e2", timestamp: Date.now() + 100 },
    },
  ]
}

const callAction: MockScenarioFn = (input) => {
  const runId = "mock-run-5"
  const msgId1 = "mock-msg-5a"
  const msgId2 = "mock-msg-5b"
  const contextNote = input
    ? `I can see your current state. Let me update things now.`
    : `Sure, let me handle that.`
  const confirm = "Done! I've added the item, applied a coupon, and navigated to your cart."

  return [
    {
      type: EventType.RUN_STARTED,
      payload: { runId },
      meta: { id: "e1", timestamp: Date.now() },
    },
    {
      type: EventType.TEXT_MESSAGE_START,
      payload: { messageId: msgId1, role: "assistant" },
      meta: { id: "e2" },
    },
    ...contextNote.split("").map((c, i) => ({
      type: EventType.TEXT_MESSAGE_CONTENT,
      payload: { messageId: msgId1, delta: c },
      meta: { id: `e3-${i}` },
    })),
    {
      type: EventType.TEXT_MESSAGE_END,
      payload: { messageId: msgId1 },
      meta: { id: "e4" },
    },
    {
      type: EventType.CALL_ACTION,
      payload: {
        name: "addToCart",
        args: { sku: "SNEAKER-WHITE-42", qty: 1, price: 129.99 },
        actionId: "act-1",
      },
      meta: { id: "e5" },
    },
    {
      type: EventType.CALL_ACTION,
      payload: {
        name: "applyCoupon",
        args: { code: "WELCOME10" },
        actionId: "act-2",
      },
      meta: { id: "e6" },
    },
    {
      type: EventType.SHOW_TOAST,
      payload: { message: "Coupon WELCOME10 applied — 10% off!", variant: "success" },
      meta: { id: "e7" },
    },
    {
      type: EventType.CALL_ACTION,
      payload: { name: "navigateToScreen", args: { screen: "Cart" }, actionId: "act-3" },
      meta: { id: "e8" },
    },
    {
      type: EventType.TEXT_MESSAGE_START,
      payload: { messageId: msgId2, role: "assistant" },
      meta: { id: "e9" },
    },
    ...confirm.split("").map((c, i) => ({
      type: EventType.TEXT_MESSAGE_CONTENT,
      payload: { messageId: msgId2, delta: c },
      meta: { id: `e10-${i}` },
    })),
    {
      type: EventType.TEXT_MESSAGE_END,
      payload: { messageId: msgId2 },
      meta: { id: "e11" },
    },
    {
      type: EventType.RUN_FINISHED,
      payload: { runId },
      meta: { id: "e12", timestamp: Date.now() + 200 },
    },
  ]
}

export const builtInScenarios: Record<string, MockScenarioFn> = {
  greeting,
  toolCall,
  navigation,
  error,
  callAction,
  /** Default scenario when none is specified. */
  default: greeting,
}
