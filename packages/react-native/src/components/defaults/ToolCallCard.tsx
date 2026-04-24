import React from "react"
import { StyleSheet, Text, View } from "react-native"
import { ToolCall } from "@ag-ui/core"

export interface ToolCallCardProps {
  toolCall: ToolCall
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#FF9500",
  running: "#007AFF",
  complete: "#34C759",
  error: "#FF3B30",
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  running: "Running…",
  complete: "Done",
  error: "Error",
}

/**
 * Default card for tool call events.
 * Shows tool name, streaming args, and status indicator.
 */
export function ToolCallCard({ toolCall }: ToolCallCardProps): React.JSX.Element {
  const statusColor = STATUS_COLORS[toolCall.status] ?? "#8E8E93"
  const statusLabel = STATUS_LABELS[toolCall.status] ?? toolCall.status

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={styles.toolName}>{toolCall.name}</Text>
        <Text style={[styles.statusLabel, { color: statusColor }]}>
          {statusLabel}
        </Text>
      </View>

      {toolCall.args ? (
        <Text style={styles.args} numberOfLines={3}>
          {toolCall.args}
        </Text>
      ) : null}

      {toolCall.result != null ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultLabel}>Result</Text>
          <Text style={styles.result} numberOfLines={5}>
            {JSON.stringify(toolCall.result, null, 2)}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
    marginHorizontal: 12,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    padding: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  toolName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1C1E",
    fontFamily: "Menlo",
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  args: {
    marginTop: 8,
    fontSize: 12,
    color: "#636366",
    fontFamily: "Menlo",
  },
  resultContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
    paddingTop: 8,
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8E8E93",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  result: {
    fontSize: 12,
    color: "#1C1C1E",
    fontFamily: "Menlo",
  },
})
