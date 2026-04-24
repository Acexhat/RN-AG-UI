import React, { useState } from "react"
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native"
import { useAgentUI } from "../hooks/useAgentUI"

export interface ChatInputProps {
  placeholder?: string
  style?: ViewStyle
  /** Called after sending — useful for clearing custom state. */
  onSend?: (input: string) => void
  /** Disable the input independently of engine state. */
  disabled?: boolean
}

/**
 * Ready-to-use chat input bar that connects to the nearest AgentProvider.
 *
 * Reads `isStreaming` from the engine so the send button is automatically
 * disabled while a response is being generated.
 */
export function ChatInput({
  placeholder = "Message…",
  style,
  onSend,
  disabled: externalDisabled = false,
}: ChatInputProps): React.JSX.Element {
  const { send, isStreaming } = useAgentUI()
  const [text, setText] = useState("")

  const isDisabled = externalDisabled || isStreaming
  const canSend = text.trim().length > 0 && !isDisabled

  function handleSend(): void {
    const trimmed = text.trim()
    if (!trimmed) return
    send(trimmed)
    onSend?.(trimmed)
    setText("")
  }

  return (
    <View style={[styles.container, style]}>
      <TextInput
        style={[styles.input, isDisabled && styles.inputDisabled]}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor="#8E8E93"
        multiline
        maxLength={4000}
        editable={!isDisabled}
        onSubmitEditing={Platform.OS === "web" ? handleSend : undefined}
        blurOnSubmit={false}
        returnKeyType="send"
        accessibilityLabel="Chat input"
      />
      <Pressable
        onPress={handleSend}
        disabled={!canSend}
        style={({ pressed }) => [
          styles.sendButton,
          canSend ? styles.sendButtonActive : styles.sendButtonInactive,
          pressed && styles.sendButtonPressed,
        ]}
        accessibilityLabel="Send message"
        accessibilityRole="button"
      >
        <Text style={[styles.sendIcon, !canSend && styles.sendIconInactive]}>
          ↑
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#C6C6C8",
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#C6C6C8",
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "ios" ? 8 : 6,
    paddingBottom: Platform.OS === "ios" ? 8 : 6,
    fontSize: 15,
    color: "#1C1C1E",
    backgroundColor: "#F2F2F7",
  },
  inputDisabled: {
    opacity: 0.6,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  sendButtonActive: {
    backgroundColor: "#007AFF",
  },
  sendButtonInactive: {
    backgroundColor: "#E5E5EA",
  },
  sendButtonPressed: {
    opacity: 0.7,
  },
  sendIcon: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 22,
  },
  sendIconInactive: {
    color: "#8E8E93",
  },
})
