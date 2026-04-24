import { useCallback } from "react"
import { EngineState } from "@ag-ui/core"
import { useAgentContext } from "../context/AgentContext"

export interface UseAgentUIResult {
  /** Current engine state snapshot. */
  state: EngineState
  /**
   * Send a user input string through the connected client.
   * No-ops if no client is provided to the AgentProvider.
   */
  send: (input: string, context?: Record<string, unknown>) => void
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
  const { state, client } = useAgentContext()

  const send = useCallback(
    (input: string, context?: Record<string, unknown>) => {
      if (!client) {
        console.warn("[ag-ui] useAgentUI.send called but no client is connected")
        return
      }
      client.send(input, context)
    },
    [client]
  )

  return {
    state,
    send,
    isStreaming: state.status === "streaming",
    error: state.error,
  }
}
