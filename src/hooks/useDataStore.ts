import { useState, useEffect } from "react";
import { dataStore } from "../data/dataStore";

/**
 * Custom hook to subscribe to data store changes
 * This will cause components to re-render when data changes
 */
export function useDataStore() {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    console.log(`🟡 [useDataStore] Subscribing to data store changes`);
    const unsubscribe = dataStore.subscribe(() => {
      console.log(`🟡 [useDataStore] Data store changed, forcing re-render`);
      // Force re-render by updating state
      forceUpdate({});
    });

    return unsubscribe;
  }, []);

  return dataStore;
}

/**
 * Hook to get patients with automatic updates
 */
export function usePatients() {
  const dataStore = useDataStore();
  return dataStore.searchPatients();
}

/**
 * Hook to get reports with automatic updates
 */
export function useReports() {
  const dataStore = useDataStore();
  return dataStore.listReports();
}

/**
 * Hook to get appointments with automatic updates
 */
export function useAppointments() {
  const dataStore = useDataStore();
  return dataStore.listAppointments();
}

/**
 * Hook to get medications for a specific patient with automatic updates
 */
export function usePatientMedications(patientId: string) {
  const dataStore = useDataStore();
  return dataStore.listMedications(patientId);
}

/**
 * Hook to get reports for a specific patient with automatic updates
 */
export function usePatientReports(patientId: string) {
  const dataStore = useDataStore();
  return dataStore.listReports(patientId);
}

/**
 * Hook to get latest vitals for a specific patient with automatic updates
 */
export function usePatientVitals(patientId: string) {
  const dataStore = useDataStore();
  return dataStore.getLatestVitals(patientId);
}

/**
 * Hook to get a specific patient with automatic updates
 */
export function usePatient(patientId: string) {
  const dataStore = useDataStore();
  return dataStore.getPatient(patientId);
}
