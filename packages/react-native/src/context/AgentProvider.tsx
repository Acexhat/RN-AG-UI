import React, { ReactNode, useEffect, useRef, useState } from "react"
import { Engine, EngineState, ComponentRegistry, HandlerRegistry } from "@ag-ui/core"
import { AGUIClient } from "@ag-ui/client"
import { AgentContext } from "./AgentContext"

export interface AgentProviderProps {
  engine: Engine
  /** Optional pre-connected client. When provided, the provider auto-subscribes. */
  client?: AGUIClient
  components?: ComponentRegistry
  handlers?: HandlerRegistry
  children: ReactNode
}

/**
 * AgentProvider — wraps a subtree with engine state and registry access.
 *
 * Use this when you want to share a single engine across many components
 * without threading props manually.
 */
export function AgentProvider({
  engine,
  client,
  components = {},
  handlers = {},
  children,
}: AgentProviderProps): React.JSX.Element {
  const [state, setState] = useState<EngineState>(engine.getState)
  const unsubClientRef = useRef<(() => void) | null>(null)

  // Subscribe to engine state changes
  useEffect(() => {
    const unsub = engine.subscribe(setState)
    return unsub
  }, [engine])

  // Wire client → engine
  useEffect(() => {
    if (!client) return
    const unsub = client.subscribe(engine.consume)
    unsubClientRef.current = unsub
    return () => {
      unsub()
      unsubClientRef.current = null
    }
  }, [client, engine])

  return (
    <AgentContext.Provider
      value={{
        engine,
        client: client ?? null as AGUIClient | null,
        components,
        handlers,
        state,
      }}
    >
      {children}
    </AgentContext.Provider>
  )
}
