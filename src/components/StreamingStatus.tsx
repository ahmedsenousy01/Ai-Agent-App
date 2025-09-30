import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface StreamingStatusProps {
  isVisible: boolean;
  status: string;
  processedTask: string;
  isStreaming?: boolean;
  streamingText?: string;
}

export const StreamingStatus: React.FC<StreamingStatusProps> = ({
  isVisible,
  status,
  processedTask,
  isStreaming = false,
  streamingText = "",
}) => {
  const [animatedValue] = useState(new Animated.Value(0));
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (isVisible) {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, animatedValue]);

  useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(() => {
        setDots((prev) => {
          if (prev === "...") return "";
          return prev + ".";
        });
      }, 500);

      return () => clearInterval(interval);
    } else {
      setDots("");
    }
  }, [isStreaming]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: animatedValue,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={isStreaming ? "radio" : "checkmark-circle"}
              size={20}
              color={isStreaming ? "#3b82f6" : "#10b981"}
            />
          </View>
          <Text style={styles.statusText}>
            {status}
            {isStreaming && dots}
          </Text>
        </View>

        {streamingText && (
          <View style={styles.streamingContainer}>
            <Text style={styles.streamingText}>{streamingText}</Text>
          </View>
        )}

        {processedTask && (
          <View style={styles.taskContainer}>
            <Text style={styles.taskText}>{processedTask}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  content: {
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
  },
  streamingContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
  },
  streamingText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  taskContainer: {
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#10b981",
  },
  taskText: {
    fontSize: 14,
    color: "#166534",
    lineHeight: 20,
    fontWeight: "500",
  },
});
