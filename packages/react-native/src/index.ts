// Context + Provider
export { AgentContext, useAgentContext } from "./context/AgentContext"
export type { AgentContextValue } from "./context/AgentContext"
export { AgentProvider } from "./context/AgentProvider"
export type { AgentProviderProps } from "./context/AgentProvider"

// Renderer
export { AgentRenderer } from "./components/AgentRenderer"
export type { AgentRendererProps } from "./components/AgentRenderer"

// Input
export { ChatInput } from "./components/ChatInput"
export type { ChatInputProps } from "./components/ChatInput"

// Default components (exported so consumers can use or extend them)
export { TextMessageBubble } from "./components/defaults/TextMessageBubble"
export type { TextMessageBubbleProps } from "./components/defaults/TextMessageBubble"
export { ToolCallCard } from "./components/defaults/ToolCallCard"
export type { ToolCallCardProps } from "./components/defaults/ToolCallCard"
export { StreamingIndicator } from "./components/defaults/StreamingIndicator"

// Hooks
export { useAgentUI } from "./hooks/useAgentUI"
export type { UseAgentUIResult } from "./hooks/useAgentUI"
export { useEngineState } from "./hooks/useEngineState"
