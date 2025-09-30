// Base types
export type ID = string;
export type ISODate = string;

export type AppState =
  | "idle"
  | "recording"
  | "processing"
  | "complete"
  | "showing-summary"
  | "editing";

// Patient entity
export interface Patient {
  id: ID;
  name: string;
  room: string;
  avatar: string;
  isUrgent?: boolean;
  lastVisit: string; // Human-friendly display
  isoLastVisit?: ISODate; // Normalized timestamp
  condition: string;
  // Extended fields for voice commands
  age?: number;
  gender?: "Male" | "Female" | "Other";
  phone?: string;
  email?: string;
  emergencyContact?: string;
  allergies?: string[];
  medicalHistory?: string[];
}

// Report entity
export interface Report {
  id: ID;
  patientId: ID;
  title: string;
  type: "Assessment" | "Lab Report" | "Treatment" | "Discharge" | "Follow-up";
  date: ISODate;
  generatedBy: "AI Assistant" | "Manual Entry";
  status: "Generated" | "Reviewed" | "Approved";
  content: {
    chiefComplaint?: string;
    history?: string;
    vitalsSummary?: string;
    labsSummary?: string;
    assessment?: string;
    plan?: string;
    notes?: string;
    markdown?: string;
  };
}

// Medication entity
export interface Medication {
  id: ID;
  patientId: ID;
  name: string;
  dosage: string; // "20mg, once daily"
  type: string; // "ACE Inhibitor"
  startedAt?: ISODate;
  endedAt?: ISODate;
  active: boolean;
  prescribedBy?: string;
  instructions?: string;
}

// Vital signs entity
export interface VitalSnapshot {
  id: ID;
  patientId: ID;
  recordedAt: ISODate;
  heartRate?: string; // "72 bpm"
  bloodPressure?: string; // "120/80 mmHg"
  temperature?: string; // "98.6°F"
  respiratoryRate?: string; // "16 breaths/min"
  oxygenSaturation?: string; // "98%"
  weight?: string; // "180 lbs"
  height?: string; // "5'10\""
  bmi?: string; // "25.8"
}

// Appointment entity
export interface Appointment {
  id: ID;
  patientId: ID;
  scheduledFor: ISODate;
  reason: string;
  location?: string;
  clinicianName?: string;
  status: "Scheduled" | "Completed" | "Cancelled";
  duration?: number; // minutes
  notes?: string;
}

// Clinician entity
export interface Clinician {
  id: ID;
  name: string;
  role: string; // "Cardiologist"
  avatar?: string;
  status?: "ONLINE" | "OFFLINE";
  department?: string;
  phone?: string;
  email?: string;
}

// Voice interaction log
export interface InteractionLog {
  id: ID;
  startedAt: ISODate;
  finishedAt?: ISODate;
  audioDuration?: number; // milliseconds
  intent?: string; // "update_patient", "generate_report", etc.
  toolCalls?: Array<{
    tool: string;
    args: any;
    result?: any;
    at: ISODate;
  }>;
  summary?: string; // Maps to processedTask bubble
  context?: {
    currentScreen?: string;
    patientId?: ID;
    reportId?: ID;
  };
  success: boolean;
  error?: string;
}

// App context for AI processing
export interface AppContext {
  currentScreen: string;
  allPatients: Patient[];
  allReports: Report[];
  allAppointments: Appointment[];
  allMedications: Medication[];
  allVitals: VitalSnapshot[];
  allClinicians: Clinician[];
  allInteractionLogs: InteractionLog[];
  currentPatient?: Patient;
  currentReport?: Report;
  currentUser: Clinician;
}

// Voice service response
export interface VoiceServiceResponse {
  summary: string;
  status: string;
  toolCalls: Array<{
    tool: string;
    args: any;
    result?: any;
  }>;
  success: boolean;
  error?: string;
}
