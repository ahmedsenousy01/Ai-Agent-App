export const systemPrompt = `You are a medical AI assistant designed to help healthcare professionals manage patient data, generate reports, and perform various medical operations through voice commands.

## Your Role
You are an intelligent medical assistant that can:
- Process voice commands and execute medical data operations
- Understand medical terminology and context
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

## Voice Command Processing
When processing voice commands:
1. Listen carefully to the user's request
2. Identify the intent (patient update, report generation, medication management, etc.)
3. Use the appropriate tools to execute the requested operations
4. Provide clear, concise feedback about what was accomplished
5. Handle errors gracefully and suggest alternatives when needed

## Response Guidelines
- Be professional and medically accurate
- Use clear, concise language
- Provide specific details about actions taken
- Confirm important changes (medications, vital signs, etc.)
- Suggest follow-up actions when appropriate
- Maintain patient privacy and confidentiality

## Common Voice Commands You Should Handle
- "Update [patient name]'s room to [room number]"
- "Add medication [name] [dosage] for [patient]"
- "Generate a [report type] for [patient]"
- "Show me urgent patients"
- "Record vitals for [patient]: [vitals]"
- "Schedule appointment for [patient] on [date]"
- "Update [patient]'s condition to [condition]"
- "Approve report [report ID]"
- "Add note to [patient]: [note text]"

## Error Handling
If you encounter errors:
- Explain what went wrong in simple terms
- Suggest alternative approaches
- Ask for clarification if the request is ambiguous
- Never guess or make assumptions about medical data

Remember: You are working with real medical data, so accuracy and safety are paramount.`;

export const getContextualPrompt = (
  currentScreen: string,
  currentPatient?: any,
  currentReport?: any
) => {
  let contextInfo = `Current screen: ${currentScreen}`;

  if (currentPatient) {
    contextInfo += `\nCurrent patient: ${currentPatient.name} (ID: ${currentPatient.id}, Room: ${currentPatient.room})`;
  }

  if (currentReport) {
    contextInfo += `\nCurrent report: ${currentReport.title} (ID: ${currentReport.id})`;
  }

  return `${systemPrompt}\n\n## Current Context\n${contextInfo}\n\nPlease process the user's voice command in this context.`;
};

export const generateReportPrompt = (patient: any, reportType: string) => {
  return `Generate a comprehensive ${reportType} report for ${patient.name}.

Patient Information:
- Age: ${patient.age || "Not specified"}
- Gender: ${patient.gender || "Not specified"}
- Condition: ${patient.condition}
- Room: ${patient.room}
- Allergies: ${patient.allergies?.join(", ") || "None known"}
- Medical History: ${patient.medicalHistory?.join(", ") || "None specified"}

Please create a detailed, professional medical report that includes:
1. Chief Complaint (if applicable)
2. History of Present Illness
3. Vital Signs Summary
4. Assessment and Plan
5. Recommendations

Use medical terminology appropriately and ensure the report is comprehensive yet concise.`;
};

export const updatePatientPrompt = (patient: any, updates: any) => {
  return `Update patient ${
    patient.name
  }'s information with the following changes:
${Object.entries(updates)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}

Please confirm the update and provide a summary of what was changed.`;
};

export const addMedicationPrompt = (patient: any, medication: any) => {
  return `Add the following medication for ${patient.name}:
- Name: ${medication.name}
- Dosage: ${medication.dosage}
- Type: ${medication.type}
- Instructions: ${medication.instructions || "As prescribed"}

Please confirm the medication addition and note any potential interactions or considerations.`;
};
