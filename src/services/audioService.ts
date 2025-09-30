import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  type RecordingOptions,
} from "expo-audio";
import { useCallback, useRef, useState } from "react";

// Custom hook for audio recording that can be used in React components
export const useAudioRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recordingStartTime = useRef<number>(0);

  // Create audio recorder with high quality preset optimized for speech/LLM
  const recordingOptions: RecordingOptions = {
    ...RecordingPresets.HIGH_QUALITY,
    // Optimize for speech recognition and LLM processing
    sampleRate: 44100,
    numberOfChannels: 1, // Mono is better for speech
    bitRate: 128000,
    isMeteringEnabled: true, // Enable metering for audio level monitoring
  };

  const audioRecorder = useAudioRecorder(recordingOptions);
  const recorderState = useAudioRecorderState(audioRecorder);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      // First check if we already have permissions
      const currentStatus = await getRecordingPermissionsAsync();
      if (currentStatus.granted) {
        return true;
      }

      // Request permissions if not granted
      const { granted } = await requestRecordingPermissionsAsync();
      return granted;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setError(`Permission error: ${errorMessage}`);
      console.error("Error requesting audio permissions:", error);
      return false;
    }
  }, []);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);

      if (isRecording) {
        console.warn("Recording is already in progress");
        return false;
      }

      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setError("Audio recording permission not granted");
        return false;
      }

      // Configure audio mode for recording
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: false,
        shouldPlayInBackground: false,
      });

      // Prepare the recorder
      await audioRecorder.prepareToRecordAsync();

      // Start recording
      audioRecorder.record();
      recordingStartTime.current = Date.now();
      setIsRecording(true);
      setRecordingUri(null);

      console.log("Recording started successfully");
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setError(`Recording error: ${errorMessage}`);
      console.error("Error starting recording:", error);
      setIsRecording(false);
      return false;
    }
  }, [isRecording, requestPermissions, audioRecorder]);

  const stopRecording = useCallback(async (): Promise<{
    uri: string;
    blob?: Blob;
  } | null> => {
    try {
      setError(null);

      if (!isRecording) {
        console.warn("No active recording to stop");
        return null;
      }

      // Stop the recording
      await audioRecorder.stop();

      const uri = audioRecorder.uri;
      const duration = Date.now() - recordingStartTime.current;

      setIsRecording(false);
      setRecordingUri(uri);

      if (!uri) {
        setError("No recording URI available");
        return null;
      }

      console.log(`Recording stopped. Duration: ${duration}ms, URI: ${uri}`);

      // Create a blob for AI processing
      let blob: Blob | undefined;
      try {
        // Try to create blob from URI using fetch
        const response = await fetch(uri);
        if (response.ok) {
          blob = await response.blob();
        } else {
          console.warn("Failed to fetch audio URI:", response.status);
        }
      } catch (fetchError) {
        console.warn("Could not create blob from URI:", fetchError);
        // Fallback: create a minimal blob with the URI as reference
        // This is a workaround for React Native environments
        blob = new Blob([uri], { type: "audio/m4a" });
      }

      return { uri, blob };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setError(`Stop recording error: ${errorMessage}`);
      console.error("Error stopping recording:", error);
      setIsRecording(false);
      return null;
    }
  }, [isRecording, audioRecorder]);

  const getRecordingDuration = useCallback((): number => {
    if (!isRecording || recordingStartTime.current === 0) {
      return 0;
    }
    return Date.now() - recordingStartTime.current;
  }, [isRecording]);

  const getAudioLevel = useCallback((): number => {
    return recorderState.metering || 0;
  }, [recorderState.metering]);

  // Method to prepare audio for LLM consumption
  const prepareAudioForLLM = useCallback(
    async (
      uri: string
    ): Promise<{ uri: string; format: string; size?: number }> => {
      try {
        // For LLM integration, we want to ensure the audio is in a compatible format
        // Most LLMs work well with MP3, WAV, or M4A formats
        const format = uri.includes(".m4a")
          ? "m4a"
          : uri.includes(".mp3")
          ? "mp3"
          : uri.includes(".wav")
          ? "wav"
          : "unknown";

        let size: number | undefined;
        if (typeof window !== "undefined" && window.fetch) {
          try {
            const response = await fetch(uri);
            const blob = await response.blob();
            size = blob.size;
          } catch (error) {
            console.warn("Could not determine file size:", error);
          }
        }

        return { uri, format, size };
      } catch (error) {
        console.error("Error preparing audio for LLM:", error);
        throw error;
      }
    },
    []
  );

  return {
    // State
    isRecording,
    recordingUri,
    error,
    recorderState,

    // Methods
    startRecording,
    stopRecording,
    requestPermissions,
    getRecordingDuration,
    getAudioLevel,
    prepareAudioForLLM,

    // Recorder instance for advanced usage
    audioRecorder,
  };
};

// Service class that provides a bridge for non-React code
export class AudioService {
  private static instance: AudioService;
  private currentHook: ReturnType<typeof useAudioRecording> | null = null;

  private constructor() {}

  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  // This method should be called from a React component to register the hook
  setHook(hook: ReturnType<typeof useAudioRecording>): void {
    this.currentHook = hook;
  }

  async startRecording(): Promise<boolean> {
    if (!this.currentHook) {
      throw new Error(
        "AudioService hook not initialized. Call setHook() from a React component first."
      );
    }
    return await this.currentHook.startRecording();
  }

  async stopRecording(): Promise<{ uri: string; blob?: Blob } | null> {
    if (!this.currentHook) {
      throw new Error(
        "AudioService hook not initialized. Call setHook() from a React component first."
      );
    }
    return await this.currentHook.stopRecording();
  }

  isCurrentlyRecording(): boolean {
    return this.currentHook?.isRecording || false;
  }

  getRecordingDuration(): number {
    return this.currentHook?.getRecordingDuration() || 0;
  }

  getAudioLevel(): number {
    return this.currentHook?.getAudioLevel() || 0;
  }

  async prepareAudioForLLM(
    uri: string
  ): Promise<{ uri: string; format: string; size?: number }> {
    if (!this.currentHook) {
      throw new Error(
        "AudioService hook not initialized. Call setHook() from a React component first."
      );
    }
    return await this.currentHook.prepareAudioForLLM(uri);
  }

  getError(): string | null {
    return this.currentHook?.error || null;
  }
}

// Export singleton instance
export const audioService = AudioService.getInstance();
