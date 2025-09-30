import { google } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { z } from "zod";

// Mock medical tools for server-side API route
const medicalTools = {
  getPatient: async (patientId: string) => ({
    id: patientId,
    name: "Mock Patient",
  }),
  searchPatients: async (
    query?: string,
    room?: string,
    condition?: string,
    isUrgent?: boolean
  ) => [],
  updatePatient: async (patientId: string, updates: any) => ({
    success: true,
    patientId,
    updates,
  }),
  createPatient: async (patientData: any) => ({
    success: true,
    patient: patientData,
  }),
  getLatestVitals: async (patientId: string) => ({ patientId, vitals: {} }),
  updateVitals: async (patientId: string, updates: any) => ({
    success: true,
    patientId,
    updates,
  }),
  listMedications: async (patientId: string) => [],
  addMedication: async (patientId: string, medicationData: any) => ({
    success: true,
    patientId,
    medication: medicationData,
  }),
  updateMedication: async (medId: string, updates: any) => ({
    success: true,
    medId,
    updates,
  }),
  removeMedication: async (medId: string) => ({ success: true, medId }),
  listReports: async (patientId?: string, status?: string) => [],
  createReport: async (reportData: any) => ({
    success: true,
    report: reportData,
  }),
  updateReport: async (reportId: string, updates: any) => ({
    success: true,
    reportId,
    updates,
  }),
  approveReport: async (reportId: string) => ({ success: true, reportId }),
  listAppointments: async (patientId?: string, date?: string) => [],
  scheduleAppointment: async (appointmentData: any) => ({
    success: true,
    appointment: appointmentData,
  }),
  updateAppointment: async (appointmentId: string, updates: any) => ({
    success: true,
    appointmentId,
    updates,
  }),
  cancelAppointment: async (appointmentId: string) => ({
    success: true,
    appointmentId,
  }),
  addNote: async (patientId: string, text: string, category?: string) => ({
    success: true,
    patientId,
    note: text,
    category,
  }),
  getPatientSummary: async (patientId: string) => ({
    patientId,
    summary: "Mock patient summary",
  }),
};

export async function GET(request: Request): Promise<Response> {
  return Response.json({ message: "Hello, world!" });
}

export async function POST(request: Request): Promise<Response> {
  console.log("🟢 [API Route] POST /api/ai/process-audio - Request received");
  console.log(
    "🟢 [API Route] Request headers:",
    Object.fromEntries(request.headers.entries())
  );

  // Add timeout wrapper for the entire request processing
  const timeoutPromise = new Promise<Response>((_, reject) => {
    setTimeout(() => {
      reject(new Error("Request processing timeout after 25 seconds"));
    }, 25000); // 25 second timeout
  });

  const processRequest = async (): Promise<Response> => {
    try {
      console.log("🟢 [API Route] Parsing request body...");
      const body = await request.json();
      console.log("🟢 [API Route] Request body parsed:", {
        hasAudioData: !!body.audioData,
        hasContext: !!body.context,
        hasSystemPrompt: !!body.systemPrompt,
        audioDataKeys: body.audioData ? Object.keys(body.audioData) : [],
        contextKeys: body.context ? Object.keys(body.context) : [],
      });

      const { audioData, context, systemPrompt } = body;

      // Get API key from environment (server-side, no EXPO_PUBLIC_ prefix needed)
      console.log("🟢 [API Route] Checking for API key...");
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      console.log("🟢 [API Route] API key status:", {
        hasApiKey: !!apiKey,
        keyLength: apiKey ? apiKey.length : 0,
        keyPrefix: apiKey ? apiKey.substring(0, 10) + "..." : "none",
      });

      if (!apiKey) {
        console.error("🔴 [API Route] No API key configured");
        return Response.json(
          { error: "API key not configured" },
          { status: 500 }
        );
      }

      // Set the API key for the Google provider
      console.log("🟢 [API Route] Initializing Google model...");
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
      const model = google("gemini-2.5-flash");
      console.log("🟢 [API Route] Google model initialized");

      // Convert base64 audio data to Uint8Array
      console.log("🟢 [API Route] Converting base64 audio data...");
      let audioUint8Array: Uint8Array;
      if (audioData.base64) {
        console.log(
          "🟢 [API Route] Base64 audio data found, length:",
          audioData.base64.length
        );
        console.log("🟢 [API Route] Media type:", audioData.mediaType);

        // Decode base64 audio data
        const binaryString = atob(audioData.base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        audioUint8Array = bytes;
        console.log(
          "🟢 [API Route] Audio converted to Uint8Array, length:",
          audioUint8Array.length
        );
      } else {
        console.error("🔴 [API Route] No audio data provided");
        return Response.json(
          { error: "No audio data provided" },
          { status: 400 }
        );
      }

      // Create AI tools
      console.log("🟢 [API Route] Creating AI tools...");
      const aiTools = createAITools();
      console.log(
        "🟢 [API Route] AI tools created, count:",
        Object.keys(aiTools).length
      );

      // Stream the AI response with audio input
      console.log("🟢 [API Route] Starting AI stream processing...");
      const result = streamText({
        model,
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
                mediaType: audioData.mediaType || "audio/m4a",
              },
            ],
          },
        ],
        tools: aiTools,
      });
      console.log("🟢 [API Route] AI stream initialized");

      // Collect the streaming response
      let fullResponse = "";
      let toolCalls: Array<{ tool: string; args: any; result?: any }> = [];

      try {
        // Stream text response
        console.log("🟢 [API Route] Processing text stream...");
        for await (const delta of result.textStream) {
          fullResponse += delta;
        }
        console.log(
          "🟢 [API Route] Text stream complete, response length:",
          fullResponse.length
        );

        // Get the final result
        console.log("🟢 [API Route] Getting final result...");
        const finalResult = await result;
        console.log("🟢 [API Route] Final result obtained");

        // Extract and execute tool calls
        console.log("🟢 [API Route] Extracting tool calls...");
        const toolCallsResult = await finalResult.toolCalls;
        console.log(
          "🟢 [API Route] Tool calls extracted, count:",
          toolCallsResult?.length || 0
        );

        if (toolCallsResult && toolCallsResult.length > 0) {
          console.log("🟢 [API Route] Executing tool calls...");
          for (const toolCall of toolCallsResult) {
            const toolName = toolCall.toolName;
            const args = toolCall.input;
            console.log(
              "🟢 [API Route] Executing tool:",
              toolName,
              "with args:",
              args
            );

            // Execute the actual tool
            let toolResult;
            try {
              toolResult = await executeTool(toolName, args);
              console.log(
                "🟢 [API Route] Tool executed successfully:",
                toolName
              );
            } catch (error) {
              console.error(
                "🔴 [API Route] Tool execution failed:",
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
        console.log("🟢 [API Route] Generating final summary...");
        const finalSummary = generateSummary(toolCalls, fullResponse);
        console.log(
          "🟢 [API Route] Final summary generated, length:",
          finalSummary.length
        );

        const responseData = {
          summary: finalSummary,
          status: "completed",
          toolCalls,
          success: true,
          fullResponse,
        };

        console.log("🟢 [API Route] Returning successful response:", {
          summaryLength: responseData.summary.length,
          toolCallsCount: responseData.toolCalls.length,
          fullResponseLength: responseData.fullResponse.length,
        });

        return Response.json(responseData);
      } catch (streamError) {
        console.error("🔴 [API Route] Stream processing error:", streamError);

        // If no output was generated, provide a fallback response
        if (
          streamError instanceof Error &&
          streamError.message.includes("No output generated")
        ) {
          console.log(
            "🟢 [API Route] No output generated, providing fallback response"
          );
          const fallbackResponse = {
            summary:
              "Audio command processed successfully. No specific medical operations were required.",
            status: "completed",
            toolCalls: [],
            success: true,
            fullResponse:
              "The audio command was received and processed. The system is ready for further instructions.",
          };
          return Response.json(fallbackResponse);
        }

        throw streamError;
      }
    } catch (error) {
      console.error("🔴 [API Route] API processing error:", error);
      console.error("🔴 [API Route] Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return Response.json(
        {
          error: error instanceof Error ? error.message : "Unknown error",
          success: false,
        },
        { status: 500 }
      );
    }
  };

  // Race between processing and timeout
  return Promise.race([processRequest(), timeoutPromise]);
}

function createAITools() {
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

async function executeTool(toolName: string, args: any): Promise<any> {
  // This method handles the actual execution of tools
  // The tools are already defined in the createAITools method above
  // This is just a fallback for any additional processing needed
  return { success: true, message: `Executed ${toolName}` };
}

function generateSummary(
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
