import { Medication, ID, MedicationCreate, MedicationUpdate } from "../types";
import { dataStore } from "../data/dataStore";

export class MedicationService {
  static listMedications(patientId: ID): Medication[] {
    return dataStore.listMedications(patientId);
  }

  static addMedication(
    patientId: ID,
    medicationData: MedicationCreate
  ): Medication {
    const newMedication: MedicationCreate = {
      ...medicationData,
      patientId,
    };

    const result = dataStore.addMedication(newMedication);
    dataStore.saveToStorage();
    return result;
  }

  static updateMedication(
    medId: ID,
    updates: MedicationUpdate
  ): Medication | null {
    const result = dataStore.updateMedication(medId, updates);
    if (result) {
      dataStore.saveToStorage();
    }
    return result;
  }

  static removeMedication(medId: ID): boolean {
    const result = dataStore.removeMedication(medId);
    if (result) {
      dataStore.saveToStorage();
    }
    return result;
  }

  static discontinueMedication(medId: ID): Medication | null {
    return this.updateMedication(medId, {
      active: false,
      endedAt: new Date().toISOString(),
    });
  }
}
