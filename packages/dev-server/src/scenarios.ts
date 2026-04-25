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

/**
 * Demonstrates bidirectional state sync:
 *
 * 1. LLM reads the cart from context (sent automatically by useAgentReadable)
 * 2. Emits a text message summarising what it sees
 * 3. Calls addToCart via CALL_ACTION — app state mutates live
 * 4. Calls navigateToCart via CALL_ACTION — app navigates
 * 5. Sends a final confirmation message
 *
 * The "context" field in the request body is echoed back in the first
 * message so you can see what the backend received.
 */
const callAction: Scenario = {
  name: "callAction",
  description: "Bidirectional state sync — LLM reads context and calls app actions",
  events: (input = "") => {
    const rid = runId()
    const msgId1 = `msg-${Date.now()}`
    const msgId2 = `msg-${Date.now() + 1}`
    const msgId3 = `msg-${Date.now() + 2}`

    // Simulate what the LLM would say after reading the readable context
    const contextNote =
      input.length > 0
        ? `I can see your current state. Let me update your cart now.`
        : `Sure, I'll add that to your cart.`

    const confirmText = "Done! I've added the sneakers to your cart and navigated you there."

    return [
      { type: EventType.RUN_STARTED, payload: { runId: rid }, meta: { id: "e1" } },

      // LLM acknowledges what it sees
      { type: EventType.TEXT_MESSAGE_START, payload: { messageId: msgId1, role: "assistant" }, meta: { id: "e2" } },
      ...contextNote.split("").map((c, i): AGUIEvent => ({
        type: EventType.TEXT_MESSAGE_CONTENT,
        payload: { messageId: msgId1, delta: c },
        meta: { id: `e3-${i}` },
      })),
      { type: EventType.TEXT_MESSAGE_END, payload: { messageId: msgId1 }, meta: { id: "e4" } },

      // LLM calls addToCart — app state mutates
      {
        type: EventType.CALL_ACTION,
        payload: {
          name: "addToCart",
          args: { sku: "SNEAKER-WHITE-42", qty: 1, price: 129.99 },
          actionId: "act-1",
        },
        meta: { id: "e5" },
      },

      // LLM applies a discount coupon
      {
        type: EventType.CALL_ACTION,
        payload: {
          name: "applyCoupon",
          args: { code: "WELCOME10" },
          actionId: "act-2",
        },
        meta: { id: "e6" },
      },

      // LLM shows a toast
      {
        type: EventType.SHOW_TOAST,
        payload: { message: "Coupon WELCOME10 applied — 10% off!", variant: "success" },
        meta: { id: "e7" },
      },

      // LLM navigates to cart
      {
        type: EventType.CALL_ACTION,
        payload: {
          name: "navigateToScreen",
          args: { screen: "Cart" },
          actionId: "act-3",
        },
        meta: { id: "e8" },
      },

      // Confirmation message
      { type: EventType.TEXT_MESSAGE_START, payload: { messageId: msgId3, role: "assistant" }, meta: { id: "e9" } },
      ...confirmText.split("").map((c, i): AGUIEvent => ({
        type: EventType.TEXT_MESSAGE_CONTENT,
        payload: { messageId: msgId3, delta: c },
        meta: { id: `e10-${i}` },
      })),
      { type: EventType.TEXT_MESSAGE_END, payload: { messageId: msgId3 }, meta: { id: "e11" } },

      { type: EventType.RUN_FINISHED, payload: { runId: rid }, meta: { id: "e12" } },
    ]
  },
}

export const scenarios: Record<string, Scenario> = {
  greeting,
  weather,
  navigation,
  callAction,
  error: errorScenario,
}

export const defaultScenario = greeting
