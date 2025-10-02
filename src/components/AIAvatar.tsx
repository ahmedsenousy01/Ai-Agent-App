import React, { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Stethoscope, CheckCircle, Loader2 } from "lucide-react-native";
import { AudioWaveform } from "./AudioWaveform";

interface AIAvatarProps {
  isRecording: boolean;
  isProcessing: boolean;
  isComplete: boolean;
  isShowingSummary: boolean;
  onRecordingStart: () => void;
  onRecordingStop: (recordingTime: number) => void;
  isDisabled: boolean;
  processedTask?: string;
  currentStatus?: string;
}

export const AIAvatar: React.FC<AIAvatarProps> = ({
  isRecording,
  isProcessing,
  isComplete,
  isShowingSummary,
  onRecordingStart,
  onRecordingStop,
  isDisabled,
  processedTask = "",
  currentStatus = "",
}) => {
  const [recordingTime, setRecordingTime] = useState(0);
  const [bubbleShown, setBubbleShown] = useState(false);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef(null);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Pulse animations
  const pulseAnim1 = useRef(new Animated.Value(0)).current;
  const pulseAnim2 = useRef(new Animated.Value(0)).current;
  const processingPulseAnim = useRef(new Animated.Value(0)).current;

  // Content animations
  const idleAnim = useRef(new Animated.Value(1)).current;
  const recordingAnim = useRef(new Animated.Value(0)).current;
  const processingAnim = useRef(new Animated.Value(0)).current;
  const completeAnim = useRef(new Animated.Value(0)).current;

  // Check icon animations
  const checkIconScale = useRef(new Animated.Value(0)).current;
  const checkIconRotate = useRef(new Animated.Value(0)).current;

  // Avatar shrink when showing summary
  const avatarShrinkAnim = useRef(new Animated.Value(1)).current;

  // Speech bubble animation
  const bubbleAnim = useRef(new Animated.Value(0)).current;

  // Loader rotation
  const loaderRotate = useRef(new Animated.Value(0)).current;

  // Status dot pulse
  const statusDotAnim = useRef(new Animated.Value(1)).current;

  // Keep references to looping animations so we can stop them cleanly
  const loopsRef = useRef<{
    recordingPulse1: Animated.CompositeAnimation | null;
    recordingPulse2: Animated.CompositeAnimation | null;
    processingPulse: Animated.CompositeAnimation | null;
    loaderRotate: Animated.CompositeAnimation | null;
    statusDot: Animated.CompositeAnimation | null;
  }>({
    recordingPulse1: null,
    recordingPulse2: null,
    processingPulse: null,
    loaderRotate: null,
    statusDot: null,
  });

  // Track long-running non-loop sequences to prevent stacking
  const sequencesRef = useRef<{
    complete: Animated.CompositeAnimation | null;
  }>({ complete: null });

  // Bubble shown ref to avoid stale closure inside animation callbacks
  const bubbleShownRef = useRef(bubbleShown);
  useEffect(() => {
    bubbleShownRef.current = bubbleShown;
  }, [bubbleShown]);

  const stopAllLoops = () => {
    const current = loopsRef.current;
    Object.values(current).forEach((anim) => {
      if (anim && typeof anim.stop === "function") anim.stop();
    });
    loopsRef.current = {
      recordingPulse1: null,
      recordingPulse2: null,
      processingPulse: null,
      loaderRotate: null,
      statusDot: null,
    };
  };

  // Main animation controller
  useEffect(() => {
    // Stop any existing loops so they don't stack across state changes
    stopAllLoops();

    // Also stop any long-running sequences that could still be in-flight
    if (sequencesRef.current.complete) {
      sequencesRef.current.complete.stop();
      sequencesRef.current.complete = null;
    }

    if (isRecording) {
      // Idle OUT, Recording IN
      Animated.parallel([
        Animated.timing(idleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(recordingAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Recording pulse rings
      pulseAnim1.setValue(0);
      pulseAnim2.setValue(0);
      loopsRef.current.recordingPulse1 = Animated.loop(
        Animated.timing(pulseAnim1, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      loopsRef.current.recordingPulse2 = Animated.loop(
        Animated.sequence([
          Animated.delay(500),
          Animated.timing(pulseAnim2, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      loopsRef.current.recordingPulse1.start();
      loopsRef.current.recordingPulse2.start();
    } else if (isProcessing) {
      // Recording OUT, Processing IN
      Animated.parallel([
        Animated.timing(recordingAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(processingAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Processing pulse
      processingPulseAnim.setValue(0);
      loopsRef.current.processingPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(processingPulseAnim, {
            toValue: 1,
            duration: 1250,
            useNativeDriver: true,
          }),
          Animated.timing(processingPulseAnim, {
            toValue: 0,
            duration: 1250,
            useNativeDriver: true,
          }),
        ])
      );
      loopsRef.current.processingPulse.start();

      // Loader rotation
      loaderRotate.setValue(0);
      loopsRef.current.loaderRotate = Animated.loop(
        Animated.timing(loaderRotate, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      loopsRef.current.loaderRotate.start();
    } else if (isComplete) {
      // Processing OUT to LEFT, Check IN from LEFT
      checkIconScale.setValue(0);
      checkIconRotate.setValue(0);
      bubbleAnim.setValue(0);

      const sequence = Animated.sequence([
        Animated.parallel([
          Animated.timing(processingAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(completeAnim, {
            toValue: 1,
            stiffness: 400,
            damping: 30,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(100),
        Animated.parallel([
          Animated.spring(checkIconScale, {
            toValue: 1,
            stiffness: 500,
            damping: 20,
            useNativeDriver: true,
          }),
          Animated.spring(checkIconRotate, {
            toValue: 1,
            stiffness: 500,
            damping: 20,
            useNativeDriver: true,
          }),
        ]),
        // Wait 3 seconds before showing bubble
        Animated.delay(3000),
      ]);

      sequencesRef.current.complete = sequence;
      sequence.start(() => {
        sequencesRef.current.complete = null;
        // After 3 seconds, shrink avatar and show speech bubble
        if (isShowingSummary && !bubbleShownRef.current) {
          setBubbleShown(true);
          Animated.parallel([
            Animated.spring(avatarShrinkAnim, {
              toValue: 0.7,
              friction: 8,
              useNativeDriver: true,
            }),
            Animated.spring(bubbleAnim, {
              toValue: 1,
              friction: 8,
              useNativeDriver: true,
            }),
          ]).start();
        }
      });
    } else if (isShowingSummary) {
      // Ensure bubble is shown
      if (!bubbleShown) {
        setBubbleShown(true);
        Animated.parallel([
          Animated.spring(avatarShrinkAnim, {
            toValue: 0.7,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.spring(bubbleAnim, {
            toValue: 1,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } else {
      // Back to idle
      setBubbleShown(false);
      Animated.parallel([
        Animated.spring(idleAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(avatarShrinkAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(recordingAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(processingAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(completeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(bubbleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      checkIconScale.setValue(0);
    }

    // Status dot pulse (do not reset to 0 to avoid jump)
    if (isRecording || isProcessing || isComplete || isShowingSummary) {
      statusDotAnim.setValue(1);
      loopsRef.current.statusDot = Animated.loop(
        Animated.sequence([
          Animated.timing(statusDotAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(statusDotAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      loopsRef.current.statusDot.start();
    }

    // Cleanup on unmount/state change
    return () => {
      stopAllLoops();
      if (sequencesRef.current.complete) {
        sequencesRef.current.complete.stop();
        sequencesRef.current.complete = null;
      }
    };
  }, [isRecording, isProcessing, isComplete, isShowingSummary]);

  const handlePressIn = () => {
    if (!isDisabled && !isComplete && !isShowingSummary) {
      Animated.spring(scaleAnim, {
        toValue: 1.05,
        friction: 3,
        useNativeDriver: true,
      }).start();
      startTimeRef.current = Date.now();
      onRecordingStart();
      intervalRef.current = setInterval(() => {
        setRecordingTime(Date.now() - startTimeRef.current);
      }, 10);
    }
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
    if (isRecording) {
      const finalTime = Date.now() - startTimeRef.current;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      onRecordingStop(finalTime);
      setRecordingTime(0);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${seconds}.${centiseconds.toString().padStart(2, "0")}`;
  };

  const getAvatarStyles = () => {
    if (isComplete || isShowingSummary) {
      return {
        gradient: ["#10b981", "#22c55e", "#14b8a6"],
        shadowColor: "#10b981",
        ringColor: "rgba(16, 185, 129, 0.3)",
      };
    }
    if (isProcessing) {
      return {
        gradient: ["#3b82f6", "#06b6d4", "#2563eb"],
        shadowColor: "#3b82f6",
        ringColor: "rgba(59, 130, 246, 0.3)",
      };
    }
    if (isRecording) {
      return {
        gradient: ["#ef4444", "#f43f5e", "#dc2626"],
        shadowColor: "#ef4444",
        ringColor: "rgba(239, 68, 68, 0.5)",
      };
    }
    return {
      gradient: ["#334155", "#475569", "#1e293b"],
      shadowColor: "#1e293b",
      ringColor: "rgba(100, 116, 139, 0.2)",
    };
  };

  const stylesConfig = getAvatarStyles();

  return (
    <View style={styles.container}>
      {/* Recording pulse rings */}
      {isRecording && (
        <>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [
                  {
                    scale: pulseAnim1.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.33],
                    }),
                  },
                ],
                opacity: pulseAnim1.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 0],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [
                  {
                    scale: pulseAnim2.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.22],
                    }),
                  },
                ],
                opacity: pulseAnim2.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 0],
                }),
              },
            ]}
          />
        </>
      )}

      {/* Processing pulse */}
      {isProcessing && (
        <Animated.View
          style={[
            styles.processingRing,
            {
              transform: [
                {
                  scale: processingPulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.15],
                  }),
                },
              ],
              opacity: processingPulseAnim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.3, 0.6, 0.3],
              }),
            },
          ]}
        />
      )}

      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled || isComplete || isShowingSummary}
      >
        <Animated.View
          style={[
            styles.avatar,
            {
              shadowColor: stylesConfig.shadowColor,
              borderColor: stylesConfig.ringColor,
              transform: [
                { scale: Animated.multiply(scaleAnim, avatarShrinkAnim) },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={stylesConfig.gradient as any}
            style={styles.gradient}
          >
            {/* Idle - Stethoscope */}
            <Animated.View
              style={[
                styles.content,
                { opacity: idleAnim, transform: [{ scale: idleAnim }] },
              ]}
            >
              <Stethoscope size={52} color="white" strokeWidth={2.5} />
            </Animated.View>

            {/* Recording - Waveform + Timer */}
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: recordingAnim,
                  transform: [{ scale: recordingAnim }],
                },
              ]}
            >
              <AudioWaveform isRecording={true} />
              <Text style={styles.recordingTime}>
                {formatTime(recordingTime)}
              </Text>
            </Animated.View>

            {/* Processing - Loader + Status */}
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: processingAnim,
                  transform: [{ scale: processingAnim }],
                },
              ]}
            >
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: loaderRotate.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "360deg"],
                      }),
                    },
                  ],
                }}
              >
                <Loader2 size={40} color="white" strokeWidth={2.5} />
              </Animated.View>
              {currentStatus && (
                <Text style={styles.statusText}>{currentStatus}</Text>
              )}
            </Animated.View>

            {/* Complete - ONLY Check Icon (no duplicate) */}
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: completeAnim,
                  transform: [
                    {
                      translateX: completeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-100, 0],
                      }),
                    },
                    { scale: completeAnim },
                  ],
                },
              ]}
            >
              <Animated.View
                style={{
                  transform: [
                    { scale: checkIconScale },
                    {
                      rotate: checkIconRotate.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["-180deg", "0deg"],
                      }),
                    },
                  ],
                }}
              >
                <CheckCircle size={56} color="white" strokeWidth={2.5} />
              </Animated.View>
              <Animated.Text
                style={[
                  styles.completeText,
                  {
                    opacity: checkIconScale.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                  },
                ]}
              >
                TASK COMPLETE
              </Animated.Text>
            </Animated.View>

            {/* Status Dot */}
            <Animated.View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    isComplete || isShowingSummary
                      ? "#10b981"
                      : isRecording
                      ? "#ef4444"
                      : isProcessing
                      ? "#3b82f6"
                      : "#94a3b8",
                  transform: [{ scale: statusDotAnim }],
                },
              ]}
            />
          </LinearGradient>
        </Animated.View>
      </Pressable>

      {/* Chat Message Bubble - appears AFTER 3 seconds */}
      {isShowingSummary && (
        <Animated.View
          style={[
            styles.chatBubble,
            {
              opacity: bubbleAnim,
              transform: [
                { scale: bubbleAnim },
                {
                  translateY: bubbleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.chatContent}>
            <Text style={styles.chatText}>{processedTask}</Text>
          </View>
          {/* Triangle pointer to avatar */}
          <View style={styles.chatTriangle} />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  processingRing: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.5)",
  },
  avatar: {
    width: 176,
    height: 176,
    borderRadius: 88,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 16,
    borderWidth: 4,
  },
  gradient: {
    width: "100%",
    height: "100%",
    borderRadius: 88,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  content: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  recordingTime: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "monospace",
    marginTop: 8,
  },
  statusText: {
    color: "white",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 12,
    textAlign: "center",
    opacity: 0.9,
    paddingHorizontal: 16,
  },
  completeText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 1.5,
    marginTop: 8,
  },
  statusDot: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "white",
  },
  chatBubble: {
    position: "absolute",
    top: 195,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  chatContent: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 18,
    maxWidth: 260,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  chatText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
    fontWeight: "400",
    textAlign: "center",
  },
  chatTriangle: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#ffffff",
    position: "absolute",
    top: -7,
    transform: [{ rotate: "180deg" }],
  },
});
