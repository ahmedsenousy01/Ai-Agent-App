import { VoiceServiceResponse, AppContext } from "../types";
import { audioService } from "./audioService";
import { apiService } from "./apiService";
import { AudioData } from "../utils/audioUtils";

export class VoiceService {
  private static instance: VoiceService;
  private isProcessing = false;

  private constructor() {}

  static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  async startRecording(): Promise<boolean> {
    return await audioService.startRecording();
  }

  async stopRecording(): Promise<{ uri: string; blob?: Blob } | null> {
    return await audioService.stopRecording();
  }

  async processAudio(
    audioData: AudioData,
    context: AppContext
  ): Promise<VoiceServiceResponse> {
    console.log("🔴 [VoiceService] Starting processAudio");
    console.log("🔴 [VoiceService] Audio data received:", {
      hasData: !!audioData.data,
      hasBlob: !!audioData.blob,
      hasUri: !!audioData.uri,
      dataLength: audioData.data?.length,
      blobType: audioData.blob?.type,
      uri: audioData.uri,
    });
    console.log("🔴 [VoiceService] Context received:", {
      currentScreen: context.currentScreen,
      currentPatient: context.currentPatient?.id,
      currentReport: context.currentReport?.id,
    });

    if (this.isProcessing) {
      console.log(
        "🔴 [VoiceService] Already processing, returning busy status"
      );
      return {
        summary: "Already processing a request. Please wait.",
        status: "busy",
        toolCalls: [],
        success: false,
        error: "Another request is being processed",
      };
    }

    this.isProcessing = true;
    console.log("🔴 [VoiceService] Set processing flag to true");

    try {
      // Use API service to process audio
      console.log("🔴 [VoiceService] Calling API service processAudio...");
      const result = await apiService.processAudio(audioData, context);
      console.log("🔴 [VoiceService] API service processing completed:", {
        success: result.success,
        status: result.status,
        toolCallsCount: result.toolCalls?.length || 0,
        hasSummary: !!result.summary,
        hasError: !!result.error,
      });

      return result;
    } catch (error) {
      console.error("🔴 [VoiceService] Voice service error:", error);
      console.error("🔴 [VoiceService] Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        summary: "Failed to process voice command. Please try again.",
        status: "error",
        toolCalls: [],
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      this.isProcessing = false;
      console.log("🔴 [VoiceService] Set processing flag to false");
    }
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }
}

// Export singleton instance
export const voiceService = VoiceService.getInstance();
