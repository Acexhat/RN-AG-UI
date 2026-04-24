import { useEffect, useState } from "react"
import { Engine, EngineState } from "@ag-ui/core"

/**
 * Subscribe directly to an Engine instance outside of an AgentProvider.
 * Useful when you wire an engine imperatively rather than via context.
 *
 * @example
 * ```tsx
 * const engine = useMemo(() => new Engine(), [])
 * const state = useEngineState(engine)
 * ```
 */
export function useEngineState(engine: Engine): EngineState {
  const [state, setState] = useState<EngineState>(engine.getState)

  useEffect(() => {
    const unsub = engine.subscribe(setState)
    return unsub
  }, [engine])

  return state
}
