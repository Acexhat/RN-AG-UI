import React, { createContext, useContext } from "react"
import { Engine, EngineState } from "@ag-ui/core"
import { AGUIClient } from "@ag-ui/client"
import { ComponentRegistry, HandlerRegistry } from "@ag-ui/core"

export interface AgentContextValue {
  engine: Engine
  client: AGUIClient | null
  components: ComponentRegistry
  handlers: HandlerRegistry
  state: EngineState
}

export const AgentContext = createContext<AgentContextValue | null>(null)

export function useAgentContext(): AgentContextValue {
  const ctx = useContext(AgentContext)
  if (!ctx) {
    throw new Error(
      "[ag-ui] useAgentContext must be used within an <AgentProvider> or <AgentRenderer>"
    )
  }
  return ctx
}
