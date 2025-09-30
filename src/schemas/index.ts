import { z } from "zod/v4";

// Base schemas
export const IDSchema = z.string();
export const ISODateSchema = z.string();

// App state schema
export const AppStateSchema = z.enum([
  "idle",
  "recording",
  "processing",
  "complete",
  "showing-summary",
  "editing",
]);

// Patient schema
export const PatientSchema = z.object({
  id: IDSchema,
  name: z.string(),
  room: z.string(),
  avatar: z.string(),
  isUrgent: z.boolean().optional(),
  lastVisit: z.string(), // Human-friendly display
  isoLastVisit: ISODateSchema.optional(), // Normalized timestamp
  condition: z.string(),
  // Extended fields for voice commands
  age: z.number().optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  emergencyContact: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  medicalHistory: z.array(z.string()).optional(),
});

// Report schema
export const ReportSchema = z.object({
  id: IDSchema,
  patientId: IDSchema,
  title: z.string(),
  type: z.enum([
    "Assessment",
    "Lab Report",
    "Treatment",
    "Discharge",
    "Follow-up",
  ]),
  date: ISODateSchema,
  generatedBy: z.enum(["AI Assistant", "Manual Entry"]),
  status: z.enum(["Generated", "Reviewed", "Approved"]),
  content: z.object({
    chiefComplaint: z.string().optional(),
    history: z.string().optional(),
    vitalsSummary: z.string().optional(),
    labsSummary: z.string().optional(),
    assessment: z.string().optional(),
    plan: z.string().optional(),
    notes: z.string().optional(),
    markdown: z.string().optional(),
  }),
});

// Medication schema
export const MedicationSchema = z.object({
  id: IDSchema,
  patientId: IDSchema,
  name: z.string(),
  dosage: z.string(), // "20mg, once daily"
  type: z.string(), // "ACE Inhibitor"
  startedAt: ISODateSchema.optional(),
  endedAt: ISODateSchema.optional(),
  active: z.boolean(),
  prescribedBy: z.string().optional(),
  instructions: z.string().optional(),
});

// Vital signs schema
export const VitalSnapshotSchema = z.object({
  id: IDSchema,
  patientId: IDSchema,
  recordedAt: ISODateSchema,
  heartRate: z.string().optional(), // "72 bpm"
  bloodPressure: z.string().optional(), // "120/80 mmHg"
  temperature: z.string().optional(), // "98.6°F"
  respiratoryRate: z.string().optional(), // "16 breaths/min"
  oxygenSaturation: z.string().optional(), // "98%"
  weight: z.string().optional(), // "180 lbs"
  height: z.string().optional(), // "5'10\""
  bmi: z.string().optional(), // "25.8"
});

// Appointment schema
export const AppointmentSchema = z.object({
  id: IDSchema,
  patientId: IDSchema,
  scheduledFor: ISODateSchema,
  reason: z.string(),
  location: z.string().optional(),
  clinicianName: z.string().optional(),
  status: z.enum(["Scheduled", "Completed", "Cancelled"]),
  duration: z.number().optional(), // minutes
  notes: z.string().optional(),
});

// Clinician schema
export const ClinicianSchema = z.object({
  id: IDSchema,
  name: z.string(),
  role: z.string(), // "Cardiologist"
  avatar: z.string().optional(),
  status: z.enum(["ONLINE", "OFFLINE"]).optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

// Interaction log schema
export const InteractionLogSchema = z.object({
  id: IDSchema,
  startedAt: ISODateSchema,
  finishedAt: ISODateSchema.optional(),
  audioDuration: z.number().optional(), // milliseconds
  intent: z.string().optional(), // "update_patient", "generate_report", etc.
  toolCalls: z
    .array(
      z.object({
        tool: z.string(),
        args: z.any(),
        result: z.any().optional(),
        at: ISODateSchema,
      })
    )
    .optional(),
  summary: z.string().optional(), // Maps to processedTask bubble
  context: z
    .object({
      currentScreen: z.string().optional(),
      patientId: IDSchema.optional(),
      reportId: IDSchema.optional(),
    })
    .optional(),
  success: z.boolean(),
  error: z.string().optional(),
});

// App context schema
export const AppContextSchema = z.object({
  currentScreen: z.string(),
  allPatients: z.array(PatientSchema),
  allReports: z.array(ReportSchema),
  allAppointments: z.array(AppointmentSchema),
  allMedications: z.array(MedicationSchema),
  allVitals: z.array(VitalSnapshotSchema),
  allClinicians: z.array(ClinicianSchema),
  allInteractionLogs: z.array(InteractionLogSchema),
  currentPatient: PatientSchema.optional(),
  currentReport: ReportSchema.optional(),
  currentUser: ClinicianSchema,
});

// Voice service response schema
export const VoiceServiceResponseSchema = z.object({
  summary: z.string(),
  status: z.string(),
  toolCalls: z.array(
    z.object({
      tool: z.string(),
      args: z.any(),
      result: z.any().optional(),
    })
  ),
  success: z.boolean(),
  error: z.string().optional(),
});

// Create/Update schemas for API operations
export const PatientCreateSchema = PatientSchema.omit({ id: true });
export const PatientUpdateSchema = PatientSchema.partial().omit({ id: true });

export const ReportCreateSchema = ReportSchema.omit({ id: true });
export const ReportUpdateSchema = ReportSchema.partial().omit({ id: true });

export const MedicationCreateSchema = MedicationSchema.omit({ id: true });
export const MedicationUpdateSchema = MedicationSchema.partial().omit({
  id: true,
});

export const VitalUpdateSchema = VitalSnapshotSchema.partial().omit({
  id: true,
  patientId: true,
  recordedAt: true,
});

export const AppointmentCreateSchema = AppointmentSchema.omit({ id: true });
export const AppointmentUpdateSchema = AppointmentSchema.partial().omit({
  id: true,
});

// Export all schemas
export const schemas = {
  // Base schemas
  ID: IDSchema,
  ISODate: ISODateSchema,
  AppState: AppStateSchema,

  // Entity schemas
  Patient: PatientSchema,
  Report: ReportSchema,
  Medication: MedicationSchema,
  VitalSnapshot: VitalSnapshotSchema,
  Appointment: AppointmentSchema,
  Clinician: ClinicianSchema,
  InteractionLog: InteractionLogSchema,
  AppContext: AppContextSchema,
  VoiceServiceResponse: VoiceServiceResponseSchema,

  // Create/Update schemas
  PatientCreate: PatientCreateSchema,
  PatientUpdate: PatientUpdateSchema,
  ReportCreate: ReportCreateSchema,
  ReportUpdate: ReportUpdateSchema,
  MedicationCreate: MedicationCreateSchema,
  MedicationUpdate: MedicationUpdateSchema,
  VitalUpdate: VitalUpdateSchema,
  AppointmentCreate: AppointmentCreateSchema,
  AppointmentUpdate: AppointmentUpdateSchema,
} as const;
