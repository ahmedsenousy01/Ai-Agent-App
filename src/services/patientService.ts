import { Patient, ID } from "../types";
import { dataStore } from "../data/dataStore";

export class PatientService {
  static getPatient(patientId: ID): Patient | null {
    return dataStore.getPatient(patientId);
  }

  static searchPatients(
    query?: string,
    room?: string,
    condition?: string,
    isUrgent?: boolean
  ): Patient[] {
    return dataStore.searchPatients(query, room, condition, isUrgent);
  }

  static updatePatient(
    patientId: ID,
    updates: Partial<Patient>
  ): Patient | null {
    const result = dataStore.updatePatient(patientId, updates);
    if (result) {
      dataStore.saveToStorage();
    }
    return result;
  }

  static createPatient(patientData: Omit<Patient, "id">): Patient {
    const result = dataStore.createPatient(patientData);
    dataStore.saveToStorage();
    return result;
  }

  static getPatientSummary(patientId: ID) {
    return dataStore.getPatientSummary(patientId);
  }

  static addNote(patientId: ID, text: string, category?: string): boolean {
    const result = dataStore.addNote(patientId, text, category);
    if (result) {
      dataStore.saveToStorage();
    }
    return result;
  }
}
