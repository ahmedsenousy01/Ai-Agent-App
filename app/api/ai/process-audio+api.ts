import { google } from "@ai-sdk/google";
import { streamText, stepCountIs } from "ai";

// Import the centralized AI tools
import { createAITools } from "../../../src/ai/tools";
import { dataStore } from "../../../src/data/dataStore";

export async function GET(request: Request): Promise<Response> {
  return Response.json({ message: "Hello, world!" });
}

export async function POST(request: Request): Promise<Response> {
  console.log("🟢 [API Route] POST /api/ai/process-audio - Request received");
  console.log(
    "🟢 [API Route] Request headers:",
    Object.fromEntries(request.headers.entries())
  );

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

      // Generate comprehensive system prompt with app data context
      console.log("🟢 [API Route] Generating system prompt with app data...");
      const enhancedSystemPrompt = generateEnhancedSystemPrompt(
        systemPrompt,
        context
      );
      console.log(
        "🟢 [API Route] Enhanced system prompt generated, length:",
        enhancedSystemPrompt.length
      );

      // Stream the AI response with audio input
      console.log("🟢 [API Route] Starting AI stream processing...");
      const result = streamText({
        model,
        system: enhancedSystemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please process this audio command and execute the appropriate medical operations using the available data and tools. IMPORTANT: If the command asks you to update, create, or modify any data, you MUST use the provided tools to actually make those changes. Do not just describe what you would do - execute the tools to make real changes.",
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
        stopWhen: stepCountIs(5), // Allow up to 5 steps for multi-step tool calls
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

        // Access tool results from the final result
        console.log("🟢 [API Route] Accessing tool results...");
        const toolResults = await finalResult.toolResults;
        console.log(
          "🟢 [API Route] Tool results found, count:",
          toolResults?.length || 0
        );

        // Debug: Log what the AI actually decided to do
        console.log("🟢 [API Route] AI Response Analysis:", {
          fullResponseLength: fullResponse.length,
          fullResponsePreview: fullResponse.substring(0, 200) + "...",
          hasToolResults: !!toolResults && toolResults.length > 0,
          toolResultsDetails:
            toolResults?.map((tr) => ({
              toolName: tr.toolName,
              hasInput: !!tr.input,
              hasOutput: !!tr.output,
              isDynamic: tr.dynamic,
            })) || [],
        });

        if (toolResults && toolResults.length > 0) {
          console.log("🟢 [API Route] Processing tool results...");
          for (const toolResult of toolResults) {
            // Skip dynamic tools (client-side tools without execute function)
            if (toolResult.dynamic) {
              console.log(
                "🟢 [API Route] Skipping dynamic tool:",
                toolResult.toolName
              );
              continue;
            }

            const toolName = toolResult.toolName;
            const args = toolResult.input;
            const result = toolResult.output;

            console.log(
              "🟢 [API Route] Tool executed successfully:",
              toolName,
              "Input:",
              args,
              "Output:",
              result
            );

            toolCalls.push({
              tool: toolName,
              args,
              result,
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

        // Get updated data context after tool execution
        const updatedContext = dataStore.getAppContext(
          context.currentScreen,
          context.currentPatient?.id,
          context.currentReport?.id
        );

        const responseData = {
          summary: finalSummary,
          status: "completed",
          toolCalls,
          success: true,
          fullResponse,
          updatedContext, // Include updated data for client sync
        };

        console.log("🟢 [API Route] Returning successful response:", {
          summaryLength: responseData.summary.length,
          toolCallsCount: responseData.toolCalls.length,
          fullResponseLength: responseData.fullResponse.length,
        });

        return Response.json(responseData);
      } catch (streamError) {
        console.error("🔴 [API Route] Stream processing error:", streamError);

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

  return await processRequest();
}

function generateEnhancedSystemPrompt(
  basePrompt: string,
  context: any
): string {
  console.log(
    "🟢 [API Route] Building enhanced system prompt with context data..."
  );

  // Extract key information from context
  const patients = context.allPatients || [];
  const reports = context.allReports || [];
  const appointments = context.allAppointments || [];
  const medications = context.allMedications || [];
  const vitals = context.allVitals || [];
  const clinicians = context.allClinicians || [];

  // Build patient summary
  const patientSummary = patients
    .map(
      (patient) =>
        `- ${patient.name} (ID: ${patient.id}, Room: ${
          patient.room
        }, Condition: ${patient.condition}${
          patient.isUrgent ? ", URGENT" : ""
        })`
    )
    .join("\n");

  // Build recent reports summary
  const recentReports = reports
    .slice(0, 5)
    .map(
      (report) =>
        `- ${report.title} (${report.type}, Status: ${
          report.status
        }, Patient: ${
          patients.find((p) => p.id === report.patientId)?.name || "Unknown"
        })`
    )
    .join("\n");

  // Build upcoming appointments
  const upcomingAppointments = appointments
    .filter((apt) => new Date(apt.scheduledFor) > new Date())
    .slice(0, 5)
    .map(
      (apt) =>
        `- ${
          patients.find((p) => p.id === apt.patientId)?.name || "Unknown"
        } - ${apt.reason} (${new Date(apt.scheduledFor).toLocaleDateString()})`
    )
    .join("\n");

  // Build urgent patients list
  const urgentPatients = patients
    .filter((p) => p.isUrgent)
    .map((p) => `- ${p.name} (Room: ${p.room}, Condition: ${p.condition})`)
    .join("\n");

  const enhancedPrompt = `${basePrompt}

## CURRENT APP DATA CONTEXT

### Current Session Context
- Current Screen: ${context.currentScreen || "Unknown"}
- Current Patient: ${
    context.currentPatient
      ? `${context.currentPatient.name} (ID: ${context.currentPatient.id}, Room: ${context.currentPatient.room})`
      : "None selected"
  }
- Current Report: ${
    context.currentReport
      ? `${context.currentReport.title} (ID: ${context.currentReport.id})`
      : "None selected"
  }
- Current User: ${context.currentUser?.name || "Unknown"} (${
    context.currentUser?.role || "Unknown"
  })

### Available Patients (${patients.length} total)
${patientSummary || "No patients available"}

### Urgent Patients (${patients.filter((p) => p.isUrgent).length} total)
${urgentPatients || "No urgent patients"}

### Recent Reports (${reports.length} total, showing latest 5)
${recentReports || "No reports available"}

### Upcoming Appointments (${
    appointments.filter((apt) => new Date(apt.scheduledFor) > new Date()).length
  } total, showing next 5)
${upcomingAppointments || "No upcoming appointments"}

### Available Clinicians (${clinicians.length} total)
${
  clinicians
    .map((c) => `- ${c.name} (${c.role}, Status: ${c.status || "Unknown"})`)
    .join("\n") || "No clinicians available"
}

## AVAILABLE TOOLS AND OPERATIONS

You have access to the following medical tools to perform operations on the data:

### Patient Management
- getPatient(patientId): Get specific patient information
- searchPatients(query?, room?, condition?, isUrgent?): Search patients by criteria
- updatePatient(patientId, updates): Update patient information
- createPatient(patientData): Create new patient record

### Vital Signs
- getLatestVitals(patientId): Get latest vital signs for a patient
- updateVitals(patientId, updates): Record new vital signs
- getVitalHistory(patientId, days): Get vital signs history

### Medications
- listMedications(patientId): List all medications for a patient
- addMedication(patientId, medicationData): Add new medication
- updateMedication(medId, updates): Update existing medication
- removeMedication(medId): Remove medication

### Reports
- listReports(patientId?, status?): List medical reports
- getReport(reportId): Get specific report
- createReport(reportData): Create new medical report
- generateAIReport(patientId, reportType, additionalContext?): Generate comprehensive AI-powered medical report
- updateReport(reportId, updates): Update existing report
- approveReport(reportId): Approve a report
- exportReportPDF(reportId): Export report as PDF

### Appointments
- listAppointments(patientId?, date?): List appointments
- scheduleAppointment(appointmentData): Schedule new appointment
- updateAppointment(appointmentId, updates): Update existing appointment
- cancelAppointment(appointmentId): Cancel appointment

### Utilities
- addNote(patientId, text, category?): Add note to patient record
- getPatientSummary(patientId): Get comprehensive patient summary

## VOICE COMMAND EXAMPLES

Based on the available data, you can handle commands like:
- "Update John Smith's room to 205"
- "Add medication Metformin 500mg twice daily for patient ID abc123"
- "Show me all urgent patients"
- "Create a discharge report for Sarah Johnson"
- "Generate an assessment report for John Smith"
- "Generate a comprehensive treatment report for patient in room 101"
- "Schedule an appointment for Mike Davis tomorrow at 2 PM"
- "Record vitals for patient in room 101: blood pressure 120/80, heart rate 72"
- "Approve report rep456"
- "Export report rep456 as PDF"
- "Add note to patient abc123: Patient responding well to treatment"

## IMPORTANT INSTRUCTIONS

1. **ALWAYS USE TOOLS**: When asked to update, create, or modify data, you MUST use the appropriate tools. Do not just describe what you would do - actually execute the tools.
2. **Use the actual data**: Always reference the real patient names, IDs, and data provided in the context above
3. **Be specific**: When updating data, use exact patient IDs and provide complete information
4. **Execute then confirm**: First use the tools to make changes, then confirm what you've done based on the tool results
5. **Handle errors gracefully**: If a patient ID doesn't exist or data is missing, explain clearly
6. **Maintain privacy**: Be professional and maintain patient confidentiality in all responses

## TOOL USAGE EXAMPLES

For "Update John Smith's room to 203":
1. First use searchPatients to find John Smith's ID (e.g., returns ID "pat123")
2. Then use updatePatient with: { patientId: "pat123", room: "203" }
3. Confirm the change was made successfully

For "Add medication for patient in room 101":
1. Use searchPatients to find patient in room 101
2. Use addMedication with the patient ID and medication details
3. Confirm the medication was added

Remember: You are working with real medical data, so accuracy and safety are paramount. Always double-check patient information before making changes, and ALWAYS use the tools to make actual changes.`;

  console.log("🟢 [API Route] Enhanced system prompt generated successfully");
  return enhancedPrompt;
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
