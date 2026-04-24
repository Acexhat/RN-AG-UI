# AG-UI React Native

> A headless React Native runtime that converts AG-UI event streams into UI and app actions via a pluggable component and handler system.

---

## Architecture

```
AG-UI Backend (any)
    ↓
Transport Layer  (@ag-ui/client)   ← WS / SSE / Mock
    ↓
Event Normalizer                   ← raw → AGUIEvent
    ↓
Core Engine      (@ag-ui/core)     ← state machine
    ↓
Renderer Adapter (@ag-ui/react-native)
    ↓
Components + Action Handlers       ← your UI
```

---

## Packages

| Package | Description |
|---|---|
| [`@ag-ui/core`](./packages/core) | Engine, types, registry — zero framework dependencies |
| [`@ag-ui/client`](./packages/client) | WebSocket, SSE, and mock transports |
| [`@ag-ui/react-native`](./packages/react-native) | AgentRenderer, AgentProvider, hooks, default components |
| [`@ag-ui/adapters`](./packages/adapters) | LangGraph + CopilotKit event normalizers |
| [`@ag-ui/dev-server`](./packages/dev-server) | Local mock backend for development |

---

## Quick Start

### 1 — Install

```sh
# From your React Native project
pnpm add @ag-ui/core @ag-ui/client @ag-ui/react-native
```

### 2 — Mock mode (no backend needed)

```tsx
import React, { useMemo } from "react"
import { SafeAreaView } from "react-native"
import { Engine } from "@ag-ui/core"
import { createClient } from "@ag-ui/client"
import { AgentRenderer, ChatInput } from "@ag-ui/react-native"

export default function App() {
  const engine = useMemo(() => new Engine(), [])
  const client = useMemo(() => {
    const c = createClient({ mock: true, mockScenario: "weather" })
    c.connect()
    return c
  }, [])

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <AgentRenderer
        engine={engine}
        client={client}
        ListFooterComponent={<ChatInput />}
      />
    </SafeAreaView>
  )
}
```

### 3 — Real backend (WebSocket)

```tsx
const client = useMemo(() => {
  const c = createClient({ url: "ws://your-backend/ag-ui" })
  c.connect()
  return c
}, [])
```

### 4 — Custom components + action handlers

```tsx
import { useNavigation } from "@react-navigation/native"

function App() {
  const navigation = useNavigation()
  const engine = useMemo(() => new Engine(), [])
  const client = useMemo(() => createClient({ url: "ws://backend" }).connect(), [])

  return (
    <AgentRenderer
      engine={engine}
      client={client}
      components={{
        TEXT_MESSAGE: MyBubble,       // override built-in
        STOCK_CHART: StockChartCard,  // custom event type
      }}
      handlers={{
        NAVIGATE: ({ screen, params }) => navigation.navigate(screen, params),
        OPEN_MODAL: ({ id }) => openModal(id),
        SHOW_TOAST: ({ message, variant }) => Toast.show(message, variant),
      }}
      ListFooterComponent={<ChatInput placeholder="Ask anything…" />}
    />
  )
}
```

---

## Core Concepts

### Engine

The `Engine` is a state machine that consumes AG-UI events and maintains UI state. It's framework-agnostic — usable in React Native, web, CLI, or tests.

```ts
import { Engine } from "@ag-ui/core"

const engine = new Engine()

// Subscribe to state changes
const unsub = engine.subscribe((state) => {
  console.log(state.messages)   // accumulated messages
  console.log(state.toolCalls)  // tool call lifecycle
  console.log(state.status)     // "idle" | "streaming" | "error"
})

// Feed events manually (or via client.subscribe)
engine.consume({ type: "RUN_STARTED", payload: { runId: "r1" } })

unsub() // clean up
```

### Client

Handles transport, reconnection, and event normalization.

```ts
import { createClient } from "@ag-ui/client"

// WebSocket
const wsClient = createClient({ url: "ws://backend/stream" })

// SSE
const sseClient = createClient({
  url: "https://backend/stream",
  transport: "sse",
})

// Mock — no backend
const mockClient = createClient({ mock: true, mockScenario: "weather" })

// Wire client → engine
wsClient.subscribe(engine.consume)
wsClient.connect()

// Send user input
wsClient.send("Show me the weather in Tokyo")
```

### Component Registry

Maps event type strings to React components. Built-in defaults are provided; override any or add new types.

```ts
const components = {
  TEXT_MESSAGE: MyTextBubble,     // replaces built-in TextMessageBubble
  TOOL_CALL: MyToolCard,          // replaces built-in ToolCallCard
  STOCK_CHART: StockChartWidget,  // brand-new custom type
}
```

### Action Handler System

The key differentiator. Handlers intercept events and execute side-effects instead of rendering UI.

```ts
const handlers = {
  NAVIGATE: ({ screen, params }) => navigation.navigate(screen, params),
  OPEN_MODAL: ({ id, props }) => openModal(id, props),
  CLOSE_MODAL: () => closeModal(),
  SHOW_TOAST: ({ message, variant }) => showToast(message, variant),
  REFRESH_FEED: () => feedRef.current?.refresh(),
}
```

The renderer checks: **handler present → execute, no handler → render component**.

### Hooks

```tsx
// Inside any component under <AgentProvider> or <AgentRenderer>
function ChatInput() {
  const { send, isStreaming, state, error } = useAgentUI()

  return (
    <TextInput
      editable={!isStreaming}
      onSubmitEditing={(e) => send(e.nativeEvent.text)}
    />
  )
}
```

```tsx
// Direct engine subscription outside of a provider
const state = useEngineState(engine)
```

---

## AGUIEvent Schema

```ts
type AGUIEvent = {
  type: string                    // e.g. "TEXT_MESSAGE_CONTENT"
  payload: Record<string, any>   // event-specific data
  meta?: {
    id?: string
    timestamp?: number
    runId?: string
    threadId?: string
  }
}
```

### Built-in Event Types

| Event | Payload | Behavior |
|---|---|---|
| `RUN_STARTED` | `{ runId, threadId? }` | sets status → streaming |
| `RUN_FINISHED` | `{ runId }` | sets status → idle |
| `RUN_ERROR` | `{ runId, message, code? }` | sets status → error |
| `TEXT_MESSAGE_START` | `{ messageId, role }` | opens streaming message |
| `TEXT_MESSAGE_CONTENT` | `{ messageId, delta }` | appends delta to message |
| `TEXT_MESSAGE_END` | `{ messageId }` | closes streaming message |
| `TOOL_CALL_START` | `{ toolCallId, toolName }` | opens tool call |
| `TOOL_CALL_ARGS` | `{ toolCallId, delta }` | streams tool args |
| `TOOL_CALL_END` | `{ toolCallId }` | closes tool call |
| `TOOL_RESULT` | `{ toolCallId, result }` | attaches result to tool call |
| `NAVIGATE` | `{ screen, params? }` | action — no default component |
| `OPEN_MODAL` | `{ id, props? }` | action — no default component |
| `SHOW_TOAST` | `{ message, variant?, duration? }` | action — no default component |

---

## Backend Adapters

### LangGraph

```ts
import { createClient } from "@ag-ui/client"
import { langGraphClientOptions } from "@ag-ui/adapters/langgraph"

const client = createClient({
  url: "http://localhost:2024/stream",
  ...langGraphClientOptions,
})
```

### CopilotKit

```ts
import { createClient } from "@ag-ui/client"
import { copilotKitClientOptions } from "@ag-ui/adapters/copilotkit"

const client = createClient({
  url: "https://your-copilotkit-endpoint/stream",
  ...copilotKitClientOptions,
})
```

### Custom Transform

```ts
const client = createClient({
  url: "ws://your-custom-backend",
  transform: (raw) => ({
    type: raw.event_name,
    payload: raw.data,
    meta: { timestamp: raw.ts },
  }),
})
```

---

## Dev Server

A local mock SSE backend — no AI service required.

```sh
# From packages/dev-server
pnpm start

# Or via CLI
npx ag-ui-dev

# Custom port + scenario
PORT=3333 SCENARIO=weather npx ag-ui-dev
```

Endpoints:

| Method | Path | Description |
|---|---|---|
| POST | `/stream?scenario=weather` | SSE stream |
| GET | `/scenarios` | list available scenarios |
| GET | `/health` | health check |

Connect your app to it:

```ts
const client = createClient({
  url: "http://localhost:4000/stream",
  transport: "sse",
})
```

---

## Mock Scenarios

Built into both `@ag-ui/client` (mock transport) and `@ag-ui/dev-server`:

| Scenario | Description |
|---|---|
| `greeting` | Simple streaming text response |
| `weather` | Text → tool call → result → follow-up text |
| `navigation` | Emits a NAVIGATE action handler event |
| `error` | Simulates a backend RUN_ERROR |

---

## Extensibility

### Custom Event Types

Define a component for any event type string:

```ts
// Backend sends: { type: "STOCK_CHART", payload: { ticker: "AAPL", data: [...] } }

components={{
  STOCK_CHART: ({ ticker, data }) => <StockChart ticker={ticker} data={data} />,
}}
```

### Plugin System (future)

```ts
// Planned API
engine.use(chartPlugin)
engine.use(offlinePlugin)
```

---

## Development

```sh
# Install all dependencies
pnpm install

# Build all packages
pnpm build

# Type-check all packages
pnpm typecheck

# Start dev server
pnpm --filter @ag-ui/dev-server start
```

---

## Non-Goals

- LLM integration
- Tool execution
- Backend orchestration
- Opinionated UI design / theming

---

## Roadmap

- [ ] Streaming optimization (batched renders)
- [ ] Offline queue support
- [ ] Devtools event inspector (React Native Debugger integration)
- [ ] Visual UI builder
- [ ] Web renderer (`@ag-ui/react`)
- [ ] CLI renderer (`@ag-ui/ink`)
- [ ] Plugin system
