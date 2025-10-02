import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { Patient, Report, VitalSnapshot, Medication } from "../types";
import { dataStore } from "../data/dataStore";

export class AIReportService {
  private static instance: AIReportService;
  private model: any;

  private constructor() {
    // Initialize the AI model - API key will be handled server-side
    this.model = google("gemini-2.5-flash");
  }

  static getInstance(): AIReportService {
    if (!AIReportService.instance) {
      AIReportService.instance = new AIReportService();
    }
    return AIReportService.instance;
  }

  async generateReportContent(
    patient: Patient,
    reportType: string,
    additionalContext?: string
  ): Promise<{
    chiefComplaint: string;
    history: string;
    vitalsSummary: string;
    assessment: string;
    plan: string;
    notes: string;
    markdown: string;
  }> {
    console.log(
      "🤖 [AIReportService] Generating AI report content for patient:",
      patient.id
    );

    // Gather comprehensive patient data
    const latestVitals = dataStore.getLatestVitals(patient.id);
    const medications = dataStore.listMedications(patient.id);
    const vitalHistory = dataStore.getVitalHistory(patient.id, 30); // Last 30 days
    const existingReports = dataStore.listReports(patient.id).slice(0, 3); // Last 3 reports

    // Create comprehensive context for AI
    const patientContext = this.buildPatientContext(
      patient,
      latestVitals,
      medications,
      vitalHistory,
      existingReports,
      additionalContext
    );

    const systemPrompt = this.getReportGenerationPrompt(reportType);

    try {
      console.log(
        "🤖 [AIReportService] Calling AI to generate report content..."
      );

      const result = await generateText({
        model: this.model,
        system: systemPrompt,
        prompt: `Generate a comprehensive ${reportType} report for the following patient:

${patientContext}

Please generate a detailed medical report with all the required sections. Be thorough, professional, and medically accurate.`,
      });

      console.log("🤖 [AIReportService] AI report generation completed");

      // Parse the AI response into structured sections
      const parsedContent = this.parseAIResponse(result.text);

      return parsedContent;
    } catch (error) {
      console.error("🔴 [AIReportService] Error generating AI report:", error);
      throw new Error(
        `Failed to generate AI report: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private buildPatientContext(
    patient: Patient,
    latestVitals: VitalSnapshot | null,
    medications: Medication[],
    vitalHistory: VitalSnapshot[],
    existingReports: Report[],
    additionalContext?: string
  ): string {
    let context = `## PATIENT INFORMATION
Name: ${patient.name}
Age: ${patient.age || "Not specified"}
Gender: ${patient.gender || "Not specified"}
Room: ${patient.room}
Current Condition: ${patient.condition}
Urgent Status: ${patient.isUrgent ? "URGENT" : "Standard"}
Last Visit: ${patient.lastVisit}

## MEDICAL HISTORY
${patient.medicalHistory?.join("\n- ") || "No medical history recorded"}

## ALLERGIES
${patient.allergies?.join(", ") || "No known allergies"}

## CURRENT MEDICATIONS (${medications.length} total)
${
  medications
    .map(
      (med) =>
        `- ${med.name} (${med.type}): ${med.dosage}${
          med.active ? " [ACTIVE]" : " [INACTIVE]"
        }${med.prescribedBy ? ` - Prescribed by ${med.prescribedBy}` : ""}`
    )
    .join("\n") || "No current medications"
}

## LATEST VITAL SIGNS
${
  latestVitals
    ? `
- Heart Rate: ${latestVitals.heartRate || "Not recorded"}
- Blood Pressure: ${latestVitals.bloodPressure || "Not recorded"}
- Temperature: ${latestVitals.temperature || "Not recorded"}
- Respiratory Rate: ${latestVitals.respiratoryRate || "Not recorded"}
- Oxygen Saturation: ${latestVitals.oxygenSaturation || "Not recorded"}
- Weight: ${latestVitals.weight || "Not recorded"}
- Height: ${latestVitals.height || "Not recorded"}
- BMI: ${latestVitals.bmi || "Not calculated"}
- Recorded: ${new Date(latestVitals.recordedAt).toLocaleString()}
`
    : "No vital signs recorded"
}

## VITAL SIGNS TREND (Last 30 days)
${
  vitalHistory.length > 0
    ? vitalHistory
        .map(
          (vital) =>
            `${new Date(vital.recordedAt).toLocaleDateString()}: BP ${
              vital.bloodPressure || "N/A"
            }, HR ${vital.heartRate || "N/A"}, Temp ${
              vital.temperature || "N/A"
            }`
        )
        .join("\n")
    : "No vital signs history available"
}

## RECENT REPORTS
${
  existingReports.length > 0
    ? existingReports
        .map(
          (report) =>
            `- ${report.title} (${report.type}) - ${report.status} - ${new Date(
              report.date
            ).toLocaleDateString()}`
        )
        .join("\n")
    : "No previous reports"
}

## CONTACT INFORMATION
Phone: ${patient.phone || "Not provided"}
Email: ${patient.email || "Not provided"}
Emergency Contact: ${patient.emergencyContact || "Not provided"}`;

    if (additionalContext) {
      context += `\n\n## ADDITIONAL CONTEXT\n${additionalContext}`;
    }

    return context;
  }

  private getReportGenerationPrompt(reportType: string): string {
    return `You are an expert medical AI assistant specializing in generating comprehensive medical reports. You will create detailed, professional medical reports based on patient data.

## REPORT TYPE: ${reportType}

## YOUR ROLE
- Generate accurate, professional medical reports
- Use proper medical terminology
- Be thorough but concise
- Follow standard medical report formats
- Ensure all sections are complete and relevant

## REPORT SECTIONS TO GENERATE

### CHIEF COMPLAINT
- Primary reason for the visit/report
- Patient's main concern in their own words
- Duration and severity

### HISTORY OF PRESENT ILLNESS
- Detailed narrative of the current condition
- Timeline of symptoms
- Relevant associated symptoms
- Previous treatments attempted

### VITAL SIGNS SUMMARY
- Analysis of current vital signs
- Comparison with normal ranges
- Trends from historical data
- Clinical significance

### ASSESSMENT
- Clinical impression based on all available data
- Differential diagnoses if applicable
- Risk factors and complications
- Overall patient status

### PLAN
- Treatment recommendations
- Follow-up care instructions
- Medication adjustments if needed
- Monitoring requirements
- Patient education points

### CLINICAL NOTES
- Additional observations
- Patient response to treatment
- Family concerns or questions
- Discharge planning if applicable

## FORMATTING REQUIREMENTS
- Use clear, professional medical language
- Include specific measurements and dates
- Provide rationale for clinical decisions
- Ensure continuity of care information
- Maintain patient confidentiality standards

## IMPORTANT GUIDELINES
- Base all assessments on provided patient data
- Do not make assumptions about missing information
- Highlight any urgent or concerning findings
- Provide actionable recommendations
- Ensure report is suitable for medical record keeping

Generate a comprehensive medical report following these guidelines.`;
  }

  private parseAIResponse(aiResponse: string): {
    chiefComplaint: string;
    history: string;
    vitalsSummary: string;
    assessment: string;
    plan: string;
    notes: string;
    markdown: string;
  } {
    // Parse the AI response into structured sections
    // This is a simple parser - could be enhanced with more sophisticated parsing

    const sections = {
      chiefComplaint: "",
      history: "",
      vitalsSummary: "",
      assessment: "",
      plan: "",
      notes: "",
      markdown: aiResponse, // Store the full response as markdown
    };

    // Try to extract sections using common medical report patterns
    const extractSection = (text: string, sectionNames: string[]): string => {
      for (const sectionName of sectionNames) {
        const regex = new RegExp(
          `(?:^|\\n)\\s*(?:##?\\s*)?${sectionName}[:\\s]*\\n([\\s\\S]*?)(?=\\n\\s*(?:##?\\s*)?(?:CHIEF|HISTORY|VITAL|ASSESSMENT|PLAN|NOTES|$))`,
          "i"
        );
        const match = text.match(regex);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
      return "";
    };

    sections.chiefComplaint = extractSection(aiResponse, [
      "CHIEF COMPLAINT",
      "Chief Complaint",
    ]);
    sections.history = extractSection(aiResponse, [
      "HISTORY OF PRESENT ILLNESS",
      "History",
      "Present Illness",
    ]);
    sections.vitalsSummary = extractSection(aiResponse, [
      "VITAL SIGNS SUMMARY",
      "Vital Signs",
      "Vitals",
    ]);
    sections.assessment = extractSection(aiResponse, [
      "ASSESSMENT",
      "Clinical Assessment",
      "Impression",
    ]);
    sections.plan = extractSection(aiResponse, [
      "PLAN",
      "Treatment Plan",
      "Care Plan",
    ]);
    sections.notes = extractSection(aiResponse, [
      "CLINICAL NOTES",
      "Notes",
      "Additional Notes",
    ]);

    // If sections are empty, try to extract from a more general format
    if (!sections.chiefComplaint && !sections.history && !sections.assessment) {
      // Fallback: split by paragraphs and assign to sections
      const paragraphs = aiResponse.split("\n\n").filter((p) => p.trim());
      if (paragraphs.length >= 3) {
        sections.chiefComplaint = paragraphs[0] || "";
        sections.history = paragraphs[1] || "";
        sections.assessment = paragraphs[2] || "";
        sections.plan = paragraphs[3] || "";
        sections.vitalsSummary = paragraphs[4] || "";
        sections.notes = paragraphs.slice(5).join("\n\n") || "";
      }
    }

    return sections;
  }
}

// Export singleton instance
export const aiReportService = AIReportService.getInstance();
