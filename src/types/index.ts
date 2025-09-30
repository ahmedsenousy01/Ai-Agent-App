// Import schemas to derive types from
import { z } from "zod/v4";
import { schemas } from "../schemas";

// Base types derived from schemas
export type ID = z.infer<typeof schemas.ID>;
export type ISODate = z.infer<typeof schemas.ISODate>;
export type AppState = z.infer<typeof schemas.AppState>;

// Entity types derived from schemas
export type Patient = z.infer<typeof schemas.Patient>;
export type Report = z.infer<typeof schemas.Report>;
export type Medication = z.infer<typeof schemas.Medication>;
export type VitalSnapshot = z.infer<typeof schemas.VitalSnapshot>;
export type Appointment = z.infer<typeof schemas.Appointment>;
export type Clinician = z.infer<typeof schemas.Clinician>;
export type InteractionLog = z.infer<typeof schemas.InteractionLog>;
export type AppContext = z.infer<typeof schemas.AppContext>;
export type VoiceServiceResponse = z.infer<typeof schemas.VoiceServiceResponse>;

// Create/Update types derived from schemas
export type PatientCreate = z.infer<typeof schemas.PatientCreate>;
export type PatientUpdate = z.infer<typeof schemas.PatientUpdate>;
export type ReportCreate = z.infer<typeof schemas.ReportCreate>;
export type ReportUpdate = z.infer<typeof schemas.ReportUpdate>;
export type MedicationCreate = z.infer<typeof schemas.MedicationCreate>;
export type MedicationUpdate = z.infer<typeof schemas.MedicationUpdate>;
export type VitalUpdate = z.infer<typeof schemas.VitalUpdate>;
export type AppointmentCreate = z.infer<typeof schemas.AppointmentCreate>;
export type AppointmentUpdate = z.infer<typeof schemas.AppointmentUpdate>;

// Re-export schemas for validation
export { schemas } from "../schemas";
