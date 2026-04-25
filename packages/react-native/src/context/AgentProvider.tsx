import React, { ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { Engine, EngineState, ComponentRegistry, HandlerRegistry, EventType } from "@ag-ui/core"
import { AGUIClient } from "@ag-ui/client"
import type { CallActionPayload } from "@ag-ui/core"
import { AgentContext, AgentActionHandler } from "./AgentContext"

export interface AgentProviderProps {
  engine: Engine
  client?: AGUIClient
  components?: ComponentRegistry
  handlers?: HandlerRegistry
  children: ReactNode
}

/**
 * AgentProvider — wraps a subtree with engine state, readable context, and
 * the bidirectional action registry.
 *
 * It owns three things beyond plain state subscription:
 *
 *  1. readablesRef  — merged snapshot of all useAgentReadable() calls in the
 *                     tree. Auto-injected into every client.send() as `context`.
 *
 *  2. actionsRef    — registry of all useAgentAction() calls. When the backend
 *                     emits CALL_ACTION the provider looks up the name and
 *                     executes the registered handler.
 *
 *  3. CALL_ACTION   — listens to engine state and dispatches incoming
 *                     CALL_ACTION events to the correct registered handler.
 */
export function AgentProvider({
  engine,
  client,
  components = {},
  handlers = {},
  children,
}: AgentProviderProps): React.JSX.Element {
  const [state, setState] = useState<EngineState>(engine.getState)

  // Stable refs — mutations never cause re-renders, always fresh at call time
  const readablesRef = useRef<Record<string, unknown>>({})
  const actionsRef = useRef<Record<string, AgentActionHandler>>({})

  // Track which CALL_ACTION events we've already dispatched to avoid double-firing
  const dispatchedActionsRef = useRef<Set<string>>(new Set())

  // Subscribe to engine state changes
  useEffect(() => engine.subscribe(setState), [engine])

  // Wire client → engine
  useEffect(() => {
    if (!client) return
    const unsub = client.subscribe(engine.consume)
    return unsub
  }, [client, engine])

  // Dispatch incoming CALL_ACTION events to registered handlers
  const dispatchActions = useCallback(
    (currentState: EngineState) => {
      currentState.events.forEach((event) => {
        if (event.type !== EventType.CALL_ACTION) return

        const meta = event.meta
        const payload = event.payload as unknown as CallActionPayload
        // Use actionId if provided, otherwise fall back to event id or serialized payload
        const dedupeKey = (meta?.id ?? "") + (payload.actionId ?? JSON.stringify(event.payload))

        if (dispatchedActionsRef.current.has(dedupeKey)) return
        dispatchedActionsRef.current.add(dedupeKey)

        const { name, args = {} } = payload
        const handler = actionsRef.current[name]

        if (!handler) {
          console.warn(
            `[ag-ui] CALL_ACTION received for "${name}" but no handler is registered. ` +
              `Register one with useAgentAction("${name}", handler).`
          )
          return
        }

        // Execute — errors are caught so one bad action doesn't break the stream
        Promise.resolve()
          .then(() => handler(args))
          .catch((err: unknown) => {
            console.error(`[ag-ui] useAgentAction("${name}") threw:`, err)
          })
      })
    },
    []
  )

  // Re-run dispatch whenever events grow
  useEffect(() => {
    dispatchActions(state)
  }, [state.events, dispatchActions])

  return (
    <AgentContext.Provider
      value={{
        engine,
        client: client ?? null,
        components,
        handlers,
        state,
        readablesRef,
        actionsRef,
      }}
    >
      {children}
    </AgentContext.Provider>
  )
}
