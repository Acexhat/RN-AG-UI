import { useEffect, useRef } from "react"
import { useAgentContext } from "../context/AgentContext"

/**
 * useAgentReadable — registers a piece of app state that is automatically
 * injected into every send() call as part of the `context` object.
 *
 * The backend receives this context alongside the user's input and can
 * inject it into the LLM's system prompt so the model always has an
 * up-to-date view of the app's current state.
 *
 * @param key   - The name the backend will receive this value under.
 * @param value - Any serializable value. Updates are captured at send() time
 *                so you can pass live state directly without worrying about
 *                stale closures.
 *
 * @example
 * ```tsx
 * function CartScreen() {
 *   const cart = useCartStore()
 *   const user = useUserStore()
 *
 *   // LLM will always know current cart contents + user tier
 *   useAgentReadable("cart", cart.items)
 *   useAgentReadable("currentUser", { name: user.name, tier: user.tier })
 *   useAgentReadable("activeScreen", "Cart")
 *
 *   return <View>...</View>
 * }
 * ```
 *
 * The backend receives:
 * ```json
 * {
 *   "input": "What should I remove from my cart?",
 *   "context": {
 *     "cart": [{ "sku": "X1", "qty": 2 }, ...],
 *     "currentUser": { "name": "Alice", "tier": "premium" },
 *     "activeScreen": "Cart"
 *   }
 * }
 * ```
 */
export function useAgentReadable(key: string, value: unknown): void {
  const { readablesRef } = useAgentContext()

  // Keep a ref to the key so the cleanup can remove it even if key changes
  const keyRef = useRef(key)

  useEffect(() => {
    const prevKey = keyRef.current
    keyRef.current = key

    // If the key changed, remove the old entry first
    if (prevKey !== key) {
      delete readablesRef.current[prevKey]
    }

    readablesRef.current[key] = value

    return () => {
      // Only remove if this instance's key still owns the slot
      if (readablesRef.current[key] === value) {
        delete readablesRef.current[key]
      }
    }
  })

  // Also keep the value in sync without waiting for the next effect cycle
  readablesRef.current[key] = value
}
