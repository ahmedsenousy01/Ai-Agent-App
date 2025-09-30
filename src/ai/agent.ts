import { AppContext, VoiceServiceResponse, InteractionLog } from "../types";
import { dataStore } from "../data/dataStore";
import { getAIService } from "./aiService";
import { AudioData } from "../utils/audioUtils";

export class MedicalAIAgent {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async processAudio(
    audioData: AudioData,
    context: AppContext
  ): Promise<VoiceServiceResponse> {
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

    try {
      // Use the real AI service instead of mock responses
      const aiService = getAIService();
      const result = await aiService.processAudio(audioData, context);

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
      }

      // Save interaction log
      dataStore.addInteractionLog(interactionLog);

      return result;
    } catch (error) {
      console.error("AI processing error:", error);

      // Update interaction log with error
      interactionLog.finishedAt = new Date().toISOString();
      interactionLog.error =
        error instanceof Error ? error.message : "Unknown error";
      interactionLog.success = false;

      // Save interaction log
      dataStore.addInteractionLog(interactionLog);

      return {
        summary:
          "I encountered an error processing your request. Please try again.",
        status: "error",
        toolCalls: [],
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
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

export const initializeAgent = (apiKey?: string): MedicalAIAgent => {
  // Initialize AI services first
  const { initializeAIService } = require("./aiService");
  const { initializeStreamingAIService } = require("./streamingAIService");

  initializeAIService(apiKey);
  initializeStreamingAIService(apiKey);

  medicalAgent = new MedicalAIAgent(apiKey || "mock-api-key");
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
