import { google } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { z } from "zod";
import { medicalTools } from "./tools";
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
  constructor(apiKey?: string) {
    // Set the API key as environment variable for the Google provider
    if (apiKey && apiKey !== "mock-api-key") {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
    }
    this.model = google("gemini-2.5-flash");
  }

  async processAudio(
    audioData: AudioData,
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
      // Validate audio data
      if (!validateAudioData(audioData)) {
        throw new Error("Invalid audio data provided");
      }

      // Process audio directly with Gemini (no STT layer needed)
      const result = await this.processAudioDirectly(audioData, context);

      return result;
    } catch (error) {
      console.error("AI processing error:", error);
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
    }
  }

  private async processAudioDirectly(
    audioData: AudioData,
    context: AppContext
  ): Promise<VoiceServiceResponse> {
    try {
      // Create AI tools from our medical tools
      const aiTools = this.createAITools();

      // Get contextual prompt
      const systemPrompt = this.getSystemPrompt(context);

      // Convert audio data to Uint8Array for Gemini
      const audioUint8Array = await convertAudioToUint8Array(audioData);
      const mediaType = getAudioMediaType(audioData);

      // Stream the AI response with audio input
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

      // Collect the streaming response
      let fullResponse = "";
      let toolCalls: Array<{ tool: string; args: any; result?: any }> = [];
      let finalSummary = "";

      for await (const delta of result.textStream) {
        fullResponse += delta;
      }

      // Get the final result
      const finalResult = await result;

      // Extract tool calls from the result
      const toolCallsResult = await finalResult.toolCalls;
      if (toolCallsResult && toolCallsResult.length > 0) {
        for (const toolCall of toolCallsResult) {
          const toolName = toolCall.toolName;
          const args = toolCall.input;

          // Execute the actual tool
          let toolResult;
          try {
            toolResult = await this.executeTool(toolName, args);
          } catch (error) {
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
      finalSummary = this.generateSummary(toolCalls, fullResponse);

      return {
        summary: finalSummary,
        status: "completed",
        toolCalls,
        success: true,
      };
    } catch (error) {
      console.error("AI processing error:", error);
      throw error;
    }
  }

  private createAITools() {
    return {
      // Patient operations
      getPatient: tool({
        description: "Get patient information by ID",
        inputSchema: z.object({
          patientId: z.string().describe("The patient ID"),
        }),
        execute: async ({ patientId }) => {
          return await medicalTools.getPatient(patientId);
        },
      }),

      searchPatients: tool({
        description: "Search for patients by various criteria",
        inputSchema: z.object({
          query: z.string().optional().describe("Search query"),
          room: z.string().optional().describe("Room number"),
          condition: z.string().optional().describe("Medical condition"),
          isUrgent: z.boolean().optional().describe("Urgent patients only"),
        }),
        execute: async ({ query, room, condition, isUrgent }) => {
          return await medicalTools.searchPatients(
            query,
            room,
            condition,
            isUrgent
          );
        },
      }),

      updatePatient: tool({
        description: "Update patient information",
        inputSchema: z.object({
          patientId: z.string().describe("The patient ID"),
          updates: z.record(z.any()).describe("Updates to apply"),
        }),
        execute: async ({ patientId, updates }) => {
          return await medicalTools.updatePatient(patientId, updates);
        },
      }),

      createPatient: tool({
        description: "Create a new patient record",
        inputSchema: z.object({
          patientData: z.record(z.any()).describe("Patient data"),
        }),
        execute: async ({ patientData }) => {
          return await medicalTools.createPatient(patientData);
        },
      }),

      // Vital signs operations
      getLatestVitals: tool({
        description: "Get the latest vital signs for a patient",
        inputSchema: z.object({
          patientId: z.string().describe("The patient ID"),
        }),
        execute: async ({ patientId }) => {
          return await medicalTools.getLatestVitals(patientId);
        },
      }),

      updateVitals: tool({
        description: "Update patient vital signs",
        inputSchema: z.object({
          patientId: z.string().describe("The patient ID"),
          updates: z.record(z.any()).describe("Vital signs updates"),
        }),
        execute: async ({ patientId, updates }) => {
          return await medicalTools.updateVitals(patientId, updates);
        },
      }),

      // Medication operations
      listMedications: tool({
        description: "List all medications for a patient",
        inputSchema: z.object({
          patientId: z.string().describe("The patient ID"),
        }),
        execute: async ({ patientId }) => {
          return await medicalTools.listMedications(patientId);
        },
      }),

      addMedication: tool({
        description: "Add a new medication for a patient",
        inputSchema: z.object({
          patientId: z.string().describe("The patient ID"),
          medicationData: z.record(z.any()).describe("Medication data"),
        }),
        execute: async ({ patientId, medicationData }) => {
          return await medicalTools.addMedication(patientId, medicationData);
        },
      }),

      updateMedication: tool({
        description: "Update an existing medication",
        inputSchema: z.object({
          medId: z.string().describe("The medication ID"),
          updates: z.record(z.any()).describe("Updates to apply"),
        }),
        execute: async ({ medId, updates }) => {
          return await medicalTools.updateMedication(medId, updates);
        },
      }),

      removeMedication: tool({
        description: "Remove a medication from a patient",
        inputSchema: z.object({
          medId: z.string().describe("The medication ID"),
        }),
        execute: async ({ medId }) => {
          return await medicalTools.removeMedication(medId);
        },
      }),

      // Report operations
      listReports: tool({
        description: "List medical reports",
        inputSchema: z.object({
          patientId: z.string().optional().describe("Filter by patient ID"),
          status: z.string().optional().describe("Filter by status"),
        }),
        execute: async ({ patientId, status }) => {
          return await medicalTools.listReports(patientId, status);
        },
      }),

      createReport: tool({
        description: "Create a new medical report",
        inputSchema: z.object({
          reportData: z.record(z.any()).describe("Report data"),
        }),
        execute: async ({ reportData }) => {
          return await medicalTools.createReport(reportData);
        },
      }),

      updateReport: tool({
        description: "Update an existing medical report",
        inputSchema: z.object({
          reportId: z.string().describe("The report ID"),
          updates: z.record(z.any()).describe("Updates to apply"),
        }),
        execute: async ({ reportId, updates }) => {
          return await medicalTools.updateReport(reportId, updates);
        },
      }),

      approveReport: tool({
        description: "Approve a medical report",
        inputSchema: z.object({
          reportId: z.string().describe("The report ID"),
        }),
        execute: async ({ reportId }) => {
          return await medicalTools.approveReport(reportId);
        },
      }),

      // Appointment operations
      listAppointments: tool({
        description: "List appointments",
        inputSchema: z.object({
          patientId: z.string().optional().describe("Filter by patient ID"),
          date: z.string().optional().describe("Filter by date"),
        }),
        execute: async ({ patientId, date }) => {
          return await medicalTools.listAppointments(patientId, date);
        },
      }),

      scheduleAppointment: tool({
        description: "Schedule a new appointment",
        inputSchema: z.object({
          appointmentData: z.record(z.any()).describe("Appointment data"),
        }),
        execute: async ({ appointmentData }) => {
          return await medicalTools.scheduleAppointment(appointmentData);
        },
      }),

      updateAppointment: tool({
        description: "Update an existing appointment",
        inputSchema: z.object({
          appointmentId: z.string().describe("The appointment ID"),
          updates: z.record(z.any()).describe("Updates to apply"),
        }),
        execute: async ({ appointmentId, updates }) => {
          return await medicalTools.updateAppointment(appointmentId, updates);
        },
      }),

      cancelAppointment: tool({
        description: "Cancel an appointment",
        inputSchema: z.object({
          appointmentId: z.string().describe("The appointment ID"),
        }),
        execute: async ({ appointmentId }) => {
          return await medicalTools.cancelAppointment(appointmentId);
        },
      }),

      // Utility operations
      addNote: tool({
        description: "Add a note to a patient record",
        inputSchema: z.object({
          patientId: z.string().describe("The patient ID"),
          text: z.string().describe("Note text"),
          category: z.string().optional().describe("Note category"),
        }),
        execute: async ({ patientId, text, category }) => {
          return await medicalTools.addNote(patientId, text, category);
        },
      }),

      getPatientSummary: tool({
        description: "Get a comprehensive patient summary",
        inputSchema: z.object({
          patientId: z.string().describe("The patient ID"),
        }),
        execute: async ({ patientId }) => {
          return await medicalTools.getPatientSummary(patientId);
        },
      }),
    };
  }

  private async executeTool(toolName: string, args: any): Promise<any> {
    // This method handles the actual execution of tools
    // The tools are already defined in the createAITools method above
    // This is just a fallback for any additional processing needed
    return { success: true, message: `Executed ${toolName}` };
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

export const initializeAIService = (apiKey?: string): AIService => {
  aiService = new AIService(apiKey);
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
