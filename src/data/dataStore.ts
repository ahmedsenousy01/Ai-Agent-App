import {
  Patient,
  Report,
  Medication,
  VitalSnapshot,
  Appointment,
  Clinician,
  InteractionLog,
  ID,
  ISODate,
  AppContext,
} from "../types";
import {
  mockPatients,
  mockReports,
  mockMedications,
  mockVitals,
  mockAppointments,
  mockClinicians,
  mockInteractionLogs,
  currentUser,
} from "./mockData";

class DataStore {
  private patients: Patient[] = [...mockPatients];
  private reports: Report[] = [...mockReports];
  private medications: Medication[] = [...mockMedications];
  private vitals: VitalSnapshot[] = [...mockVitals];
  private appointments: Appointment[] = [...mockAppointments];
  private clinicians: Clinician[] = [...mockClinicians];
  private interactionLogs: InteractionLog[] = [...mockInteractionLogs];

  // Event listeners for data changes
  private listeners: Set<() => void> = new Set();

  // Event system methods
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    console.log(
      `🟡 [DataStore] Notifying ${this.listeners.size} listeners of data changes`
    );
    this.listeners.forEach((listener) => listener());
  }

  // Patient operations
  getPatient(patientId: ID): Patient | null {
    return this.patients.find((p) => p.id === patientId) || null;
  }

  searchPatients(
    query?: string,
    room?: string,
    condition?: string,
    isUrgent?: boolean
  ): Patient[] {
    return this.patients.filter((patient) => {
      if (query && !patient.name.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
      if (room && patient.room !== room) {
        return false;
      }
      if (
        condition &&
        !patient.condition.toLowerCase().includes(condition.toLowerCase())
      ) {
        return false;
      }
      if (isUrgent !== undefined && patient.isUrgent !== isUrgent) {
        return false;
      }
      return true;
    });
  }

  updatePatient(patientId: ID, updates: Partial<Patient>): Patient | null {
    const index = this.patients.findIndex((p) => p.id === patientId);
    if (index === -1) return null;

    this.patients[index] = { ...this.patients[index], ...updates };
    this.notifyListeners();
    return this.patients[index];
  }

  createPatient(patientData: Omit<Patient, "id">): Patient {
    const newPatient: Patient = {
      ...patientData,
      id: this.generateId(),
    };
    this.patients.push(newPatient);
    this.notifyListeners();
    return newPatient;
  }

  // Report operations
  getReport(reportId: ID): Report | null {
    return this.reports.find((r) => r.id === reportId) || null;
  }

  listReports(patientId?: ID, status?: string): Report[] {
    return this.reports.filter((report) => {
      if (patientId && report.patientId !== patientId) {
        return false;
      }
      if (status && report.status !== status) {
        return false;
      }
      return true;
    });
  }

  createReport(reportData: Omit<Report, "id">): Report {
    const newReport: Report = {
      ...reportData,
      id: this.generateId(),
    };
    this.reports.push(newReport);
    this.notifyListeners();
    return newReport;
  }

  updateReport(reportId: ID, updates: Partial<Report>): Report | null {
    const index = this.reports.findIndex((r) => r.id === reportId);
    if (index === -1) return null;

    this.reports[index] = { ...this.reports[index], ...updates };
    this.notifyListeners();
    return this.reports[index];
  }

  // Medication operations
  listMedications(patientId: ID): Medication[] {
    return this.medications.filter((m) => m.patientId === patientId);
  }

  addMedication(medicationData: Omit<Medication, "id">): Medication {
    const newMedication: Medication = {
      ...medicationData,
      id: this.generateId(),
    };
    this.medications.push(newMedication);
    this.notifyListeners();
    return newMedication;
  }

  updateMedication(medId: ID, updates: Partial<Medication>): Medication | null {
    const index = this.medications.findIndex((m) => m.id === medId);
    if (index === -1) return null;

    this.medications[index] = { ...this.medications[index], ...updates };
    this.notifyListeners();
    return this.medications[index];
  }

  removeMedication(medId: ID): boolean {
    const index = this.medications.findIndex((m) => m.id === medId);
    if (index === -1) return false;

    this.medications.splice(index, 1);
    this.notifyListeners();
    return true;
  }

  // Vital signs operations
  getLatestVitals(patientId: ID): VitalSnapshot | null {
    const patientVitals = this.vitals
      .filter((v) => v.patientId === patientId)
      .sort(
        (a, b) =>
          new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
      );

    return patientVitals[0] || null;
  }

  updateVitals(patientId: ID, updates: Partial<VitalSnapshot>): VitalSnapshot {
    const newVitals: VitalSnapshot = {
      id: this.generateId(),
      patientId,
      recordedAt: new Date().toISOString(),
      ...updates,
    };
    this.vitals.push(newVitals);
    this.notifyListeners();
    return newVitals;
  }

  getVitalHistory(patientId: ID, days: number = 7): VitalSnapshot[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.vitals
      .filter(
        (v) => v.patientId === patientId && new Date(v.recordedAt) >= cutoffDate
      )
      .sort(
        (a, b) =>
          new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
      );
  }

  // Appointment operations
  listAppointments(patientId?: ID, date?: ISODate): Appointment[] {
    return this.appointments.filter((appointment) => {
      if (patientId && appointment.patientId !== patientId) {
        return false;
      }
      if (date) {
        const appointmentDate = new Date(
          appointment.scheduledFor
        ).toDateString();
        const filterDate = new Date(date).toDateString();
        if (appointmentDate !== filterDate) {
          return false;
        }
      }
      return true;
    });
  }

  scheduleAppointment(appointmentData: Omit<Appointment, "id">): Appointment {
    const newAppointment: Appointment = {
      ...appointmentData,
      id: this.generateId(),
    };
    this.appointments.push(newAppointment);
    this.notifyListeners();
    return newAppointment;
  }

  updateAppointment(
    appointmentId: ID,
    updates: Partial<Appointment>
  ): Appointment | null {
    const index = this.appointments.findIndex((a) => a.id === appointmentId);
    if (index === -1) return null;

    this.appointments[index] = { ...this.appointments[index], ...updates };
    this.notifyListeners();
    return this.appointments[index];
  }

  // Interaction log operations
  addInteractionLog(log: Omit<InteractionLog, "id">): InteractionLog {
    const newLog: InteractionLog = {
      ...log,
      id: this.generateId(),
    };
    this.interactionLogs.push(newLog);
    this.notifyListeners();
    return newLog;
  }

  // Utility operations
  addNote(patientId: ID, text: string, category?: string): boolean {
    // For now, we'll add notes to the patient's medical history
    const patient = this.getPatient(patientId);
    if (!patient) return false;

    const note = category ? `${category}: ${text}` : text;
    const updatedHistory = [...(patient.medicalHistory || []), note];
    this.updatePatient(patientId, { medicalHistory: updatedHistory });
    return true;
  }

  getPatientSummary(patientId: ID) {
    const patient = this.getPatient(patientId);
    if (!patient) return null;

    return {
      patient,
      latestVitals: this.getLatestVitals(patientId),
      medications: this.listMedications(patientId),
      recentReports: this.listReports(patientId).slice(0, 3),
    };
  }

  // Get complete app context
  getAppContext(
    currentScreen: string,
    currentPatientId?: ID,
    currentReportId?: ID
  ): AppContext {
    return {
      currentScreen,
      allPatients: [...this.patients],
      allReports: [...this.reports],
      allAppointments: [...this.appointments],
      allMedications: [...this.medications],
      allVitals: [...this.vitals],
      allClinicians: [...this.clinicians],
      allInteractionLogs: [...this.interactionLogs],
      currentPatient: currentPatientId
        ? this.getPatient(currentPatientId)
        : undefined,
      currentReport: currentReportId
        ? this.getReport(currentReportId)
        : undefined,
      currentUser,
    };
  }

  // Helper methods
  private generateId(): ID {
    return Math.random().toString(36).substr(2, 9);
  }

  // Public method to sync data from server
  syncFromServer(updatedContext: AppContext): void {
    if (updatedContext.allPatients) {
      this.patients = [...updatedContext.allPatients];
    }
    if (updatedContext.allReports) {
      this.reports = [...updatedContext.allReports];
    }
    if (updatedContext.allAppointments) {
      this.appointments = [...updatedContext.allAppointments];
    }
    if (updatedContext.allMedications) {
      this.medications = [...updatedContext.allMedications];
    }
    if (updatedContext.allVitals) {
      this.vitals = [...updatedContext.allVitals];
    }
    if (updatedContext.allInteractionLogs) {
      this.interactionLogs = [...updatedContext.allInteractionLogs];
    }
    this.notifyListeners();
  }

  // Data persistence (optional localStorage for demo)
  saveToStorage(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      const data = {
        patients: this.patients,
        reports: this.reports,
        medications: this.medications,
        vitals: this.vitals,
        appointments: this.appointments,
        interactionLogs: this.interactionLogs,
      };
      localStorage.setItem("medicalAppData", JSON.stringify(data));
    }
  }

  loadFromStorage(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = localStorage.getItem("medicalAppData");
      if (stored) {
        try {
          const data = JSON.parse(stored);
          this.patients = data.patients || this.patients;
          this.reports = data.reports || this.reports;
          this.medications = data.medications || this.medications;
          this.vitals = data.vitals || this.vitals;
          this.appointments = data.appointments || this.appointments;
          this.interactionLogs = data.interactionLogs || this.interactionLogs;
        } catch (error) {
          console.warn("Failed to load data from storage:", error);
        }
      }
    }
  }
}

// Export singleton instance
export const dataStore = new DataStore();

// Load data from storage on initialization
dataStore.loadFromStorage();
