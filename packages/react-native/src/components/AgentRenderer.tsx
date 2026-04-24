import React, {
  ReactElement,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { ScrollView, StyleSheet, View, ViewStyle } from "react-native"
import {
  AGUIEvent,
  ComponentRegistry,
  Engine,
  EngineState,
  EventType,
  HandlerRegistry,
} from "@ag-ui/core"
import { AGUIClient } from "@ag-ui/client"
import { AgentProvider } from "../context/AgentProvider"
import { StreamingIndicator } from "./defaults/StreamingIndicator"
import { TextMessageBubble } from "./defaults/TextMessageBubble"
import { ToolCallCard } from "./defaults/ToolCallCard"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RNComponent = (props: any) => ReactNode

export interface AgentRendererProps {
  /** Engine instance — the single source of truth for UI state. */
  engine: Engine
  /**
   * Optional pre-connected client. When provided the renderer subscribes
   * automatically. You can also manage the subscription yourself.
   */
  client?: AGUIClient
  /** Map of event types → components to render. */
  components?: ComponentRegistry
  /** Map of event types → side-effect handlers (navigation, modals, etc.). */
  handlers?: HandlerRegistry
  /** Whether to show the built-in streaming typing indicator. Default: true */
  showStreamingIndicator?: boolean
  /** Whether to auto-scroll to the latest message. Default: true */
  autoScroll?: boolean
  /** Override the outer container style. */
  style?: ViewStyle
  /** Rendered above the event list (e.g. a header or title). */
  ListHeaderComponent?: ReactElement
  /** Rendered below the event list (e.g. a text input). */
  ListFooterComponent?: ReactElement
}

/**
 * AgentRenderer — the top-level React Native component for AG-UI.
 *
 * Subscribes to an Engine, processes each event through the component and
 * handler registries, and renders the result in a scrollable container.
 *
 * Handler events (NAVIGATE, OPEN_MODAL, etc.) are executed as side-effects
 * and produce no visual output. Component events are rendered inline.
 *
 * @example
 * ```tsx
 * <AgentRenderer
 *   engine={engine}
 *   client={client}
 *   components={{
 *     TEXT_MESSAGE: TextBubble,
 *     TOOL_RESULT: ToolCard,
 *   }}
 *   handlers={{
 *     NAVIGATE: ({ screen }) => navigation.navigate(screen),
 *     OPEN_MODAL: ({ id }) => openModal(id),
 *   }}
 *   ListFooterComponent={<ChatInput />}
 * />
 * ```
 */
export function AgentRenderer({
  engine,
  client,
  components = {},
  handlers = {},
  showStreamingIndicator = true,
  autoScroll = true,
  style,
  ListHeaderComponent,
  ListFooterComponent,
}: AgentRendererProps): React.JSX.Element {
  const [state, setState] = useState<EngineState>(engine.getState)
  const scrollRef = useRef<ScrollView>(null)

  // Built-in default component registry — consumer overrides take precedence
  const mergedComponents = useMemo<ComponentRegistry>(
    () => ({
      ...defaultComponents,
      ...components,
    }),
    [components]
  )

  // Subscribe to engine
  useEffect(() => engine.subscribe(setState), [engine])

  // Wire client → engine if provided
  useEffect(() => {
    if (!client) return
    const unsub = client.subscribe(engine.consume)
    return unsub
  }, [client, engine])

  // Execute handler-type events as side effects
  useEffect(() => {
    const latest = state.events[state.events.length - 1]
    if (!latest) return
    const handler = handlers[latest.type]
    if (handler) {
      handler(latest.payload)
    }
  }, [state.events, handlers])

  // Auto-scroll when messages grow
  useEffect(() => {
    if (autoScroll) {
      scrollRef.current?.scrollToEnd({ animated: true })
    }
  }, [state.messages.length, autoScroll])

  return (
    <AgentProvider
      engine={engine}
      client={client}
      components={mergedComponents}
      handlers={handlers}
    >
      <View style={[styles.container, style]}>
        {ListHeaderComponent}

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {renderEvents(state, mergedComponents, handlers)}

          {showStreamingIndicator && state.status === "streaming" && (
            <StreamingIndicator />
          )}
        </ScrollView>

        {ListFooterComponent}
      </View>
    </AgentProvider>
  )
}

// ─── Internal render logic ──────────────────────────────────────────────────

function renderEvents(
  state: EngineState,
  components: ComponentRegistry,
  handlers: HandlerRegistry
): React.ReactNode[] {
  const renderedNodes: React.ReactNode[] = []

  // Render messages (built from streaming TEXT_MESSAGE_* events)
  state.messages.forEach((message) => {
    const MessageComponent = components["TEXT_MESSAGE"] as RNComponent | undefined
    if (MessageComponent) {
      renderedNodes.push(
        <MessageComponent key={`msg-${message.id}`} message={message} />
      )
    }
  })

  // Render tool calls
  Object.values(state.toolCalls).forEach((toolCall) => {
    const ToolComponent = components["TOOL_CALL"] as RNComponent | undefined
    if (ToolComponent) {
      renderedNodes.push(
        <ToolComponent key={`tc-${toolCall.id}`} toolCall={toolCall} />
      )
    }
  })

  // Render any custom event types (not lifecycle or messaging events)
  const lifecycleEvents = new Set<string>([
    EventType.RUN_STARTED,
    EventType.RUN_FINISHED,
    EventType.RUN_ERROR,
    EventType.TEXT_MESSAGE_START,
    EventType.TEXT_MESSAGE_CONTENT,
    EventType.TEXT_MESSAGE_END,
    EventType.TOOL_CALL_START,
    EventType.TOOL_CALL_ARGS,
    EventType.TOOL_CALL_END,
    EventType.TOOL_RESULT,
  ])

  state.events.forEach((event: AGUIEvent, i: number) => {
    if (lifecycleEvents.has(event.type)) return
    if (handlers[event.type]) return // side-effect only, no render

    const CustomComponent = components[event.type] as RNComponent | undefined
    if (CustomComponent) {
      renderedNodes.push(
        <CustomComponent
          key={`evt-${event.meta?.id ?? i}`}
          {...event.payload}
        />
      )
    }
  })

  return renderedNodes
}

// ─── Default component registry ─────────────────────────────────────────────

const defaultComponents: ComponentRegistry = {
  TEXT_MESSAGE: TextMessageBubble,
  TOOL_CALL: ToolCallCard,
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 8,
  },
})
