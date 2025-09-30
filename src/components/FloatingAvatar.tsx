import React, { useState, useRef, useEffect } from "react";
import { View, Pressable, StyleSheet, Text, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Stethoscope,
  CheckCircle,
  Edit3,
  X,
  Loader2,
} from "lucide-react-native";
import { AppState } from "../types";
import { AudioWaveform } from "./AudioWaveform"; // Assuming this is now in the project

interface FloatingAvatarProps {
  isVisible: boolean;
  state: AppState;
  onRecordingStart: () => void;
  onRecordingStop: (recordingTime: number) => void;
  editingItem?: string;
  onEditComplete?: () => void;
  processedTask?: string;
}

export const FloatingAvatar: React.FC<FloatingAvatarProps> = ({
  isVisible,
  state,
  onRecordingStart,
  onRecordingStop,
  editingItem,
  onEditComplete,
  processedTask = "",
}) => {
  const [recordingTime, setRecordingTime] = useState(0);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef(null);

  const containerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(containerAnim, {
      toValue: isVisible ? 1 : 0,
      stiffness: 400,
      damping: 30,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  // Recording timer logic...
  useEffect(() => {
    let interval = null;
    if (state === "recording") {
      startTimeRef.current = Date.now() - recordingTime;
      interval = setInterval(() => {
        setRecordingTime(Date.now() - startTimeRef.current);
      }, 100);
    } else {
      setRecordingTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state]);

  // Animations for prompts
  const promptAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const showPrompt =
      (state === "editing" && !!editingItem) ||
      (state === "showing-summary" && !!processedTask);
    Animated.spring(promptAnim, {
      toValue: showPrompt ? 1 : 0,
      stiffness: 300,
      damping: 25,
      delay: showPrompt ? 200 : 0,
      useNativeDriver: true,
    }).start();
  }, [state, editingItem, processedTask]);

  // Status Dot Animation
  const statusDotAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (
      state === "recording" ||
      state === "processing" ||
      state === "complete" ||
      state === "showing-summary"
    ) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(statusDotAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(statusDotAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      statusDotAnim.stopAnimation();
      statusDotAnim.setValue(1);
    }
  }, [state]);

  // Recording Time Animation
  const timeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(timeAnim, {
      toValue: state === "recording" ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [state]);

  const handlePressIn = () => {
    if (state === "idle" || state === "editing") {
      startTimeRef.current = Date.now();
      onRecordingStart();
    }
  };

  const handlePressOut = () => {
    if (state === "recording") {
      const finalTime = Date.now() - startTimeRef.current;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      onRecordingStop(recordingTime);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${seconds}.${centiseconds.toString().padStart(2, "0")}`;
  };

  const getAvatarStyles = () => {
    if (state === "complete" || state === "showing-summary") {
      return {
        gradient: ["#059669", "#10b981"],
        shadowColor: "#10b981",
        ringColor: "rgba(16, 185, 129, 0.3)",
      };
    }
    if (state === "processing") {
      const isEditing = !!editingItem;
      return {
        gradient: isEditing ? ["#7c3aed", "#8b5cf6"] : ["#2563eb", "#3b82f6"],
        shadowColor: isEditing ? "#8b5cf6" : "#3b82f6",
        ringColor: isEditing
          ? "rgba(139, 92, 246, 0.3)"
          : "rgba(59, 130, 246, 0.3)",
      };
    }
    if (state === "recording") {
      return {
        gradient: ["#dc2626", "#ef4444"],
        shadowColor: "#ef4444",
        ringColor: "rgba(239, 68, 68, 0.3)",
      };
    }
    if (state === "editing") {
      return {
        gradient: ["#7c3aed", "#8b5cf6"],
        shadowColor: "#8b5cf6",
        ringColor: "rgba(139, 92, 246, 0.3)",
      };
    }
    return {
      gradient: ["#334155", "#475569"],
      shadowColor: "#1e293b",
      ringColor: "rgba(100, 116, 139, 0.2)",
    };
  };

  const stylesConfig = getAvatarStyles();

  // Animations for content transitions with scale effects
  const contentAnims = {
    idle: useRef(new Animated.Value(state === "idle" ? 1 : 0)).current,
    recording: useRef(new Animated.Value(state === "recording" ? 1 : 0))
      .current,
    processing: useRef(new Animated.Value(state === "processing" ? 1 : 0))
      .current,
    editing: useRef(new Animated.Value(state === "editing" ? 1 : 0)).current,
    complete: useRef(
      new Animated.Value(
        state === "complete" || state === "showing-summary" ? 1 : 0
      )
    ).current,
  };

  // Icon animation for complete state
  const completeIconAnim = useRef(new Animated.Value(0)).current;
  const completeIconRotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animConfig = { duration: 200, useNativeDriver: true };
    const animations = Object.keys(contentAnims).map((key) => {
      let toValue = 0;
      if (key === "complete") {
        toValue = state === "complete" || state === "showing-summary" ? 1 : 0;
      } else {
        toValue = state === key ? 1 : 0;
      }
      return Animated.spring(contentAnims[key as keyof typeof contentAnims], {
        toValue,
        stiffness: 400,
        damping: 30,
        useNativeDriver: true,
      });
    });
    Animated.parallel(animations).start();

    // Animate check icon with rotation and scale when complete
    if (state === "complete" || state === "showing-summary") {
      completeIconAnim.setValue(0);
      completeIconRotateAnim.setValue(0);
      Animated.sequence([
        Animated.delay(150),
        Animated.parallel([
          Animated.spring(completeIconAnim, {
            toValue: 1,
            stiffness: 500,
            damping: 20,
            useNativeDriver: true,
          }),
          Animated.spring(completeIconRotateAnim, {
            toValue: 1,
            stiffness: 500,
            damping: 20,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [state]);

  // Animation for recording pulse
  const recordingPulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (state === "recording") {
      Animated.loop(
        Animated.timing(recordingPulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();
    } else {
      recordingPulseAnim.stopAnimation();
      recordingPulseAnim.setValue(0);
    }
  }, [state]);

  // Animation for processing loader rotation - smooth continuous rotation
  const loaderRotateAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (state === "processing") {
      loaderRotateAnim.setValue(0);
      Animated.loop(
        Animated.timing(loaderRotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: (t) => t, // Linear easing for smooth rotation
        })
      ).start();
    } else {
      loaderRotateAnim.stopAnimation();
      loaderRotateAnim.setValue(0);
    }
  }, [state]);

  if (!isVisible && !containerAnim) return null;

  const containerStyle: any = {
    opacity: containerAnim,
    transform: [
      {
        scale: containerAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1],
        }),
      },
      {
        translateY: containerAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [80, 0],
        }),
      },
    ],
  };

  const recordingPulseStyle = {
    transform: [
      {
        scale: recordingPulseAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.4],
        }),
      },
    ],
    opacity: recordingPulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 0],
    }),
  };

  const promptStyle: any = {
    opacity: promptAnim,
    transform: [
      {
        scale: promptAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
        }),
      },
      {
        translateY: promptAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
    ],
  };

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {state === "recording" && (
        <Animated.View style={[styles.pulseRing, recordingPulseStyle]} />
      )}

      {/* Edit/Summary Prompts */}
      <Animated.View style={[styles.promptContainer, promptStyle]}>
        {state === "editing" && editingItem && (
          <View style={[styles.prompt, styles.editPrompt]}>
            <View style={styles.promptHeader}>
              <Edit3 size={16} color="#7c3aed" />
              <Text style={styles.promptTitle}>Edit Report</Text>
              <Pressable onPress={onEditComplete} style={styles.closeButton}>
                <X size={14} color="#64748b" />
              </Pressable>
            </View>
            <Text style={styles.promptText}>
              How would you like to edit "{editingItem}"?
            </Text>
            <View style={styles.editHint}>
              <View style={styles.pulseDot} />
              <Text style={styles.editHintText}>
                Press & hold to give voice instructions
              </Text>
            </View>
          </View>
        )}
        {state === "showing-summary" && processedTask && (
          <View style={[styles.prompt, styles.summaryPrompt]}>
            <View style={styles.promptHeader}>
              <CheckCircle size={16} color="#059669" />
              <Text style={styles.promptTitle}>Task Complete</Text>
            </View>
            <Text style={styles.promptText}>{processedTask}</Text>
          </View>
        )}
      </Animated.View>

      {/* Main avatar button */}
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={
          state === "processing" ||
          state === "complete" ||
          state === "showing-summary"
        }
      >
        <Animated.View
          style={[
            styles.avatar,
            {
              shadowColor: stylesConfig.shadowColor,
              borderColor: stylesConfig.ringColor,
            },
          ]}
        >
          <LinearGradient
            colors={stylesConfig.gradient as any}
            style={styles.gradient}
          >
            <Animated.View
              style={[
                styles.contentContainer,
                {
                  opacity: contentAnims.idle,
                  transform: [
                    {
                      scale: contentAnims.idle.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Stethoscope size={24} color="white" strokeWidth={2.5} />
            </Animated.View>
            <Animated.View
              style={[
                styles.contentContainer,
                {
                  opacity: contentAnims.recording,
                  transform: [
                    {
                      scale: contentAnims.recording.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <AudioWaveform isRecording={true} size="small" />
            </Animated.View>
            <Animated.View
              style={[
                styles.contentContainer,
                {
                  opacity: contentAnims.processing,
                  transform: [
                    {
                      scale: contentAnims.processing.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: loaderRotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "360deg"],
                      }),
                    },
                  ],
                }}
              >
                <Loader2 size={24} color="white" strokeWidth={2.5} />
              </Animated.View>
            </Animated.View>
            <Animated.View
              style={[
                styles.contentContainer,
                {
                  opacity: contentAnims.editing,
                  transform: [
                    {
                      scale: contentAnims.editing.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Edit3 size={24} color="white" strokeWidth={2.5} />
            </Animated.View>
            <Animated.View
              style={[
                styles.contentContainer,
                {
                  opacity: contentAnims.complete,
                  transform: [
                    {
                      scale: contentAnims.complete.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Animated.View
                style={{
                  transform: [
                    { scale: completeIconAnim },
                    {
                      rotate: completeIconRotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["-180deg", "0deg"],
                      }),
                    },
                  ],
                }}
              >
                <CheckCircle size={24} color="white" strokeWidth={2.5} />
              </Animated.View>
            </Animated.View>
          </LinearGradient>
        </Animated.View>

        {/* Status Dot */}
        <Animated.View
          style={[
            styles.statusDot,
            {
              backgroundColor: stylesConfig.gradient[1],
              transform: [{ scale: statusDotAnim }],
            },
          ]}
        />
      </Pressable>

      {/* Recording Time Display */}
      <Animated.View style={[styles.timeContainer, { opacity: timeAnim }]}>
        <Text style={styles.timeText}>{formatTime(recordingTime)}</Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 24,
    right: 24,
    zIndex: 50,
  },
  pulseRing: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 64,
    height: 64,
    borderRadius: 32,
    borderColor: "rgba(239, 68, 68, 0.4)",
    borderWidth: 1,
  },
  promptContainer: {
    position: "absolute",
    bottom: 80, // Position above the avatar
    right: 0,
    width: 260,
  },
  prompt: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  editPrompt: {
    borderColor: "rgba(124, 58, 237, 0.2)",
    borderWidth: 1,
  },
  summaryPrompt: {
    borderColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
  },
  promptHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  promptTitle: {
    flex: 1,
    fontWeight: "600",
    color: "#1e293b",
  },
  closeButton: {
    padding: 4,
  },
  promptText: {
    color: "#475569",
    marginBottom: 12,
  },
  editHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#7c3aed",
  },
  editHintText: {
    fontSize: 12,
    color: "#7c3aed",
    fontWeight: "500",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
  },
  statusDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "white",
  },
  timeContainer: {
    position: "absolute",
    bottom: 72,
    left: "50%",
    transform: [{ translateX: -30 }],
    minWidth: 60,
    backgroundColor: "#dc2626",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  timeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  gradient: {
    flex: 1,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
});
