import { Medication, ID } from "../types";
import { dataStore } from "../data/dataStore";

export class MedicationService {
  static listMedications(patientId: ID): Medication[] {
    return dataStore.listMedications(patientId);
  }

  static addMedication(
    patientId: ID,
    medicationData: {
      name: string;
      dosage: string;
      type: string;
      instructions?: string;
      prescribedBy?: string;
    }
  ): Medication {
    const newMedication: Omit<Medication, "id"> = {
      patientId,
      name: medicationData.name,
      dosage: medicationData.dosage,
      type: medicationData.type,
      instructions: medicationData.instructions,
      prescribedBy: medicationData.prescribedBy,
      startedAt: new Date().toISOString(),
      active: true,
    };

    const result = dataStore.addMedication(newMedication);
    dataStore.saveToStorage();
    return result;
  }

  static updateMedication(
    medId: ID,
    updates: Partial<Medication>
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
