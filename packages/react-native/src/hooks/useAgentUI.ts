import { useCallback } from "react"
import { EngineState } from "@ag-ui/core"
import { useAgentContext } from "../context/AgentContext"

export interface UseAgentUIResult {
  /** Current engine state snapshot. */
  state: EngineState
  /**
   * Send a user input string through the connected client.
   *
   * Automatically merges all active useAgentReadable() registrations into
   * the `context` object so the backend always receives up-to-date app state
   * alongside the user's message.
   *
   * Any additional context passed here is merged on top of readables,
   * with the explicit argument taking precedence on key conflicts.
   */
  send: (input: string, extraContext?: Record<string, unknown>) => void
  /** True while the engine is processing a run. */
  isStreaming: boolean
  /** Non-null when the engine has entered an error state. */
  error: string | undefined
}

/**
 * Primary hook for interacting with the AG-UI engine from any component
 * nested inside an <AgentProvider>.
 *
 * @example
 * ```tsx
 * function ChatInput() {
 *   const { send, isStreaming } = useAgentUI()
 *   return (
 *     <TextInput
 *       editable={!isStreaming}
 *       onSubmitEditing={(e) => send(e.nativeEvent.text)}
 *     />
 *   )
 * }
 * ```
 */
export function useAgentUI(): UseAgentUIResult {
  const { state, client, readablesRef } = useAgentContext()

  const send = useCallback(
    (input: string, extraContext?: Record<string, unknown>) => {
      if (!client) {
        console.warn("[ag-ui] useAgentUI.send called but no client is connected")
        return
      }

      // Snapshot readables at call time — always fresh, never stale
      const context: Record<string, unknown> = {
        ...readablesRef.current,
        ...extraContext,
      }

      client.send(input, context)
    },
    [client, readablesRef]
  )

  return {
    state,
    send,
    isStreaming: state.status === "streaming",
    error: state.error,
  }
}
