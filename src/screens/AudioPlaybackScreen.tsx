import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AudioPlayer } from "../components/AudioPlayer";
import { useAudioRecording } from "../services/audioService";

interface AudioRecording {
  id: string;
  uri: string;
  timestamp: Date;
  duration: number;
  size?: number;
}

export const AudioPlaybackScreen: React.FC = () => {
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);
  const [selectedRecording, setSelectedRecording] =
    useState<AudioRecording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const audioRecording = useAudioRecording();

  // Load saved recordings (in a real app, this would come from storage)
  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    // In a real implementation, this would load from AsyncStorage or a database
    // For now, we'll use a simple in-memory storage
    const savedRecordings = await getSavedRecordings();
    setRecordings(savedRecordings);
  };

  const getSavedRecordings = async (): Promise<AudioRecording[]> => {
    // Mock implementation - in a real app, this would load from storage
    return [];
  };

  const saveRecording = async (recording: AudioRecording) => {
    // In a real implementation, this would save to AsyncStorage or a database
    const updatedRecordings = [...recordings, recording];
    setRecordings(updatedRecordings);
  };

  const handleStartRecording = async () => {
    try {
      setIsLoading(true);
      const success = await audioRecording.startRecording();

      if (success) {
        setIsRecording(true);
      } else {
        Alert.alert(
          "Recording Failed",
          "Could not start recording. Please check permissions."
        );
      }
    } catch (error) {
      console.error("Error starting recording:", error);
      Alert.alert("Recording Error", "Failed to start recording");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsLoading(true);
      const result = await audioRecording.stopRecording();

      if (result && result.uri) {
        const newRecording: AudioRecording = {
          id: Date.now().toString(),
          uri: result.uri,
          timestamp: new Date(),
          duration: audioRecording.getRecordingDuration(),
          size: result.blob?.size,
        };

        await saveRecording(newRecording);
        setSelectedRecording(newRecording);
        Alert.alert(
          "Recording Saved",
          "Audio recording has been saved successfully!"
        );
      } else {
        Alert.alert("Recording Failed", "No audio was recorded");
      }
    } catch (error) {
      console.error("Error stopping recording:", error);
      Alert.alert("Recording Error", "Failed to stop recording");
    } finally {
      setIsRecording(false);
      setIsLoading(false);
    }
  };

  const handleDeleteRecording = (recordingId: string) => {
    Alert.alert(
      "Delete Recording",
      "Are you sure you want to delete this recording?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updatedRecordings = recordings.filter(
              (r) => r.id !== recordingId
            );
            setRecordings(updatedRecordings);

            if (selectedRecording?.id === recordingId) {
              setSelectedRecording(null);
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "Unknown";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Audio Playback</Text>
            <Text style={styles.subtitle}>
              Test and review your audio recordings
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording ? styles.recordingButton : styles.idleButton,
            ]}
            onPress={isRecording ? handleStopRecording : handleStartRecording}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons
                name={isRecording ? "stop" : "mic"}
                size={24}
                color="white"
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Recording Status */}
      {isRecording && (
        <View style={styles.recordingStatus}>
          <View style={styles.recordingIndicator} />
          <Text style={styles.recordingText}>
            Recording... {formatDuration(audioRecording.getRecordingDuration())}
          </Text>
        </View>
      )}

      {audioRecording.error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color="#ff4444" />
          <Text style={styles.errorText}>{audioRecording.error}</Text>
        </View>
      )}

      {/* Recordings List */}
      <View style={styles.recordingsSection}>
        <Text style={styles.sectionTitle}>
          Saved Recordings ({recordings.length})
        </Text>

        {recordings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="mic-off" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No recordings yet</Text>
            <Text style={styles.emptySubtext}>
              Start recording to test audio quality
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.recordingsList}>
            {recordings.map((recording) => (
              <TouchableOpacity
                key={recording.id}
                style={[
                  styles.recordingItem,
                  selectedRecording?.id === recording.id &&
                    styles.selectedRecording,
                ]}
                onPress={() => setSelectedRecording(recording)}
              >
                <View style={styles.recordingInfo}>
                  <Text style={styles.recordingTitle}>
                    Recording {recording.id.slice(-4)}
                  </Text>
                  <Text style={styles.recordingDetails}>
                    {formatTimestamp(recording.timestamp)} •{" "}
                    {formatDuration(recording.duration)} •{" "}
                    {formatFileSize(recording.size)}
                  </Text>
                </View>
                <View style={styles.recordingActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setSelectedRecording(recording)}
                  >
                    <Ionicons name="play" size={20} color="#007AFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteRecording(recording.id)}
                  >
                    <Ionicons name="trash" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Audio Player */}
      {selectedRecording && (
        <View style={styles.playerSection}>
          <AudioPlayer
            audioUri={selectedRecording.uri}
            onClose={() => setSelectedRecording(null)}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  recordButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  idleButton: {
    backgroundColor: "#4CAF50",
  },
  recordingButton: {
    backgroundColor: "#ff4444",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  recordingStatus: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    padding: 12,
    backgroundColor: "white",
    borderRadius: 8,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ff4444",
    marginRight: 8,
  },
  recordingText: {
    fontSize: 16,
    color: "#ff4444",
    fontWeight: "500",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    padding: 12,
    backgroundColor: "#ffebee",
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#ff4444",
    marginLeft: 8,
    flex: 1,
  },
  recordingsSection: {
    flex: 1,
    margin: 16,
    marginTop: 0,
    marginBottom: 0,
  },
  recordingsList: {
    maxHeight: 150,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "white",
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  recordingItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedRecording: {
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  recordingInfo: {
    flex: 1,
  },
  recordingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  recordingDetails: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  recordingActions: {
    flexDirection: "row",
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  playerSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    height: "70%",
    minHeight: 400,
  },
});
