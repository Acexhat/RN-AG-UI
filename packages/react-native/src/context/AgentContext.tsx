import React, { createContext, MutableRefObject, useContext } from "react"
import { Engine, EngineState } from "@ag-ui/core"
import { AGUIClient } from "@ag-ui/client"
import { ComponentRegistry, HandlerRegistry } from "@ag-ui/core"

// ─── Action handler type ──────────────────────────────────────────────────────

export type AgentActionHandler = (
  args: Record<string, unknown>
) => unknown | Promise<unknown>

// ─── Context shape ────────────────────────────────────────────────────────────

export interface AgentContextValue {
  engine: Engine
  client: AGUIClient | null
  components: ComponentRegistry
  handlers: HandlerRegistry
  state: EngineState

  /**
   * Live snapshot of all useAgentReadable() registrations.
   * Stored as a ref so reads never trigger re-renders; the latest value
   * is always available at send() time.
   */
  readablesRef: MutableRefObject<Record<string, unknown>>

  /**
   * Registry of all useAgentAction() registrations.
   * Also a ref — actions don't need to cause re-renders.
   */
  actionsRef: MutableRefObject<Record<string, AgentActionHandler>>
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
