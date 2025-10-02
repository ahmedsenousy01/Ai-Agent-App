import { streamText } from "ai";
import { createAITools } from "./tools";
import { AppContext, VoiceServiceResponse } from "../types";
import {
  convertAudioToUint8Array,
  getAudioMediaType,
  validateAudioData,
  AudioData,
} from "../utils/audioUtils";

export class AIService {
  private model: any;
  private isProcessing = false;
  constructor() {
    console.log(
      "🟡 [AIService] Constructor called (API keys handled server-side)"
    );
    console.log(
      "🟡 [AIService] Note: This service is for client-side use only"
    );
    console.log("🟡 [AIService] Actual AI processing happens in API route");
  }

  async processAudio(
    audioData: AudioData,
    context: AppContext
  ): Promise<VoiceServiceResponse> {
    console.log(
      "🟡 [AIService] Starting processAudio (delegating to API service)"
    );
    console.log("🟡 [AIService] Audio data received:", {
      hasData: !!audioData.data,
      hasBlob: !!audioData.blob,
      hasUri: !!audioData.uri,
      dataLength: audioData.data?.length,
      blobType: audioData.blob?.type,
      uri: audioData.uri,
    });
    console.log("🟡 [AIService] Context received:", {
      currentScreen: context.currentScreen,
      currentPatient: context.currentPatient?.id,
      currentReport: context.currentReport?.id,
    });

    if (this.isProcessing) {
      console.log("🟡 [AIService] Already processing, returning busy status");
      return {
        summary: "Already processing a request. Please wait.",
        status: "busy",
        toolCalls: [],
        success: false,
        error: "Another request is being processed",
      };
    }

    this.isProcessing = true;
    console.log("🟡 [AIService] Set processing flag to true");

    try {
      // Validate audio data
      console.log("🟡 [AIService] Validating audio data...");
      if (!validateAudioData(audioData)) {
        console.error("🔴 [AIService] Audio data validation failed");
        throw new Error("Invalid audio data provided");
      }
      console.log("🟡 [AIService] Audio data validation passed");

      // Delegate to API service (which handles the actual AI processing)
      console.log("🟡 [AIService] Delegating to API service...");
      const { apiService } = require("../services/apiService");
      const result = await apiService.processAudio(audioData, context);
      console.log("🟡 [AIService] API service processing completed:", {
        success: result.success,
        status: result.status,
        toolCallsCount: result.toolCalls?.length || 0,
        hasSummary: !!result.summary,
      });

      return result;
    } catch (error) {
      console.error("🔴 [AIService] AI processing error:", error);
      console.error("🔴 [AIService] Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        summary:
          "I encountered an error processing your request. Please try again.",
        status: "error",
        toolCalls: [],
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      this.isProcessing = false;
      console.log("🟡 [AIService] Set processing flag to false");
    }
  }

  private async processAudioDirectly(
    audioData: AudioData,
    context: AppContext
  ): Promise<VoiceServiceResponse> {
    console.log(
      "🟡 [AIService] processAudioDirectly - Starting direct processing"
    );
    try {
      // Create AI tools from our medical tools
      console.log("🟡 [AIService] Creating AI tools...");
      const aiTools = createAITools();
      console.log(
        "🟡 [AIService] AI tools created, count:",
        Object.keys(aiTools).length
      );

      // Get contextual prompt
      console.log("🟡 [AIService] Getting system prompt...");
      const systemPrompt = this.getSystemPrompt(context);
      console.log(
        "🟡 [AIService] System prompt created, length:",
        systemPrompt.length
      );

      // Convert audio data to Uint8Array for Gemini
      console.log("🟡 [AIService] Converting audio data...");
      const audioUint8Array = await convertAudioToUint8Array(audioData);
      const mediaType = getAudioMediaType(audioData);
      console.log(
        "🟡 [AIService] Audio converted, length:",
        audioUint8Array.length,
        "type:",
        mediaType
      );

      // Stream the AI response with audio input
      console.log("🟡 [AIService] Starting AI stream...");
      const result = streamText({
        model: this.model,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please process this audio command and execute the appropriate medical operations.",
              },
              {
                type: "file",
                data: audioUint8Array,
                mediaType: mediaType,
              },
            ],
          },
        ],
        tools: aiTools,
      });
      console.log("🟡 [AIService] AI stream initialized");

      // Collect the streaming response
      let fullResponse = "";
      let toolCalls: Array<{ tool: string; args: any; result?: any }> = [];
      let finalSummary = "";

      console.log("🟡 [AIService] Processing text stream...");
      for await (const delta of result.textStream) {
        fullResponse += delta;
      }
      console.log(
        "🟡 [AIService] Text stream complete, response length:",
        fullResponse.length
      );

      // Get the final result
      console.log("🟡 [AIService] Getting final result...");
      const finalResult = await result;
      console.log("🟡 [AIService] Final result obtained");

      // Extract tool calls from the result
      console.log("🟡 [AIService] Extracting tool calls...");
      const toolCallsResult = await finalResult.toolCalls;
      console.log(
        "🟡 [AIService] Tool calls extracted, count:",
        toolCallsResult?.length || 0
      );

      if (toolCallsResult && toolCallsResult.length > 0) {
        console.log("🟡 [AIService] Executing tool calls...");
        for (const toolCall of toolCallsResult) {
          const toolName = toolCall.toolName;
          const args = toolCall.input;
          console.log(
            "🟡 [AIService] Executing tool:",
            toolName,
            "with args:",
            args
          );

          // Execute the actual tool
          let toolResult;
          try {
            toolResult = await this.executeTool(toolName, args);
            console.log("🟡 [AIService] Tool executed successfully:", toolName);
          } catch (error) {
            console.error(
              "🔴 [AIService] Tool execution failed:",
              toolName,
              error
            );
            toolResult = {
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }

          toolCalls.push({
            tool: toolName,
            args,
            result: toolResult,
          });
        }
      }

      // Generate final summary
      console.log("🟡 [AIService] Generating final summary...");
      finalSummary = this.generateSummary(toolCalls, fullResponse);
      console.log(
        "🟡 [AIService] Final summary generated, length:",
        finalSummary.length
      );

      const finalResponse = {
        summary: finalSummary,
        status: "completed",
        toolCalls,
        success: true,
      };

      console.log("🟡 [AIService] Returning successful response:", {
        summaryLength: finalResponse.summary.length,
        toolCallsCount: finalResponse.toolCalls.length,
      });

      return finalResponse;
    } catch (error) {
      console.error(
        "🔴 [AIService] AI processing error in processAudioDirectly:",
        error
      );
      console.error("🔴 [AIService] Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private async executeTool(toolName: string, args: any): Promise<any> {
    // This method is no longer used since all processing happens server-side
    // But keeping it as a fallback for any direct client-side tool execution
    console.warn(
      "🟡 [AIService] executeTool called on client-side - this should not happen in normal flow"
    );
    return {
      success: true,
      message: `Executed ${toolName}`,
      note: "Client-side execution",
    };
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
export let aiService: AIService | null = null;

export const initializeAIService = (): AIService => {
  console.log("🟡 [AIService] Initializing AIService (client-side only)");

  aiService = new AIService();
  console.log("🟡 [AIService] AIService instance created successfully");

  return aiService;
};

export const getAIService = (): AIService => {
  if (!aiService) {
    throw new Error(
      "AI Service not initialized. Call initializeAIService() first."
    );
  }
  return aiService;
};
