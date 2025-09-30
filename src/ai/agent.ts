import { AppContext, VoiceServiceResponse, InteractionLog } from "../types";
import { dataStore } from "../data/dataStore";

export class MedicalAIAgent {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async processAudio(
    audioBlob: Blob,
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
      // For now, simulate AI processing with mock responses
      // In a real implementation, this would call the actual AI service
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate processing time

      // Mock response based on current screen
      let summary = "Task completed successfully";
      let toolCalls: Array<{ tool: string; args: any; result?: any }> = [];

      if (context.currentScreen === "patients") {
        summary = "Updated patient information successfully";
        toolCalls = [
          {
            tool: "updatePatient",
            args: { patientId: "patient-001", updates: { room: "201" } },
            result: { success: true },
          },
        ];
      } else if (context.currentScreen === "patient-details") {
        summary = "Added new medication to patient record";
        toolCalls = [
          {
            tool: "addMedication",
            args: {
              patientId: context.currentPatient?.id,
              name: "Lisinopril",
              dosage: "10mg daily",
            },
            result: { success: true },
          },
        ];
      } else if (context.currentScreen === "reports") {
        summary = "Generated new medical report";
        toolCalls = [
          {
            tool: "createReport",
            args: { patientId: context.currentPatient?.id, type: "Assessment" },
            result: { success: true },
          },
        ];
      }

      // Update interaction log
      interactionLog.finishedAt = new Date().toISOString();
      interactionLog.intent = this.determineIntent(toolCalls);
      interactionLog.summary = summary;
      interactionLog.success = true;
      interactionLog.toolCalls = toolCalls.map((tc) => ({
        tool: tc.tool,
        args: tc.args,
        result: tc.result,
        at: new Date().toISOString(),
      }));

      // Save interaction log
      dataStore.addInteractionLog(interactionLog);

      return {
        summary,
        status: "completed",
        toolCalls,
        success: true,
      };
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

export const initializeAgent = (apiKey: string): MedicalAIAgent => {
  medicalAgent = new MedicalAIAgent(apiKey);
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
