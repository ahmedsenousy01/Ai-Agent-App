import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { PatientsScreen } from "./src/screens/PatientsScreen";
import { ReportsScreen } from "./src/screens/ReportsScreen";
import { PatientDetailsScreen } from "./src/screens/PatientDetailsScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { AudioPlaybackScreen } from "./src/screens/AudioPlaybackScreen";
import { FloatingAvatar } from "./src/components/FloatingAvatar";
import { Patient, Report, AppState, AppContext } from "./src/types";
import { voiceService } from "./src/services/voiceService";
import { useAudioRecording, audioService } from "./src/services/audioService";
import { initializeAgent } from "./src/ai/agent";
import { dataStore } from "./src/data/dataStore";
import { appConfig } from "./src/config/appConfig";
import { useDataStore } from "./src/hooks/useDataStore";

type Page = "home" | "patients" | "reports" | "settings" | "audio-playback";

// Use processing steps from config
const processingSteps = appConfig.ui.processingSteps;
const editingSteps = appConfig.ui.editingSteps;

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Initialize audio recording hook
  const audioRecording = useAudioRecording();

  // Subscribe to data store changes to keep selectedPatient in sync
  useDataStore();

  // Update selectedPatient when data changes
  useEffect(() => {
    if (selectedPatient) {
      const updatedPatient = dataStore.getPatient(selectedPatient.id);
      if (updatedPatient) {
        // Use shallow comparison instead of JSON.stringify for better performance
        const hasChanges = Object.keys(updatedPatient).some(
          (key) =>
            updatedPatient[key as keyof typeof updatedPatient] !==
            selectedPatient[key as keyof typeof selectedPatient]
        );
        if (hasChanges) {
          console.log("🟪 [App] Updating selected patient with fresh data");
          setSelectedPatient(updatedPatient);
        }
      }
    }
  }, [selectedPatient]); // Only run when selectedPatient changes

  const [state, setState] = useState<AppState>("idle");
  const [currentStatus, setCurrentStatus] = useState("");
  const [processedTask, setProcessedTask] = useState("");
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Sidebar animations - recreate on each toggle to ensure fresh animations
  const sidebarSlideAnim = useRef(new Animated.Value(-280)).current;
  const backdropFadeAnim = useRef(new Animated.Value(0)).current;

  // Initialize the app
  useEffect(() => {
    const initializeApp = async () => {
      console.log("🟪 [App] Initializing app...");
      console.log("🟪 [App] Note: API keys are handled server-side only");

      try {
        // Initialize the AI agent (no API key needed in mobile app)
        console.log("🟪 [App] Calling initializeAgent...");
        initializeAgent(); // No API key parameter needed
        console.log("🟪 [App] Agent initialized successfully");
        setIsInitialized(true);
        console.log("🟪 [App] App initialization completed");
      } catch (error) {
        console.error("🟪 [App] Failed to initialize app:", error);
        console.error("🟪 [App] Error details:", {
          name: error instanceof Error ? error.name : "Unknown",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        setIsInitialized(true); // Still allow the app to run
        console.log(
          "🟪 [App] App initialization completed with error (continuing anyway)"
        );
      }
    };

    initializeApp();
  }, []);

  // Initialize audio service with the hook
  useEffect(() => {
    audioService.setHook(audioRecording);
  }, [audioRecording]);

  useEffect(() => {
    if (sidebarOpen) {
      // Reset to start positions
      sidebarSlideAnim.setValue(-280);
      backdropFadeAnim.setValue(0);

      // Animate IN
      Animated.parallel([
        Animated.spring(sidebarSlideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(backdropFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate OUT
      Animated.parallel([
        Animated.spring(sidebarSlideAnim, {
          toValue: -280,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(backdropFadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [sidebarOpen]);

  const processVoiceCommand = async (recordingTime: number) => {
    console.log(
      "🟪 [App] processVoiceCommand - Starting voice command processing"
    );
    console.log("🟪 [App] Recording time:", recordingTime);
    console.log("🟪 [App] App initialized:", isInitialized);
    console.log("🟪 [App] Current page:", currentPage);
    console.log("🟪 [App] Selected patient:", selectedPatient?.id);
    console.log("🟪 [App] Editing report:", editingReport?.id);

    if (!isInitialized) {
      console.log("🟪 [App] App not initialized, setting status");
      setCurrentStatus("App not initialized yet");
      return;
    }

    setState("processing");
    setCurrentStatus("Processing voice command...");
    console.log("🟪 [App] State set to processing");

    try {
      // Get app context
      console.log("🟪 [App] Getting app context...");
      const context: AppContext = dataStore.getAppContext(
        currentPage,
        selectedPatient?.id,
        editingReport?.id
      );
      console.log("🟪 [App] App context obtained:", {
        currentScreen: context.currentScreen,
        currentPatient: context.currentPatient?.id,
        currentReport: context.currentReport?.id,
      });

      // Get the actual audio recording
      console.log("🟪 [App] Stopping recording to get audio result...");
      const audioResult = await voiceService.stopRecording();
      console.log("🟪 [App] Audio result received:", {
        hasResult: !!audioResult,
        hasUri: !!audioResult?.uri,
        hasBlob: !!audioResult?.blob,
        uri: audioResult?.uri,
      });

      if (!audioResult) {
        console.error("🟪 [App] No audio recording available");
        throw new Error("No audio recording available");
      }

      // Create AudioData object for processing
      const audioData = {
        uri: audioResult.uri,
        blob: audioResult.blob,
      };
      console.log("🟪 [App] AudioData object created:", {
        hasUri: !!audioData.uri,
        hasBlob: !!audioData.blob,
        uri: audioData.uri,
      });

      console.log("🟪 [App] Calling voiceService.processAudio...");
      const result = await voiceService.processAudio(audioData, context);
      console.log("🟪 [App] Voice service processing completed:", {
        success: result.success,
        status: result.status,
        toolCallsCount: result.toolCalls?.length || 0,
        hasSummary: !!result.summary,
        hasError: !!result.error,
        summary: result.summary?.substring(0, 100) + "...",
      });

      if (result.success) {
        console.log("🟪 [App] Processing successful, setting UI state");
        setCurrentStatus("Task completed");
        setProcessedTask(result.summary);

        // Sync any updated data from the backend
        if (result.updatedContext) {
          console.log("🟪 [App] Syncing updated data from backend");
          dataStore.syncFromServer(result.updatedContext);
        }

        setTimeout(() => {
          setState("complete");

          setTimeout(() => {
            setState("showing-summary");

            setTimeout(() => {
              setState(editingReport ? "editing" : "idle");
              setCurrentStatus("");
              setProcessedTask("");
            }, 3000);
          }, 2000);
        }, 1200);
      } else {
        console.log("🟪 [App] Processing failed, setting error state");
        setCurrentStatus("Error processing command");
        setProcessedTask(result.error || "Unknown error occurred");

        setTimeout(() => {
          setState(editingReport ? "editing" : "idle");
          setCurrentStatus("");
          setProcessedTask("");
        }, 3000);
      }
    } catch (error) {
      console.error("🟪 [App] Voice processing error:", error);
      console.error("🟪 [App] Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      setCurrentStatus("Error processing command");
      setProcessedTask("Failed to process voice command");

      setTimeout(() => {
        setState(editingReport ? "editing" : "idle");
        setCurrentStatus("");
        setProcessedTask("");
      }, 3000);
    }
  };

  const handleRecordingStart = async () => {
    try {
      const success = await voiceService.startRecording();
      if (success) {
        setState("recording");
        setCurrentStatus("Listening...");
      } else {
        setCurrentStatus("Failed to start recording");
        setTimeout(() => {
          setState(editingReport ? "editing" : "idle");
          setCurrentStatus("");
        }, 2000);
      }
    } catch (error) {
      console.error("Error starting recording:", error);
      setCurrentStatus("Error starting recording");
      setTimeout(() => {
        setState(editingReport ? "editing" : "idle");
        setCurrentStatus("");
      }, 2000);
    }
  };

  const handleRecordingStop = async (recordingTime: number) => {
    if (recordingTime >= 800) {
      processVoiceCommand(recordingTime);
    } else {
      // Stop recording even if it was too short
      try {
        await voiceService.stopRecording();
      } catch (error) {
        console.error("Error stopping recording:", error);
      }
      setState(editingReport ? "editing" : "idle");
      setCurrentStatus("");
    }
  };

  const handleNewTask = () => {
    setState(editingReport ? "editing" : "idle");
    setCurrentStatus("");
    setProcessedTask("");
  };

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    setSelectedPatient(null);
    setSidebarOpen(false);
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
  };

  const handlePatientBack = () => {
    setSelectedPatient(null);
  };

  const handleEditReport = (report: Report) => {
    setEditingReport(report);
    setState("editing");
  };

  const handleEditComplete = () => {
    setEditingReport(null);
    setState("idle");
    setCurrentStatus("");
    setProcessedTask("");
  };

  const getPageTitle = () => {
    if (selectedPatient) return "Patient Details";
    switch (currentPage) {
      case "home":
        return "Home";
      case "patients":
        return "Patients";
      case "reports":
        return "Reports";
      case "settings":
        return "Settings";
      case "audio-playback":
        return "Audio Playback";
      default:
        return "Home";
    }
  };

  const renderContent = () => {
    if (selectedPatient) {
      return (
        <PatientDetailsScreen
          patient={selectedPatient}
          onBack={handlePatientBack}
        />
      );
    }

    switch (currentPage) {
      case "home":
        return (
          <DashboardScreen
            state={state}
            currentStatus={currentStatus}
            processedTask={processedTask}
            onRecordingStart={handleRecordingStart}
            onRecordingStop={handleRecordingStop}
            onNewTask={handleNewTask}
          />
        );
      case "patients":
        return <PatientsScreen onPatientSelect={handlePatientSelect} />;
      case "reports":
        return <ReportsScreen onEditReport={handleEditReport} />;
      case "settings":
        return <SettingsScreen />;
      case "audio-playback":
        return <AudioPlaybackScreen />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header (shown on non-home pages) */}
      {(currentPage !== "home" || selectedPatient) && (
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setSidebarOpen(!sidebarOpen)}
            style={styles.menuButton}
          >
            <Ionicons name="menu" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{getPageTitle()}</Text>
          <View style={{ width: 40 }} />
        </View>
      )}

      {/* Home Header (only on home) */}
      {currentPage === "home" && !selectedPatient && (
        <View style={styles.homeHeader}>
          <TouchableOpacity
            onPress={() => setSidebarOpen(!sidebarOpen)}
            style={styles.menuButton}
          >
            <View style={styles.hamburger}>
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content */}
      <View style={styles.content}>{renderContent()}</View>

      {/* Footer (only shown on home) */}
      {currentPage === "home" && !selectedPatient && (
        <View style={styles.footer}>
          <View style={styles.badge}>
            <View style={[styles.dot, { backgroundColor: "#10b981" }]} />
            <Text style={styles.badgeText}>SECURE</Text>
          </View>
          <View style={styles.badge}>
            <View style={[styles.dot, { backgroundColor: "#3b82f6" }]} />
            <Text style={styles.badgeText}>HIPAA COMPLIANT</Text>
          </View>
          <View style={styles.badge}>
            <View style={[styles.dot, { backgroundColor: "#8b5cf6" }]} />
            <Text style={styles.badgeText}>ENCRYPTED</Text>
          </View>
        </View>
      )}

      {/* Floating Avatar (visible on all pages except home and settings) */}
      <FloatingAvatar
        isVisible={
          currentPage !== "home" &&
          currentPage !== "settings" &&
          currentPage !== "audio-playback" &&
          !selectedPatient
        }
        onRecordingStart={handleRecordingStart}
        onRecordingStop={handleRecordingStop}
        state={state}
        editingItem={editingReport?.title}
        onEditComplete={handleEditComplete}
        processedTask={processedTask}
      />

      {/* Sidebar */}
      {sidebarOpen && (
        <>
          <Animated.View
            style={[styles.backdrop, { opacity: backdropFadeAnim }]}
            pointerEvents={sidebarOpen ? "auto" : "none"}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={() => setSidebarOpen(false)}
              activeOpacity={1}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.sidebar,
              { transform: [{ translateX: sidebarSlideAnim }] },
            ]}
          >
            <View style={styles.sidebarHeader}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoEmoji}>🏥</Text>
              </View>
              <Text style={styles.sidebarTitle}>MEDICAL AI</Text>
              <TouchableOpacity onPress={() => setSidebarOpen(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.nav}>
              {[
                { id: "home", label: "Home", icon: "home" },
                { id: "patients", label: "Patients", icon: "people" },
                { id: "reports", label: "Reports", icon: "document-text" },
                {
                  id: "audio-playback",
                  label: "Audio Playback",
                  icon: "musical-notes",
                },
                { id: "settings", label: "Settings", icon: "settings" },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.navItem,
                    currentPage === item.id && styles.navItemActive,
                  ]}
                  onPress={() => handleNavigate(item.id as Page)}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={20}
                    color={currentPage === item.id ? "#3b82f6" : "#64748b"}
                  />
                  <Text
                    style={[
                      styles.navText,
                      currentPage === item.id && styles.navTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sidebarFooter}>
              <View style={styles.profileCard}>
                <View style={styles.profileAvatar}>
                  <View style={styles.profileDot} />
                </View>
                <View>
                  <Text style={styles.profileName}>Dr. Sarah Chen</Text>
                  <Text style={styles.profileRole}>Cardiologist</Text>
                </View>
              </View>
              <View style={styles.statusRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.statusText}>ONLINE</Text>
                <Text style={styles.statusId}>ID: 12345</Text>
              </View>
            </View>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  homeHeader: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingLeft: 24,
  },
  menuButton: {
    padding: 8,
  },
  hamburger: {
    width: 24,
    height: 24,
    justifyContent: "center",
    gap: 4,
  },
  hamburgerLine: {
    width: 24,
    height: 2,
    backgroundColor: "#475569",
    borderRadius: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
  },
  content: {
    flex: 1,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 50,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    backgroundColor: "white",
    zIndex: 51,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  logoContainer: {
    width: 32,
    height: 32,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  logoEmoji: {
    fontSize: 20,
  },
  sidebarTitle: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    letterSpacing: 1,
  },
  nav: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  navItemActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  navText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#64748b",
  },
  navTextActive: {
    color: "#3b82f6",
  },
  sidebarFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 12,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
  },
  profileDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "white",
  },
  profileName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
  },
  profileRole: {
    fontSize: 11,
    color: "#64748b",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10b981",
  },
  statusText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },
  statusId: {
    fontSize: 11,
    color: "#94a3b8",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
    paddingBottom: 24,
    gap: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    letterSpacing: 1,
  },
});
