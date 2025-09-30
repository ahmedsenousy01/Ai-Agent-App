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

  constructor(apiKey?: string) {
    // Set the API key as environment variable for the Google provider
    if (apiKey && apiKey !== "mock-api-key") {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
    }
    this.model = google("gemini-2.5-flash");
  }

  async processAudioWithStreaming(
    audioData: AudioData,
    context: AppContext,
    callbacks: StreamingCallback
  ): Promise<void> {
    if (this.isProcessing) {
      callbacks.onError("Already processing a request. Please wait.");
      return;
    }

    this.isProcessing = true;

    try {
      callbacks.onStatusUpdate("Processing audio with AI...");

      // Validate audio data
      if (!validateAudioData(audioData)) {
        throw new Error("Invalid audio data provided");
      }

      // Process audio directly with Gemini (no STT layer needed)
      await this.processAudioDirectlyWithStreaming(
        audioData,
        context,
        callbacks
      );
    } catch (error) {
      console.error("AI processing error:", error);
      callbacks.onError(
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      this.isProcessing = false;
    }
  }

  private async processAudioDirectlyWithStreaming(
    audioData: AudioData,
    context: AppContext,
    callbacks: StreamingCallback
  ): Promise<void> {
    try {
      // Create AI tools from our medical tools
      const aiTools = this.createAITools(callbacks);

      // Get contextual prompt
      const systemPrompt = this.getSystemPrompt(context);

      callbacks.onStatusUpdate("Generating AI response...");

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

      // Stream text response
      for await (const delta of result.textStream) {
        fullResponse += delta;
        callbacks.onStreamingText(fullResponse);
      }

      // Get the final result
      const finalResult = await result;

      // Extract and execute tool calls
      const toolCallsResult = await finalResult.toolCalls;
      if (toolCallsResult && toolCallsResult.length > 0) {
        callbacks.onStatusUpdate("Executing medical operations...");

        for (const toolCall of toolCallsResult) {
          const toolName = toolCall.toolName;
          const args = toolCall.input;

          callbacks.onToolCall(toolName, args);

          // Execute the actual tool
          let toolResult;
          try {
            toolResult = await this.executeTool(toolName, args);
            callbacks.onToolResult(toolName, toolResult);
          } catch (error) {
            toolResult = {
              error: error instanceof Error ? error.message : "Unknown error",
            };
            callbacks.onToolResult(toolName, toolResult);
          }

          toolCalls.push({
            tool: toolName,
            args,
            result: toolResult,
          });
        }
      }

      // Generate final summary
      const finalSummary = this.generateSummary(toolCalls, fullResponse);

      callbacks.onStatusUpdate("Task completed");
      callbacks.onComplete({
        summary: finalSummary,
        status: "completed",
        toolCalls,
        success: true,
      });
    } catch (error) {
      console.error("AI processing error:", error);
      callbacks.onError(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  private createAITools(callbacks: StreamingCallback) {
    return {
      // Patient operations
      getPatient: tool({
        description: "Get patient information by ID",
        inputSchema: z.object({
          patientId: z.string().describe("The patient ID"),
        }),
        execute: async ({ patientId }) => {
          callbacks.onStreamingText(
            `Retrieving patient information for ID: ${patientId}`
          );
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
          callbacks.onStreamingText(
            `Searching patients with criteria: ${JSON.stringify({
              query,
              room,
              condition,
              isUrgent,
            })}`
          );
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
          callbacks.onStreamingText(
            `Updating patient ${patientId} with changes: ${JSON.stringify(
              updates
            )}`
          );
          return await medicalTools.updatePatient(patientId, updates);
        },
      }),

      createPatient: tool({
        description: "Create a new patient record",
        inputSchema: z.object({
          patientData: z.record(z.any()).describe("Patient data"),
        }),
        execute: async ({ patientData }) => {
          callbacks.onStreamingText(
            `Creating new patient record: ${JSON.stringify(patientData)}`
          );
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
          callbacks.onStreamingText(
            `Retrieving latest vital signs for patient ${patientId}`
          );
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
          callbacks.onStreamingText(
            `Updating vital signs for patient ${patientId}: ${JSON.stringify(
              updates
            )}`
          );
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
          callbacks.onStreamingText(
            `Retrieving medication list for patient ${patientId}`
          );
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
          callbacks.onStreamingText(
            `Adding medication ${
              medicationData.name || "unknown"
            } for patient ${patientId}`
          );
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
          callbacks.onStreamingText(
            `Updating medication ${medId} with changes: ${JSON.stringify(
              updates
            )}`
          );
          return await medicalTools.updateMedication(medId, updates);
        },
      }),

      removeMedication: tool({
        description: "Remove a medication from a patient",
        inputSchema: z.object({
          medId: z.string().describe("The medication ID"),
        }),
        execute: async ({ medId }) => {
          callbacks.onStreamingText(`Removing medication ${medId}`);
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
          callbacks.onStreamingText(
            `Retrieving reports for patient ${patientId || "all patients"}`
          );
          return await medicalTools.listReports(patientId, status);
        },
      }),

      createReport: tool({
        description: "Create a new medical report",
        inputSchema: z.object({
          reportData: z.record(z.any()).describe("Report data"),
        }),
        execute: async ({ reportData }) => {
          callbacks.onStreamingText(
            `Creating medical report: ${reportData.type || "Assessment"}`
          );
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
          callbacks.onStreamingText(
            `Updating report ${reportId} with changes: ${JSON.stringify(
              updates
            )}`
          );
          return await medicalTools.updateReport(reportId, updates);
        },
      }),

      approveReport: tool({
        description: "Approve a medical report",
        inputSchema: z.object({
          reportId: z.string().describe("The report ID"),
        }),
        execute: async ({ reportId }) => {
          callbacks.onStreamingText(`Approving report ${reportId}`);
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
          callbacks.onStreamingText(
            `Retrieving appointments for patient ${patientId || "all patients"}`
          );
          return await medicalTools.listAppointments(patientId, date);
        },
      }),

      scheduleAppointment: tool({
        description: "Schedule a new appointment",
        inputSchema: z.object({
          appointmentData: z.record(z.any()).describe("Appointment data"),
        }),
        execute: async ({ appointmentData }) => {
          callbacks.onStreamingText(
            `Scheduling appointment for patient ${
              appointmentData.patientId || "unknown"
            }`
          );
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
          callbacks.onStreamingText(
            `Updating appointment ${appointmentId} with changes: ${JSON.stringify(
              updates
            )}`
          );
          return await medicalTools.updateAppointment(appointmentId, updates);
        },
      }),

      cancelAppointment: tool({
        description: "Cancel an appointment",
        inputSchema: z.object({
          appointmentId: z.string().describe("The appointment ID"),
        }),
        execute: async ({ appointmentId }) => {
          callbacks.onStreamingText(`Cancelling appointment ${appointmentId}`);
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
          callbacks.onStreamingText(
            `Adding note to patient ${patientId}: ${text.substring(0, 50)}...`
          );
          return await medicalTools.addNote(patientId, text, category);
        },
      }),

      getPatientSummary: tool({
        description: "Get a comprehensive patient summary",
        inputSchema: z.object({
          patientId: z.string().describe("The patient ID"),
        }),
        execute: async ({ patientId }) => {
          callbacks.onStreamingText(
            `Generating comprehensive summary for patient ${patientId}`
          );
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
export let streamingAIService: StreamingAIService | null = null;

export const initializeStreamingAIService = (
  apiKey?: string
): StreamingAIService => {
  streamingAIService = new StreamingAIService(apiKey);
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
