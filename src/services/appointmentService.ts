import { Appointment, ID, ISODate } from "../types";
import { dataStore } from "../data/dataStore";

export class AppointmentService {
  static listAppointments(patientId?: ID, date?: ISODate): Appointment[] {
    return dataStore.listAppointments(patientId, date);
  }

  static scheduleAppointment(appointmentData: {
    patientId: ID;
    scheduledFor: ISODate;
    reason: string;
    location?: string;
    duration?: number;
    clinicianName?: string;
    notes?: string;
  }): Appointment {
    const newAppointment: Omit<Appointment, "id"> = {
      patientId: appointmentData.patientId,
      scheduledFor: appointmentData.scheduledFor,
      reason: appointmentData.reason,
      location: appointmentData.location,
      duration: appointmentData.duration || 30,
      clinicianName: appointmentData.clinicianName,
      status: "Scheduled",
      notes: appointmentData.notes,
    };

    const result = dataStore.scheduleAppointment(newAppointment);
    dataStore.saveToStorage();
    return result;
  }

  static updateAppointment(
    appointmentId: ID,
    updates: Partial<Appointment>
  ): Appointment | null {
    const result = dataStore.updateAppointment(appointmentId, updates);
    if (result) {
      dataStore.saveToStorage();
    }
    return result;
  }

  static cancelAppointment(appointmentId: ID): Appointment | null {
    return this.updateAppointment(appointmentId, { status: "Cancelled" });
  }

  static completeAppointment(
    appointmentId: ID,
    notes?: string
  ): Appointment | null {
    return this.updateAppointment(appointmentId, {
      status: "Completed",
      notes: notes,
    });
  }

  static getUpcomingAppointments(
    patientId?: ID,
    days: number = 7
  ): Appointment[] {
    const appointments = this.listAppointments(patientId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    return appointments
      .filter((apt) => {
        const aptDate = new Date(apt.scheduledFor);
        return (
          aptDate >= new Date() &&
          aptDate <= cutoffDate &&
          apt.status === "Scheduled"
        );
      })
      .sort(
        (a, b) =>
          new Date(a.scheduledFor).getTime() -
          new Date(b.scheduledFor).getTime()
      );
  }
}
