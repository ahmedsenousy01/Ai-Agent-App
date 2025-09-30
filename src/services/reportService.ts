import { Report, ID } from "../types";
import { dataStore } from "../data/dataStore";

export class ReportService {
  static getReport(reportId: ID): Report | null {
    return dataStore.getReport(reportId);
  }

  static listReports(patientId?: ID, status?: string): Report[] {
    return dataStore.listReports(patientId, status);
  }

  static createReport(reportData: Omit<Report, "id">): Report {
    const result = dataStore.createReport(reportData);
    dataStore.saveToStorage();
    return result;
  }

  static updateReport(reportId: ID, updates: Partial<Report>): Report | null {
    const result = dataStore.updateReport(reportId, updates);
    if (result) {
      dataStore.saveToStorage();
    }
    return result;
  }

  static approveReport(reportId: ID): Report | null {
    return this.updateReport(reportId, { status: "Approved" });
  }

  static exportReportPDF(reportId: ID): { url: string } {
    // Mock PDF export - in a real app, this would generate an actual PDF
    const report = this.getReport(reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    // Simulate PDF generation delay
    return {
      url: `https://medical-app.com/reports/${reportId}.pdf`,
    };
  }
}
