import { AppContext, VoiceServiceResponse, InteractionLog } from "../types";
import { dataStore } from "../data/dataStore";
import { getAIService } from "./aiService";
import { AudioData } from "../utils/audioUtils";

export class MedicalAIAgent {
  async processAudio(
    audioData: AudioData,
    context: AppContext
  ): Promise<VoiceServiceResponse> {
    console.log("🟣 [MedicalAIAgent] Starting processAudio");
    console.log("🟣 [MedicalAIAgent] Audio data received:", {
      hasData: !!audioData.data,
      hasBlob: !!audioData.blob,
      hasUri: !!audioData.uri,
      dataLength: audioData.data?.length,
      blobType: audioData.blob?.type,
      uri: audioData.uri,
    });
    console.log("🟣 [MedicalAIAgent] Context received:", {
      currentScreen: context.currentScreen,
      currentPatient: context.currentPatient?.id,
      currentReport: context.currentReport?.id,
    });

    const startTime = new Date().toISOString();
    const interactionLog: Omit<InteractionLog, "id"> = {
      startedAt: startTime,
      audioDuration: 0,
      context: {
        currentScreen: context.currentScreen,
        patientId: context.currentPatient?.id,
        reportId: context.currentReport?.id,
      },
      success: false,
    };
    console.log("🟣 [MedicalAIAgent] Interaction log initialized:", {
      startedAt: interactionLog.startedAt,
      context: interactionLog.context,
    });

    try {
      // Use the real AI service instead of mock responses
      console.log("🟣 [MedicalAIAgent] Getting AI service...");
      const aiService = getAIService();
      console.log(
        "🟣 [MedicalAIAgent] AI service obtained, calling processAudio..."
      );

      const result = await aiService.processAudio(audioData, context);
      console.log("🟣 [MedicalAIAgent] AI service processing completed:", {
        success: result.success,
        status: result.status,
        toolCallsCount: result.toolCalls?.length || 0,
        hasSummary: !!result.summary,
        hasError: !!result.error,
      });

      // Update interaction log
      interactionLog.finishedAt = new Date().toISOString();
      interactionLog.intent = this.determineIntent(result.toolCalls);
      interactionLog.summary = result.summary;
      interactionLog.success = result.success;
      interactionLog.toolCalls = result.toolCalls.map((tc) => ({
        tool: tc.tool,
        args: tc.args,
        result: tc.result,
        at: new Date().toISOString(),
      }));

      if (!result.success && result.error) {
        interactionLog.error = result.error;
        console.log(
          "🟣 [MedicalAIAgent] Error recorded in interaction log:",
          result.error
        );
      }

      console.log("🟣 [MedicalAIAgent] Interaction log updated:", {
        finishedAt: interactionLog.finishedAt,
        intent: interactionLog.intent,
        success: interactionLog.success,
        toolCallsCount: interactionLog.toolCalls?.length || 0,
      });

      // Save interaction log
      console.log(
        "🟣 [MedicalAIAgent] Saving interaction log to data store..."
      );
      dataStore.addInteractionLog(interactionLog);
      console.log("🟣 [MedicalAIAgent] Interaction log saved successfully");

      console.log("🟣 [MedicalAIAgent] Returning successful result");
      return result;
    } catch (error) {
      console.error("🔴 [MedicalAIAgent] AI processing error:", error);
      console.error("🔴 [MedicalAIAgent] Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Update interaction log with error
      interactionLog.finishedAt = new Date().toISOString();
      interactionLog.error =
        error instanceof Error ? error.message : "Unknown error";
      interactionLog.success = false;

      console.log("🟣 [MedicalAIAgent] Error interaction log updated:", {
        finishedAt: interactionLog.finishedAt,
        error: interactionLog.error,
        success: interactionLog.success,
      });

      // Save interaction log
      console.log(
        "🟣 [MedicalAIAgent] Saving error interaction log to data store..."
      );
      dataStore.addInteractionLog(interactionLog);
      console.log(
        "🟣 [MedicalAIAgent] Error interaction log saved successfully"
      );

      const errorResponse = {
        summary:
          "I encountered an error processing your request. Please try again.",
        status: "error",
        toolCalls: [],
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };

      console.log("🟣 [MedicalAIAgent] Returning error response");
      return errorResponse;
    }
  }

  private determineIntent(
    toolCalls: Array<{ tool: string; args: any; result?: any }>
  ): string {
    if (toolCalls.length === 0) return "unknown";

    const firstTool = toolCalls[0].tool;

    // Map tool names to intents
    const intentMap: Record<string, string> = {
      updatePatient: "update_patient",
      createPatient: "create_patient",
      searchPatients: "search_patients",
      createReport: "generate_report",
      editReport: "edit_report",
      approveReport: "approve_report",
      addMedication: "add_medication",
      updateMedication: "update_medication",
      removeMedication: "remove_medication",
      updateVitals: "update_vitals",
      scheduleAppointment: "schedule_appointment",
      updateAppointment: "update_appointment",
      cancelAppointment: "cancel_appointment",
      addNote: "add_note",
    };

    return intentMap[firstTool] || "unknown";
  }

  // Helper method to get app context
  getAppContext(
    currentScreen: string,
    currentPatientId?: string,
    currentReportId?: string
  ): AppContext {
    return dataStore.getAppContext(
      currentScreen,
      currentPatientId,
      currentReportId
    );
  }
}

// Export singleton instance (will be initialized with API key)
export let medicalAgent: MedicalAIAgent | null = null;

export const initializeAgent = (): MedicalAIAgent => {
  console.log(
    "🟣 [MedicalAIAgent] Initializing agent (API keys handled server-side)"
  );

  // Initialize AI services first
  console.log("🟣 [MedicalAIAgent] Initializing AI services...");
  const { initializeAIService } = require("./aiService");
  const { initializeStreamingAIService } = require("./streamingAIService");

  console.log("🟣 [MedicalAIAgent] Initializing AIService...");
  initializeAIService(); // No API key needed in mobile app
  console.log("🟣 [MedicalAIAgent] AIService initialized");

  console.log("🟣 [MedicalAIAgent] Initializing StreamingAIService...");
  initializeStreamingAIService(); // No API key needed in mobile app
  console.log("🟣 [MedicalAIAgent] StreamingAIService initialized");

  console.log("🟣 [MedicalAIAgent] Creating MedicalAIAgent instance...");
  medicalAgent = new MedicalAIAgent(); // No API key needed in mobile app
  console.log(
    "🟣 [MedicalAIAgent] MedicalAIAgent instance created successfully"
  );

  return medicalAgent;
};

export const getAgent = (): MedicalAIAgent => {
  if (!medicalAgent) {
    throw new Error(
      "Medical AI Agent not initialized. Call initializeAgent() first."
    );
  }
  return medicalAgent;
};
