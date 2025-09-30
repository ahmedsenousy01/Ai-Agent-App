import { VitalSnapshot, ID } from "../types";
import { dataStore } from "../data/dataStore";

export class VitalService {
  static getLatestVitals(patientId: ID): VitalSnapshot | null {
    return dataStore.getLatestVitals(patientId);
  }

  static updateVitals(
    patientId: ID,
    updates: Partial<VitalSnapshot>
  ): VitalSnapshot {
    const result = dataStore.updateVitals(patientId, updates);
    dataStore.saveToStorage();
    return result;
  }

  static getVitalHistory(patientId: ID, days: number = 7): VitalSnapshot[] {
    return dataStore.getVitalHistory(patientId, days);
  }

  static recordVitals(
    patientId: ID,
    vitals: {
      heartRate?: string;
      bloodPressure?: string;
      temperature?: string;
      respiratoryRate?: string;
      oxygenSaturation?: string;
      weight?: string;
      height?: string;
      bmi?: string;
    }
  ): VitalSnapshot {
    return this.updateVitals(patientId, vitals);
  }
}
