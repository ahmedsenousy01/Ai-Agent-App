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
    // Discharge report template fields
    diagnoses?: string;
    therapy?: string;
    histology?: string;
    course?: string;
    recommendations?: string;
    lastMedication?: string;
    // Operation report specific fields
    surgeon?: string;
    assistants?: string;
    anesthesiologist?: string;
    anesthesia?: string;
    procedure?: string;
    operativeCourse?: string;
    surgicalDiagnosis?: string;
    patientInfo?: {
      name?: string;
      dateOfBirth?: string;
      dateOfSurgery?: string;
      ward?: string;
    };
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
    const basePrompt = `You are an expert medical AI assistant specializing in generating comprehensive medical reports. You will create detailed, professional medical reports based on patient data.

## REPORT TYPE: ${reportType}

## YOUR ROLE
- Generate accurate, professional medical reports
- Use proper medical terminology
- Be thorough but concise
- Follow standard medical report formats
- Ensure all sections are complete and relevant`;

    // Return specific prompts based on report type
    if (reportType === "Discharge") {
      return `${basePrompt}

## DISCHARGE REPORT STRUCTURE
Follow this specific format for discharge reports:

### DIAGNOSES
- Primary diagnosis with ICD codes if applicable
- Secondary diagnoses
- Complications if any

### THERAPY
- Surgical procedures performed with dates
- Medical treatments administered
- Interventions and their outcomes

### HISTOLOGY
- Pathology results if available
- Biopsy findings
- Laboratory results relevant to diagnosis

### COURSE
- Detailed narrative of the patient's hospital stay
- Timeline of events from admission to discharge
- Patient's response to treatment
- Postoperative course if applicable
- Recovery milestones

### RECOMMENDATIONS
- Follow-up care instructions
- Medication regimen
- Activity restrictions
- Wound care instructions
- Follow-up appointments scheduled

### LAST MEDICATION
- Current medications at discharge
- Dosage and frequency
- Duration of treatment
- Special instructions for medication management

## FORMATTING REQUIREMENTS
- Use clear, professional medical language
- Include specific dates and measurements
- Provide detailed course narrative
- Ensure continuity of care information
- Structure similar to hospital discharge summaries`;
    } else if (reportType === "Operation") {
      return `${basePrompt}

## OPERATION REPORT STRUCTURE
Follow this specific format for surgical operation reports:

### PATIENT INFORMATION
- Patient name, date of birth
- Date of surgery
- Ward/department

### SURGICAL TEAM
- Surgeon name and title
- First assistant
- Second assistant (if applicable)
- Anesthesiologist
- Nursing staff

### SURGICAL DIAGNOSIS
- Preoperative diagnosis
- Postoperative diagnosis
- ICD codes if applicable

### ANESTHESIA
- Type of anesthesia used
- Anesthesia provider

### PROCEDURE
- Detailed name of surgical procedure
- OPS codes if applicable

### OPERATIVE COURSE
- Detailed step-by-step description of the surgical procedure
- Patient positioning
- Surgical approach and technique
- Findings during surgery
- Complications if any
- Closure technique
- Postoperative status

## FORMATTING REQUIREMENTS
- Use precise surgical terminology
- Include detailed procedural steps
- Document all findings and complications
- Ensure accurate team member documentation
- Follow standard operative note format`;
    } else {
      // Default format for other report types
      return `${basePrompt}

## STANDARD REPORT SECTIONS

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
- Maintain patient confidentiality standards`;
    }
  }

  private parseAIResponse(aiResponse: string): {
    chiefComplaint: string;
    history: string;
    vitalsSummary: string;
    assessment: string;
    plan: string;
    notes: string;
    markdown: string;
    // Discharge report template fields
    diagnoses?: string;
    therapy?: string;
    histology?: string;
    course?: string;
    recommendations?: string;
    lastMedication?: string;
    // Operation report specific fields
    surgeon?: string;
    assistants?: string;
    anesthesiologist?: string;
    anesthesia?: string;
    procedure?: string;
    operativeCourse?: string;
    surgicalDiagnosis?: string;
    patientInfo?: {
      name?: string;
      dateOfBirth?: string;
      dateOfSurgery?: string;
      ward?: string;
    };
  } {
    // Parse the AI response into structured sections
    const sections: any = {
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
          `(?:^|\\n)\\s*(?:##?\\s*)?${sectionName}[:\\s]*\\n([\\s\\S]*?)(?=\\n\\s*(?:##?\\s*)?(?:CHIEF|HISTORY|VITAL|ASSESSMENT|PLAN|NOTES|DIAGNOSES|THERAPY|HISTOLOGY|COURSE|RECOMMENDATIONS|LAST MEDICATION|PATIENT INFORMATION|SURGICAL TEAM|SURGICAL DIAGNOSIS|ANESTHESIA|PROCEDURE|OPERATIVE COURSE|$))`,
          "i"
        );
        const match = text.match(regex);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
      return "";
    };

    // Standard report sections
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

    // Discharge report template sections
    sections.diagnoses = extractSection(aiResponse, [
      "DIAGNOSES",
      "Diagnoses",
      "DIAGNOSIS",
      "Diagnosis",
    ]);
    sections.therapy = extractSection(aiResponse, [
      "THERAPY",
      "Therapy",
      "TREATMENT",
      "Treatment",
    ]);
    sections.histology = extractSection(aiResponse, [
      "HISTOLOGY",
      "Histology",
      "PATHOLOGY",
      "Pathology",
    ]);
    sections.course = extractSection(aiResponse, [
      "COURSE",
      "Course",
      "CLINICAL COURSE",
      "Clinical Course",
    ]);
    sections.recommendations = extractSection(aiResponse, [
      "RECOMMENDATIONS",
      "Recommendations",
      "RECOMMENDATION",
      "Recommendation",
    ]);
    sections.lastMedication = extractSection(aiResponse, [
      "LAST MEDICATION",
      "Last Medication",
      "MEDICATION",
      "Medication",
    ]);

    // Operation report specific sections
    sections.surgeon = extractSection(aiResponse, ["SURGEON", "Surgeon"]);
    sections.assistants = extractSection(aiResponse, [
      "ASSISTANTS",
      "Assistants",
      "SURGICAL TEAM",
    ]);
    sections.anesthesiologist = extractSection(aiResponse, [
      "ANESTHESIOLOGIST",
      "Anesthesiologist",
    ]);
    sections.anesthesia = extractSection(aiResponse, [
      "ANESTHESIA",
      "Anesthesia",
    ]);
    sections.procedure = extractSection(aiResponse, ["PROCEDURE", "Procedure"]);
    sections.operativeCourse = extractSection(aiResponse, [
      "OPERATIVE COURSE",
      "Operative Course",
      "SURGICAL PROCEDURE",
    ]);
    sections.surgicalDiagnosis = extractSection(aiResponse, [
      "SURGICAL DIAGNOSIS",
      "Surgical Diagnosis",
    ]);

    // Extract patient information if present
    const patientInfoText = extractSection(aiResponse, [
      "PATIENT INFORMATION",
      "Patient Information",
    ]);
    if (patientInfoText) {
      sections.patientInfo = {
        name: this.extractPatientDetail(patientInfoText, ["Name", "Patient"]),
        dateOfBirth: this.extractPatientDetail(patientInfoText, [
          "Date of Birth",
          "DOB",
          "Born",
        ]),
        dateOfSurgery: this.extractPatientDetail(patientInfoText, [
          "Date of Surgery",
          "Surgery Date",
          "Operation Date",
        ]),
        ward: this.extractPatientDetail(patientInfoText, [
          "Ward",
          "Department",
          "Unit",
        ]),
      };
    }

    // If sections are empty, try to extract from a more general format
    if (
      !sections.chiefComplaint &&
      !sections.history &&
      !sections.assessment &&
      !sections.diagnoses
    ) {
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

  private extractPatientDetail(text: string, labels: string[]): string {
    for (const label of labels) {
      const regex = new RegExp(`${label}[:\\s]+([^\\n]+)`, "i");
      const match = text.match(regex);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return "";
  }
}

// Export singleton instance
export const aiReportService = AIReportService.getInstance();
