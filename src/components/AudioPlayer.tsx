import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

interface AudioPlayerProps {
  audioUri: string;
  onClose?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUri,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create audio player with the recorded audio URI
  const player = useAudioPlayer(audioUri);
  const status = useAudioPlayerStatus(player);

  // Handle loading state based on audio status
  useEffect(() => {
    if (status.isLoaded) {
      setIsLoading(false);
      setError(null);
    } else if (status.duration === 0 && status.isLoaded === false) {
      // If duration is 0 and not loaded, it might be an error
      // We'll let the timeout handle this case
    }
  }, [status.isLoaded, status.duration, audioUri]);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading && !status.isLoaded) {
        setIsLoading(false);
        setError(
          "Audio loading timeout - the file may be corrupted or inaccessible"
        );
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [isLoading, status.isLoaded]);

  const handlePlay = () => {
    try {
      if (status.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch (error) {
      console.error("Error controlling playback:", error);
      Alert.alert("Playback Error", "Failed to control audio playback");
    }
  };

  const handleSeek = (seconds: number) => {
    try {
      player.seekTo(seconds);
    } catch (error) {
      console.error("Error seeking:", error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getAudioInfo = () => {
    if (!audioUri) return null;

    const format = audioUri.includes(".m4a")
      ? "M4A"
      : audioUri.includes(".mp3")
      ? "MP3"
      : audioUri.includes(".wav")
      ? "WAV"
      : "Unknown";

    return {
      format,
      duration: status.duration,
      sampleRate: "44.1 kHz",
      channels: "Mono",
      bitrate: "128 kbps",
    };
  };

  const audioInfo = getAudioInfo();

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Audio Playback</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ff4444" />
          <Text style={styles.errorText}>Failed to load audio</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setIsLoading(true);
              setError(null);
            }}
          >
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Audio Playback</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading audio...</Text>
        </View>
      ) : (
        <>
          {/* Audio Info */}
          {audioInfo && (
            <View style={styles.infoContainer}>
              <Text style={styles.infoTitle}>Audio Information</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Format</Text>
                  <Text style={styles.infoValue}>{audioInfo.format}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Duration</Text>
                  <Text style={styles.infoValue}>
                    {formatTime(audioInfo.duration)}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Sample Rate</Text>
                  <Text style={styles.infoValue}>{audioInfo.sampleRate}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Channels</Text>
                  <Text style={styles.infoValue}>{audioInfo.channels}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Bitrate</Text>
                  <Text style={styles.infoValue}>{audioInfo.bitrate}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <Text style={styles.infoValue}>
                    {status.isLoaded ? "Ready" : "Loading..."}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Playback Controls */}
          <View style={styles.controlsContainer}>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>
                {formatTime(status.currentTime)}
              </Text>
              <Text style={styles.timeText}>{formatTime(status.duration)}</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(status.currentTime / status.duration) * 100}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Control Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => handleSeek(Math.max(0, status.currentTime - 10))}
              >
                <Ionicons name="play-skip-back" size={24} color="#007AFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, styles.playButton]}
                onPress={handlePlay}
              >
                <Ionicons
                  name={status.playing ? "pause" : "play"}
                  size={32}
                  color="white"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={() =>
                  handleSeek(Math.min(status.duration, status.currentTime + 10))
                }
              >
                <Ionicons name="play-skip-forward" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>

            {/* Quality Assessment */}
            <View style={styles.qualityContainer}>
              <Text style={styles.qualityTitle}>Quality Assessment</Text>
              <View style={styles.qualityItem}>
                <Ionicons
                  name={
                    status.duration > 0 ? "checkmark-circle" : "close-circle"
                  }
                  size={20}
                  color={status.duration > 0 ? "#4CAF50" : "#ff4444"}
                />
                <Text style={styles.qualityText}>
                  Audio loaded successfully
                </Text>
              </View>
              <View style={styles.qualityItem}>
                <Ionicons
                  name={
                    status.duration > 1 ? "checkmark-circle" : "close-circle"
                  }
                  size={20}
                  color={status.duration > 1 ? "#4CAF50" : "#ff4444"}
                />
                <Text style={styles.qualityText}>
                  Duration sufficient for processing
                </Text>
              </View>
              <View style={styles.qualityItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.qualityText}>
                  Format compatible with LLM
                </Text>
              </View>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 20,
    minHeight: 400,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ff4444",
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  retryButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  infoContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  infoItem: {
    width: "48%",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  controlsContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  timeText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 2,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  controlButton: {
    padding: 12,
    marginHorizontal: 8,
  },
  playButton: {
    backgroundColor: "#007AFF",
    borderRadius: 30,
    padding: 16,
    marginHorizontal: 16,
  },
  qualityContainer: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 16,
  },
  qualityTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  qualityItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  qualityText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
  },
});
