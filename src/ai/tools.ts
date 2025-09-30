import { tool } from "ai";
import { z } from "zod/v4";
import { PatientService } from "../services/patientService";
import { ReportService } from "../services/reportService";
import { VitalService } from "../services/vitalService";
import { MedicationService } from "../services/medicationService";
import { AppointmentService } from "../services/appointmentService";
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
      description: "Update patient information",
      inputSchema: z
        .object({
          patientId: z.string().describe("The patient ID"),
        })
        .and(schemas.PatientUpdate),
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
      description: "Update patient vital signs",
      inputSchema: z
        .object({
          patientId: z.string().describe("The patient ID"),
        })
        .and(schemas.VitalUpdate),
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
      inputSchema: z
        .object({
          patientId: z.string().describe("The patient ID"),
        })
        .and(schemas.MedicationCreate.omit({ patientId: true })),
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
      inputSchema: z
        .object({
          medId: z.string().describe("The medication ID"),
        })
        .and(schemas.MedicationUpdate),
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

    updateReport: tool({
      description: "Update an existing medical report",
      inputSchema: z
        .object({
          reportId: z.string().describe("The report ID"),
        })
        .and(schemas.ReportUpdate),
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
      inputSchema: z
        .object({
          appointmentId: z.string().describe("The appointment ID"),
        })
        .and(schemas.AppointmentUpdate),
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
