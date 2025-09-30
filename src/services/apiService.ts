import { AudioData } from "../utils/audioUtils";
import { AppContext, VoiceServiceResponse } from "../types";

export class APIService {
  private static instance: APIService;
  private baseUrl: string;

  private constructor() {
    // Use the Expo API route
    this.baseUrl = __DEV__
      ? "http://192.168.1.109:8081" // Expo dev server (updated port)
      : "https://your-production-api.com"; // Replace with your production URL
  }

  static getInstance(): APIService {
    if (!APIService.instance) {
      APIService.instance = new APIService();
    }
    return APIService.instance;
  }

  async processAudio(
    audioData: AudioData,
    context: AppContext
  ): Promise<VoiceServiceResponse> {
    try {
      // Convert audio data to base64 for API transmission
      const audioUint8Array = await this.convertAudioToUint8Array(audioData);
      const base64Audio = this.uint8ArrayToBase64(audioUint8Array);
      const mediaType = this.getAudioMediaType(audioData);

      // Create system prompt
      const systemPrompt = this.getSystemPrompt(context);

      // Make API call
      console.log(`Making API call to: ${this.baseUrl}/api/ai/process-audio`);
      const response = await fetch(`${this.baseUrl}/api/ai/process-audio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audioData: {
            base64: base64Audio,
            mediaType: mediaType,
          },
          context,
          systemPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Unknown API error");
      }

      return {
        summary: result.summary,
        status: result.status,
        toolCalls: result.toolCalls,
        success: result.success,
      };
    } catch (error) {
      console.error("API service error:", error);
      return {
        summary: "Failed to process voice command. Please try again.",
        status: "error",
        toolCalls: [],
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async convertAudioToUint8Array(
    audioData: AudioData
  ): Promise<Uint8Array> {
    try {
      // If we already have the data as Uint8Array, use it
      if (audioData.data) {
        return audioData.data;
      }

      // If we have a blob, try to convert it
      if (audioData.blob) {
        if (typeof audioData.blob.arrayBuffer === "function") {
          const arrayBuffer = await audioData.blob.arrayBuffer();
          return new Uint8Array(arrayBuffer);
        } else if (typeof audioData.blob.stream === "function") {
          const stream = audioData.blob.stream();
          const reader = stream.getReader();
          const chunks: Uint8Array[] = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }

          const totalLength = chunks.reduce(
            (acc, chunk) => acc + chunk.length,
            0
          );
          const result = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
          }
          return result;
        }
      }

      // Fallback: try to fetch the URI and convert to Uint8Array
      if (audioData.uri) {
        try {
          const response = await fetch(audioData.uri);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            return new Uint8Array(arrayBuffer);
          }
        } catch (fetchError) {
          console.warn("Failed to fetch audio URI:", fetchError);
        }
      }

      throw new Error("Unable to convert audio data to Uint8Array");
    } catch (error) {
      console.error("Error converting audio to Uint8Array:", error);
      throw error;
    }
  }

  private uint8ArrayToBase64(uint8Array: Uint8Array): string {
    // Use a more compatible base64 encoding method
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let result = "";
    let i = 0;

    while (i < uint8Array.length) {
      const a = uint8Array[i++];
      const b = i < uint8Array.length ? uint8Array[i++] : 0;
      const c = i < uint8Array.length ? uint8Array[i++] : 0;

      const bitmap = (a << 16) | (b << 8) | c;

      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result +=
        i - 2 < uint8Array.length ? chars.charAt((bitmap >> 6) & 63) : "=";
      result += i - 1 < uint8Array.length ? chars.charAt(bitmap & 63) : "=";
    }

    return result;
  }

  private getAudioMediaType(audioData: AudioData): string {
    if (audioData.blob && audioData.blob.type) {
      return audioData.blob.type;
    }

    if (audioData.uri) {
      if (audioData.uri.includes(".m4a")) return "audio/m4a";
      if (audioData.uri.includes(".mp3")) return "audio/mpeg";
      if (audioData.uri.includes(".wav")) return "audio/wav";
      if (audioData.uri.includes(".aac")) return "audio/aac";
    }

    return "audio/m4a"; // Default for React Native recordings
  }

  private getSystemPrompt(context: AppContext): string {
    return `You are a medical AI assistant designed to help healthcare professionals manage patient data, generate reports, and perform various medical operations through audio commands.

## Your Role
You are an intelligent medical assistant that can:
- Process audio commands directly and execute medical data operations
- Understand medical terminology and context from speech
- Provide accurate, helpful responses about patient care
- Generate comprehensive medical reports
- Manage patient information, medications, vitals, and appointments

## Medical Context
You have access to a complete medical database including:
- Patient records with demographics, conditions, and medical history
- Vital signs and health metrics
- Current medications and prescriptions
- Medical reports and assessments
- Appointments and scheduling
- Clinician information

## Current Context
- Current screen: ${context.currentScreen}
- Current patient: ${
      context.currentPatient
        ? `${context.currentPatient.name} (ID: ${context.currentPatient.id}, Room: ${context.currentPatient.room})`
        : "None selected"
    }
- Current report: ${
      context.currentReport
        ? `${context.currentReport.title} (ID: ${context.currentReport.id})`
        : "None selected"
    }

## Response Guidelines
- Be professional and medically accurate
- Use clear, concise language
- Provide specific details about actions taken
- Confirm important changes (medications, vital signs, etc.)
- Suggest follow-up actions when appropriate
- Maintain patient privacy and confidentiality

## Audio Command Processing
When processing audio commands:
1. Listen carefully to the user's spoken request
2. Identify the intent (patient update, report generation, medication management, etc.)
3. Use the appropriate tools to execute the requested operations
4. Provide clear, concise feedback about what was accomplished
5. Handle errors gracefully and suggest alternatives when needed

Remember: You are working with real medical data, so accuracy and safety are paramount.`;
  }
}

// Export singleton instance
export const apiService = APIService.getInstance();
