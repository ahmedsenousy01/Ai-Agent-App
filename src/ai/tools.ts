import { tool } from "ai";
import { z } from "zod/v4";
import { PatientService } from "../services/patientService";
import { ReportService } from "../services/reportService";
import { VitalService } from "../services/vitalService";
import { MedicationService } from "../services/medicationService";
import { AppointmentService } from "../services/appointmentService";
import { aiReportService } from "../services/aiReportService";
import {
  ID,
  ISODate,
  PatientCreate,
  PatientUpdate,
  ReportCreate,
  ReportUpdate,
  MedicationCreate,
  MedicationUpdate,
  VitalUpdate,
  AppointmentCreate,
  AppointmentUpdate,
} from "../types";
import { schemas } from "../schemas";

// Tool implementations (simplified for now)
export const medicalTools = {
  // Patient operations
  getPatient: async (patientId: ID) => {
    return PatientService.getPatient(patientId);
  },

  searchPatients: async (
    query?: string,
    room?: string,
    condition?: string,
    isUrgent?: boolean
  ) => {
    return PatientService.searchPatients(query, room, condition, isUrgent);
  },

  updatePatient: async (patientId: ID, updates: PatientUpdate) => {
    return PatientService.updatePatient(patientId, updates);
  },

  createPatient: async (patientData: PatientCreate) => {
    return PatientService.createPatient(patientData);
  },

  // Vital signs operations
  getLatestVitals: async (patientId: ID) => {
    return VitalService.getLatestVitals(patientId);
  },

  updateVitals: async (patientId: ID, updates: VitalUpdate) => {
    return VitalService.updateVitals(patientId, updates);
  },

  getVitalHistory: async (patientId: ID, days: number = 7) => {
    return VitalService.getVitalHistory(patientId, days);
  },

  // Medication operations
  listMedications: async (patientId: ID) => {
    return MedicationService.listMedications(patientId);
  },

  addMedication: async (patientId: ID, medicationData: MedicationCreate) => {
    return MedicationService.addMedication(patientId, medicationData);
  },

  updateMedication: async (medId: ID, updates: MedicationUpdate) => {
    return MedicationService.updateMedication(medId, updates);
  },

  removeMedication: async (medId: ID) => {
    return MedicationService.removeMedication(medId);
  },

  // Report operations
  listReports: async (patientId?: ID, status?: string) => {
    return ReportService.listReports(patientId, status);
  },

  getReport: async (reportId: ID) => {
    return ReportService.getReport(reportId);
  },

  createReport: async (reportData: ReportCreate) => {
    return ReportService.createReport(reportData);
  },

  generateAIReport: async (
    patientId: ID,
    reportType: string,
    additionalContext?: string
  ) => {
    const patient = PatientService.getPatient(patientId);
    if (!patient) {
      throw new Error(`Patient with ID ${patientId} not found`);
    }

    // Generate AI content
    const aiContent = await aiReportService.generateReportContent(
      patient,
      reportType,
      additionalContext
    );

    // Create the report with AI-generated content
    const reportData: ReportCreate = {
      patientId,
      title: `${reportType} Report - ${patient.name}`,
      type: reportType as any,
      date: new Date().toISOString(),
      generatedBy: "AI Assistant",
      status: "Generated",
      content: aiContent,
    };

    return ReportService.createReport(reportData);
  },

  updateReport: async (reportId: ID, updates: ReportUpdate) => {
    return ReportService.updateReport(reportId, updates);
  },

  approveReport: async (reportId: ID) => {
    return ReportService.approveReport(reportId);
  },

  exportReportPDF: async (reportId: ID) => {
    return ReportService.exportReportPDF(reportId);
  },

  // Appointment operations
  listAppointments: async (patientId?: ID, date?: ISODate) => {
    return AppointmentService.listAppointments(patientId, date);
  },

  scheduleAppointment: async (appointmentData: AppointmentCreate) => {
    return AppointmentService.scheduleAppointment(appointmentData);
  },

  updateAppointment: async (appointmentId: ID, updates: AppointmentUpdate) => {
    return AppointmentService.updateAppointment(appointmentId, updates);
  },

  cancelAppointment: async (appointmentId: ID) => {
    return AppointmentService.cancelAppointment(appointmentId);
  },

  // Utility operations
  addNote: async (patientId: ID, text: string, category?: string) => {
    return PatientService.addNote(patientId, text, category);
  },

  getPatientSummary: async (patientId: ID) => {
    return PatientService.getPatientSummary(patientId);
  },
};

// AI Tool Definitions for use with AI SDK
export const createAITools = () => {
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
      description:
        "Update patient information including room, condition, demographics, etc.",
      inputSchema: z.object({
        patientId: z.string().describe("The patient ID"),
        room: z.string().optional().describe("Patient's room number"),
        name: z.string().optional().describe("Patient's name"),
        condition: z
          .string()
          .optional()
          .describe("Patient's medical condition"),
        isUrgent: z.boolean().optional().describe("Whether patient is urgent"),
        age: z.number().optional().describe("Patient's age"),
        gender: z
          .enum(["Male", "Female", "Other"])
          .optional()
          .describe("Patient's gender"),
        phone: z.string().optional().describe("Patient's phone number"),
        email: z.string().optional().describe("Patient's email"),
        emergencyContact: z
          .string()
          .optional()
          .describe("Emergency contact info"),
        allergies: z.array(z.string()).optional().describe("Patient allergies"),
        medicalHistory: z
          .array(z.string())
          .optional()
          .describe("Medical history"),
      }),
      execute: async (data) => {
        const { patientId, ...updates } = data;
        return await medicalTools.updatePatient(patientId, updates);
      },
    }),

    createPatient: tool({
      description: "Create a new patient record",
      inputSchema: schemas.PatientCreate,
      execute: async (patientData) => {
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
      description:
        "Update patient vital signs including heart rate, blood pressure, temperature, etc.",
      inputSchema: z.object({
        patientId: z.string().describe("The patient ID"),
        heartRate: z
          .string()
          .optional()
          .describe("Heart rate (e.g., '72 bpm')"),
        bloodPressure: z
          .string()
          .optional()
          .describe("Blood pressure (e.g., '120/80 mmHg')"),
        temperature: z
          .string()
          .optional()
          .describe("Temperature (e.g., '98.6°F')"),
        respiratoryRate: z
          .string()
          .optional()
          .describe("Respiratory rate (e.g., '16 breaths/min')"),
        oxygenSaturation: z
          .string()
          .optional()
          .describe("Oxygen saturation (e.g., '98%')"),
        weight: z.string().optional().describe("Weight (e.g., '180 lbs')"),
        height: z.string().optional().describe("Height (e.g., '5'10\"')"),
        bmi: z.string().optional().describe("BMI (e.g., '25.8')"),
      }),
      execute: async (data) => {
        const { patientId, ...updates } = data;
        return await medicalTools.updateVitals(patientId, updates);
      },
    }),

    getVitalHistory: tool({
      description: "Get vital signs history for a patient",
      inputSchema: z.object({
        patientId: z.string().describe("The patient ID"),
        days: z
          .number()
          .optional()
          .describe("Number of days to look back (default: 7)"),
      }),
      execute: async ({ patientId, days = 7 }) => {
        return await medicalTools.getVitalHistory(patientId, days);
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
        name: z.string().describe("Medication name (e.g., 'Metformin')"),
        dosage: z
          .string()
          .describe("Dosage and frequency (e.g., '500mg twice daily')"),
        type: z.string().describe("Medication type (e.g., 'ACE Inhibitor')"),
        startedAt: z.string().optional().describe("Start date (ISO format)"),
        endedAt: z.string().optional().describe("End date (ISO format)"),
        active: z
          .boolean()
          .default(true)
          .describe("Whether medication is active (default: true)"),
        prescribedBy: z.string().optional().describe("Prescribing doctor"),
        instructions: z.string().optional().describe("Special instructions"),
      }),
      execute: async (data) => {
        const { patientId, ...medicationData } = data;
        return await medicalTools.addMedication(patientId, {
          ...medicationData,
          patientId,
        });
      },
    }),

    updateMedication: tool({
      description: "Update an existing medication",
      inputSchema: z.object({
        medId: z.string().describe("The medication ID"),
        name: z
          .string()
          .optional()
          .describe("Medication name (e.g., 'Metformin')"),
        dosage: z
          .string()
          .optional()
          .describe("Dosage and frequency (e.g., '500mg twice daily')"),
        type: z
          .string()
          .optional()
          .describe("Medication type (e.g., 'ACE Inhibitor')"),
        startedAt: z.string().optional().describe("Start date (ISO format)"),
        endedAt: z.string().optional().describe("End date (ISO format)"),
        active: z.boolean().optional().describe("Whether medication is active"),
        prescribedBy: z.string().optional().describe("Prescribing doctor"),
        instructions: z.string().optional().describe("Special instructions"),
      }),
      execute: async (data) => {
        const { medId, ...updates } = data;
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

    getReport: tool({
      description: "Get a specific medical report",
      inputSchema: z.object({
        reportId: z.string().describe("The report ID"),
      }),
      execute: async ({ reportId }) => {
        return await medicalTools.getReport(reportId);
      },
    }),

    createReport: tool({
      description: "Create a new medical report",
      inputSchema: schemas.ReportCreate,
      execute: async (reportData) => {
        return await medicalTools.createReport(reportData);
      },
    }),

    generateAIReport: tool({
      description:
        "Generate a comprehensive medical report using AI based on patient data, history, vitals, and medications. Supports structured medical report templates for discharge and operation reports.",
      inputSchema: z.object({
        patientId: z.string().describe("The patient ID"),
        reportType: z
          .enum([
            "Assessment",
            "Lab Report",
            "Treatment",
            "Follow-up",
            "Discharge",
            "Operation",
          ])
          .describe(
            "Type of report to generate. Use 'Discharge' for hospital discharge summaries or 'Operation' for surgical procedure reports."
          ),
        additionalContext: z
          .string()
          .optional()
          .describe(
            "Additional context or specific focus for the report (e.g., 'focus on cardiac symptoms', 'post-surgery follow-up', 'hemorrhoidectomy procedure', 'appendectomy with complications')"
          ),
      }),
      execute: async ({ patientId, reportType, additionalContext }) => {
        return await medicalTools.generateAIReport(
          patientId,
          reportType,
          additionalContext
        );
      },
    }),

    updateReport: tool({
      description: "Update an existing medical report",
      inputSchema: z.object({
        reportId: z.string().describe("The report ID"),
        patientId: z.string().optional().describe("The patient ID"),
        title: z.string().optional().describe("Report title"),
        type: z
          .enum([
            "Assessment",
            "Lab Report",
            "Treatment",
            "Follow-up",
            "Discharge",
            "Operation",
          ])
          .optional()
          .describe("Report type"),
        date: z.string().optional().describe("Report date (ISO format)"),
        generatedBy: z
          .enum(["AI Assistant", "Manual Entry"])
          .optional()
          .describe("How report was generated"),
        status: z
          .enum(["Generated", "Reviewed", "Approved"])
          .optional()
          .describe("Report status"),
        content: z
          .object({
            chiefComplaint: z.string().optional(),
            history: z.string().optional(),
            vitalsSummary: z.string().optional(),
            labsSummary: z.string().optional(),
            assessment: z.string().optional(),
            plan: z.string().optional(),
            notes: z.string().optional(),
            markdown: z.string().optional(),
          })
          .optional()
          .describe("Report content sections"),
      }),
      execute: async (data) => {
        const { reportId, ...updates } = data;
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

    exportReportPDF: tool({
      description: "Export a medical report as PDF",
      inputSchema: z.object({
        reportId: z.string().describe("The report ID"),
      }),
      execute: async ({ reportId }) => {
        return await medicalTools.exportReportPDF(reportId);
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
      inputSchema: schemas.AppointmentCreate,
      execute: async (appointmentData) => {
        return await medicalTools.scheduleAppointment(appointmentData);
      },
    }),

    updateAppointment: tool({
      description: "Update an existing appointment",
      inputSchema: z.object({
        appointmentId: z.string().describe("The appointment ID"),
        patientId: z.string().optional().describe("The patient ID"),
        scheduledFor: z
          .string()
          .optional()
          .describe("Appointment date/time (ISO format)"),
        reason: z.string().optional().describe("Reason for appointment"),
        location: z.string().optional().describe("Appointment location"),
        clinicianName: z.string().optional().describe("Clinician name"),
        status: z
          .enum(["Scheduled", "Completed", "Cancelled"])
          .optional()
          .describe("Appointment status"),
        duration: z.number().optional().describe("Duration in minutes"),
        notes: z.string().optional().describe("Appointment notes"),
      }),
      execute: async (data) => {
        const { appointmentId, ...updates } = data;
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
};
