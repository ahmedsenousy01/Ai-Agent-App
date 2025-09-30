// Client-side streaming AI service - delegates to API route
import { AppContext, VoiceServiceResponse } from "../types";
import {
  convertAudioToUint8Array,
  getAudioMediaType,
  validateAudioData,
  AudioData,
} from "../utils/audioUtils";

export interface StreamingCallback {
  onStatusUpdate: (status: string) => void;
  onStreamingText: (text: string) => void;
  onToolCall: (toolName: string, args: any) => void;
  onToolResult: (toolName: string, result: any) => void;
  onComplete: (result: VoiceServiceResponse) => void;
  onError: (error: string) => void;
}

export class StreamingAIService {
  private model: any;
  private isProcessing = false;

  constructor() {
    console.log(
      "🟠 [StreamingAIService] Constructor called (API keys handled server-side)"
    );
    console.log(
      "🟠 [StreamingAIService] Note: This service is for client-side use only"
    );
    console.log(
      "🟠 [StreamingAIService] Actual AI processing happens in API route"
    );
  }

  async processAudioWithStreaming(
    audioData: AudioData,
    context: AppContext,
    callbacks: StreamingCallback
  ): Promise<void> {
    console.log("🟠 [StreamingAIService] Starting processAudioWithStreaming");
    console.log("🟠 [StreamingAIService] Audio data received:", {
      hasData: !!audioData.data,
      hasBlob: !!audioData.blob,
      hasUri: !!audioData.uri,
      dataLength: audioData.data?.length,
      blobType: audioData.blob?.type,
      uri: audioData.uri,
    });
    console.log("🟠 [StreamingAIService] Context received:", {
      currentScreen: context.currentScreen,
      currentPatient: context.currentPatient?.id,
      currentReport: context.currentReport?.id,
    });

    if (this.isProcessing) {
      console.log(
        "🟠 [StreamingAIService] Already processing, returning busy status"
      );
      callbacks.onError("Already processing a request. Please wait.");
      return;
    }

    this.isProcessing = true;
    console.log("🟠 [StreamingAIService] Set processing flag to true");

    try {
      callbacks.onStatusUpdate("Processing audio with AI...");
      console.log(
        "🟠 [StreamingAIService] Status update sent: Processing audio with AI..."
      );

      // Validate audio data
      console.log("🟠 [StreamingAIService] Validating audio data...");
      if (!validateAudioData(audioData)) {
        console.error("🔴 [StreamingAIService] Audio data validation failed");
        throw new Error("Invalid audio data provided");
      }
      console.log("🟠 [StreamingAIService] Audio data validation passed");

      // Process audio via API route (server-side processing)
      console.log("🟠 [StreamingAIService] Starting API route processing...");
      await this.processAudioViaAPI(audioData, context, callbacks);
      console.log("🟠 [StreamingAIService] API route processing completed");
    } catch (error) {
      console.error("🔴 [StreamingAIService] AI processing error:", error);
      console.error("🔴 [StreamingAIService] Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      callbacks.onError(
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      this.isProcessing = false;
      console.log("🟠 [StreamingAIService] Set processing flag to false");
    }
  }

  private async processAudioViaAPI(
    audioData: AudioData,
    context: AppContext,
    callbacks: StreamingCallback
  ): Promise<void> {
    console.log(
      "🟠 [StreamingAIService] processAudioViaAPI - Starting API route processing"
    );
    try {
      callbacks.onStatusUpdate("Sending audio to AI service...");
      console.log(
        "🟠 [StreamingAIService] Status update sent: Sending audio to AI service..."
      );

      // Convert audio data to base64 for API transmission
      console.log("🟠 [StreamingAIService] Converting audio data...");
      const audioUint8Array = await convertAudioToUint8Array(audioData);
      const mediaType = getAudioMediaType(audioData);

      // Convert to base64
      const base64Audio = btoa(String.fromCharCode(...audioUint8Array));
      console.log(
        "🟠 [StreamingAIService] Audio converted to base64, length:",
        base64Audio.length,
        "type:",
        mediaType
      );

      // Get system prompt
      const systemPrompt = this.getSystemPrompt(context);

      // Prepare request payload
      const requestPayload = {
        audioData: {
          base64: base64Audio,
          mediaType: mediaType,
        },
        context: context,
        systemPrompt: systemPrompt,
      };

      console.log("🟠 [StreamingAIService] Sending request to API route...");

      // Make API request
      const response = await fetch("/api/ai/process-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API request failed: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const result = await response.json();
      console.log("🟠 [StreamingAIService] API response received:", {
        success: result.success,
        summaryLength: result.summary?.length || 0,
        toolCallsCount: result.toolCalls?.length || 0,
      });

      // Simulate streaming by sending the response in chunks
      if (result.fullResponse) {
        callbacks.onStatusUpdate("Processing AI response...");
        callbacks.onStreamingText(result.fullResponse);
      }

      // Process tool calls
      if (result.toolCalls && result.toolCalls.length > 0) {
        callbacks.onStatusUpdate("Executing medical operations...");
        for (const toolCall of result.toolCalls) {
          callbacks.onToolCall(toolCall.tool, toolCall.args);
          callbacks.onToolResult(toolCall.tool, toolCall.result);
        }
      }

      callbacks.onStatusUpdate("Task completed");
      console.log("🟠 [StreamingAIService] Status update sent: Task completed");

      const finalResponse = {
        summary: result.summary || "Task completed successfully",
        status: result.status || "completed",
        toolCalls: result.toolCalls || [],
        success: result.success || true,
      };

      console.log("🟠 [StreamingAIService] Calling onComplete with response:", {
        summaryLength: finalResponse.summary.length,
        toolCallsCount: finalResponse.toolCalls.length,
      });

      callbacks.onComplete(finalResponse);
    } catch (error) {
      console.error(
        "🔴 [StreamingAIService] API processing error in processAudioViaAPI:",
        error
      );
      console.error("🔴 [StreamingAIService] Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      callbacks.onError(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
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

  private generateSummary(
    toolCalls: Array<{ tool: string; args: any; result?: any }>,
    aiResponse: string
  ): string {
    if (toolCalls.length === 0) {
      return aiResponse || "Task completed successfully";
    }

    const toolDescriptions = toolCalls.map((tc) => {
      switch (tc.tool) {
        case "updatePatient":
          return `Updated patient ${
            tc.args.patientId
          } with changes: ${JSON.stringify(tc.args.updates)}`;
        case "addMedication":
          return `Added medication ${
            tc.args.medicationData?.name || "unknown"
          } for patient ${tc.args.patientId}`;
        case "createReport":
          return `Created new medical report for patient ${
            tc.args.reportData?.patientId || "unknown"
          }`;
        case "updateVitals":
          return `Updated vital signs for patient ${tc.args.patientId}`;
        case "scheduleAppointment":
          return `Scheduled appointment for patient ${
            tc.args.appointmentData?.patientId || "unknown"
          }`;
        default:
          return `Executed ${tc.tool} operation`;
      }
    });

    return `Task completed successfully. Actions performed: ${toolDescriptions.join(
      ", "
    )}`;
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }
}

// Export singleton instance
export let streamingAIService: StreamingAIService | null = null;

export const initializeStreamingAIService = (): StreamingAIService => {
  console.log(
    "🟠 [StreamingAIService] Initializing StreamingAIService (client-side only)"
  );

  streamingAIService = new StreamingAIService();
  console.log(
    "🟠 [StreamingAIService] StreamingAIService instance created successfully"
  );

  return streamingAIService;
};

export const getStreamingAIService = (): StreamingAIService => {
  if (!streamingAIService) {
    throw new Error(
      "Streaming AI Service not initialized. Call initializeStreamingAIService() first."
    );
  }
  return streamingAIService;
};
