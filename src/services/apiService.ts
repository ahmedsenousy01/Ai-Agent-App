import { AudioData } from "../utils/audioUtils";
import { AppContext, VoiceServiceResponse } from "../types";
import Constants from "expo-constants";
import { dataStore } from "../data/dataStore";

export class APIService {
  private static instance: APIService;
  private baseUrl: string;

  private constructor() {
    // Use the Expo API route - get the correct IP from Expo
    // For mobile devices, we need to use the network IP, not localhost
    if (__DEV__) {
      // Try to get the development server URL from Expo constants
      const expoServerUrl = Constants.expoConfig?.hostUri;
      console.log("🔵 [APIService] Expo hostUri:", expoServerUrl);

      if (expoServerUrl) {
        this.baseUrl = `http://${expoServerUrl}`;
        console.log(
          "🔵 [APIService] Using Expo hostUri for baseUrl:",
          this.baseUrl
        );
      } else {
        // Fallback to the IP from the logs
        this.baseUrl = "http://192.168.8.109:8081";
        console.log("🔵 [APIService] Using fallback baseUrl:", this.baseUrl);
      }
    } else {
      this.baseUrl = "https://your-production-api.com"; // Replace with your production URL
    }

    console.log("🔵 [APIService] Final baseUrl:", this.baseUrl);
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
    console.log("🔵 [APIService] Starting processAudio");
    console.log("🔵 [APIService] Audio data received:", {
      hasData: !!audioData.data,
      hasBlob: !!audioData.blob,
      hasUri: !!audioData.uri,
      dataLength: audioData.data?.length,
      blobType: audioData.blob?.type,
      uri: audioData.uri,
    });
    console.log("🔵 [APIService] Context received:", {
      currentScreen: context.currentScreen,
      currentPatient: context.currentPatient?.id,
      currentReport: context.currentReport?.id,
    });

    try {
      // Convert audio data to base64 for API transmission
      console.log("🔵 [APIService] Converting audio to Uint8Array...");
      const audioUint8Array = await this.convertAudioToUint8Array(audioData);
      console.log(
        "🔵 [APIService] Audio converted to Uint8Array, length:",
        audioUint8Array.length
      );

      console.log("🔵 [APIService] Converting to base64...");
      const base64Audio = this.uint8ArrayToBase64(audioUint8Array);
      console.log(
        "🔵 [APIService] Base64 conversion complete, length:",
        base64Audio.length
      );

      const mediaType = this.getAudioMediaType(audioData);
      console.log("🔵 [APIService] Detected media type:", mediaType);

      // Create system prompt
      console.log("🔵 [APIService] Creating system prompt...");
      const systemPrompt = this.getSystemPrompt(context);
      console.log(
        "🔵 [APIService] System prompt created, length:",
        systemPrompt.length
      );

      // Prepare request payload
      const requestPayload = {
        audioData: {
          base64: base64Audio,
          mediaType: mediaType,
        },
        context,
        systemPrompt,
      };
      console.log("🔵 [APIService] Request payload prepared:", {
        audioDataSize: requestPayload.audioData.base64.length,
        mediaType: requestPayload.audioData.mediaType,
        contextKeys: Object.keys(requestPayload.context),
        systemPromptLength: requestPayload.systemPrompt.length,
      });

      // Make API call
      const apiUrl = `${this.baseUrl}/api/ai/process-audio`;
      console.log("🔵 [APIService] Making API call to:", apiUrl);
      console.log("🔵 [APIService] Base URL:", this.baseUrl);
      console.log("🔵 [APIService] Full URL:", apiUrl);

      // Make the API request with proper timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("🔵 [APIService] Response received:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("🔴 [APIService] API request failed:", {
          status: response.status,
          statusText: response.statusText,
          errorText,
        });
        throw new Error(
          `API request failed: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      console.log("🔵 [APIService] Parsing response JSON...");
      const result = await response.json();
      console.log("🔵 [APIService] Response parsed:", {
        success: result.success,
        status: result.status,
        hasSummary: !!result.summary,
        toolCallsCount: result.toolCalls?.length || 0,
        hasError: !!result.error,
        fullResponse: result.fullResponse?.substring(0, 100) + "...",
      });

      if (!result.success) {
        console.error(
          "🔴 [APIService] API returned success: false",
          result.error
        );
        throw new Error(result.error || "Unknown API error");
      }

      // Sync updated data with client-side data store
      if (result.updatedContext) {
        console.log(
          "🔵 [APIService] Syncing updated context with client data store"
        );
        this.syncDataStore(result.updatedContext);
      }

      const finalResult = {
        summary: result.summary,
        status: result.status,
        toolCalls: result.toolCalls,
        success: result.success,
      };
      console.log("🔵 [APIService] Returning successful result:", {
        summaryLength: finalResult.summary?.length,
        status: finalResult.status,
        toolCallsCount: finalResult.toolCalls?.length,
      });

      return finalResult;
    } catch (error) {
      console.error("🔴 [APIService] Error in processAudio:", error);
      console.error("🔴 [APIService] Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Handle specific error types
      let errorMessage = "Failed to process voice command. Please try again.";
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage =
            "Request timed out. Please try again with a shorter audio clip.";
        } else if (error.message.includes("fetch")) {
          errorMessage =
            "Network error. Please check your connection and try again.";
        } else {
          errorMessage = error.message;
        }
      }

      return {
        summary: errorMessage,
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
    console.log(
      "🔵 [APIService] convertAudioToUint8Array - Starting conversion"
    );
    try {
      // If we already have the data as Uint8Array, use it
      if (audioData.data) {
        console.log(
          "🔵 [APIService] Using existing Uint8Array data, length:",
          audioData.data.length
        );
        return audioData.data;
      }

      // If we have a blob, try to convert it
      if (audioData.blob) {
        console.log(
          "🔵 [APIService] Converting blob to Uint8Array, blob type:",
          audioData.blob.type
        );
        if (typeof audioData.blob.arrayBuffer === "function") {
          console.log("🔵 [APIService] Using arrayBuffer() method");
          const arrayBuffer = await audioData.blob.arrayBuffer();
          const result = new Uint8Array(arrayBuffer);
          console.log(
            "🔵 [APIService] Blob converted via arrayBuffer, length:",
            result.length
          );
          return result;
        } else if (typeof audioData.blob.stream === "function") {
          console.log("🔵 [APIService] Using stream() method");
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
          console.log(
            "🔵 [APIService] Blob converted via stream, length:",
            result.length
          );
          return result;
        } else {
          console.warn(
            "🔴 [APIService] Blob has neither arrayBuffer nor stream method"
          );
        }
      }

      // Fallback: try to fetch the URI and convert to Uint8Array
      if (audioData.uri) {
        console.log("🔵 [APIService] Fetching audio from URI:", audioData.uri);
        try {
          const response = await fetch(audioData.uri);
          console.log("🔵 [APIService] URI fetch response:", {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
          });
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const result = new Uint8Array(arrayBuffer);
            console.log(
              "🔵 [APIService] URI audio converted, length:",
              result.length
            );
            return result;
          }
        } catch (fetchError) {
          console.error(
            "🔴 [APIService] Failed to fetch audio URI:",
            fetchError
          );
        }
      }

      console.error(
        "🔴 [APIService] Unable to convert audio data to Uint8Array - no valid data source found"
      );
      throw new Error("Unable to convert audio data to Uint8Array");
    } catch (error) {
      console.error(
        "🔴 [APIService] Error converting audio to Uint8Array:",
        error
      );
      throw error;
    }
  }

  private uint8ArrayToBase64(uint8Array: Uint8Array): string {
    console.log(
      "🔵 [APIService] uint8ArrayToBase64 - Starting conversion, input length:",
      uint8Array.length
    );
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

    console.log(
      "🔵 [APIService] Base64 conversion complete, output length:",
      result.length
    );
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

  private syncDataStore(updatedContext: AppContext): void {
    console.log("🔵 [APIService] Starting data store sync");
    try {
      dataStore.syncFromServer(updatedContext);
      console.log("🔵 [APIService] Data store sync completed successfully");
    } catch (error) {
      console.error("🔴 [APIService] Error syncing data store:", error);
    }
  }
}

// Export singleton instance
export const apiService = APIService.getInstance();
