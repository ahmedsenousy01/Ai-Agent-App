import { VoiceServiceResponse, AppContext } from "../types";
import { getAgent } from "../ai/agent";
import { audioService } from "./audioService";

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
    audioBlob: Blob,
    context: AppContext
  ): Promise<VoiceServiceResponse> {
    if (this.isProcessing) {
      return {
        summary: "Already processing a request. Please wait.",
        status: "busy",
        toolCalls: [],
        success: false,
        error: "Another request is being processed",
      };
    }

    this.isProcessing = true;

    try {
      const agent = getAgent();
      const result = await agent.processAudio(audioBlob, context);
      return result;
    } catch (error) {
      console.error("Voice service error:", error);
      return {
        summary: "Failed to process voice command. Please try again.",
        status: "error",
        toolCalls: [],
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      this.isProcessing = false;
    }
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }
}

// Export singleton instance
export const voiceService = VoiceService.getInstance();
