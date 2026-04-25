import { useEffect, useRef } from "react"
import { useAgentContext, AgentActionHandler } from "../context/AgentContext"

/**
 * useAgentAction — registers a named handler that the LLM can invoke by
 * emitting a CALL_ACTION event from the backend.
 *
 * This is the write-side of bidirectional state sync. While useAgentReadable
 * lets the LLM *see* app state, useAgentAction lets the LLM *change* it.
 *
 * @param name    - The action name the backend emits in CALL_ACTION.name
 * @param handler - Called with the args the LLM provides. Can be async.
 *                  Return value is currently ignored (future: sent back as
 *                  ACTION_RESULT for the LLM to read).
 *
 * @example
 * ```tsx
 * function CartScreen() {
 *   const cart = useCartStore()
 *
 *   // LLM can add items: CALL_ACTION { name: "addToCart", args: { sku, qty } }
 *   useAgentAction("addToCart", ({ sku, qty }) => {
 *     cart.addItem(sku as string, qty as number)
 *   })
 *
 *   // LLM can clear the cart entirely
 *   useAgentAction("clearCart", () => {
 *     cart.clear()
 *   })
 *
 *   // LLM can apply a coupon
 *   useAgentAction("applyCoupon", async ({ code }) => {
 *     await cart.applyCoupon(code as string)
 *   })
 *
 *   return <View>...</View>
 * }
 * ```
 *
 * Backend emits to trigger this:
 * ```json
 * {
 *   "type": "CALL_ACTION",
 *   "payload": { "name": "addToCart", "args": { "sku": "SHOE-42", "qty": 1 } }
 * }
 * ```
 */
export function useAgentAction(
  name: string,
  handler: AgentActionHandler
): void {
  const { actionsRef } = useAgentContext()

  // Keep handler ref fresh so the provider always calls the latest closure
  const handlerRef = useRef<AgentActionHandler>(handler)
  handlerRef.current = handler

  // Store a stable wrapper that always delegates to the latest handler ref
  useEffect(() => {
    const stableWrapper: AgentActionHandler = (args) =>
      handlerRef.current(args)

    actionsRef.current[name] = stableWrapper

    return () => {
      // Only deregister if this instance is still the owner
      if (actionsRef.current[name] === stableWrapper) {
        delete actionsRef.current[name]
      }
    }
  }, [name, actionsRef])
}
