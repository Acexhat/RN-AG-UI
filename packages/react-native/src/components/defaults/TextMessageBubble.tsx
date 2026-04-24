import React from "react"
import { StyleSheet, Text, View } from "react-native"
import { Message } from "@ag-ui/core"

export interface TextMessageBubbleProps {
  message: Message
}

/**
 * Default chat bubble for TEXT_MESSAGE events.
 * Consumers can replace this via the component registry.
 */
export function TextMessageBubble({
  message,
}: TextMessageBubbleProps): React.JSX.Element {
  const isUser = message.role === "user"

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        <Text style={[styles.text, isUser ? styles.textUser : styles.textAssistant]}>
          {message.content}
          {message.isStreaming && (
            <Text style={styles.cursor}>▌</Text>
          )}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  rowAssistant: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: "#007AFF",
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: "#F0F0F0",
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  textUser: {
    color: "#FFFFFF",
  },
  textAssistant: {
    color: "#1C1C1E",
  },
  cursor: {
    color: "#007AFF",
    opacity: 0.7,
  },
})
